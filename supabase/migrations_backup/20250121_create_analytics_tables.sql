-- Create conversation analytics tables for insights and tracking

-- Conversation insights table
CREATE TABLE IF NOT EXISTS conversation_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL UNIQUE,
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    
    -- Core insights
    summary TEXT,
    topics TEXT[] DEFAULT '{}',
    sentiment JSONB DEFAULT '{}', -- {overall: 0.8, by_segment: [...]}
    
    -- Extracted information
    goals_mentioned JSONB DEFAULT '[]',
    action_items JSONB DEFAULT '[]',
    coaching_areas TEXT[] DEFAULT '{}',
    key_phrases JSONB DEFAULT '[]',
    
    -- Metrics
    duration_seconds INTEGER,
    message_count INTEGER DEFAULT 0,
    tool_calls_count INTEGER DEFAULT 0,
    
    -- Analytics
    engagement_score DECIMAL(3,2), -- 0.00 to 1.00
    clarity_score DECIMAL(3,2),
    progress_indicators JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Goal progress tracking table
CREATE TABLE IF NOT EXISTS goal_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    goal_id UUID NOT NULL REFERENCES user_goals(id),
    
    -- Progress details
    milestone TEXT NOT NULL,
    description TEXT,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Evidence and tracking
    conversation_id TEXT, -- Link to conversation where progress was made
    evidence JSONB DEFAULT '{}', -- Screenshots, links, notes
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'verified')),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(user_id, goal_id, milestone)
);

-- Coaching effectiveness metrics table
CREATE TABLE IF NOT EXISTS coaching_effectiveness (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Engagement metrics
    total_conversations INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    average_conversation_length DECIMAL(5,2),
    conversation_frequency JSONB DEFAULT '{}', -- {daily: [], weekly: []}
    
    -- Goal metrics
    goals_set INTEGER DEFAULT 0,
    goals_completed INTEGER DEFAULT 0,
    goals_in_progress INTEGER DEFAULT 0,
    goal_completion_rate DECIMAL(3,2),
    average_goal_duration_days DECIMAL(5,2),
    
    -- Progress metrics
    milestones_reached INTEGER DEFAULT 0,
    action_items_completed INTEGER DEFAULT 0,
    
    -- Satisfaction metrics
    user_satisfaction_score DECIMAL(3,2), -- 0.00 to 5.00
    recommendation_likelihood INTEGER, -- 0 to 10 (NPS)
    
    -- Coaching areas
    primary_coaching_areas TEXT[] DEFAULT '{}',
    coaching_style_preferences JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(user_id, period_start, period_end)
);

-- User coaching journey table
CREATE TABLE IF NOT EXISTS user_coaching_journey (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Journey stages
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Coaching preferences
    preferred_coaching_style TEXT,
    preferred_session_length INTEGER, -- minutes
    preferred_frequency TEXT, -- daily, weekly, bi-weekly, monthly
    
    -- Progress summary
    total_goals_set INTEGER DEFAULT 0,
    total_goals_achieved INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    
    -- Engagement
    last_conversation_at TIMESTAMP WITH TIME ZONE,
    total_conversation_count INTEGER DEFAULT 0,
    
    -- Personalization
    interests TEXT[] DEFAULT '{}',
    challenges TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_conversation_insights_user_id ON conversation_insights(user_id);
CREATE INDEX idx_conversation_insights_agent_id ON conversation_insights(agent_id);
CREATE INDEX idx_conversation_insights_created_at ON conversation_insights(created_at);
CREATE INDEX idx_goal_progress_user_goal ON goal_progress(user_id, goal_id);
CREATE INDEX idx_goal_progress_status ON goal_progress(status);
CREATE INDEX idx_coaching_effectiveness_user_period ON coaching_effectiveness(user_id, period_start);

-- Create functions for analytics

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    message_count INTEGER,
    duration_seconds INTEGER,
    tool_calls_count INTEGER
)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
    score DECIMAL(3,2);
    message_score DECIMAL(3,2);
    duration_score DECIMAL(3,2);
    tool_score DECIMAL(3,2);
BEGIN
    -- Message engagement (0-0.4)
    message_score := LEAST(message_count::DECIMAL / 20.0, 1.0) * 0.4;
    
    -- Duration engagement (0-0.4)
    duration_score := LEAST(duration_seconds::DECIMAL / 600.0, 1.0) * 0.4;
    
    -- Tool usage engagement (0-0.2)
    tool_score := LEAST(tool_calls_count::DECIMAL / 5.0, 1.0) * 0.2;
    
    score := message_score + duration_score + tool_score;
    
    RETURN ROUND(score, 2);
END;
$$;

-- Function to update user journey
CREATE OR REPLACE FUNCTION update_user_journey()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update or insert user journey record
    INSERT INTO user_coaching_journey (
        user_id,
        last_conversation_at,
        total_conversation_count
    )
    VALUES (
        NEW.user_id,
        NEW.created_at,
        1
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        last_conversation_at = NEW.created_at,
        total_conversation_count = user_coaching_journey.total_conversation_count + 1,
        updated_at = TIMEZONE('utc', NOW());
    
    RETURN NEW;
END;
$$;

-- Create trigger to update journey on new conversations
CREATE TRIGGER update_journey_on_conversation
AFTER INSERT ON conversation_insights
FOR EACH ROW
WHEN (NEW.user_id IS NOT NULL)
EXECUTE FUNCTION update_user_journey();

-- RLS policies
ALTER TABLE conversation_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coaching_journey ENABLE ROW LEVEL SECURITY;

-- Users can view their own analytics
CREATE POLICY "Users can view own conversation insights" ON conversation_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own goal progress" ON goal_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own coaching effectiveness" ON coaching_effectiveness
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own journey" ON user_coaching_journey
    FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to insights" ON conversation_insights
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to progress" ON goal_progress
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to effectiveness" ON coaching_effectiveness
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to journey" ON user_coaching_journey
    FOR ALL USING (auth.role() = 'service_role');