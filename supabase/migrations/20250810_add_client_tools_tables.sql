-- Add tables to support client tools functionality
-- This migration adds support for agent recommendations, handoffs, and tool logging

-- Agent recommendations tracking
CREATE TABLE IF NOT EXISTS agent_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_agent_id TEXT NOT NULL,
    trigger_event TEXT NOT NULL CHECK (trigger_event IN ('onboarding_complete', 'new_goal_created', 'goal_status_changed', 'context_shift_detected')),
    recommendation_context JSONB NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent handoffs tracking
CREATE TABLE IF NOT EXISTS agent_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_agent_id TEXT,
    target_agent_id TEXT NOT NULL,
    handoff_reason TEXT NOT NULL,
    context_package JSONB NOT NULL,
    status TEXT DEFAULT 'prepared' CHECK (status IN ('prepared', 'in_progress', 'completed', 'failed', 'cancelled')),
    preparation_time_ms INTEGER,
    handoff_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client tool usage logging
CREATE TABLE IF NOT EXISTS client_tool_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    session_id TEXT NOT NULL,
    conversation_id TEXT,
    parameters_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'throttled')),
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User tool usage quotas and limits
CREATE TABLE IF NOT EXISTS user_tool_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    daily_limit INTEGER DEFAULT 50,
    daily_used INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    cooldown_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tool_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_user_id ON agent_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_created_at ON agent_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_status ON agent_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_expires_at ON agent_recommendations(expires_at);

CREATE INDEX IF NOT EXISTS idx_agent_handoffs_user_id ON agent_handoffs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_status ON agent_handoffs(status);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_created_at ON agent_handoffs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_target_agent ON agent_handoffs(target_agent_id);

CREATE INDEX IF NOT EXISTS idx_client_tool_logs_user_id ON client_tool_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_client_tool_logs_tool_name ON client_tool_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_client_tool_logs_session_id ON client_tool_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_client_tool_logs_created_at ON client_tool_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_tool_quotas_user_tool ON user_tool_quotas(user_id, tool_name);
CREATE INDEX IF NOT EXISTS idx_user_tool_quotas_reset_date ON user_tool_quotas(last_reset_date);

-- RLS policies
ALTER TABLE agent_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tool_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tool_quotas ENABLE ROW LEVEL SECURITY;

-- Users can only access their own records
CREATE POLICY "Users can access own recommendations" ON agent_recommendations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own handoffs" ON agent_handoffs  
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own tool logs" ON client_tool_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own quotas" ON user_tool_quotas
    FOR ALL USING (auth.uid() = user_id);

-- Functions for quota management
CREATE OR REPLACE FUNCTION check_user_tool_quota(
    p_user_id UUID,
    p_tool_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    quota_record user_tool_quotas%ROWTYPE;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Get or create quota record
    SELECT * INTO quota_record
    FROM user_tool_quotas
    WHERE user_id = p_user_id AND tool_name = p_tool_name;
    
    -- Create record if it doesn't exist
    IF NOT FOUND THEN
        INSERT INTO user_tool_quotas (user_id, tool_name, daily_used)
        VALUES (p_user_id, p_tool_name, 0)
        RETURNING * INTO quota_record;
    END IF;
    
    -- Reset daily counter if needed
    IF quota_record.last_reset_date < current_date THEN
        UPDATE user_tool_quotas
        SET daily_used = 0, last_reset_date = current_date
        WHERE id = quota_record.id;
        quota_record.daily_used := 0;
    END IF;
    
    -- Check cooldown
    IF quota_record.cooldown_until IS NOT NULL AND quota_record.cooldown_until > NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Check daily limit
    IF quota_record.daily_used >= quota_record.daily_limit THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_tool_usage(
    p_user_id UUID,
    p_tool_name TEXT,
    p_cooldown_minutes INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    cooldown_until TIMESTAMPTZ;
BEGIN
    -- Calculate cooldown end time
    IF p_cooldown_minutes > 0 THEN
        cooldown_until := NOW() + (p_cooldown_minutes || ' minutes')::INTERVAL;
    END IF;
    
    -- Increment usage and set cooldown
    INSERT INTO user_tool_quotas (user_id, tool_name, daily_used, cooldown_until)
    VALUES (p_user_id, p_tool_name, 1, cooldown_until)
    ON CONFLICT (user_id, tool_name)
    DO UPDATE SET
        daily_used = user_tool_quotas.daily_used + 1,
        cooldown_until = COALESCE(EXCLUDED.cooldown_until, user_tool_quotas.cooldown_until),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations() RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Mark expired recommendations as expired
    UPDATE agent_recommendations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW();
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_recommendations_updated_at
    BEFORE UPDATE ON agent_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_handoffs_updated_at
    BEFORE UPDATE ON agent_handoffs  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tool_quotas_updated_at
    BEFORE UPDATE ON user_tool_quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON agent_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON agent_handoffs TO authenticated;
GRANT SELECT, INSERT ON client_tool_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_tool_quotas TO authenticated;

GRANT EXECUTE ON FUNCTION check_user_tool_quota TO authenticated;
GRANT EXECUTE ON FUNCTION increment_tool_usage TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_recommendations TO authenticated;

-- Comments for documentation
COMMENT ON TABLE agent_recommendations IS 'Tracks agent recommendations made to users with eligibility and context';
COMMENT ON TABLE agent_handoffs IS 'Manages agent-to-agent handoffs with complete context preservation';
COMMENT ON TABLE client_tool_logs IS 'Logs all client tool invocations for analytics and debugging';
COMMENT ON TABLE user_tool_quotas IS 'Manages per-user quotas and cooldowns for tool usage';

COMMENT ON FUNCTION check_user_tool_quota IS 'Checks if user can use a tool based on quotas and cooldowns';
COMMENT ON FUNCTION increment_tool_usage IS 'Increments tool usage counter and sets optional cooldown';
COMMENT ON FUNCTION cleanup_expired_recommendations IS 'Marks expired recommendations as expired (run periodically)';

-- Initial tool quota configuration
INSERT INTO user_tool_quotas (user_id, tool_name, daily_limit)
SELECT 
    id as user_id,
    tool_name,
    CASE tool_name
        WHEN 'check_recommendation_eligibility' THEN 50
        WHEN 'recommend_specialist_agent' THEN 10
        WHEN 'prepare_handoff_context' THEN 20
        WHEN 'update_user_interface' THEN 200
        WHEN 'log_tool_invocation' THEN 1000
        ELSE 25
    END as daily_limit
FROM auth.users
CROSS JOIN (
    VALUES 
        ('check_recommendation_eligibility'),
        ('recommend_specialist_agent'), 
        ('prepare_handoff_context'),
        ('update_user_interface'),
        ('log_tool_invocation')
) AS tools(tool_name)
ON CONFLICT (user_id, tool_name) DO NOTHING;