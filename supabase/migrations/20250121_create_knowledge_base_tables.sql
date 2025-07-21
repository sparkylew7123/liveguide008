-- Create knowledge base tables for agent RAG system
-- Following the Agent RAG Development Order document recommendations

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Agent knowledge bases table
CREATE TABLE IF NOT EXISTS agent_knowledge_bases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id TEXT NOT NULL, -- ElevenLabs agent ID
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    UNIQUE(agent_id, name)
);

-- Knowledge documents table with vector embeddings
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kb_id UUID NOT NULL REFERENCES agent_knowledge_bases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- text, pdf, html, etc.
    source_url TEXT,
    -- Vector embedding for semantic search (1536 dimensions for OpenAI embeddings)
    embedding vector(1536),
    -- Metadata for filtering and context
    metadata JSONB DEFAULT '{}',
    -- Full-text search vector
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    -- Analytics
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Knowledge categories for organization
CREATE TABLE IF NOT EXISTS knowledge_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kb_id UUID NOT NULL REFERENCES agent_knowledge_bases(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES knowledge_categories(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(kb_id, category)
);

-- Document categories junction table
CREATE TABLE IF NOT EXISTS document_categories (
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES knowledge_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, category_id)
);

-- Conversation context table for RAG retrieval
CREATE TABLE IF NOT EXISTS conversation_contexts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL, -- ElevenLabs conversation ID
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    retrieved_documents JSONB DEFAULT '[]', -- Array of document IDs used
    query_embedding vector(1536),
    retrieval_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX idx_knowledge_documents_kb_id ON knowledge_documents(kb_id);
CREATE INDEX idx_knowledge_documents_embedding ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_documents_search ON knowledge_documents USING GIN (search_vector);
CREATE INDEX idx_knowledge_categories_kb_id ON knowledge_categories(kb_id);
CREATE INDEX idx_conversation_contexts_conversation_id ON conversation_contexts(conversation_id);
CREATE INDEX idx_conversation_contexts_user_id ON conversation_contexts(user_id);

-- Create functions for hybrid search (semantic + keyword)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(1536),
    query_text TEXT,
    kb_id_filter UUID,
    match_count INT DEFAULT 10,
    semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    metadata JSONB,
    similarity_score FLOAT,
    keyword_score FLOAT,
    combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT 
            d.id,
            d.title,
            d.content,
            d.metadata,
            1 - (d.embedding <=> query_embedding) AS similarity_score
        FROM knowledge_documents d
        WHERE d.kb_id = kb_id_filter
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT 
            d.id,
            d.title,
            d.content,
            d.metadata,
            ts_rank(d.search_vector, plainto_tsquery('english', query_text)) AS keyword_score
        FROM knowledge_documents d
        WHERE d.kb_id = kb_id_filter
            AND d.search_vector @@ plainto_tsquery('english', query_text)
        ORDER BY keyword_score DESC
        LIMIT match_count * 2
    ),
    combined AS (
        SELECT 
            COALESCE(s.id, k.id) AS id,
            COALESCE(s.title, k.title) AS title,
            COALESCE(s.content, k.content) AS content,
            COALESCE(s.metadata, k.metadata) AS metadata,
            COALESCE(s.similarity_score, 0) AS similarity_score,
            COALESCE(k.keyword_score, 0) AS keyword_score,
            (COALESCE(s.similarity_score, 0) * semantic_weight + 
             COALESCE(k.keyword_score, 0) * (1 - semantic_weight)) AS combined_score
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.id = k.id
    )
    SELECT * FROM combined
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;

-- Function to update document access analytics
CREATE OR REPLACE FUNCTION update_document_access(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE knowledge_documents
    SET 
        access_count = access_count + 1,
        last_accessed_at = TIMEZONE('utc', NOW())
    WHERE id = doc_id;
END;
$$;

-- RLS policies
ALTER TABLE agent_knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_contexts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read knowledge bases
CREATE POLICY "Users can read active knowledge bases" ON agent_knowledge_bases
    FOR SELECT USING (is_active = true);

-- Allow authenticated users to read documents
CREATE POLICY "Users can read knowledge documents" ON knowledge_documents
    FOR SELECT USING (true);

-- Allow authenticated users to read categories
CREATE POLICY "Users can read knowledge categories" ON knowledge_categories
    FOR SELECT USING (true);

-- Allow authenticated users to read document categories
CREATE POLICY "Users can read document categories" ON document_categories
    FOR SELECT USING (true);

-- Allow users to read their own conversation contexts
CREATE POLICY "Users can read own conversation contexts" ON conversation_contexts
    FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to knowledge bases" ON agent_knowledge_bases
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to documents" ON knowledge_documents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to categories" ON knowledge_categories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to document categories" ON document_categories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to conversation contexts" ON conversation_contexts
    FOR ALL USING (auth.role() = 'service_role');

-- Insert initial knowledge base for Maya agent
INSERT INTO agent_knowledge_bases (agent_id, name, description, metadata)
VALUES (
    'SuIlXQ4S6dyjrNViOrQ8',
    'Maya Coaching Knowledge Base',
    'Comprehensive knowledge base for Maya - LiveGuide Onboarding Specialist',
    '{
        "agent_name": "Maya",
        "specialties": ["goal_discovery", "coaching_style_assessment", "personalized_guidance"],
        "knowledge_domains": ["career_coaching", "life_coaching", "wellness", "personal_development"]
    }'::jsonb
);