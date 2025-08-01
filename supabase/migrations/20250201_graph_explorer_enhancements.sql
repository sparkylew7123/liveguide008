-- Migration: Graph Explorer PWA Enhancements
-- Description: Add status column, embedding column, and graph traversal functions

-- Create node status enum type
CREATE TYPE node_status AS ENUM ('draft_verbal', 'curated');

-- Add status column to graph_nodes table
ALTER TABLE graph_nodes 
ADD COLUMN status node_status DEFAULT 'draft_verbal';

-- Add embedding column for semantic search (using OpenAI text-embedding-3-small dimensions)
ALTER TABLE graph_nodes 
ADD COLUMN embedding vector(1536);

-- Create index on embedding column for efficient similarity search
CREATE INDEX idx_graph_nodes_embedding ON graph_nodes 
USING ivfflat (embedding vector_cosine_ops) 
WHERE deleted_at IS NULL;

-- Update existing nodes to have 'curated' status (since they were manually created)
UPDATE graph_nodes 
SET status = 'curated' 
WHERE status IS NULL;

-- Function to get node neighborhood with configurable depth
CREATE OR REPLACE FUNCTION get_node_neighborhood(
    p_node_id UUID,
    p_depth INTEGER DEFAULT 2,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    node_id UUID,
    node_type node_type,
    label TEXT,
    description TEXT,
    properties JSONB,
    status node_status,
    depth INTEGER,
    edge_id UUID,
    edge_type edge_type,
    edge_label TEXT,
    edge_properties JSONB,
    source_node_id UUID,
    target_node_id UUID
) AS $$
WITH RECURSIVE node_graph AS (
    -- Base case: start with the requested node
    SELECT 
        n.id as node_id,
        n.node_type,
        n.label,
        n.description,
        n.properties,
        n.status,
        0 as depth,
        NULL::UUID as edge_id,
        NULL::edge_type as edge_type,
        NULL::TEXT as edge_label,
        NULL::JSONB as edge_properties,
        NULL::UUID as source_node_id,
        NULL::UUID as target_node_id
    FROM graph_nodes n
    WHERE n.id = p_node_id
        AND n.deleted_at IS NULL
        AND (p_user_id IS NULL OR n.user_id = p_user_id)
    
    UNION ALL
    
    -- Recursive case: find connected nodes
    SELECT DISTINCT
        n.id as node_id,
        n.node_type,
        n.label,
        n.description,
        n.properties,
        n.status,
        ng.depth + 1 as depth,
        e.id as edge_id,
        e.edge_type,
        e.label as edge_label,
        e.properties as edge_properties,
        e.source_node_id,
        e.target_node_id
    FROM node_graph ng
    JOIN graph_edges e ON (
        (e.source_node_id = ng.node_id OR e.target_node_id = ng.node_id)
        AND e.valid_to IS NULL
    )
    JOIN graph_nodes n ON (
        n.id = CASE 
            WHEN e.source_node_id = ng.node_id THEN e.target_node_id
            ELSE e.source_node_id
        END
        AND n.deleted_at IS NULL
    )
    WHERE ng.depth < p_depth
        AND (p_user_id IS NULL OR n.user_id = p_user_id)
)
SELECT DISTINCT * FROM node_graph
ORDER BY depth, node_type, label;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to find semantically similar nodes using vector embeddings
CREATE OR REPLACE FUNCTION find_similar_nodes(
    p_user_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    node_id UUID,
    node_type node_type,
    label TEXT,
    description TEXT,
    properties JSONB,
    status node_status,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id as node_id,
        n.node_type,
        n.label,
        n.description,
        n.properties,
        n.status,
        1 - (n.embedding <=> p_query_embedding) as similarity
    FROM graph_nodes n
    WHERE n.user_id = p_user_id
        AND n.deleted_at IS NULL
        AND n.embedding IS NOT NULL
        AND 1 - (n.embedding <=> p_query_embedding) > p_threshold
    ORDER BY n.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update node status from draft_verbal to curated
CREATE OR REPLACE FUNCTION update_node_status(
    p_node_id UUID,
    p_user_id UUID,
    p_new_status node_status
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE graph_nodes
    SET status = p_new_status,
        updated_at = now()
    WHERE id = p_node_id
        AND user_id = p_user_id
        AND deleted_at IS NULL;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or update node embedding
CREATE OR REPLACE FUNCTION upsert_node_embedding(
    p_node_id UUID,
    p_user_id UUID,
    p_embedding vector(1536)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE graph_nodes
    SET embedding = p_embedding,
        updated_at = now()
    WHERE id = p_node_id
        AND user_id = p_user_id
        AND deleted_at IS NULL;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_node_neighborhood TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_nodes TO authenticated;
GRANT EXECUTE ON FUNCTION update_node_status TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_node_embedding TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN graph_nodes.status IS 'Node status: draft_verbal (created by AI from conversation) or curated (user-edited/confirmed)';
COMMENT ON COLUMN graph_nodes.embedding IS 'Vector embedding for semantic search using OpenAI text-embedding-3-small';
COMMENT ON FUNCTION get_node_neighborhood IS 'Fetches a node and all connected nodes up to specified depth using recursive traversal';
COMMENT ON FUNCTION find_similar_nodes IS 'Finds semantically similar nodes using vector similarity search';
COMMENT ON FUNCTION update_node_status IS 'Updates node status, typically from draft_verbal to curated when user edits';
COMMENT ON FUNCTION upsert_node_embedding IS 'Creates or updates the vector embedding for a node';