-- Fix the track_emotion function to properly handle edge creation
CREATE OR REPLACE FUNCTION track_emotion(
    p_user_id UUID,
    p_emotion emotion_type,
    p_intensity FLOAT DEFAULT 0.5,
    p_context TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_node_id UUID;
BEGIN
    -- Create emotion node
    INSERT INTO graph_nodes (user_id, node_type, label, properties)
    VALUES (
        p_user_id,
        'emotion',
        p_emotion::text,
        jsonb_build_object(
            'intensity', p_intensity,
            'context', p_context,
            'timestamp', now()
        )
    )
    RETURNING id INTO v_node_id;
    
    -- Note: We're not creating an edge here because emotions are standalone nodes
    -- They represent a state at a point in time, not a relationship
    -- If we want to link emotions to sessions or goals later, we can create edges then
    
    RETURN v_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION track_emotion(UUID, emotion_type, FLOAT, TEXT) TO authenticated;