-- Migration: Complete RAG System Setup
-- Description: Ensures all RAG system components are properly configured with performance optimizations
-- Date: 2025-08-11

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- VECTOR INDEXES FOR PERFORMANCE
-- ==========================================

-- Critical: Add vector index for graph_nodes.embedding for semantic search
-- This is essential for RAG performance on large datasets
CREATE INDEX IF NOT EXISTS idx_graph_nodes_embedding 
ON public.graph_nodes 
USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL AND deleted_at IS NULL;

-- Add compound index for user-specific semantic searches
CREATE INDEX IF NOT EXISTS idx_graph_nodes_user_embedding 
ON public.graph_nodes (user_id)
WHERE embedding IS NOT NULL AND deleted_at IS NULL;

-- Optimize text search with GIN index on searchable text fields
CREATE INDEX IF NOT EXISTS idx_graph_nodes_text_search
ON public.graph_nodes 
USING gin (to_tsvector('english', COALESCE(label, '') || ' ' || COALESCE(description, '')))
WHERE deleted_at IS NULL;

-- ==========================================
-- ENHANCED RAG FUNCTIONS
-- ==========================================

-- Function to search nodes semantically with enhanced filtering
CREATE OR REPLACE FUNCTION search_nodes_semantic(
    p_user_id UUID,
    p_query_embedding vector(1536),
    p_node_types TEXT[] DEFAULT NULL,
    p_similarity_threshold REAL DEFAULT 0.7,
    p_limit INTEGER DEFAULT 10,
    p_exclude_node_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
    node_id UUID,
    node_type TEXT,
    label TEXT,
    description TEXT,
    similarity_score REAL,
    created_at TIMESTAMPTZ,
    properties JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gn.id::UUID,
        gn.node_type::TEXT,
        gn.label::TEXT,
        gn.description::TEXT,
        (1 - (p_query_embedding <=> gn.embedding))::REAL as similarity_score,
        gn.created_at::TIMESTAMPTZ,
        gn.properties::JSONB
    FROM graph_nodes gn
    WHERE gn.user_id = p_user_id
        AND gn.embedding IS NOT NULL
        AND gn.deleted_at IS NULL
        AND (p_node_types IS NULL OR gn.node_type::TEXT = ANY(p_node_types))
        AND (p_exclude_node_ids IS NULL OR gn.id != ALL(p_exclude_node_ids))
        AND (1 - (p_query_embedding <=> gn.embedding)) >= p_similarity_threshold
    ORDER BY gn.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

-- Function to get contextual node recommendations
CREATE OR REPLACE FUNCTION get_contextual_recommendations(
    p_user_id UUID,
    p_current_node_id UUID,
    p_recommendation_types TEXT[] DEFAULT ARRAY['goal', 'insight', 'skill'],
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    node_id UUID,
    node_type TEXT,
    label TEXT,
    description TEXT,
    similarity_score REAL,
    relationship_strength REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_embedding vector(1536);
BEGIN
    -- Get the embedding of the current node
    SELECT embedding INTO current_embedding
    FROM graph_nodes
    WHERE id = p_current_node_id AND user_id = p_user_id AND deleted_at IS NULL;
    
    -- Return empty if no embedding found
    IF current_embedding IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH similar_nodes AS (
        SELECT 
            gn.id,
            gn.node_type,
            gn.label,
            gn.description,
            (1 - (current_embedding <=> gn.embedding))::REAL as sim_score
        FROM graph_nodes gn
        WHERE gn.user_id = p_user_id
            AND gn.id != p_current_node_id
            AND gn.embedding IS NOT NULL
            AND gn.deleted_at IS NULL
            AND gn.node_type::TEXT = ANY(p_recommendation_types)
        ORDER BY gn.embedding <=> current_embedding
        LIMIT p_limit * 2
    ),
    connected_nodes AS (
        SELECT 
            CASE 
                WHEN ge.source_node_id = p_current_node_id THEN ge.target_node_id
                ELSE ge.source_node_id
            END as connected_id,
            COUNT(*) as connection_count
        FROM graph_edges ge
        WHERE (ge.source_node_id = p_current_node_id OR ge.target_node_id = p_current_node_id)
            AND ge.deleted_at IS NULL
        GROUP BY 
            CASE 
                WHEN ge.source_node_id = p_current_node_id THEN ge.target_node_id
                ELSE ge.source_node_id
            END
    )
    SELECT 
        sn.id::UUID,
        sn.node_type::TEXT,
        sn.label::TEXT,
        sn.description::TEXT,
        sn.sim_score::REAL,
        COALESCE(cn.connection_count, 0)::REAL as relationship_strength
    FROM similar_nodes sn
    LEFT JOIN connected_nodes cn ON cn.connected_id = sn.id
    ORDER BY (sn.sim_score * 0.7 + COALESCE(cn.connection_count, 0) * 0.3) DESC
    LIMIT p_limit;
END;
$$;

-- Function for comprehensive user context with embedding-based insights
CREATE OR REPLACE FUNCTION get_enhanced_user_context(
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 30,
    p_max_nodes INTEGER DEFAULT 50
)
RETURNS TABLE (
    active_goals JSONB,
    recent_insights JSONB,
    skill_progression JSONB,
    context_summary TEXT,
    total_nodes INTEGER,
    embedding_coverage REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH node_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(embedding)::INTEGER as with_embeddings,
            COUNT(embedding)::REAL / COUNT(*)::REAL as coverage
        FROM graph_nodes gn
        WHERE gn.user_id = p_user_id AND gn.deleted_at IS NULL
    ),
    goals AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', gn.id,
                'label', gn.label,
                'description', gn.description,
                'status', gn.properties->>'status',
                'priority', gn.properties->>'priority',
                'created_at', gn.created_at,
                'has_embedding', (gn.embedding IS NOT NULL)
            )
            ORDER BY 
                CASE WHEN gn.properties->>'status' = 'active' THEN 1
                     WHEN gn.properties->>'status' = 'in_progress' THEN 2
                     ELSE 3 END,
                gn.created_at DESC
        ) as goal_data
        FROM graph_nodes gn
        WHERE gn.user_id = p_user_id
            AND gn.node_type = 'goal'
            AND gn.deleted_at IS NULL
            AND gn.created_at >= NOW() - (p_days_back || ' days')::interval
        LIMIT p_max_nodes
    ),
    insights AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', gn.id,
                'label', gn.label,
                'description', gn.description,
                'type', gn.node_type,
                'created_at', gn.created_at,
                'has_embedding', (gn.embedding IS NOT NULL)
            )
            ORDER BY gn.created_at DESC
        ) as insight_data
        FROM graph_nodes gn
        WHERE gn.user_id = p_user_id
            AND gn.node_type IN ('insight', 'skill', 'accomplishment', 'emotion')
            AND gn.deleted_at IS NULL
            AND gn.created_at >= NOW() - (p_days_back || ' days')::interval
        LIMIT p_max_nodes
    ),
    skills AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'skill', gn.label,
                'level', gn.properties->>'level',
                'progress', gn.properties->>'progress',
                'last_practiced', gn.updated_at
            )
            ORDER BY gn.updated_at DESC
        ) as skill_data
        FROM graph_nodes gn
        WHERE gn.user_id = p_user_id
            AND gn.node_type = 'skill'
            AND gn.deleted_at IS NULL
        LIMIT 20
    )
    SELECT 
        COALESCE(g.goal_data, '[]'::jsonb) as active_goals,
        COALESCE(i.insight_data, '[]'::jsonb) as recent_insights,
        COALESCE(s.skill_data, '[]'::jsonb) as skill_progression,
        COALESCE(
            'User has ' || ns.total || ' total nodes (' || 
            ROUND(ns.coverage * 100, 1) || '% with embeddings). ' ||
            'Recent activity: ' || 
            COALESCE(jsonb_array_length(g.goal_data), 0) || ' goals, ' ||
            COALESCE(jsonb_array_length(i.insight_data), 0) || ' insights.',
            'No recent activity found.'
        ) as context_summary,
        ns.total as total_nodes,
        ns.coverage as embedding_coverage
    FROM node_stats ns
    CROSS JOIN goals g
    CROSS JOIN insights i
    CROSS JOIN skills s;
END;
$$;

-- ==========================================
-- KNOWLEDGE BASE FUNCTIONS
-- ==========================================

-- Ensure knowledge_bases table exists with proper structure
CREATE TABLE IF NOT EXISTS public.knowledge_bases (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, name)
);

-- Enable RLS on knowledge_bases
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_bases
CREATE POLICY "Users can manage their own knowledge bases" ON public.knowledge_bases
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all knowledge bases" ON public.knowledge_bases
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Enhanced function to search across user's knowledge and graph
CREATE OR REPLACE FUNCTION search_user_knowledge_comprehensive(
    p_user_id UUID,
    p_query_embedding vector(1536),
    p_query_text TEXT DEFAULT NULL,
    p_include_graph BOOLEAN DEFAULT TRUE,
    p_include_knowledge_base BOOLEAN DEFAULT TRUE,
    p_similarity_threshold REAL DEFAULT 0.6,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    source_type TEXT,
    item_id UUID,
    title TEXT,
    content TEXT,
    similarity_score REAL,
    created_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Graph nodes
    SELECT 
        'graph_node'::TEXT as source_type,
        gn.id as item_id,
        gn.label as title,
        COALESCE(gn.description, gn.label) as content,
        (1 - (p_query_embedding <=> gn.embedding))::REAL as similarity_score,
        gn.created_at,
        jsonb_build_object(
            'node_type', gn.node_type,
            'properties', gn.properties
        ) as metadata
    FROM graph_nodes gn
    WHERE p_include_graph
        AND gn.user_id = p_user_id
        AND gn.embedding IS NOT NULL
        AND gn.deleted_at IS NULL
        AND (1 - (p_query_embedding <=> gn.embedding)) >= p_similarity_threshold
        AND (p_query_text IS NULL OR 
             gn.label ILIKE '%' || p_query_text || '%' OR 
             gn.description ILIKE '%' || p_query_text || '%')
    
    UNION ALL
    
    -- Knowledge chunks
    SELECT 
        'knowledge_chunk'::TEXT as source_type,
        kc.id as item_id,
        COALESCE(kd.title, 'Document Chunk') as title,
        kc.content,
        (1 - (p_query_embedding <=> kc.embedding))::REAL as similarity_score,
        kc.created_at,
        jsonb_build_object(
            'document_id', kc.document_id,
            'chunk_index', kc.chunk_index,
            'document_type', kd.document_type,
            'metadata', kc.metadata
        ) as metadata
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kc.document_id = kd.id
    JOIN knowledge_bases kb ON kd.knowledge_base_id = kb.id
    WHERE p_include_knowledge_base
        AND kb.user_id = p_user_id
        AND kc.embedding IS NOT NULL
        AND (1 - (p_query_embedding <=> kc.embedding)) >= p_similarity_threshold
        AND (p_query_text IS NULL OR kc.content ILIKE '%' || p_query_text || '%')
    
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$;

-- ==========================================
-- RLS POLICIES AND PERMISSIONS
-- ==========================================

-- Grant execute permissions on RAG functions
GRANT EXECUTE ON FUNCTION search_nodes_semantic TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_contextual_recommendations TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_enhanced_user_context TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_user_knowledge_comprehensive TO authenticated, service_role;

-- Ensure existing RAG functions have proper permissions
GRANT EXECUTE ON FUNCTION find_similar_goal_patterns TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_insights_semantic TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_context_summary TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION match_knowledge_chunks TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_user_goals_semantic TO authenticated, service_role;

-- ==========================================
-- PERFORMANCE AND MONITORING
-- ==========================================

-- Create a view for monitoring RAG system health
CREATE OR REPLACE VIEW rag_system_health AS
SELECT 
    'graph_nodes' as table_name,
    COUNT(*) as total_records,
    COUNT(embedding) as records_with_embeddings,
    ROUND((COUNT(embedding)::REAL / COUNT(*) * 100), 2) as embedding_coverage_percent,
    AVG(array_length(embedding::FLOAT[], 1)) as avg_embedding_dimension,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as most_recent_update
FROM graph_nodes 
WHERE deleted_at IS NULL

UNION ALL

SELECT 
    'knowledge_chunks' as table_name,
    COUNT(*) as total_records,
    COUNT(embedding) as records_with_embeddings,
    ROUND((COUNT(embedding)::REAL / COUNT(*) * 100), 2) as embedding_coverage_percent,
    AVG(array_length(embedding::FLOAT[], 1)) as avg_embedding_dimension,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as most_recent_update
FROM knowledge_chunks;

-- Grant access to health monitoring view
GRANT SELECT ON rag_system_health TO authenticated, service_role;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to get embedding statistics for a user
CREATE OR REPLACE FUNCTION get_user_embedding_stats(p_user_id UUID)
RETURNS TABLE (
    total_nodes INTEGER,
    nodes_with_embeddings INTEGER,
    embedding_coverage REAL,
    nodes_by_type JSONB,
    oldest_missing_embedding TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(embedding)::INTEGER as with_embeddings,
            COUNT(embedding)::REAL / COUNT(*)::REAL as coverage
        FROM graph_nodes
        WHERE user_id = p_user_id AND deleted_at IS NULL
    ),
    type_breakdown AS (
        SELECT jsonb_object_agg(
            node_type::TEXT,
            jsonb_build_object(
                'total', COUNT(*),
                'with_embeddings', COUNT(embedding),
                'coverage', ROUND((COUNT(embedding)::REAL / COUNT(*) * 100), 1)
            )
        ) as breakdown
        FROM graph_nodes
        WHERE user_id = p_user_id AND deleted_at IS NULL
        GROUP BY node_type
    ),
    oldest_missing AS (
        SELECT MIN(created_at) as oldest
        FROM graph_nodes
        WHERE user_id = p_user_id 
            AND deleted_at IS NULL 
            AND embedding IS NULL
    )
    SELECT 
        s.total,
        s.with_embeddings,
        s.coverage,
        COALESCE(tb.breakdown, '{}'::jsonb),
        om.oldest
    FROM stats s
    CROSS JOIN type_breakdown tb
    CROSS JOIN oldest_missing om;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_embedding_stats TO authenticated, service_role;

-- Add helpful comments
COMMENT ON INDEX idx_graph_nodes_embedding IS 'Vector similarity search index for RAG operations';
COMMENT ON INDEX idx_graph_nodes_text_search IS 'Full-text search index for RAG text matching';
COMMENT ON FUNCTION search_nodes_semantic IS 'Primary semantic search function for graph nodes';
COMMENT ON FUNCTION get_contextual_recommendations IS 'Provides AI-powered node recommendations based on similarity and relationships';
COMMENT ON FUNCTION get_enhanced_user_context IS 'Comprehensive user context for RAG applications';
COMMENT ON VIEW rag_system_health IS 'Monitoring view for RAG system performance and coverage';

-- Migration completed successfully
SELECT 'RAG system migration completed successfully' as status;