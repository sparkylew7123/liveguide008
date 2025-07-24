-- Fix remaining search_knowledge_base function search_path issue
-- This function might have been created/modified after our initial migration

-- First, let's check what signatures exist for this function
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    -- Count how many search_knowledge_base functions exist
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'search_knowledge_base';
    
    RAISE NOTICE 'Found % search_knowledge_base function(s)', func_count;
END $$;

-- Drop all possible variations of the function
DROP FUNCTION IF EXISTS public.search_knowledge_base(TEXT);
DROP FUNCTION IF EXISTS public.search_knowledge_base(TEXT, UUID);
DROP FUNCTION IF EXISTS public.search_knowledge_base(TEXT, UUID, INT);
DROP FUNCTION IF EXISTS public.search_knowledge_base(TEXT, UUID, INT, INT);

-- Recreate the function with proper search_path setting
CREATE FUNCTION public.search_knowledge_base(
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
    -- Check if the required tables exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'knowledge_documents') THEN
        RAISE NOTICE 'Table public.knowledge_documents does not exist';
        RETURN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_knowledge_bases') THEN
        RAISE NOTICE 'Table public.agent_knowledge_bases does not exist';
        RETURN;
    END IF;

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

-- Verify the function was created with search_path
DO $$
DECLARE
    has_search_path BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'search_knowledge_base'
        AND p.proconfig @> ARRAY['search_path=']
    ) INTO has_search_path;
    
    IF has_search_path THEN
        RAISE NOTICE 'SUCCESS: search_knowledge_base function now has search_path set';
    ELSE
        RAISE WARNING 'FAILED: search_knowledge_base function still missing search_path';
    END IF;
END $$;