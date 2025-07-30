-- Move vector extension from public schema to dedicated extensions schema
-- This addresses the security warning about extensions in public schema

-- 1. Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 3. Move vector extension to extensions schema
-- Note: We need to drop and recreate as Postgres doesn't support ALTER EXTENSION ... SET SCHEMA for vector
-- First, we need to drop dependent objects and recreate them

-- Save the current search_path
DO $$
DECLARE
    current_path TEXT;
BEGIN
    SHOW search_path INTO current_path;
    
    -- Temporarily set search_path to include extensions
    SET search_path TO public, extensions;
    
    -- Drop dependent objects (columns using vector type)
    -- We'll need to recreate these after moving the extension
    
    -- Drop indexes that use vector type
    DROP INDEX IF EXISTS idx_knowledge_documents_embedding;
    DROP INDEX IF EXISTS idx_document_chunks_embedding;
    
    -- Temporarily change vector columns to a placeholder type
    -- Store the table information for recreation
    CREATE TEMP TABLE vector_columns_backup AS
    SELECT 
        n.nspname AS schema_name,
        c.relname AS table_name,
        a.attname AS column_name,
        a.atttypmod AS type_modifier
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_type t ON a.atttypid = t.oid
    WHERE t.typname = 'vector'
    AND a.attnum > 0
    AND NOT a.attisdropped;
    
    -- Drop vector columns
    IF EXISTS (SELECT 1 FROM vector_columns_backup WHERE schema_name = 'public' AND table_name = 'knowledge_documents' AND column_name = 'embedding') THEN
        ALTER TABLE public.knowledge_documents DROP COLUMN IF EXISTS embedding CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM vector_columns_backup WHERE schema_name = 'public' AND table_name = 'document_chunks' AND column_name = 'embedding') THEN
        ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS embedding CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM vector_columns_backup WHERE schema_name = 'public' AND table_name = 'conversation_contexts' AND column_name = 'query_embedding') THEN
        ALTER TABLE public.conversation_contexts DROP COLUMN IF EXISTS query_embedding CASCADE;
    END IF;
END $$;

-- Drop the extension from public schema
DROP EXTENSION IF EXISTS vector CASCADE;

-- Create the extension in extensions schema
CREATE EXTENSION vector SCHEMA extensions;

-- Update search_path for the database to include extensions
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Now recreate the vector columns with the new schema
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);
ALTER TABLE public.conversation_contexts ADD COLUMN IF NOT EXISTS query_embedding extensions.vector(1536);

-- Recreate the indexes
CREATE INDEX idx_knowledge_documents_embedding ON public.knowledge_documents 
    USING ivfflat (embedding extensions.vector_cosine_ops);
    
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks 
    USING ivfflat (embedding extensions.vector_cosine_ops);

-- Update functions to use the new vector type location
-- The functions already use schema-qualified names from the previous migration
-- But we need to update the parameter and return types

-- Update hybrid_search function with new vector type
DROP FUNCTION IF EXISTS public.hybrid_search(extensions.vector(1536), TEXT, UUID, INT, FLOAT);
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

-- Add comment to document the change
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions to improve security';
COMMENT ON EXTENSION vector IS 'vector data type and ivfflat access method';