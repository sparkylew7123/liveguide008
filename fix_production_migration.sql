        -- Safe Production Migration Script
        -- This script checks for existing objects before creating them

        -- Enable required extensions
        CREATE EXTENSION IF NOT EXISTS vector;

        -- Check and create agent_knowledge_bases table
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'agent_knowledge_bases') THEN
                CREATE TABLE agent_knowledge_bases (
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
            END IF;
        END $$;

        -- Check and create knowledge_documents table
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'knowledge_documents') THEN
                CREATE TABLE knowledge_documents (
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
            END IF;
        END $$;

        -- Check and create document_chunks table
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'document_chunks') THEN
                CREATE TABLE document_chunks (
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
            END IF;
        END $$;

        -- Check and create knowledge_categories table
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'knowledge_categories') THEN
                CREATE TABLE knowledge_categories (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    knowledge_base_id UUID NOT NULL REFERENCES agent_knowledge_bases(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    description TEXT,
                    parent_category_id UUID REFERENCES knowledge_categories(id),
                    
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
                    
                    UNIQUE(knowledge_base_id, name)
                );
            END IF;
        END $$;

        -- Check and create document_categories table
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'document_categories') THEN
                CREATE TABLE document_categories (
                    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
                    category_id UUID NOT NULL REFERENCES knowledge_categories(id) ON DELETE CASCADE,
                    
                    PRIMARY KEY (document_id, category_id)
                );
            END IF;
        END $$;

        -- Create indexes (check if they exist first)
        DO $$ 
        BEGIN
            -- Index for knowledge_documents.knowledge_base_id
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                        WHERE schemaname = 'public' 
                        AND indexname = 'idx_knowledge_documents_kb_id') THEN
                CREATE INDEX idx_knowledge_documents_kb_id ON knowledge_documents(knowledge_base_id);
            END IF;
            
            -- Index for document_chunks.document_id
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                        WHERE schemaname = 'public' 
                        AND indexname = 'idx_document_chunks_doc_id') THEN
                CREATE INDEX idx_document_chunks_doc_id ON document_chunks(document_id);
            END IF;
            
            -- Vector index for document_chunks
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                        WHERE schemaname = 'public' 
                        AND indexname = 'idx_document_chunks_embedding') THEN
                CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
            END IF;
            
            -- Vector index for knowledge_documents
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                        WHERE schemaname = 'public' 
                        AND indexname = 'idx_knowledge_documents_embedding') THEN
                CREATE INDEX idx_knowledge_documents_embedding ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);
            END IF;
        END $$;

        -- Enable RLS on all tables
        ALTER TABLE agent_knowledge_bases ENABLE ROW LEVEL SECURITY;
        ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE knowledge_categories ENABLE ROW LEVEL SECURITY;
        ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist and recreate
        DO $$ 
        BEGIN
            -- Drop existing policies
            DROP POLICY IF EXISTS "Service role has full access to knowledge bases" ON agent_knowledge_bases;
            DROP POLICY IF EXISTS "Service role has full access to documents" ON knowledge_documents;
            DROP POLICY IF EXISTS "Service role has full access to chunks" ON document_chunks;
            DROP POLICY IF EXISTS "Service role has full access to categories" ON knowledge_categories;
            DROP POLICY IF EXISTS "Service role has full access to document categories" ON document_categories;
            
            -- Create service role policies
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
        END $$;

        -- Check if Maya's knowledge base exists, create if not
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM agent_knowledge_bases 
                        WHERE agent_id = 'SuIlXQ4S6dyjrNViOrQ8') THEN
                INSERT INTO agent_knowledge_bases (
                    agent_id, 
                    name, 
                    description,
                    document_count,
                    total_chunks,
                    indexing_status
                )
                VALUES (
                    'SuIlXQ4S6dyjrNViOrQ8',
                    'Maya Coaching Knowledge Base',
                    'Knowledge base for Maya AI coach',
                    0,
                    0,
                    'pending'
                );
            END IF;
        END $$;

        -- Create hybrid search function if it doesn't exist
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

        -- Success message
        DO $$
        BEGIN
            RAISE NOTICE 'Migration completed successfully!';
        END $$;