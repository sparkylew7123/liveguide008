-- Add temporal tracking for graph evolution
-- This migration adds event sourcing and temporal fields to track graph changes over time

-- Create enum for event types
CREATE TYPE graph_event_type AS ENUM (
    'node_created',
    'node_updated', 
    'node_deleted',
    'edge_created',
    'edge_updated',
    'edge_removed',
    'progress_changed',
    'status_changed',
    'embedding_generated'
);

-- Create graph_events table for event sourcing
CREATE TABLE IF NOT EXISTS graph_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    node_id uuid REFERENCES graph_nodes(id) ON DELETE CASCADE,
    edge_id uuid REFERENCES graph_edges(id) ON DELETE CASCADE,
    session_id uuid REFERENCES graph_nodes(id), -- Reference to session nodes
    event_type graph_event_type NOT NULL,
    previous_state jsonb,
    new_state jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT check_entity_reference CHECK (
        (node_id IS NOT NULL AND edge_id IS NULL) OR 
        (node_id IS NULL AND edge_id IS NOT NULL) OR
        (node_id IS NULL AND edge_id IS NULL) -- For general events
    )
);

-- Create indexes for efficient temporal queries
CREATE INDEX idx_graph_events_user_time ON graph_events(user_id, created_at DESC);
CREATE INDEX idx_graph_events_session ON graph_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_graph_events_node ON graph_events(node_id) WHERE node_id IS NOT NULL;
CREATE INDEX idx_graph_events_edge ON graph_events(edge_id) WHERE edge_id IS NOT NULL;
CREATE INDEX idx_graph_events_type ON graph_events(event_type);
CREATE INDEX idx_graph_events_created_at ON graph_events(created_at DESC);

-- Add temporal tracking columns to graph_nodes
ALTER TABLE graph_nodes 
ADD COLUMN IF NOT EXISTS first_mentioned_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_discussed_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS session_mentions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evolution_metadata jsonb DEFAULT '{}'::jsonb;

-- Add temporal metadata to graph_edges
ALTER TABLE graph_edges
ADD COLUMN IF NOT EXISTS discovered_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS strength_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_reinforced_at timestamptz DEFAULT now();

-- Create a materialized view for fast timeline access
CREATE MATERIALIZED VIEW IF NOT EXISTS user_timeline AS
SELECT 
    user_id,
    date_trunc('hour', created_at) as time_bucket,
    COUNT(*) as event_count,
    jsonb_agg(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) as sessions,
    jsonb_object_agg(event_type::text, count) as event_types
FROM (
    SELECT 
        user_id,
        created_at,
        session_id,
        event_type,
        COUNT(*) OVER (PARTITION BY user_id, date_trunc('hour', created_at), event_type) as count
    FROM graph_events
) as event_counts
GROUP BY user_id, time_bucket;

-- Create index on materialized view
CREATE INDEX idx_user_timeline_user_time ON user_timeline(user_id, time_bucket DESC);

-- Function to record graph events
CREATE OR REPLACE FUNCTION record_graph_event(
    p_user_id uuid,
    p_event_type graph_event_type,
    p_new_state jsonb,
    p_node_id uuid DEFAULT NULL,
    p_edge_id uuid DEFAULT NULL,
    p_session_id uuid DEFAULT NULL,
    p_previous_state jsonb DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
    v_event_id uuid;
BEGIN
    -- Insert the event
    INSERT INTO graph_events (
        user_id,
        node_id,
        edge_id,
        session_id,
        event_type,
        previous_state,
        new_state,
        metadata,
        created_by
    ) VALUES (
        p_user_id,
        p_node_id,
        p_edge_id,
        p_session_id,
        p_event_type,
        p_previous_state,
        p_new_state,
        p_metadata,
        p_user_id -- Assuming the user is creating their own events
    ) RETURNING id INTO v_event_id;
    
    -- Update temporal fields on nodes if applicable
    IF p_node_id IS NOT NULL THEN
        UPDATE graph_nodes
        SET 
            last_discussed_at = now(),
            session_mentions = CASE 
                WHEN p_session_id IS NOT NULL 
                THEN jsonb_insert(
                    session_mentions, 
                    '{-1}', 
                    jsonb_build_object(
                        'session_id', p_session_id,
                        'timestamp', now(),
                        'event_type', p_event_type::text
                    ),
                    true
                )
                ELSE session_mentions
            END
        WHERE id = p_node_id;
    END IF;
    
    -- Update edge temporal data if applicable
    IF p_edge_id IS NOT NULL AND p_event_type IN ('edge_created', 'edge_updated') THEN
        UPDATE graph_edges
        SET 
            last_reinforced_at = now(),
            strength_history = jsonb_insert(
                strength_history,
                '{-1}',
                jsonb_build_object(
                    'timestamp', now(),
                    'strength', COALESCE((p_new_state->>'weight')::float, 1.0),
                    'session_id', p_session_id
                ),
                true
            )
        WHERE id = p_edge_id;
    END IF;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get graph snapshot at a specific time
CREATE OR REPLACE FUNCTION get_graph_snapshot(
    p_user_id uuid,
    p_timestamp timestamptz
) RETURNS TABLE (
    nodes jsonb,
    edges jsonb
) AS $$
BEGIN
    RETURN QUERY
    WITH node_states AS (
        -- Get the latest state of each node up to the given timestamp
        SELECT DISTINCT ON (node_id)
            node_id,
            new_state,
            event_type
        FROM graph_events
        WHERE user_id = p_user_id
            AND node_id IS NOT NULL
            AND created_at <= p_timestamp
        ORDER BY node_id, created_at DESC
    ),
    edge_states AS (
        -- Get the latest state of each edge up to the given timestamp
        SELECT DISTINCT ON (edge_id)
            edge_id,
            new_state,
            event_type
        FROM graph_events
        WHERE user_id = p_user_id
            AND edge_id IS NOT NULL
            AND created_at <= p_timestamp
        ORDER BY edge_id, created_at DESC
    )
    SELECT 
        COALESCE(
            jsonb_agg(
                CASE 
                    WHEN ns.event_type != 'node_deleted' 
                    THEN ns.new_state 
                    ELSE NULL 
                END
            ) FILTER (WHERE ns.event_type != 'node_deleted'),
            '[]'::jsonb
        ) as nodes,
        COALESCE(
            jsonb_agg(
                CASE 
                    WHEN es.event_type != 'edge_removed' 
                    THEN es.new_state 
                    ELSE NULL 
                END
            ) FILTER (WHERE es.event_type != 'edge_removed'),
            '[]'::jsonb
        ) as edges
    FROM node_states ns
    FULL OUTER JOIN edge_states es ON false;
END;
$$ LANGUAGE plpgsql;

-- Function to get node evolution history
CREATE OR REPLACE FUNCTION get_node_evolution(
    p_node_id uuid
) RETURNS TABLE (
    event_id uuid,
    event_type graph_event_type,
    event_timestamp timestamptz,
    changes jsonb,
    session_id uuid,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id as event_id,
        ge.event_type,
        created_at as event_timestamp,
        CASE 
            WHEN previous_state IS NOT NULL 
            THEN jsonb_diff(previous_state, new_state)
            ELSE new_state
        END as changes,
        ge.session_id,
        ge.metadata
    FROM graph_events ge
    WHERE node_id = p_node_id
    ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Helper function to compute JSON diff (basic implementation)
CREATE OR REPLACE FUNCTION jsonb_diff(old_val jsonb, new_val jsonb)
RETURNS jsonb AS $$
DECLARE
    result jsonb = '{}'::jsonb;
    k text;
BEGIN
    -- Find keys that changed or were added
    FOR k IN SELECT jsonb_object_keys(new_val)
    LOOP
        IF old_val->k IS DISTINCT FROM new_val->k THEN
            result = result || jsonb_build_object(
                k, jsonb_build_object(
                    'old', old_val->k,
                    'new', new_val->k
                )
            );
        END IF;
    END LOOP;
    
    -- Find keys that were removed
    FOR k IN SELECT jsonb_object_keys(old_val)
    LOOP
        IF new_val->k IS NULL AND old_val->k IS NOT NULL THEN
            result = result || jsonb_build_object(
                k, jsonb_build_object(
                    'old', old_val->k,
                    'new', null
                )
            );
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for graph_events
ALTER TABLE graph_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own graph events"
ON graph_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own graph events"
ON graph_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger to automatically record events when nodes are modified
CREATE OR REPLACE FUNCTION auto_record_node_event() RETURNS TRIGGER AS $$
DECLARE
    v_event_type graph_event_type;
    v_previous_state jsonb;
BEGIN
    -- Determine event type
    IF TG_OP = 'INSERT' THEN
        v_event_type = 'node_created';
        v_previous_state = NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_event_type = 'node_updated';
        v_previous_state = to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        v_event_type = 'node_deleted';
        v_previous_state = to_jsonb(OLD);
    END IF;
    
    -- Record the event
    IF TG_OP = 'DELETE' THEN
        PERFORM record_graph_event(
            OLD.user_id,
            v_event_type,
            v_previous_state,
            OLD.id,
            NULL,
            NULL,
            v_previous_state
        );
        RETURN OLD;
    ELSE
        PERFORM record_graph_event(
            NEW.user_id,
            v_event_type,
            to_jsonb(NEW),
            NEW.id,
            NULL,
            NULL,
            v_previous_state
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on graph_nodes
CREATE TRIGGER trigger_record_node_events
AFTER INSERT OR UPDATE OR DELETE ON graph_nodes
FOR EACH ROW EXECUTE FUNCTION auto_record_node_event();

-- Similar trigger for edges
CREATE OR REPLACE FUNCTION auto_record_edge_event() RETURNS TRIGGER AS $$
DECLARE
    v_event_type graph_event_type;
    v_previous_state jsonb;
    v_user_id uuid;
BEGIN
    -- Get user_id from the source node
    IF TG_OP = 'DELETE' THEN
        SELECT user_id INTO v_user_id FROM graph_nodes WHERE id = OLD.source_id;
    ELSE
        SELECT user_id INTO v_user_id FROM graph_nodes WHERE id = NEW.source_id;
    END IF;
    
    -- Determine event type
    IF TG_OP = 'INSERT' THEN
        v_event_type = 'edge_created';
        v_previous_state = NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_event_type = 'edge_updated';
        v_previous_state = to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        v_event_type = 'edge_removed';
        v_previous_state = to_jsonb(OLD);
    END IF;
    
    -- Record the event
    IF TG_OP = 'DELETE' THEN
        PERFORM record_graph_event(
            v_user_id,
            v_event_type,
            v_previous_state,
            NULL,
            OLD.id,
            NULL,
            v_previous_state
        );
        RETURN OLD;
    ELSE
        PERFORM record_graph_event(
            v_user_id,
            v_event_type,
            to_jsonb(NEW),
            NULL,
            NEW.id,
            NULL,
            v_previous_state
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on graph_edges
CREATE TRIGGER trigger_record_edge_events
AFTER INSERT OR UPDATE OR DELETE ON graph_edges
FOR EACH ROW EXECUTE FUNCTION auto_record_edge_event();

-- Grant permissions
GRANT SELECT ON user_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION record_graph_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_graph_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION get_node_evolution TO authenticated;