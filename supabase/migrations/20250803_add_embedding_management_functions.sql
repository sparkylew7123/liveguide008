-- Migration: Add embedding management functions
-- Description: Add functions to manage embedding generation queue and status tracking

-- Function to mark nodes for embedding update
CREATE OR REPLACE FUNCTION mark_nodes_for_embedding_update(
    p_user_id UUID DEFAULT NULL,
    p_node_ids UUID[] DEFAULT NULL,
    p_node_types TEXT[] DEFAULT NULL,
    p_force_update BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    marked_count INTEGER,
    node_ids UUID[]
) AS $$
DECLARE
    v_marked_count INTEGER;
    v_node_ids UUID[];
BEGIN
    -- Build the UPDATE query dynamically based on parameters
    IF p_node_ids IS NOT NULL THEN
        -- Mark specific nodes
        UPDATE graph_nodes
        SET embedding = NULL,
            updated_at = now()
        WHERE id = ANY(p_node_ids)
          AND (p_user_id IS NULL OR user_id = p_user_id)
          AND deleted_at IS NULL
          AND (p_force_update OR embedding IS NOT NULL);
    ELSIF p_node_types IS NOT NULL THEN
        -- Mark nodes by type
        UPDATE graph_nodes
        SET embedding = NULL,
            updated_at = now()
        WHERE node_type::TEXT = ANY(p_node_types)
          AND (p_user_id IS NULL OR user_id = p_user_id)
          AND deleted_at IS NULL
          AND (p_force_update OR embedding IS NOT NULL);
    ELSIF p_user_id IS NOT NULL THEN
        -- Mark all nodes for a specific user
        UPDATE graph_nodes
        SET embedding = NULL,
            updated_at = now()
        WHERE user_id = p_user_id
          AND deleted_at IS NULL
          AND (p_force_update OR embedding IS NOT NULL);
    ELSE
        -- Mark all nodes (admin operation)
        UPDATE graph_nodes
        SET embedding = NULL,
            updated_at = now()
        WHERE deleted_at IS NULL
          AND (p_force_update OR embedding IS NOT NULL);
    END IF;

    GET DIAGNOSTICS v_marked_count = ROW_COUNT;
    
    -- Get the IDs of marked nodes for return
    IF p_node_ids IS NOT NULL THEN
        SELECT array_agg(id) INTO v_node_ids
        FROM graph_nodes
        WHERE id = ANY(p_node_ids)
          AND (p_user_id IS NULL OR user_id = p_user_id)
          AND deleted_at IS NULL
          AND embedding IS NULL;
    ELSE
        -- For bulk operations, return a sample of node IDs
        SELECT array_agg(id) INTO v_node_ids
        FROM (
            SELECT id 
            FROM graph_nodes
            WHERE (p_user_id IS NULL OR user_id = p_user_id)
              AND (p_node_types IS NULL OR node_type::TEXT = ANY(p_node_types))
              AND deleted_at IS NULL
              AND embedding IS NULL
            ORDER BY updated_at DESC
            LIMIT 10
        ) sample_nodes;
    END IF;

    RETURN QUERY SELECT v_marked_count, COALESCE(v_node_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get embedding queue statistics
CREATE OR REPLACE FUNCTION get_embedding_queue_stats(
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_nodes BIGINT,
    nodes_with_embeddings BIGINT,
    nodes_without_embeddings BIGINT,
    nodes_with_errors BIGINT,
    oldest_pending_node TIMESTAMPTZ,
    by_node_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH base_stats AS (
        SELECT 
            COUNT(*) as total_nodes,
            COUNT(embedding) as nodes_with_embeddings,
            COUNT(*) - COUNT(embedding) as nodes_without_embeddings,
            COUNT(*) FILTER (WHERE properties ? 'embedding_error') as nodes_with_errors,
            MIN(created_at) FILTER (WHERE embedding IS NULL) as oldest_pending_node
        FROM graph_nodes
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
          AND deleted_at IS NULL
    ),
    type_stats AS (
        SELECT 
            jsonb_object_agg(
                node_type::TEXT,
                jsonb_build_object(
                    'total', type_counts.total,
                    'with_embeddings', type_counts.with_embeddings,
                    'without_embeddings', type_counts.without_embeddings
                )
            ) as by_node_type
        FROM (
            SELECT 
                node_type,
                COUNT(*) as total,
                COUNT(embedding) as with_embeddings,
                COUNT(*) - COUNT(embedding) as without_embeddings
            FROM graph_nodes
            WHERE (p_user_id IS NULL OR user_id = p_user_id)
              AND deleted_at IS NULL
            GROUP BY node_type
        ) type_counts
    )
    SELECT 
        bs.total_nodes,
        bs.nodes_with_embeddings,
        bs.nodes_without_embeddings,
        bs.nodes_with_errors,
        bs.oldest_pending_node,
        ts.by_node_type
    FROM base_stats bs
    CROSS JOIN type_stats ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nodes that need embeddings (for queue processing)
CREATE OR REPLACE FUNCTION get_nodes_needing_embeddings(
    p_limit INTEGER DEFAULT 100,
    p_user_id UUID DEFAULT NULL,
    p_exclude_error_nodes BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    node_type TEXT,
    label TEXT,
    description TEXT,
    properties JSONB,
    created_at TIMESTAMPTZ,
    days_pending INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.user_id,
        n.node_type::TEXT,
        n.label,
        n.description,
        n.properties,
        n.created_at,
        EXTRACT(days FROM (now() - n.created_at))::INTEGER as days_pending
    FROM graph_nodes n
    WHERE n.deleted_at IS NULL
      AND n.embedding IS NULL
      AND (p_user_id IS NULL OR n.user_id = p_user_id)
      AND (NOT p_exclude_error_nodes OR NOT (n.properties ? 'embedding_error'))
    ORDER BY n.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear embedding errors (for retry)
CREATE OR REPLACE FUNCTION clear_embedding_errors(
    p_user_id UUID DEFAULT NULL,
    p_node_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_cleared_count INTEGER;
BEGIN
    UPDATE graph_nodes
    SET properties = properties - 'embedding_error' - 'embedding_error_at',
        updated_at = now()
    WHERE (p_node_ids IS NULL OR id = ANY(p_node_ids))
      AND (p_user_id IS NULL OR user_id = p_user_id)
      AND deleted_at IS NULL
      AND properties ? 'embedding_error';
    
    GET DIAGNOSTICS v_cleared_count = ROW_COUNT;
    RETURN v_cleared_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate node embeddings
CREATE OR REPLACE FUNCTION validate_node_embeddings(
    p_user_id UUID DEFAULT NULL,
    p_check_dimensions BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    total_checked BIGINT,
    valid_embeddings BIGINT,
    invalid_embeddings BIGINT,
    issues JSONB
) AS $$
DECLARE
    v_total_checked BIGINT;
    v_valid_embeddings BIGINT;
    v_invalid_embeddings BIGINT;
    v_issues JSONB := '[]'::JSONB;
BEGIN
    -- Count total embeddings to check
    SELECT COUNT(*) INTO v_total_checked
    FROM graph_nodes
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND deleted_at IS NULL
      AND embedding IS NOT NULL;

    -- Count valid embeddings (assuming 1536 dimensions for text-embedding-3-small)
    IF p_check_dimensions THEN
        SELECT COUNT(*) INTO v_valid_embeddings
        FROM graph_nodes
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
          AND deleted_at IS NULL
          AND embedding IS NOT NULL
          AND array_length(embedding::FLOAT[], 1) = 1536;
    ELSE
        SELECT COUNT(*) INTO v_valid_embeddings
        FROM graph_nodes
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
          AND deleted_at IS NULL
          AND embedding IS NOT NULL;
    END IF;

    v_invalid_embeddings := v_total_checked - v_valid_embeddings;

    -- Collect issues
    IF p_check_dimensions AND v_invalid_embeddings > 0 THEN
        v_issues := jsonb_build_array(
            jsonb_build_object(
                'issue', 'wrong_dimensions',
                'description', 'Embeddings with incorrect dimensions (expected 1536)',
                'count', v_invalid_embeddings
            )
        );
    END IF;

    RETURN QUERY SELECT v_total_checked, v_valid_embeddings, v_invalid_embeddings, v_issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION mark_nodes_for_embedding_update TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_queue_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_nodes_needing_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION clear_embedding_errors TO authenticated;
GRANT EXECUTE ON FUNCTION validate_node_embeddings TO authenticated;

-- Grant service role permissions for queue processing
GRANT EXECUTE ON FUNCTION mark_nodes_for_embedding_update TO service_role;
GRANT EXECUTE ON FUNCTION get_embedding_queue_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_nodes_needing_embeddings TO service_role;
GRANT EXECUTE ON FUNCTION clear_embedding_errors TO service_role;
GRANT EXECUTE ON FUNCTION validate_node_embeddings TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION mark_nodes_for_embedding_update IS 'Marks nodes for embedding regeneration by clearing their embedding column';
COMMENT ON FUNCTION get_embedding_queue_stats IS 'Returns statistics about the embedding generation queue';
COMMENT ON FUNCTION get_nodes_needing_embeddings IS 'Returns nodes that need embeddings generated, ordered by creation date';
COMMENT ON FUNCTION clear_embedding_errors IS 'Clears embedding error flags from nodes to allow retry';
COMMENT ON FUNCTION validate_node_embeddings IS 'Validates existing embeddings for correct format and dimensions';