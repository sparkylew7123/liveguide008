-- Fix function search path security warnings
-- Sets search_path = '' for all functions and ensures schema-qualified references

-- 1. Fix calculate_engagement_score function
CREATE OR REPLACE FUNCTION public.calculate_engagement_score(
    message_count INTEGER,
    duration_seconds INTEGER,
    tool_calls_count INTEGER
)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
SET search_path = ''
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

-- 2. Fix get_agents_by_category function
CREATE OR REPLACE FUNCTION public.get_agents_by_category(category_filter TEXT)
RETURNS TABLE (
    agent_id TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    avatar_url TEXT,
    is_featured BOOLEAN,
    voice_sample_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.agent_id,
        ap.name,
        ap.description,
        ap.category,
        ap.avatar_url,
        ap.is_featured,
        ap.voice_sample_url,
        ap.created_at
    FROM public.agent_personae ap
    WHERE ap.category = category_filter
        AND ap.is_active = true
    ORDER BY ap.is_featured DESC, ap.created_at DESC;
END;
$$;

-- 3. Fix get_onboarding_status function
CREATE OR REPLACE FUNCTION public.get_onboarding_status(user_id_param UUID)
RETURNS TABLE (
    onboarding_completed BOOLEAN,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    preferred_coaching_style TEXT,
    preferred_session_length INTEGER,
    preferred_frequency TEXT,
    interests TEXT[],
    challenges TEXT[],
    strengths TEXT[]
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ucj.onboarding_completed,
        ucj.onboarding_completed_at,
        ucj.preferred_coaching_style,
        ucj.preferred_session_length,
        ucj.preferred_frequency,
        ucj.interests,
        ucj.challenges,
        ucj.strengths
    FROM public.user_coaching_journey ucj
    WHERE ucj.user_id = user_id_param;
END;
$$;

-- 4. Fix hybrid_search function
CREATE OR REPLACE FUNCTION public.hybrid_search(
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
SET search_path = ''
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
        FROM public.knowledge_documents d
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
        FROM public.knowledge_documents d
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

-- 5. Fix search_knowledge_base function
CREATE OR REPLACE FUNCTION public.search_knowledge_base(
    search_query TEXT,
    kb_id_filter UUID DEFAULT NULL,
    limit_results INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    kb_id UUID,
    kb_name TEXT,
    relevance_score FLOAT
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kd.id,
        kd.title,
        kd.content,
        kd.kb_id,
        akb.name AS kb_name,
        ts_rank(kd.search_vector, plainto_tsquery('english', search_query)) AS relevance_score
    FROM public.knowledge_documents kd
    JOIN public.agent_knowledge_bases akb ON kd.kb_id = akb.id
    WHERE kd.search_vector @@ plainto_tsquery('english', search_query)
        AND (kb_id_filter IS NULL OR kd.kb_id = kb_id_filter)
        AND akb.is_active = true
    ORDER BY relevance_score DESC
    LIMIT limit_results;
END;
$$;

-- 6. Fix update_user_journey function (trigger function)
CREATE OR REPLACE FUNCTION public.update_user_journey()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Update or insert user journey record
    INSERT INTO public.user_coaching_journey (
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
        total_conversation_count = public.user_coaching_journey.total_conversation_count + 1,
        updated_at = TIMEZONE('utc', NOW());
    
    RETURN NEW;
END;
$$;

-- Also fix the update_document_access function that was in the knowledge base tables
CREATE OR REPLACE FUNCTION public.update_document_access(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.knowledge_documents
    SET 
        access_count = access_count + 1,
        last_accessed_at = TIMEZONE('utc', NOW())
    WHERE id = doc_id;
END;
$$;