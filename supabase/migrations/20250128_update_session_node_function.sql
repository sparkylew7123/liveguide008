-- Update the create_session_node function to accept summary in properties
CREATE OR REPLACE FUNCTION create_session_node(
    p_user_id UUID,
    p_goal_id UUID,
    p_duration INTEGER,
    p_summary TEXT,
    p_properties JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_node_id UUID;
BEGIN
    -- Create the session node with summary as description
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'session'::node_type,
        'Coaching Session - ' || TO_CHAR(NOW(), 'YYYY-MM-DD'),
        p_summary,
        p_properties || jsonb_build_object(
            'duration_minutes', p_duration,
            'completed', true,
            'created_at', NOW()
        )
    )
    RETURNING id INTO v_node_id;
    
    -- Create edge from session to goal
    INSERT INTO graph_edges (user_id, edge_type, source_node_id, target_node_id)
    VALUES (p_user_id, 'works_on'::edge_type, v_node_id, p_goal_id);
    
    RETURN v_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_session_node(UUID, UUID, INTEGER, TEXT, JSONB) TO authenticated;