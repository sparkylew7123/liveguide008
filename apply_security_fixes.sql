-- Combined security fixes for Supabase

-- First, let's check and fix function search paths
DO $$
BEGIN
    -- Only proceed if functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_engagement_score') THEN
        EXECUTE 'ALTER FUNCTION public.calculate_engagement_score(UUID) SET search_path = public, pg_catalog, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_agents_by_category') THEN
        EXECUTE 'ALTER FUNCTION public.get_agents_by_category(TEXT) SET search_path = public, pg_catalog, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_onboarding_status') THEN
        EXECUTE 'ALTER FUNCTION public.get_onboarding_status(UUID) SET search_path = public, pg_catalog, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_user_update') THEN
        EXECUTE 'ALTER FUNCTION public.handle_user_update() SET search_path = public, pg_catalog, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'hybrid_search') THEN
        EXECUTE 'ALTER FUNCTION public.hybrid_search(TEXT, vector(1536), INT, FLOAT, FLOAT, INT) SET search_path = public, extensions, pg_catalog, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_knowledge_base') THEN
        EXECUTE 'ALTER FUNCTION public.search_knowledge_base(TEXT, UUID, INT) SET search_path = public, pg_catalog, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_journey') THEN
        EXECUTE 'ALTER FUNCTION public.update_user_journey(UUID, TEXT, JSONB) SET search_path = public, pg_catalog, pg_temp';
    END IF;
END $$;

-- Move vector extension (if it exists in public schema)
DO $$
BEGIN
    -- Check if vector extension exists in public schema
    IF EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'vector' 
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        -- Create extensions schema if it doesn't exist
        CREATE SCHEMA IF NOT EXISTS extensions;
        
        -- Grant usage on extensions schema
        GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
        
        -- Note: Moving extension requires DROP and CREATE which might affect existing data
        -- For production, this should be done with careful planning
        RAISE NOTICE 'Vector extension found in public schema. Manual migration recommended.';
    END IF;
END $$;

-- Update RLS policies to restrict anonymous access
DO $$
BEGIN
    -- Update policies for each table
    
    -- auth.users
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND schemaname = 'auth' AND policyname = 'Users can view own data') THEN
        DROP POLICY "Users can view own data" ON auth.users;
        CREATE POLICY "Users can view own data" ON auth.users
            FOR SELECT
            TO authenticated
            USING (id = auth.uid());
    END IF;
    
    -- public.agent_personae
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_personae' AND policyname = 'Allow public read access to agent personae') THEN
        DROP POLICY "Allow public read access to agent personae" ON public.agent_personae;
        CREATE POLICY "Allow authenticated read access to agent personae" ON public.agent_personae
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    -- Continue with other tables...
    -- (Adding just a few examples here, the full migration would include all tables)
    
END $$;

-- Note: OTP expiry and leaked password protection must be configured through Supabase Dashboard