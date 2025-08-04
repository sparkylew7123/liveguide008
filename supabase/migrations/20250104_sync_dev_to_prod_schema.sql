-- Migration to sync dev database schema with production
-- This migration adds missing columns, types, and views that exist in production but not in dev

-- 1. Create the node_status enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_status') THEN
        CREATE TYPE node_status AS ENUM ('draft_verbal', 'curated');
    END IF;
END$$;

-- 2. Add missing columns to graph_nodes table
-- Check and add status column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'graph_nodes' 
                   AND column_name = 'status') THEN
        ALTER TABLE graph_nodes 
        ADD COLUMN status node_status DEFAULT 'draft_verbal';
    END IF;
END$$;

-- Check and add embedding column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'graph_nodes' 
                   AND column_name = 'embedding') THEN
        ALTER TABLE graph_nodes 
        ADD COLUMN embedding vector;
    END IF;
END$$;

-- Check and add embedding_generated_at column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'graph_nodes' 
                   AND column_name = 'embedding_generated_at') THEN
        ALTER TABLE graph_nodes 
        ADD COLUMN embedding_generated_at timestamp with time zone;
    END IF;
END$$;

-- Check and add embedding_status column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'graph_nodes' 
                   AND column_name = 'embedding_status') THEN
        ALTER TABLE graph_nodes 
        ADD COLUMN embedding_status text DEFAULT 'pending';
    END IF;
END$$;

-- 3. Create or replace the graph_monitoring_dashboard view
CREATE OR REPLACE VIEW graph_monitoring_dashboard AS
SELECT 
    u.id AS user_id,
    u.email,
    count(gn.id) AS total_nodes,
    count(gn.embedding) AS nodes_with_embeddings,
    count(*) FILTER (WHERE (gn.embedding_status = 'pending'::text)) AS pending_embeddings,
    count(*) FILTER (WHERE (gn.embedding_status = 'generating'::text)) AS generating_embeddings,
    count(*) FILTER (WHERE (gn.embedding_status = 'failed'::text)) AS failed_embeddings,
    count(ge.id) AS total_edges,
    count(DISTINCT ge.edge_type) AS unique_edge_types,
    round(((count(ge.id))::numeric / (NULLIF(count(gn.id), 0))::numeric), 2) AS avg_edges_per_node,
    max(gn.created_at) AS last_node_created,
    max(ge.created_at) AS last_edge_created,
    count(*) FILTER (WHERE (gn.created_at > (now() - '24:00:00'::interval))) AS nodes_created_today,
    count(*) FILTER (WHERE (ge.created_at > (now() - '24:00:00'::interval))) AS edges_created_today
FROM auth.users u
LEFT JOIN graph_nodes gn ON (u.id = gn.user_id AND gn.deleted_at IS NULL)
LEFT JOIN graph_edges ge ON (u.id = ge.user_id)
GROUP BY u.id, u.email
HAVING count(gn.id) > 0
ORDER BY count(gn.id) DESC;

-- 4. Add all production indexes for performance (if they don't exist)

-- Graph Nodes Indexes
DO $$
BEGIN
    -- Embedding related indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_embedding') THEN
        CREATE INDEX idx_graph_nodes_embedding ON graph_nodes USING ivfflat (embedding vector_cosine_ops) WHERE (deleted_at IS NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_embedding_status') THEN
        CREATE INDEX idx_graph_nodes_embedding_status ON graph_nodes USING btree (embedding_status) WHERE (deleted_at IS NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_embedding_queue') THEN
        CREATE INDEX idx_graph_nodes_embedding_queue ON graph_nodes USING btree (created_at) WHERE ((embedding_status = 'pending'::text) AND (deleted_at IS NULL));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_needs_embedding') THEN
        CREATE INDEX idx_graph_nodes_needs_embedding ON graph_nodes USING btree (id) WHERE ((embedding IS NULL) AND (deleted_at IS NULL));
    END IF;
    
    -- Status and type indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_status_user') THEN
        CREATE INDEX idx_graph_nodes_status_user ON graph_nodes USING btree (user_id, status) WHERE (deleted_at IS NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_type') THEN
        CREATE INDEX idx_graph_nodes_type ON graph_nodes USING btree (node_type) WHERE (deleted_at IS NULL);
    END IF;
    
    -- User and temporal indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_user_id') THEN
        CREATE INDEX idx_graph_nodes_user_id ON graph_nodes USING btree (user_id) WHERE (deleted_at IS NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_created_at') THEN
        CREATE INDEX idx_graph_nodes_created_at ON graph_nodes USING btree (created_at DESC) WHERE (deleted_at IS NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_recent_updates') THEN
        CREATE INDEX idx_graph_nodes_recent_updates ON graph_nodes USING btree (user_id, updated_at DESC) WHERE (deleted_at IS NULL);
    END IF;
    
    -- Properties indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_properties') THEN
        CREATE INDEX idx_graph_nodes_properties ON graph_nodes USING gin (properties) WHERE (deleted_at IS NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_category') THEN
        CREATE INDEX idx_graph_nodes_category ON graph_nodes USING btree (((properties ->> 'category'::text))) WHERE ((deleted_at IS NULL) AND (properties ? 'category'::text));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_priority') THEN
        CREATE INDEX idx_graph_nodes_priority ON graph_nodes USING btree (((properties ->> 'priority'::text))) WHERE ((deleted_at IS NULL) AND (properties ? 'priority'::text));
    END IF;
    
    -- Unique constraint for preventing duplicate goals
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_nodes' AND indexname = 'idx_graph_nodes_unique_user_type_label') THEN
        CREATE UNIQUE INDEX idx_graph_nodes_unique_user_type_label ON graph_nodes USING btree (user_id, node_type, label) WHERE (deleted_at IS NULL);
    END IF;
END$$;

-- Graph Edges Indexes
DO $$
BEGIN
    -- User and type indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_user_id') THEN
        CREATE INDEX idx_graph_edges_user_id ON graph_edges USING btree (user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_type') THEN
        CREATE INDEX idx_graph_edges_type ON graph_edges USING btree (edge_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_user_type') THEN
        CREATE INDEX idx_graph_edges_user_type ON graph_edges USING btree (user_id, edge_type);
    END IF;
    
    -- Source and target indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_source') THEN
        CREATE INDEX idx_graph_edges_source ON graph_edges USING btree (source_node_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_target') THEN
        CREATE INDEX idx_graph_edges_target ON graph_edges USING btree (target_node_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_source_type') THEN
        CREATE INDEX idx_graph_edges_source_type ON graph_edges USING btree (source_node_id, edge_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_target_type') THEN
        CREATE INDEX idx_graph_edges_target_type ON graph_edges USING btree (target_node_id, edge_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_user_source_type') THEN
        CREATE INDEX idx_graph_edges_user_source_type ON graph_edges USING btree (user_id, source_node_id, edge_type);
    END IF;
    
    -- Temporal indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_temporal') THEN
        CREATE INDEX idx_graph_edges_temporal ON graph_edges USING btree (valid_from, valid_to);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_user_temporal') THEN
        CREATE INDEX idx_graph_edges_user_temporal ON graph_edges USING btree (user_id, valid_from DESC, valid_to DESC);
    END IF;
    
    -- Properties index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'graph_edges' AND indexname = 'idx_graph_edges_properties') THEN
        CREATE INDEX idx_graph_edges_properties ON graph_edges USING gin (properties);
    END IF;
END$$;

-- 5. Update any existing nodes that have status in properties to use the new column
-- This migrates data from the properties jsonb to the proper status column
UPDATE graph_nodes
SET status = 
    CASE 
        WHEN properties->>'status' = 'curated' THEN 'curated'::node_status
        WHEN properties->>'status' = 'draft_verbal' THEN 'draft_verbal'::node_status
        ELSE 'draft_verbal'::node_status
    END
WHERE status IS NULL 
  AND properties->>'status' IS NOT NULL;

-- Remove status from properties jsonb after migration
UPDATE graph_nodes
SET properties = properties - 'status'
WHERE properties ? 'status';

-- 6. Grant appropriate permissions
GRANT SELECT ON graph_monitoring_dashboard TO authenticated;
GRANT SELECT ON graph_monitoring_dashboard TO anon;

-- 7. Add RLS policies if needed
-- The view inherits RLS from the underlying tables, but we can add explicit policies if needed

-- 8. Add comment to document the migration
COMMENT ON VIEW graph_monitoring_dashboard IS 'Dashboard view for monitoring graph statistics per user, including node and edge counts, embedding status, and activity metrics';

-- Verification queries (commented out, run manually to verify)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'graph_nodes' ORDER BY ordinal_position;
-- SELECT * FROM graph_monitoring_dashboard LIMIT 5;
-- SELECT count(*) FROM graph_nodes WHERE status IS NOT NULL;