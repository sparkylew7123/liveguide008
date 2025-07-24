-- Security fixes for Supabase warnings

-- Fix function search paths for functions that exist
DO $$
DECLARE
    func_count INTEGER := 0;
BEGIN
    -- Check and fix each function if it exists
    
    -- handle_new_user
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
               WHERE n.nspname = 'public' AND p.proname = 'handle_new_user') THEN
        EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog, pg_temp';
        func_count := func_count + 1;
    END IF;
    
    -- handle_user_update
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
               WHERE n.nspname = 'public' AND p.proname = 'handle_user_update') THEN
        EXECUTE 'ALTER FUNCTION public.handle_user_update() SET search_path = public, pg_catalog, pg_temp';
        func_count := func_count + 1;
    END IF;
    
    -- update_updated_at_column
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
               WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
        EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog, pg_temp';
        func_count := func_count + 1;
    END IF;
    
    -- For functions with parameters, we need to check more carefully
    -- Check if any of the other functions exist
    PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname IN (
        'calculate_engagement_score',
        'get_agents_by_category',
        'get_onboarding_status',
        'hybrid_search',
        'search_knowledge_base',
        'update_user_journey'
    );
    
    IF FOUND THEN
        RAISE NOTICE 'Some functions may need manual search_path updates. Check pg_proc for exact signatures.';
    END IF;
    
    RAISE NOTICE 'Updated search_path for % function(s)', func_count;
END $$;

-- Note: Additional security fixes that need to be addressed:
-- 1. Vector extension should be moved from public schema to extensions schema
-- 2. RLS policies should be updated to restrict anonymous access
-- 3. OTP expiry should be set to <= 3600 seconds (configure in Supabase Dashboard)
-- 4. Leaked password protection should be enabled (configure in Supabase Dashboard)