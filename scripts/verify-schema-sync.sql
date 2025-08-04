-- Schema verification script
-- Run this after migration to verify dev matches production

-- 1. Check graph_nodes columns
SELECT 
    'graph_nodes columns' as check_type,
    COUNT(*) as column_count,
    string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'graph_nodes'
  AND table_schema = 'public';

-- 2. Check for node_status enum
SELECT 
    'node_status enum' as check_type,
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_status') as exists;

-- 3. Check graph_monitoring_dashboard view
SELECT 
    'graph_monitoring_dashboard' as check_type,
    table_type
FROM information_schema.tables
WHERE table_name = 'graph_monitoring_dashboard'
  AND table_schema = 'public';

-- 4. Count indexes on graph_nodes
SELECT 
    'graph_nodes indexes' as check_type,
    COUNT(*) as index_count
FROM pg_indexes
WHERE tablename = 'graph_nodes'
  AND schemaname = 'public';

-- 5. Count indexes on graph_edges
SELECT 
    'graph_edges indexes' as check_type,
    COUNT(*) as index_count
FROM pg_indexes
WHERE tablename = 'graph_edges'
  AND schemaname = 'public';

-- 6. Check for unique constraint on goals
SELECT 
    'unique goal constraint' as check_type,
    EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'graph_nodes' 
        AND indexname = 'idx_graph_nodes_unique_user_type_label'
    ) as exists;

-- 7. Verify embedding columns
SELECT 
    'embedding columns' as check_type,
    COUNT(*) as embedding_column_count
FROM information_schema.columns
WHERE table_name = 'graph_nodes'
  AND column_name IN ('embedding', 'embedding_generated_at', 'embedding_status');

-- 8. Sample data with new columns
SELECT 
    id,
    node_type,
    label,
    status,
    embedding_status,
    CASE WHEN embedding IS NOT NULL THEN 'has_embedding' ELSE 'no_embedding' END as embedding_present
FROM graph_nodes
LIMIT 5;