-- Create Graph Database Schema for LiveGuide MVP
-- This migration creates a flexible graph structure with nodes and edges
-- to support coaching goals, skills, emotions, sessions, and accomplishments

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create enum types for better type safety
CREATE TYPE node_type AS ENUM ('goal', 'skill', 'emotion', 'session', 'accomplishment');
CREATE TYPE edge_type AS ENUM ('works_on', 'has_skill', 'derived_from', 'feels', 'achieves');
CREATE TYPE emotion_type AS ENUM ('confident', 'anxious', 'motivated', 'uncertain', 'accomplished', 'frustrated');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- Create the nodes table
-- This table stores all node types in a single table for graph flexibility
CREATE TABLE graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    node_type node_type NOT NULL,
    
    -- Common properties for all nodes
    label TEXT NOT NULL, -- Human-readable name/title
    description TEXT,
    properties JSONB DEFAULT '{}'::jsonb, -- Flexible properties storage
    
    -- Type-specific properties stored in JSONB
    -- For goals: { "category": "career", "target_date": "2024-12-31", "priority": "high" }
    -- For skills: { "level": "intermediate", "years_experience": 5, "transferable_from": ["caregiving", "management"] }
    -- For emotions: { "intensity": 0.8, "triggers": ["interview", "networking"] }
    -- For sessions: { "duration_minutes": 30, "agent_id": "uuid", "topics": ["confidence", "interview prep"] }
    -- For accomplishments: { "completed": true, "evidence": "url or description", "impact": "high" }
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    
    -- Indexes will be created after table creation
    CONSTRAINT valid_node_label CHECK (char_length(label) >= 1 AND char_length(label) <= 255)
);

-- Create the edges table
-- This table stores all relationships between nodes
CREATE TABLE graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    edge_type edge_type NOT NULL,
    
    -- Source and target nodes
    source_node_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    
    -- Edge properties
    label TEXT, -- Optional human-readable label for the relationship
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1), -- Relationship strength
    properties JSONB DEFAULT '{}'::jsonb, -- Flexible properties storage
    
    -- Type-specific properties stored in JSONB
    -- For works_on: { "progress": 0.7, "time_spent_minutes": 120 }
    -- For has_skill: { "verified": true, "assessment_score": 85 }
    -- For derived_from: { "action_items": ["practice", "review"], "key_insights": ["..."] }
    -- For feels: { "context": "before interview", "intensity": 0.8 }
    -- For achieves: { "effort_level": "high", "celebration_logged": true }
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    valid_from TIMESTAMPTZ DEFAULT now(), -- For temporal relationships
    valid_to TIMESTAMPTZ, -- NULL means currently valid
    
    -- Prevent duplicate edges of the same type between same nodes
    CONSTRAINT unique_edge UNIQUE (user_id, edge_type, source_node_id, target_node_id, valid_to),
    
    -- Ensure edges connect nodes from the same user
    CONSTRAINT same_user_nodes CHECK (
        EXISTS (
            SELECT 1 FROM graph_nodes n1, graph_nodes n2 
            WHERE n1.id = source_node_id 
            AND n2.id = target_node_id 
            AND n1.user_id = user_id 
            AND n2.user_id = user_id
        )
    )
);

-- Create indexes for optimal graph traversal performance
-- Node indexes
CREATE INDEX idx_nodes_user_type ON graph_nodes(user_id, node_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_type_created ON graph_nodes(node_type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_label_trgm ON graph_nodes USING gin(label gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_properties ON graph_nodes USING gin(properties) WHERE deleted_at IS NULL;

-- Edge indexes
CREATE INDEX idx_edges_user_type ON graph_edges(user_id, edge_type) WHERE valid_to IS NULL;
CREATE INDEX idx_edges_source ON graph_edges(source_node_id) WHERE valid_to IS NULL;
CREATE INDEX idx_edges_target ON graph_edges(target_node_id) WHERE valid_to IS NULL;
CREATE INDEX idx_edges_source_type ON graph_edges(source_node_id, edge_type) WHERE valid_to IS NULL;
CREATE INDEX idx_edges_target_type ON graph_edges(target_node_id, edge_type) WHERE valid_to IS NULL;
CREATE INDEX idx_edges_temporal ON graph_edges(valid_from, valid_to);
CREATE INDEX idx_edges_properties ON graph_edges USING gin(properties) WHERE valid_to IS NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_graph_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_graph_nodes_updated_at
    BEFORE UPDATE ON graph_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_graph_updated_at();

CREATE TRIGGER update_graph_edges_updated_at
    BEFORE UPDATE ON graph_edges
    FOR EACH ROW
    EXECUTE FUNCTION update_graph_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;

-- Nodes RLS Policies
-- Users can only see their own nodes
CREATE POLICY "Users can view own nodes" ON graph_nodes
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own nodes
CREATE POLICY "Users can create own nodes" ON graph_nodes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own nodes
CREATE POLICY "Users can update own nodes" ON graph_nodes
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can soft delete their own nodes
CREATE POLICY "Users can delete own nodes" ON graph_nodes
    FOR DELETE USING (auth.uid() = user_id);

-- Edges RLS Policies
-- Users can only see their own edges
CREATE POLICY "Users can view own edges" ON graph_edges
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create edges between their own nodes
CREATE POLICY "Users can create own edges" ON graph_edges
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM graph_nodes WHERE id = source_node_id AND user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM graph_nodes WHERE id = target_node_id AND user_id = auth.uid())
    );

-- Users can update their own edges
CREATE POLICY "Users can update own edges" ON graph_edges
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own edges
CREATE POLICY "Users can delete own edges" ON graph_edges
    FOR DELETE USING (auth.uid() = user_id);

-- Helper functions for common graph operations

-- Function to create a goal node
CREATE OR REPLACE FUNCTION create_goal_node(
    p_user_id UUID,
    p_label TEXT,
    p_description TEXT,
    p_category TEXT,
    p_target_date TIMESTAMPTZ DEFAULT NULL,
    p_priority TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    v_node_id UUID;
BEGIN
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'goal'::node_type,
        p_label,
        p_description,
        jsonb_build_object(
            'category', p_category,
            'target_date', p_target_date,
            'priority', p_priority,
            'progress', 0
        )
    )
    RETURNING id INTO v_node_id;
    
    RETURN v_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a skill node
CREATE OR REPLACE FUNCTION create_skill_node(
    p_user_id UUID,
    p_label TEXT,
    p_description TEXT,
    p_level skill_level DEFAULT 'beginner',
    p_transferable_from TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
    v_node_id UUID;
BEGIN
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'skill'::node_type,
        p_label,
        p_description,
        jsonb_build_object(
            'level', p_level,
            'transferable_from', p_transferable_from,
            'verified', false
        )
    )
    RETURNING id INTO v_node_id;
    
    RETURN v_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a session node and link it to goals
CREATE OR REPLACE FUNCTION create_session_node(
    p_user_id UUID,
    p_label TEXT,
    p_description TEXT,
    p_agent_id TEXT,
    p_duration_minutes INTEGER,
    p_goal_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
    v_node_id UUID;
    v_goal_id UUID;
BEGIN
    -- Create the session node
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'session'::node_type,
        p_label,
        p_description,
        jsonb_build_object(
            'agent_id', p_agent_id,
            'duration_minutes', p_duration_minutes,
            'completed', false
        )
    )
    RETURNING id INTO v_node_id;
    
    -- Create edges to goals
    FOREACH v_goal_id IN ARRAY p_goal_ids
    LOOP
        INSERT INTO graph_edges (user_id, edge_type, source_node_id, target_node_id)
        VALUES (p_user_id, 'works_on'::edge_type, v_node_id, v_goal_id);
    END LOOP;
    
    RETURN v_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track emotion
CREATE OR REPLACE FUNCTION track_emotion(
    p_user_id UUID,
    p_emotion emotion_type,
    p_intensity DECIMAL(3,2),
    p_context TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_node_id UUID;
    v_edge_id UUID;
BEGIN
    -- Create emotion node
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'emotion'::node_type,
        p_emotion::TEXT,
        p_context,
        jsonb_build_object(
            'intensity', p_intensity,
            'emotion_type', p_emotion
        )
    )
    RETURNING id INTO v_node_id;
    
    -- Create edge from user to emotion (using user_id as source for simplicity)
    -- In a real implementation, you might have a separate user node
    INSERT INTO graph_edges (user_id, edge_type, source_node_id, target_node_id, properties)
    VALUES (
        p_user_id,
        'feels'::edge_type,
        v_node_id, -- Using emotion node as source for this example
        v_node_id, -- Self-reference for this example
        jsonb_build_object(
            'intensity', p_intensity,
            'context', p_context,
            'timestamp', now()
        )
    )
    RETURNING id INTO v_edge_id;
    
    RETURN v_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active goals with progress
CREATE OR REPLACE FUNCTION get_user_goals_with_progress(p_user_id UUID)
RETURNS TABLE (
    goal_id UUID,
    label TEXT,
    description TEXT,
    category TEXT,
    target_date TIMESTAMPTZ,
    progress DECIMAL,
    session_count BIGINT,
    accomplishment_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as goal_id,
        g.label,
        g.description,
        (g.properties->>'category')::TEXT as category,
        (g.properties->>'target_date')::TIMESTAMPTZ as target_date,
        COALESCE((g.properties->>'progress')::DECIMAL, 0) as progress,
        COUNT(DISTINCT e1.source_node_id) as session_count,
        COUNT(DISTINCT a.id) as accomplishment_count
    FROM graph_nodes g
    LEFT JOIN graph_edges e1 ON g.id = e1.target_node_id 
        AND e1.edge_type = 'works_on'::edge_type 
        AND e1.valid_to IS NULL
    LEFT JOIN graph_edges e2 ON e1.source_node_id = e2.source_node_id 
        AND e2.edge_type = 'derived_from'::edge_type 
        AND e2.valid_to IS NULL
    LEFT JOIN graph_nodes a ON e2.target_node_id = a.id 
        AND a.node_type = 'accomplishment'::node_type
    WHERE g.user_id = p_user_id
        AND g.node_type = 'goal'::node_type
        AND g.deleted_at IS NULL
    GROUP BY g.id, g.label, g.description, g.properties;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's skill graph
CREATE OR REPLACE FUNCTION get_user_skills_graph(p_user_id UUID)
RETURNS TABLE (
    skill_id UUID,
    label TEXT,
    level TEXT,
    connections BIGINT,
    related_goals TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH skill_goals AS (
        SELECT 
            s.id as skill_id,
            array_agg(DISTINCT g.label) as related_goals
        FROM graph_nodes s
        JOIN graph_edges e1 ON s.id = e1.source_node_id
        JOIN graph_nodes ses ON e1.target_node_id = ses.id AND ses.node_type = 'session'::node_type
        JOIN graph_edges e2 ON ses.id = e2.source_node_id AND e2.edge_type = 'works_on'::edge_type
        JOIN graph_nodes g ON e2.target_node_id = g.id AND g.node_type = 'goal'::node_type
        WHERE s.user_id = p_user_id
            AND s.node_type = 'skill'::node_type
            AND s.deleted_at IS NULL
        GROUP BY s.id
    )
    SELECT 
        s.id as skill_id,
        s.label,
        (s.properties->>'level')::TEXT as level,
        COUNT(DISTINCT e.id) as connections,
        COALESCE(sg.related_goals, ARRAY[]::TEXT[]) as related_goals
    FROM graph_nodes s
    LEFT JOIN graph_edges e ON (s.id = e.source_node_id OR s.id = e.target_node_id) 
        AND e.valid_to IS NULL
    LEFT JOIN skill_goals sg ON s.id = sg.skill_id
    WHERE s.user_id = p_user_id
        AND s.node_type = 'skill'::node_type
        AND s.deleted_at IS NULL
    GROUP BY s.id, s.label, s.properties, sg.related_goals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create views for common queries
CREATE OR REPLACE VIEW user_goal_progress AS
SELECT 
    g.user_id,
    g.id as goal_id,
    g.label as goal_label,
    g.properties->>'category' as category,
    (g.properties->>'progress')::DECIMAL as progress,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT a.id) as total_accomplishments,
    MAX(s.created_at) as last_session_date
FROM graph_nodes g
LEFT JOIN graph_edges e1 ON g.id = e1.target_node_id 
    AND e1.edge_type = 'works_on'::edge_type 
    AND e1.valid_to IS NULL
LEFT JOIN graph_nodes s ON e1.source_node_id = s.id 
    AND s.node_type = 'session'::node_type
LEFT JOIN graph_edges e2 ON s.id = e2.source_node_id 
    AND e2.edge_type = 'derived_from'::edge_type 
    AND e2.valid_to IS NULL
LEFT JOIN graph_nodes a ON e2.target_node_id = a.id 
    AND a.node_type = 'accomplishment'::node_type
WHERE g.node_type = 'goal'::node_type 
    AND g.deleted_at IS NULL
GROUP BY g.user_id, g.id, g.label, g.properties;

-- Grant necessary permissions
GRANT ALL ON graph_nodes TO authenticated;
GRANT ALL ON graph_edges TO authenticated;
GRANT ALL ON user_goal_progress TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_goal_node TO authenticated;
GRANT EXECUTE ON FUNCTION create_skill_node TO authenticated;
GRANT EXECUTE ON FUNCTION create_session_node TO authenticated;
GRANT EXECUTE ON FUNCTION track_emotion TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_goals_with_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_skills_graph TO authenticated;

-- Add helpful comments
COMMENT ON TABLE graph_nodes IS 'Stores all nodes in the LiveGuide graph database including goals, skills, emotions, sessions, and accomplishments';
COMMENT ON TABLE graph_edges IS 'Stores all relationships between nodes with temporal support for tracking changes over time';
COMMENT ON COLUMN graph_nodes.properties IS 'Flexible JSONB storage for node-type specific properties';
COMMENT ON COLUMN graph_edges.weight IS 'Relationship strength between 0 and 1, useful for recommendation algorithms';
COMMENT ON COLUMN graph_edges.valid_to IS 'NULL indicates currently valid relationship, timestamp indicates when relationship ended';

-- Migration rollback support
-- To rollback this migration, run:
-- DROP VIEW IF EXISTS user_goal_progress;
-- DROP FUNCTION IF EXISTS get_user_skills_graph;
-- DROP FUNCTION IF EXISTS get_user_goals_with_progress;
-- DROP FUNCTION IF EXISTS track_emotion;
-- DROP FUNCTION IF EXISTS create_session_node;
-- DROP FUNCTION IF EXISTS create_skill_node;
-- DROP FUNCTION IF EXISTS create_goal_node;
-- DROP FUNCTION IF EXISTS update_graph_updated_at;
-- DROP TABLE IF EXISTS graph_edges;
-- DROP TABLE IF EXISTS graph_nodes;
-- DROP TYPE IF EXISTS skill_level;
-- DROP TYPE IF EXISTS emotion_type;
-- DROP TYPE IF EXISTS edge_type;
-- DROP TYPE IF EXISTS node_type;