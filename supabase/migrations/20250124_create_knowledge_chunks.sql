-- Create knowledge_chunks table for storing document chunks with embeddings
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    content text NOT NULL,
    embedding vector(1536), -- For OpenAI text-embedding-3-small
    chunk_index integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON public.knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage knowledge chunks" ON public.knowledge_chunks
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read knowledge chunks" ON public.knowledge_chunks
    FOR SELECT TO authenticated
    USING (true);

-- Function to search for similar chunks using embeddings
CREATE OR REPLACE FUNCTION search_knowledge_chunks(
    query_embedding vector(1536),
    knowledge_base_id_param uuid,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    document_title text,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kc.id as chunk_id,
        kc.document_id,
        kd.title as document_title,
        kc.content,
        1 - (kc.embedding <=> query_embedding) as similarity
    FROM knowledge_chunks kc
    INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE kd.knowledge_base_id = knowledge_base_id_param
        AND 1 - (kc.embedding <=> query_embedding) > match_threshold
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Update trigger for updated_at
CREATE TRIGGER update_knowledge_chunks_updated_at
    BEFORE UPDATE ON public.knowledge_chunks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();