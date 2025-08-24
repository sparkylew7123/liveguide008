-- Fix user reset preview functions by creating missing get_user_data_stats function
-- and handling tables that don't have updated_at columns

-- Create the missing get_user_data_stats function
CREATE OR REPLACE FUNCTION public.get_user_data_stats(p_user_id UUID)
RETURNS TABLE(
    category TEXT,
    table_name TEXT,
    record_count INTEGER,
    oldest_record TIMESTAMPTZ,
    newest_record TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_count INTEGER;
    v_oldest TIMESTAMPTZ;
    v_newest TIMESTAMPTZ;
BEGIN
    -- Agent-related data (no updated_at columns, use created_at where available)
    SELECT COUNT(*), MIN(created_at), MAX(created_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.agent_handoffs 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Agent Data'::TEXT, 'agent_handoffs'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(created_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.agent_interaction_logs 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Agent Data'::TEXT, 'agent_interaction_logs'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(created_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.agent_matching_history 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Agent Data'::TEXT, 'agent_matching_history'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(created_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.agent_video_interactions 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Agent Data'::TEXT, 'agent_video_interactions'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    -- Graph data (has updated_at columns)
    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.graph_nodes 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Graph Data'::TEXT, 'graph_nodes'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.graph_edges 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Graph Data'::TEXT, 'graph_edges'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(created_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.graph_events 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Graph Data'::TEXT, 'graph_events'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    -- Goals and progress (has updated_at columns)
    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.user_goals 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Goals & Progress'::TEXT, 'user_goals'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(created_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.goal_progress 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Goals & Progress'::TEXT, 'goal_progress'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    -- Conversations (has updated_at columns)
    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.elevenlabs_conversations 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Conversations'::TEXT, 'elevenlabs_conversations'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.conversation_insights 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Conversations'::TEXT, 'conversation_insights'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.voice_chat_events 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Conversations'::TEXT, 'voice_chat_events'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    -- Interaction and coaching data
    SELECT COUNT(*), MIN(created_at), MAX(created_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.interaction_events 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Interactions'::TEXT, 'interaction_events'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.user_coaching_journey 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Coaching'::TEXT, 'user_coaching_journey'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.user_questionnaire 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Coaching'::TEXT, 'user_questionnaire'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    -- Messages and communication (has updated_at for some)
    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.inbox_messages 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Messages'::TEXT, 'inbox_messages'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    SELECT COUNT(*), MIN(created_at), MAX(created_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.message_read_receipts 
    WHERE user_id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Messages'::TEXT, 'message_read_receipts'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    -- Profile and account data (has updated_at)
    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.profiles 
    WHERE id = p_user_id;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Account'::TEXT, 'profiles'::TEXT, v_count, v_oldest, v_newest;
    END IF;

    -- Check subscriptions table (handle TEXT user_id type)
    SELECT COUNT(*), MIN(created_at), MAX(updated_at) 
    INTO v_count, v_oldest, v_newest
    FROM public.subscriptions 
    WHERE user_id = p_user_id::TEXT;
    
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Account'::TEXT, 'subscriptions'::TEXT, v_count, v_oldest, v_newest;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        -- Return error information if something goes wrong
        RETURN QUERY SELECT 
            'Error'::TEXT, 
            'get_user_data_stats'::TEXT, 
            0::INTEGER, 
            NULL::TIMESTAMPTZ, 
            NULL::TIMESTAMPTZ;
END;
$$;

-- Fix the check_reset_safety function to handle tables without updated_at columns
CREATE OR REPLACE FUNCTION public.check_reset_safety(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    check_name TEXT,
    is_safe BOOLEAN,
    warning_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    target_user_id UUID;
    active_conversations INTEGER;
    recent_activity TIMESTAMPTZ;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.uid());
    
    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT 
            'Authentication'::TEXT,
            FALSE::BOOLEAN,
            'User authentication required'::TEXT;
        RETURN;
    END IF;

    -- Check for active conversations
    SELECT COUNT(*) INTO active_conversations
    FROM public.elevenlabs_conversations 
    WHERE user_id = target_user_id 
        AND status = 'active'
        AND updated_at > NOW() - INTERVAL '1 hour';

    RETURN QUERY SELECT 
        'Active Conversations'::TEXT,
        (active_conversations = 0)::BOOLEAN,
        CASE 
            WHEN active_conversations > 0 
            THEN 'User has ' || active_conversations || ' active conversations. Consider waiting or ending them first.'
            ELSE 'No active conversations detected'
        END;

    -- Check for very recent activity (only use tables that have updated_at columns)
    SELECT GREATEST(
        COALESCE((SELECT MAX(updated_at) FROM public.graph_nodes WHERE user_id = target_user_id), '1970-01-01'::TIMESTAMPTZ),
        COALESCE((SELECT MAX(updated_at) FROM public.elevenlabs_conversations WHERE user_id = target_user_id), '1970-01-01'::TIMESTAMPTZ),
        COALESCE((SELECT MAX(updated_at) FROM public.conversation_insights WHERE user_id = target_user_id), '1970-01-01'::TIMESTAMPTZ),
        COALESCE((SELECT MAX(updated_at) FROM public.voice_chat_events WHERE user_id = target_user_id), '1970-01-01'::TIMESTAMPTZ),
        COALESCE((SELECT MAX(created_at) FROM public.interaction_events WHERE user_id = target_user_id), '1970-01-01'::TIMESTAMPTZ)
    ) INTO recent_activity;

    RETURN QUERY SELECT 
        'Recent Activity'::TEXT,
        (recent_activity IS NULL OR recent_activity = '1970-01-01'::TIMESTAMPTZ OR recent_activity < NOW() - INTERVAL '10 minutes')::BOOLEAN,
        CASE 
            WHEN recent_activity > NOW() - INTERVAL '10 minutes' AND recent_activity != '1970-01-01'::TIMESTAMPTZ
            THEN 'User has very recent activity (' || recent_activity || '). Consider waiting a few minutes.'
            ELSE 'No recent activity detected'
        END;

    -- Check for profile completeness (might indicate new user)
    RETURN QUERY SELECT 
        'Profile Status'::TEXT,
        TRUE::BOOLEAN, -- Always safe from profile perspective
        'Profile reset will remove: username, preferences, and account settings'::TEXT;

END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_user_data_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_reset_safety(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_user_data_stats(UUID) IS 'Returns statistics about user data across all tables for reset preview functionality. Handles tables with and without updated_at columns appropriately.';
COMMENT ON FUNCTION public.check_reset_safety(UUID) IS 'Performs safety checks before allowing user data reset. Fixed to handle tables without updated_at columns.';