-- Fix RLS policies to handle anonymous users
-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own nodes" ON graph_nodes;
DROP POLICY IF EXISTS "Users can view their own edges" ON graph_edges;

-- Create new SELECT policies that handle anonymous users
CREATE POLICY "Users can view their own nodes" ON graph_nodes
    FOR SELECT USING (
        auth.uid() = user_id 
        OR (auth.uid() IS NULL AND user_id IS NULL)
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can view their own edges" ON graph_edges
    FOR SELECT USING (
        auth.uid() = user_id 
        OR (auth.uid() IS NULL AND user_id IS NULL)
    );

-- Update the helper functions to handle anonymous users
CREATE OR REPLACE FUNCTION get_user_goals_with_progress(p_user_id UUID)
RETURNS TABLE (
    goal_id UUID,
    goal_title TEXT,
    category TEXT,
    target_date DATE,
    priority TEXT,
    session_count BIGINT,
    total_duration_minutes BIGINT,
    accomplishment_count BIGINT,
    latest_session_date TIMESTAMPTZ
) AS $$
BEGIN
    -- Handle NULL user_id for anonymous users
    IF p_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        g.id as goal_id,
        g.label as goal_title,
        g.properties->>'category' as category,
        (g.properties->>'target_date')::date as target_date,
        g.properties->>'priority' as priority,
        COUNT(DISTINCT s.id) as session_count,
        COALESCE(SUM((s.properties->>'duration_minutes')::int), 0) as total_duration_minutes,
        COUNT(DISTINCT a.id) as accomplishment_count,
        MAX(s.created_at) as latest_session_date
    FROM graph_nodes g
    LEFT JOIN graph_edges e_session ON g.id = e_session.target_node_id 
        AND e_session.edge_type = 'works_on'
        AND e_session.user_id = p_user_id
    LEFT JOIN graph_nodes s ON e_session.source_node_id = s.id 
        AND s.node_type = 'session' 
        AND s.deleted_at IS NULL
    LEFT JOIN graph_edges e_accomplishment ON s.id = e_accomplishment.target_node_id 
        AND e_accomplishment.edge_type = 'derived_from'
        AND e_accomplishment.user_id = p_user_id
    LEFT JOIN graph_nodes a ON e_accomplishment.source_node_id = a.id 
        AND a.node_type = 'accomplishment' 
        AND a.deleted_at IS NULL
    WHERE g.user_id = p_user_id 
        AND g.node_type = 'goal' 
        AND g.deleted_at IS NULL
    GROUP BY g.id, g.label, g.properties
    ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;