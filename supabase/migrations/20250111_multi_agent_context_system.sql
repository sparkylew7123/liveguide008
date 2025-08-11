-- Multi-Agent Context System Migration
-- Created: 2025-01-11
-- Purpose: Enable Maya's multi-agent context sharing and intelligent agent recommendations

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- Agent interaction status enum
CREATE TYPE interaction_status AS ENUM (
    'active',           -- Ongoing conversation
    'completed',        -- Successfully finished
    'interrupted',      -- Ended prematurely
    'failed'           -- Technical failure
);

-- Agent recommendation trigger enum
CREATE TYPE recommendation_trigger AS ENUM (
    'onboarding',       -- During initial user setup
    'goal_change',      -- When user updates goals
    'user_request',     -- Explicit user request for recommendations
    'insight_threshold', -- When significant insights are discovered
    'session_end'      -- After conversation completion
);

-- Insight sharing level enum  
CREATE TYPE insight_sharing_level AS ENUM (
    'public',          -- Shareable with all agents
    'restricted',      -- Limited sharing based on rules
    'private'          -- Agent-specific insights only
);

-- =====================================================
-- AGENT INTERACTIONS TABLE
-- =====================================================

-- Tracks all conversations between users and agents
-- This provides conversation history and context for agent handoffs
CREATE TABLE agent_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agent_personae(uuid) ON DELETE CASCADE,
    
    -- Conversation metadata
    conversation_id TEXT, -- ElevenLabs conversation ID if available
    session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    status interaction_status NOT NULL DEFAULT 'active',
    
    -- Context and outcomes
    initial_context JSONB DEFAULT '{}', -- What agent knew at start
    conversation_summary TEXT,          -- Generated summary of conversation
    key_topics TEXT[],                  -- Main topics discussed
    user_sentiment NUMERIC(3,2),       -- -1.0 to 1.0 sentiment score
    goal_progress JSONB DEFAULT '{}',   -- Goals worked on and progress
    
    -- Technical metadata
    total_messages INTEGER DEFAULT 0,
    total_duration_seconds INTEGER,
    quality_score NUMERIC(3,2),        -- 0.0 to 1.0 conversation quality
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for agent interactions
CREATE INDEX idx_agent_interactions_user_id ON agent_interactions(user_id);
CREATE INDEX idx_agent_interactions_agent_id ON agent_interactions(agent_id);  
CREATE INDEX idx_agent_interactions_status ON agent_interactions(status);
CREATE INDEX idx_agent_interactions_session_start ON agent_interactions(session_start DESC);
CREATE INDEX idx_agent_interactions_user_agent ON agent_interactions(user_id, agent_id);

-- =====================================================
-- SHARED AGENT INSIGHTS TABLE  
-- =====================================================

-- Stores insights that agents can share about users
-- Enables cross-agent learning and context preservation
CREATE TABLE shared_agent_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source_agent_id UUID NOT NULL REFERENCES agent_personae(uuid) ON DELETE CASCADE,
    interaction_id UUID REFERENCES agent_interactions(id) ON DELETE SET NULL,
    
    -- Insight content
    insight_type TEXT NOT NULL, -- 'behavioral_pattern', 'preference', 'goal_alignment', etc.
    insight_summary TEXT NOT NULL,
    insight_details JSONB DEFAULT '{}',
    confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.5, -- 0.0 to 1.0
    
    -- Sharing and privacy
    sharing_level insight_sharing_level NOT NULL DEFAULT 'restricted',
    applicable_agent_categories TEXT[], -- Which agent types can access this
    
    -- Validation and lifecycle
    validated_by_user BOOLEAN DEFAULT FALSE,
    validation_timestamp TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Optional expiration for time-sensitive insights
    
    -- Usage tracking
    times_accessed INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for shared insights
CREATE INDEX idx_shared_insights_user_id ON shared_agent_insights(user_id);
CREATE INDEX idx_shared_insights_source_agent ON shared_agent_insights(source_agent_id);
CREATE INDEX idx_shared_insights_type ON shared_agent_insights(insight_type);
CREATE INDEX idx_shared_insights_sharing_level ON shared_agent_insights(sharing_level);
CREATE INDEX idx_shared_insights_applicable_categories ON shared_agent_insights 
    USING GIN (applicable_agent_categories);
CREATE INDEX idx_shared_insights_confidence ON shared_agent_insights(confidence_score DESC);
CREATE INDEX idx_shared_insights_expires_at ON shared_agent_insights(expires_at) 
    WHERE expires_at IS NOT NULL;

-- =====================================================
-- AGENT MATCHING HISTORY TABLE
-- =====================================================

-- Logs when and why agents were recommended to users  
-- Prevents over-recommendation and tracks effectiveness
CREATE TABLE agent_matching_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommended_agent_id UUID NOT NULL REFERENCES agent_personae(uuid) ON DELETE CASCADE,
    
    -- Recommendation context
    trigger_event recommendation_trigger NOT NULL,
    recommendation_reason TEXT NOT NULL,
    matching_score NUMERIC(3,2) NOT NULL, -- 0.0 to 1.0
    context_factors JSONB DEFAULT '{}', -- What influenced the recommendation
    
    -- User response
    user_response TEXT, -- 'accepted', 'declined', 'ignored', 'deferred'
    response_timestamp TIMESTAMPTZ,
    user_feedback TEXT, -- Optional feedback about recommendation
    
    -- Outcome tracking
    resulted_in_interaction BOOLEAN DEFAULT FALSE,
    interaction_id UUID REFERENCES agent_interactions(id) ON DELETE SET NULL,
    outcome_quality_score NUMERIC(3,2), -- How good was the match if accepted
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for matching history
CREATE INDEX idx_matching_history_user_id ON agent_matching_history(user_id);
CREATE INDEX idx_matching_history_agent_id ON agent_matching_history(recommended_agent_id);
CREATE INDEX idx_matching_history_trigger ON agent_matching_history(trigger_event);
CREATE INDEX idx_matching_history_user_response ON agent_matching_history(user_response);
CREATE INDEX idx_matching_history_created_at ON agent_matching_history(created_at DESC);
CREATE UNIQUE INDEX idx_matching_history_recent_recommendation ON agent_matching_history
    (user_id, recommended_agent_id, trigger_event, created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable Row Level Security on all new tables
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_agent_insights ENABLE ROW LEVEL SECURITY;  
ALTER TABLE agent_matching_history ENABLE ROW LEVEL SECURITY;

-- Agent Interactions RLS Policies
CREATE POLICY "Users can view their own interactions" ON agent_interactions
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert their own interactions" ON agent_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update their own interactions" ON agent_interactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Shared Agent Insights RLS Policies  
CREATE POLICY "Users can view insights about themselves" ON shared_agent_insights
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "System can insert insights" ON shared_agent_insights
    FOR INSERT WITH CHECK (true); -- Allow system to insert, user_id checked at app level
    
CREATE POLICY "Users can validate their insights" ON shared_agent_insights
    FOR UPDATE USING (auth.uid() = user_id);

-- Agent Matching History RLS Policies
CREATE POLICY "Users can view their matching history" ON agent_matching_history
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "System can log recommendations" ON agent_matching_history
    FOR INSERT WITH CHECK (true); -- Allow system to insert
    
CREATE POLICY "Users can update their responses" ON agent_matching_history
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get comprehensive user context for an agent
-- This aggregates user data, graph insights, and previous agent interactions
CREATE OR REPLACE FUNCTION get_user_context_for_agent(
    p_user_id UUID,
    p_agent_id UUID,
    p_context_depth INTEGER DEFAULT 30 -- Days of history to include
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    user_profile JSONB;
    recent_goals JSONB;
    recent_insights JSONB;
    agent_history JSONB;
    shared_insights JSONB;
BEGIN
    -- Get basic user profile
    SELECT to_jsonb(p) INTO user_profile
    FROM profiles p
    WHERE p.id = p_user_id;
    
    -- Get recent goal-related nodes from graph
    SELECT jsonb_agg(
        jsonb_build_object(
            'label', gn.label,
            'description', gn.description,
            'status', gn.status,
            'created_at', gn.created_at,
            'properties', gn.properties
        )
    ) INTO recent_goals
    FROM graph_nodes gn
    WHERE gn.user_id = p_user_id
      AND gn.node_type = 'goal'
      AND gn.deleted_at IS NULL
      AND gn.created_at >= NOW() - INTERVAL '%s days', p_context_depth
    ORDER BY gn.created_at DESC
    LIMIT 10;
    
    -- Get recent insights and key topics
    SELECT jsonb_agg(
        jsonb_build_object(
            'label', gn.label,
            'description', gn.description,
            'type', gn.node_type,
            'created_at', gn.created_at,
            'properties', gn.properties
        )
    ) INTO recent_insights  
    FROM graph_nodes gn
    WHERE gn.user_id = p_user_id
      AND gn.node_type IN ('insight', 'topic', 'emotion')
      AND gn.deleted_at IS NULL
      AND gn.created_at >= NOW() - INTERVAL '%s days', p_context_depth
    ORDER BY gn.created_at DESC  
    LIMIT 20;
    
    -- Get previous interactions with this agent
    SELECT jsonb_agg(
        jsonb_build_object(
            'session_start', ai.session_start,
            'status', ai.status,
            'conversation_summary', ai.conversation_summary,
            'key_topics', ai.key_topics,
            'user_sentiment', ai.user_sentiment,
            'goal_progress', ai.goal_progress,
            'quality_score', ai.quality_score
        )
    ) INTO agent_history
    FROM agent_interactions ai
    WHERE ai.user_id = p_user_id
      AND ai.agent_id = p_agent_id
      AND ai.session_start >= NOW() - INTERVAL '%s days', p_context_depth
    ORDER BY ai.session_start DESC
    LIMIT 5;
    
    -- Get relevant shared insights from other agents
    SELECT jsonb_agg(
        jsonb_build_object(
            'insight_type', sai.insight_type,
            'insight_summary', sai.insight_summary,
            'confidence_score', sai.confidence_score,
            'created_at', sai.created_at,
            'source_agent_name', ap."Name"
        )
    ) INTO shared_insights
    FROM shared_agent_insights sai
    JOIN agent_personae ap ON sai.source_agent_id = ap.uuid
    WHERE sai.user_id = p_user_id
      AND sai.sharing_level IN ('public', 'restricted')
      AND (sai.expires_at IS NULL OR sai.expires_at > NOW())
      AND sai.confidence_score >= 0.6
      AND sai.created_at >= NOW() - INTERVAL '%s days', p_context_depth
    ORDER BY sai.confidence_score DESC, sai.created_at DESC
    LIMIT 15;
    
    -- Build comprehensive context
    result := jsonb_build_object(
        'user_profile', COALESCE(user_profile, '{}'::jsonb),
        'recent_goals', COALESCE(recent_goals, '[]'::jsonb),  
        'recent_insights', COALESCE(recent_insights, '[]'::jsonb),
        'agent_history', COALESCE(agent_history, '[]'::jsonb),
        'shared_insights', COALESCE(shared_insights, '[]'::jsonb),
        'context_generated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Function to recommend agents for specific trigger events
-- This implements intelligent agent recommendation with cooldown periods  
CREATE OR REPLACE FUNCTION recommend_agents_for_trigger(
    p_user_id UUID,
    p_trigger_event recommendation_trigger,
    p_max_recommendations INTEGER DEFAULT 3
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '[]';
    user_goals TEXT[];
    user_categories TEXT[];
    cooldown_hours INTEGER;
    recommendation_count INTEGER;
BEGIN
    -- Set cooldown periods based on trigger type to avoid overwhelming users
    cooldown_hours := CASE p_trigger_event
        WHEN 'onboarding' THEN 0          -- No cooldown for onboarding
        WHEN 'goal_change' THEN 24        -- 24 hour cooldown
        WHEN 'user_request' THEN 1        -- 1 hour cooldown  
        WHEN 'insight_threshold' THEN 48  -- 48 hour cooldown
        WHEN 'session_end' THEN 12        -- 12 hour cooldown
        ELSE 24
    END;
    
    -- Check if we've already made recommendations recently (respecting cooldown)
    SELECT COUNT(*) INTO recommendation_count
    FROM agent_matching_history
    WHERE user_id = p_user_id
      AND trigger_event = p_trigger_event
      AND created_at >= NOW() - INTERVAL '%s hours', cooldown_hours;
      
    -- Skip recommendation if still in cooldown period
    IF recommendation_count > 0 AND p_trigger_event != 'user_request' THEN
        RETURN '[]'::jsonb;
    END IF;
    
    -- Get user's current goals and preferred categories
    SELECT 
        ARRAY(
            SELECT DISTINCT gn.label
            FROM graph_nodes gn
            WHERE gn.user_id = p_user_id
              AND gn.node_type = 'goal' 
              AND gn.deleted_at IS NULL
              AND gn.status != 'archived'
        ),
        ARRAY(
            SELECT DISTINCT jsonb_array_elements_text(p.coaching_preferences->'preferred_categories')
            FROM profiles p
            WHERE p.id = p_user_id
        )
    INTO user_goals, user_categories;
    
    -- Generate recommendations based on goals and categories
    WITH agent_scores AS (
        SELECT 
            ap.uuid as agent_id,
            ap."Name" as agent_name,
            ap."Goal Category" as goal_category,
            ap."Category" as category,
            ap."Speciality" as speciality,
            ap.average_rating,
            ap.availability_status,
            
            -- Calculate matching score based on multiple factors
            (
                -- Goal category match (40% weight)
                CASE WHEN ap."Goal Category" = ANY(user_goals) THEN 0.4 ELSE 0.0 END +
                
                -- Category preference match (30% weight)  
                CASE WHEN ap."Category" = ANY(user_categories) THEN 0.3 ELSE 0.0 END +
                
                -- Agent rating (20% weight)
                COALESCE(ap.average_rating / 5.0 * 0.2, 0.1) +
                
                -- Availability bonus (10% weight)
                CASE WHEN ap.availability_status = 'available' THEN 0.1 ELSE 0.0 END
                
            ) as matching_score,
            
            -- Avoid recently recommended agents (penalty)
            CASE WHEN EXISTS(
                SELECT 1 FROM agent_matching_history amh
                WHERE amh.user_id = p_user_id 
                  AND amh.recommended_agent_id = ap.uuid
                  AND amh.created_at >= NOW() - INTERVAL '7 days'
            ) THEN -0.2 ELSE 0.0 END as recency_penalty
            
        FROM agent_personae ap
        WHERE ap.availability_status IS NOT NULL
          AND ap.uuid IS NOT NULL
    ),
    final_scores AS (
        SELECT 
            *,
            (matching_score + recency_penalty) as final_score,
            CASE 
                WHEN goal_category = ANY(user_goals) THEN 'Goal alignment: ' || goal_category
                WHEN category = ANY(user_categories) THEN 'Category match: ' || category  
                WHEN average_rating >= 4.0 THEN 'Highly rated specialist'
                ELSE 'General coaching expertise'
            END as recommendation_reason
        FROM agent_scores
        WHERE (matching_score + recency_penalty) > 0.2 -- Minimum threshold
        ORDER BY final_score DESC
        LIMIT p_max_recommendations
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'agent_id', fs.agent_id,
            'agent_name', fs.agent_name,
            'speciality', fs.speciality,
            'matching_score', ROUND(fs.final_score::numeric, 2),
            'recommendation_reason', fs.recommendation_reason,
            'goal_category', fs.goal_category,
            'category', fs.category,
            'average_rating', fs.average_rating
        )
    ) INTO result
    FROM final_scores fs;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_agent_interactions_updated_at
    BEFORE UPDATE ON agent_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_agent_insights_updated_at  
    BEFORE UPDATE ON shared_agent_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_agent_matching_history_updated_at
    BEFORE UPDATE ON agent_matching_history  
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM shared_agent_insights
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW();
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get agent interaction summary for a user
CREATE OR REPLACE FUNCTION get_agent_interaction_summary(
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_interactions', COUNT(*),
        'unique_agents', COUNT(DISTINCT agent_id),
        'avg_quality_score', ROUND(AVG(quality_score)::numeric, 2),
        'total_duration_hours', ROUND((SUM(total_duration_seconds) / 3600.0)::numeric, 1),
        'most_common_topics', (
            SELECT jsonb_agg(DISTINCT topic)
            FROM agent_interactions ai,
            LATERAL unnest(ai.key_topics) as topic
            WHERE ai.user_id = p_user_id
              AND ai.session_start >= NOW() - INTERVAL '%s days', p_days_back
            LIMIT 10
        ),
        'recent_sentiment_trend', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', DATE(session_start),
                    'avg_sentiment', ROUND(AVG(user_sentiment)::numeric, 2)
                )
            )
            FROM agent_interactions
            WHERE user_id = p_user_id
              AND session_start >= NOW() - INTERVAL '%s days', p_days_back
              AND user_sentiment IS NOT NULL
            GROUP BY DATE(session_start)
            ORDER BY DATE(session_start) DESC
            LIMIT 7
        )
    ) INTO result
    FROM agent_interactions
    WHERE user_id = p_user_id
      AND session_start >= NOW() - INTERVAL '%s days', p_days_back;
      
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- Composite index for efficient context queries
CREATE INDEX idx_graph_nodes_user_type_status_date ON graph_nodes(user_id, node_type, status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Index for agent availability and ratings
CREATE INDEX idx_agent_personae_availability_rating ON agent_personae(availability_status, average_rating DESC NULLS LAST)
    WHERE availability_status IS NOT NULL;

-- Partial index for active interactions
CREATE INDEX idx_agent_interactions_active ON agent_interactions(user_id, agent_id, session_start DESC)
    WHERE status = 'active';

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE agent_interactions IS 'Tracks all conversations between users and agents, providing conversation history and context for agent handoffs';

COMMENT ON TABLE shared_agent_insights IS 'Stores insights that agents can share about users, enabling cross-agent learning and context preservation';

COMMENT ON TABLE agent_matching_history IS 'Logs when and why agents were recommended to users, preventing over-recommendation and tracking effectiveness';

COMMENT ON FUNCTION get_user_context_for_agent(UUID, UUID, INTEGER) IS 'Aggregates comprehensive user context including profile, goals, insights, and previous interactions for agent conversations';

COMMENT ON FUNCTION recommend_agents_for_trigger(UUID, recommendation_trigger, INTEGER) IS 'Intelligently recommends agents based on specific trigger events with built-in cooldown periods to avoid overwhelming users';

COMMENT ON TYPE recommendation_trigger IS 'Defines specific events that can trigger agent recommendations: onboarding, goal_change, user_request, insight_threshold, session_end';

COMMENT ON TYPE interaction_status IS 'Status of agent-user interactions: active, completed, interrupted, failed';

COMMENT ON TYPE insight_sharing_level IS 'Controls how insights can be shared between agents: public, restricted, private';

-- =====================================================
-- SAMPLE DATA QUERIES (for testing)
-- =====================================================

/*
-- Example: Get user context for agent interaction
SELECT get_user_context_for_agent(
    'user-uuid-here'::uuid,
    'agent-uuid-here'::uuid,
    30 -- 30 days of context
);

-- Example: Recommend agents for goal change
SELECT recommend_agents_for_trigger(
    'user-uuid-here'::uuid,
    'goal_change'::recommendation_trigger,
    3 -- max 3 recommendations
);

-- Example: Get interaction summary
SELECT get_agent_interaction_summary(
    'user-uuid-here'::uuid,
    30 -- last 30 days
);

-- Example: Clean up expired insights
SELECT cleanup_expired_insights();
*/