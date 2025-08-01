-- Add unique constraint to prevent duplicate nodes
-- We use a partial unique index because we only want to enforce uniqueness on non-deleted nodes
CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_nodes_unique_user_type_label 
ON graph_nodes(user_id, node_type, label) 
WHERE deleted_at IS NULL;

-- Add comment to explain the constraint
COMMENT ON INDEX idx_graph_nodes_unique_user_type_label IS 'Ensures no duplicate nodes with same user_id, node_type, and label for non-deleted nodes';