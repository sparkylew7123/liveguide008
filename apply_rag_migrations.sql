-- Combined RAG System Migrations
-- Run this in Supabase SQL Editor to create all required tables

-- ========================================
-- 1. KNOWLEDGE BASE TABLES
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Agent knowledge bases table
CREATE TABLE IF NOT EXISTS agent_knowledge_bases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Knowledge base settings
    indexing_status TEXT DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'processing', 'completed', 'failed')),
    document_count INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(agent_id, name)
);

-- Knowledge documents table
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_base_id UUID NOT NULL REFERENCES agent_knowledge_bases(id) ON DELETE CASCADE,
    
    -- Document info
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    document_type TEXT DEFAULT 'text' CHECK (document_type IN ('text', 'markdown', 'pdf', 'html')),
    
    -- Content processing
    content_hash TEXT NOT NULL,
    chunk_count INTEGER DEFAULT 0,
    
    -- Vector embedding (average of chunk embeddings)
    embedding vector(1536),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(knowledge_base_id, content_hash)
);

-- Document chunks for semantic search
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    
    -- Chunk content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    
    -- Vector embedding
    embedding vector(1536) NOT NULL,
    
    -- Context windows
    previous_chunk_id UUID REFERENCES document_chunks(id),
    next_chunk_id UUID REFERENCES document_chunks(id),
    
    -- Metadata (headers, section info, etc)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(document_id, chunk_index)
);

-- Knowledge categories/tags
CREATE TABLE IF NOT EXISTS knowledge_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_base_id UUID NOT NULL REFERENCES agent_knowledge_bases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES knowledge_categories(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(knowledge_base_id, name)
);

-- Document category assignments
CREATE TABLE IF NOT EXISTS document_categories (
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES knowledge_categories(id) ON DELETE CASCADE,
    
    PRIMARY KEY (document_id, category_id)
);

-- Create indexes for performance
CREATE INDEX idx_knowledge_documents_kb_id ON knowledge_documents(knowledge_base_id);
CREATE INDEX idx_document_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_documents_embedding ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);

-- Create function for hybrid search
CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(1536),
    query_text TEXT,
    kb_id_filter UUID,
    match_count INT DEFAULT 10,
    semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    document_title TEXT,
    similarity FLOAT,
    rank_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_results AS (
        SELECT 
            dc.id as chunk_id,
            dc.document_id,
            dc.content,
            kd.title as document_title,
            1 - (dc.embedding <=> query_embedding) as similarity,
            ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) as semantic_rank
        FROM document_chunks dc
        JOIN knowledge_documents kd ON dc.document_id = kd.id
        WHERE kd.knowledge_base_id = kb_id_filter
        ORDER BY dc.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_results AS (
        SELECT 
            dc.id as chunk_id,
            dc.document_id,
            dc.content,
            kd.title as document_title,
            ts_rank_cd(
                to_tsvector('english', dc.content),
                plainto_tsquery('english', query_text)
            ) as keyword_score,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(
                    to_tsvector('english', dc.content),
                    plainto_tsquery('english', query_text)
                ) DESC
            ) as keyword_rank
        FROM document_chunks dc
        JOIN knowledge_documents kd ON dc.document_id = kd.id
        WHERE 
            kd.knowledge_base_id = kb_id_filter
            AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
        ORDER BY keyword_score DESC
        LIMIT match_count * 2
    ),
    combined_results AS (
        SELECT 
            COALESCE(s.chunk_id, k.chunk_id) as chunk_id,
            COALESCE(s.document_id, k.document_id) as document_id,
            COALESCE(s.content, k.content) as content,
            COALESCE(s.document_title, k.document_title) as document_title,
            COALESCE(s.similarity, 0) as similarity,
            (
                semantic_weight * (1.0 / COALESCE(s.semantic_rank, match_count * 2)) +
                (1 - semantic_weight) * (1.0 / COALESCE(k.keyword_rank, match_count * 2))
            ) as rank_score
        FROM semantic_results s
        FULL OUTER JOIN keyword_results k ON s.chunk_id = k.chunk_id
    )
    SELECT 
        chunk_id,
        document_id,
        content,
        document_title,
        similarity,
        rank_score
    FROM combined_results
    ORDER BY rank_score DESC
    LIMIT match_count;
END;
$$;

-- Enable RLS
ALTER TABLE agent_knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

-- Create service role policies for API access
CREATE POLICY "Service role has full access to knowledge bases" ON agent_knowledge_bases
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to documents" ON knowledge_documents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to chunks" ON document_chunks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to categories" ON knowledge_categories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to document categories" ON document_categories
    FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- 2. USER GOALS TABLE (Required for analytics)
-- ========================================

CREATE TABLE IF NOT EXISTS user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Goal details
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    
    -- Tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'achieved', 'abandoned')),
    target_date DATE,
    achieved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Users can manage their own goals
CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON user_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON user_goals
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to goals" ON user_goals
    FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- 3. ANALYTICS TABLES
-- ========================================

-- Conversation insights table
CREATE TABLE IF NOT EXISTS conversation_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL UNIQUE,
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    
    -- Core insights
    summary TEXT,
    topics TEXT[] DEFAULT '{}',
    sentiment JSONB DEFAULT '{}', -- {overall: 0.8, by_segment: [...]}
    
    -- Extracted information
    goals_mentioned JSONB DEFAULT '[]',
    action_items JSONB DEFAULT '[]',
    coaching_areas TEXT[] DEFAULT '{}',
    key_phrases JSONB DEFAULT '[]',
    
    -- Metrics
    duration_seconds INTEGER,
    message_count INTEGER DEFAULT 0,
    tool_calls_count INTEGER DEFAULT 0,
    
    -- Analytics
    engagement_score DECIMAL(3,2), -- 0.00 to 1.00
    clarity_score DECIMAL(3,2),
    progress_indicators JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Goal progress tracking table
CREATE TABLE IF NOT EXISTS goal_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    goal_id UUID NOT NULL REFERENCES user_goals(id),
    
    -- Progress details
    milestone TEXT NOT NULL,
    description TEXT,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Evidence and tracking
    conversation_id TEXT, -- Link to conversation where progress was made
    evidence JSONB DEFAULT '{}', -- Screenshots, links, notes
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'verified')),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(user_id, goal_id, milestone)
);

-- Coaching effectiveness metrics table
CREATE TABLE IF NOT EXISTS coaching_effectiveness (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Engagement metrics
    total_conversations INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    average_conversation_length DECIMAL(5,2),
    conversation_frequency JSONB DEFAULT '{}', -- {daily: [], weekly: []}
    
    -- Goal metrics
    goals_set INTEGER DEFAULT 0,
    goals_completed INTEGER DEFAULT 0,
    goals_in_progress INTEGER DEFAULT 0,
    goal_completion_rate DECIMAL(3,2),
    average_goal_duration_days DECIMAL(5,2),
    
    -- Progress metrics
    milestones_reached INTEGER DEFAULT 0,
    action_items_completed INTEGER DEFAULT 0,
    
    -- Satisfaction metrics
    user_satisfaction_score DECIMAL(3,2), -- 0.00 to 5.00
    recommendation_likelihood INTEGER, -- 0 to 10 (NPS)
    
    -- Coaching areas
    primary_coaching_areas TEXT[] DEFAULT '{}',
    coaching_style_preferences JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(user_id, period_start, period_end)
);

-- User coaching journey table
CREATE TABLE IF NOT EXISTS user_coaching_journey (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Journey stages
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Coaching preferences
    preferred_coaching_style TEXT,
    preferred_session_length INTEGER, -- minutes
    preferred_frequency TEXT, -- daily, weekly, bi-weekly, monthly
    
    -- Progress summary
    total_goals_set INTEGER DEFAULT 0,
    total_goals_achieved INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    
    -- Engagement
    last_conversation_at TIMESTAMP WITH TIME ZONE,
    total_conversation_count INTEGER DEFAULT 0,
    
    -- Personalization
    interests TEXT[] DEFAULT '{}',
    challenges TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_conversation_insights_user_id ON conversation_insights(user_id);
CREATE INDEX idx_conversation_insights_agent_id ON conversation_insights(agent_id);
CREATE INDEX idx_conversation_insights_created_at ON conversation_insights(created_at);
CREATE INDEX idx_goal_progress_user_goal ON goal_progress(user_id, goal_id);
CREATE INDEX idx_goal_progress_status ON goal_progress(status);
CREATE INDEX idx_coaching_effectiveness_user_period ON coaching_effectiveness(user_id, period_start);

-- Create functions for analytics

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    message_count INTEGER,
    duration_seconds INTEGER,
    tool_calls_count INTEGER
)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
    score DECIMAL(3,2);
    message_score DECIMAL(3,2);
    duration_score DECIMAL(3,2);
    tool_score DECIMAL(3,2);
BEGIN
    -- Message engagement (0-0.4)
    message_score := LEAST(message_count::DECIMAL / 20.0, 1.0) * 0.4;
    
    -- Duration engagement (0-0.4)
    duration_score := LEAST(duration_seconds::DECIMAL / 600.0, 1.0) * 0.4;
    
    -- Tool usage engagement (0-0.2)
    tool_score := LEAST(tool_calls_count::DECIMAL / 5.0, 1.0) * 0.2;
    
    score := message_score + duration_score + tool_score;
    
    RETURN ROUND(score, 2);
END;
$$;

-- Function to update user journey
CREATE OR REPLACE FUNCTION update_user_journey()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update or insert user journey record
    INSERT INTO user_coaching_journey (
        user_id,
        last_conversation_at,
        total_conversation_count
    )
    VALUES (
        NEW.user_id,
        NEW.created_at,
        1
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        last_conversation_at = NEW.created_at,
        total_conversation_count = user_coaching_journey.total_conversation_count + 1,
        updated_at = TIMEZONE('utc', NOW());
    
    RETURN NEW;
END;
$$;

-- Create trigger to update journey on new conversations
CREATE TRIGGER update_journey_on_conversation
AFTER INSERT ON conversation_insights
FOR EACH ROW
WHEN (NEW.user_id IS NOT NULL)
EXECUTE FUNCTION update_user_journey();

-- RLS policies
ALTER TABLE conversation_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coaching_journey ENABLE ROW LEVEL SECURITY;

-- Users can view their own analytics
CREATE POLICY "Users can view own conversation insights" ON conversation_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own goal progress" ON goal_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own coaching effectiveness" ON coaching_effectiveness
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own journey" ON user_coaching_journey
    FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to insights" ON conversation_insights
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to progress" ON goal_progress
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to effectiveness" ON coaching_effectiveness
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to journey" ON user_coaching_journey
    FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- 4. DOCUMENT ACCESS ANALYTICS
-- ========================================

-- Track which documents are accessed during searches
CREATE TABLE IF NOT EXISTS document_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_base_id UUID NOT NULL REFERENCES agent_knowledge_bases(id),
    document_id UUID REFERENCES knowledge_documents(id),
    chunk_id UUID REFERENCES document_chunks(id),
    
    -- Search context
    query_text TEXT,
    conversation_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    
    -- Access type
    access_type TEXT DEFAULT 'search' CHECK (access_type IN ('search', 'direct', 'suggestion')),
    relevance_score FLOAT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_document_access_kb ON document_access_logs(knowledge_base_id);
CREATE INDEX idx_document_access_doc ON document_access_logs(document_id);
CREATE INDEX idx_document_access_created ON document_access_logs(created_at);

-- Enable RLS
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

-- Service role access only
CREATE POLICY "Service role can manage access logs" ON document_access_logs
    FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- Success! All tables created
-- ========================================