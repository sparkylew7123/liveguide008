-- Combined security fixes for Supabase advisories
-- Run this migration on production to address all security warnings
-- Date: 2025-01-22

-- ============================================
-- PART 1: Fix Function Search Path Issues
-- ============================================

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

-- 2. Fix get_agents_by_category function (if exists)
-- First check if function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_agents_by_category'
    ) THEN
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
        AS $func$
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
        $func$;
    END IF;
END $$;

-- 3. Fix get_onboarding_status function (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_onboarding_status'
    ) THEN
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
        AS $func$
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
        $func$;
    END IF;
END $$;

-- 4. Fix hybrid_search function (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'hybrid_search'
    ) THEN
        -- Drop existing function first
        DROP FUNCTION IF EXISTS public.hybrid_search(vector(1536), TEXT, UUID, INT, FLOAT);
        DROP FUNCTION IF EXISTS public.hybrid_search(extensions.vector(1536), TEXT, UUID, INT, FLOAT);
        
        -- Check if vector extension is in extensions schema
        IF EXISTS (
            SELECT 1 FROM pg_extension e
            JOIN pg_namespace n ON e.extnamespace = n.oid
            WHERE e.extname = 'vector' AND n.nspname = 'extensions'
        ) THEN
            -- Create with extensions.vector type
            CREATE OR REPLACE FUNCTION public.hybrid_search(
                query_embedding extensions.vector(1536),
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
            AS $func$
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
            $func$;
        ELSE
            -- Create with regular vector type
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
            AS $func$
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
            $func$;
        END IF;
    END IF;
END $$;

-- 5. Fix search_knowledge_base function (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'search_knowledge_base'
    ) THEN
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
        AS $func$
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
        $func$;
    END IF;
END $$;

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

-- 7. Fix update_document_access function (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'update_document_access'
    ) THEN
        CREATE OR REPLACE FUNCTION public.update_document_access(doc_id UUID)
        RETURNS void
        LANGUAGE plpgsql
        SET search_path = ''
        AS $func$
        BEGIN
            UPDATE public.knowledge_documents
            SET 
                access_count = access_count + 1,
                last_accessed_at = TIMEZONE('utc', NOW())
            WHERE id = doc_id;
        END;
        $func$;
    END IF;
END $$;

-- ============================================
-- PART 2: Move Vector Extension (Optional)
-- ============================================
-- Note: Moving the vector extension requires careful coordination
-- as it involves dropping and recreating columns. This part is
-- commented out by default. Uncomment if you want to move the
-- extension to a dedicated schema.

/*
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- The actual migration of vector extension would require:
-- 1. Backing up data from vector columns
-- 2. Dropping the columns
-- 3. Dropping and recreating the extension
-- 4. Recreating the columns with new type
-- 5. Restoring the data
-- This is a complex operation that should be done during a maintenance window
*/

-- ============================================
-- PART 3: Document Security Decisions
-- ============================================

-- Add comments to document intentional public access policies
COMMENT ON POLICY "Allow public read access to agent personae" ON public.agent_personae 
IS 'Intentional public access - users need to see available AI coaches before authentication';

COMMENT ON POLICY "Allow public read access to goal categories" ON public.goal_categories 
IS 'Intentional public access - goal categories need to be visible for onboarding flow';

-- Add comment about service role policies
COMMENT ON SCHEMA public IS 'Main application schema. Service role policies are intentional for API operations.';

-- ============================================
-- Summary of Changes
-- ============================================
-- 1. Fixed all 6 functions with search_path = '' security setting
-- 2. All table references in functions are now schema-qualified
-- 3. Documented intentional public access policies
-- 4. Vector extension migration is optional (commented out)
-- 
-- After running this migration, all function_search_path_mutable 
-- warnings should be resolved in the Supabase security advisors.