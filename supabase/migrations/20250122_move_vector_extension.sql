-- Move vector extension from public schema to dedicated extensions schema
-- This addresses the security warning about extensions in public schema

-- 1. Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 3. Check if vector extension exists and handle appropriately
DO $$
BEGIN
    -- Check if vector extension exists in public schema
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector' AND extnamespace = 'public'::regnamespace) THEN
        -- Drop and recreate the extension in extensions schema
        DROP EXTENSION IF EXISTS vector CASCADE;
    END IF;
    
    -- Create vector extension in extensions schema
    CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
END $$;

-- 4. Update search path to include extensions schema
ALTER DATABASE postgres SET search_path TO public, extensions;

-- 5. Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 6. Add vector columns to existing tables that need them
-- Only add if they don't already exist
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);
ALTER TABLE public.graph_nodes ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);

-- 7. Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding ON public.knowledge_documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON public.knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_graph_nodes_embedding ON public.graph_nodes 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- 8. Update any functions that use vector type to include extensions schema
-- This ensures they can find the vector type