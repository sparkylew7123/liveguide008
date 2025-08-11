

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "payload";


ALTER SCHEMA "payload" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'Main application schema. Service role policies are intentional for API operations.';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."edge_type" AS ENUM (
    'works_on',
    'has_skill',
    'derived_from',
    'feels',
    'achieves'
);


ALTER TYPE "public"."edge_type" OWNER TO "postgres";


CREATE TYPE "public"."emotion_type" AS ENUM (
    'confident',
    'anxious',
    'motivated',
    'uncertain',
    'accomplished',
    'frustrated'
);


ALTER TYPE "public"."emotion_type" OWNER TO "postgres";


CREATE TYPE "public"."graph_event_type" AS ENUM (
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


ALTER TYPE "public"."graph_event_type" OWNER TO "postgres";


CREATE TYPE "public"."message_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."message_priority" OWNER TO "postgres";


CREATE TYPE "public"."message_type" AS ENUM (
    'session_summary',
    'goal_achievement',
    'recommendation',
    'reminder',
    'insight',
    'resource',
    'system'
);


ALTER TYPE "public"."message_type" OWNER TO "postgres";


CREATE TYPE "public"."node_status" AS ENUM (
    'draft_verbal',
    'curated'
);


ALTER TYPE "public"."node_status" OWNER TO "postgres";


CREATE TYPE "public"."node_type" AS ENUM (
    'goal',
    'skill',
    'emotion',
    'session',
    'accomplishment'
);


ALTER TYPE "public"."node_type" OWNER TO "postgres";


CREATE TYPE "public"."skill_level" AS ENUM (
    'beginner',
    'intermediate',
    'advanced',
    'expert'
);


ALTER TYPE "public"."skill_level" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_message"("p_message_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE inbox_messages 
  SET is_archived = true, updated_at = NOW()
  WHERE id = p_message_id AND user_id = auth.uid();
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."archive_message"("p_message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_record_edge_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."auto_record_edge_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_record_node_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."auto_record_node_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_engagement_score"("message_count" integer, "duration_seconds" integer, "tool_calls_count" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."calculate_engagement_score"("message_count" integer, "duration_seconds" integer, "tool_calls_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_messages"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE inbox_messages
  SET is_archived = true, updated_at = NOW()
  WHERE expires_at IS NOT NULL 
  AND expires_at <= NOW() 
  AND NOT is_archived;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_messages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_goal_node"("p_user_id" "uuid", "p_title" "text", "p_category" "text", "p_properties" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_node_id UUID;
BEGIN
    -- Create the goal node
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'goal',
        p_title,
        COALESCE(p_properties->>'description', 'Goal: ' || p_title),
        jsonb_build_object(
            'category', p_category,
            'target_date', p_properties->>'target_date',
            'priority', COALESCE(p_properties->>'priority', 'medium'),
            'created_from', 'voice_onboarding',
            'original_properties', p_properties
        )
    )
    RETURNING id INTO v_node_id;
    
    RETURN v_node_id;
END;
$$;


ALTER FUNCTION "public"."create_goal_node"("p_user_id" "uuid", "p_title" "text", "p_category" "text", "p_properties" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_goal_node"("p_user_id" "uuid", "p_title" "text", "p_category" "text", "p_properties" "jsonb") IS 'Helper function to create a new goal node with default properties';



CREATE OR REPLACE FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration_minutes" integer, "p_summary" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Create session node
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'session',
        'Coaching Session ' || to_char(now(), 'YYYY-MM-DD HH24:MI'),
        p_summary,
        jsonb_build_object(
            'duration_minutes', p_duration_minutes,
            'date', now()::date
        )
    )
    RETURNING id INTO v_session_id;
    
    -- Create works_on edge linking session to goal
    INSERT INTO graph_edges (user_id, edge_type, source_node_id, target_node_id)
    VALUES (p_user_id, 'works_on', v_session_id, p_goal_id);
    
    RETURN v_session_id;
END;
$$;


ALTER FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration_minutes" integer, "p_summary" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration_minutes" integer, "p_summary" "text") IS 'Helper function to create a coaching session and link it to a goal';



CREATE OR REPLACE FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration" integer, "p_summary" "text", "p_properties" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_node_id UUID;
    v_edge_id UUID;
BEGIN
    -- Create the session node
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'session',
        'Session: ' || LEFT(p_summary, 50),
        p_summary,
        jsonb_build_object(
            'duration_minutes', p_duration,
            'goal_id', p_goal_id,
            'timestamp', NOW()
        ) || p_properties
    )
    RETURNING id INTO v_node_id;
    
    -- Create edge linking session to goal
    INSERT INTO graph_edges (user_id, edge_type, source_node_id, target_node_id, properties)
    VALUES (
        p_user_id,
        'works_on',
        v_node_id,
        p_goal_id,
        jsonb_build_object(
            'duration_minutes', p_duration,
            'created_at', NOW()
        )
    )
    RETURNING id INTO v_edge_id;
    
    RETURN v_node_id;
END;
$$;


ALTER FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration" integer, "p_summary" "text", "p_properties" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "text" DEFAULT 'beginner'::"text", "p_transferable_from" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_node_id UUID;
BEGIN
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'skill',
        p_skill_name,
        'Skill: ' || p_skill_name || ' (' || p_level || ')',
        jsonb_build_object(
            'level', p_level,
            'transferable_from', p_transferable_from,
            'created_at', NOW()
        )
    )
    RETURNING id INTO v_node_id;
    
    RETURN v_node_id;
END;
$$;


ALTER FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "text", "p_transferable_from" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "public"."skill_level" DEFAULT 'beginner'::"public"."skill_level", "p_transferable_from" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_node_id UUID;
BEGIN
    INSERT INTO graph_nodes (user_id, node_type, label, properties)
    VALUES (
        p_user_id,
        'skill',
        p_skill_name,
        jsonb_build_object(
            'level', p_level::text,
            'transferable_from', p_transferable_from
        )
    )
    RETURNING id INTO v_node_id;
    
    -- Create has_skill edge
    INSERT INTO graph_edges (user_id, edge_type, source_node_id, target_node_id)
    VALUES (p_user_id, 'has_skill', p_user_id, v_node_id);
    
    RETURN v_node_id;
END;
$$;


ALTER FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "public"."skill_level", "p_transferable_from" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "public"."skill_level", "p_transferable_from" "text"[]) IS 'Helper function to create a new skill node and link it to the user';



CREATE OR REPLACE FUNCTION "public"."find_connected_insights"("start_node_id" "uuid", "user_id_filter" "uuid", "max_depth" integer DEFAULT 2) RETURNS TABLE("insights" "jsonb", "depth" integer, "total_connections" integer)
    LANGUAGE "sql" STABLE
    AS $$
    WITH RECURSIVE connected_nodes AS (
        -- Base case: start with the given node
        SELECT 
            gn.id,
            gn.node_type::text,
            gn.label,
            gn.description,
            gn.properties,
            0 as depth
        FROM graph_nodes gn
        WHERE gn.id = start_node_id AND gn.user_id = user_id_filter
        
        UNION ALL
        
        -- Recursive case: find connected nodes
        SELECT 
            target.id,
            target.node_type::text,
            target.label,
            target.description,
            target.properties,
            cn.depth + 1
        FROM connected_nodes cn
        JOIN graph_edges ge ON (ge.source_node_id = cn.id OR ge.target_node_id = cn.id)
        JOIN graph_nodes target ON (
            CASE 
                WHEN ge.source_node_id = cn.id THEN target.id = ge.target_node_id
                ELSE target.id = ge.source_node_id
            END
        )
        WHERE 
            cn.depth < max_depth
            AND target.user_id = user_id_filter
            AND target.id != cn.id  -- Avoid cycles
    ),
    insights_only AS (
        SELECT 
            jsonb_build_object(
                'id', id,
                'node_type', node_type,
                'label', label,
                'description', description,
                'properties', properties,
                'depth', depth
            ) as insight_data,
            depth
        FROM connected_nodes 
        WHERE node_type = 'insight' AND depth > 0
    )
    SELECT 
        COALESCE(jsonb_agg(insight_data ORDER BY depth), '[]'::jsonb) as insights,
        COALESCE(MAX(depth), 0) as depth,
        (SELECT COUNT(*) FROM connected_nodes WHERE depth > 0)::int as total_connections
    FROM insights_only;
$$;


ALTER FUNCTION "public"."find_connected_insights"("start_node_id" "uuid", "user_id_filter" "uuid", "max_depth" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agents_by_category"("category_filter" "text") RETURNS TABLE("agent_id" "text", "name" "text", "description" "text", "category" "text", "avatar_url" "text", "is_featured" boolean, "voice_sample_url" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.agent_id,
        ap.name,
        ap.description,
        ap.category,
        ap.avatar_url,
        ap.is_featured,
        ap.voice_sample_url,
        ap.created_at
    FROM public.agent_personae ap
    WHERE ap.category = category_filter
        AND ap.is_active = true
    ORDER BY ap.is_featured DESC, ap.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_agents_by_category"("category_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_graph_snapshot"("p_user_id" "uuid", "p_timestamp" timestamp with time zone) RETURNS TABLE("nodes" "jsonb", "edges" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_graph_snapshot"("p_user_id" "uuid", "p_timestamp" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_node_evolution"("p_node_id" "uuid") RETURNS TABLE("event_id" "uuid", "event_type" "public"."graph_event_type", "event_timestamp" timestamp with time zone, "changes" "jsonb", "session_id" "uuid", "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_node_evolution"("p_node_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_onboarding_status"("user_id_param" "uuid") RETURNS TABLE("onboarding_completed" boolean, "onboarding_completed_at" timestamp with time zone, "preferred_coaching_style" "text", "preferred_session_length" integer, "preferred_frequency" "text", "interests" "text"[], "challenges" "text"[], "strengths" "text"[])
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ucj.onboarding_completed,
        ucj.onboarding_completed_at,
        ucj.preferred_coaching_style,
        ucj.preferred_session_length,
        ucj.preferred_frequency,
        ucj.interests,
        ucj.challenges,
        ucj.strengths
    FROM public.user_coaching_journey ucj
    WHERE ucj.user_id = user_id_param;
END;
$$;


ALTER FUNCTION "public"."get_onboarding_status"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM inbox_messages
    WHERE user_id = p_user_id 
    AND NOT is_read 
    AND NOT is_archived
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;


ALTER FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_goals_with_progress"("p_user_id" "uuid") RETURNS TABLE("goal_id" "uuid", "goal_title" "text", "category" "text", "target_date" "date", "priority" "text", "session_count" bigint, "total_duration_minutes" bigint, "accomplishment_count" bigint, "latest_session_date" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
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
$$;


ALTER FUNCTION "public"."get_user_goals_with_progress"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_goals_with_progress"("p_user_id" "uuid") IS 'Get all user goals with aggregated progress metrics';



CREATE OR REPLACE FUNCTION "public"."get_user_skills_graph"("p_user_id" "uuid") RETURNS TABLE("skill_id" "uuid", "skill_name" "text", "skill_level" "text", "transferable_from" "text"[], "used_in_sessions" bigint, "related_accomplishments" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as skill_id,
        s.label as skill_name,
        s.properties->>'level' as skill_level,
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(s.properties->'transferable_from')),
            ARRAY[]::TEXT[]
        ) as transferable_from,
        COUNT(DISTINCT session_edge.source_node_id) as used_in_sessions,
        COUNT(DISTINCT accomplishment.id) as related_accomplishments
    FROM graph_nodes s
    INNER JOIN graph_edges e ON s.id = e.target_node_id 
        AND e.edge_type = 'has_skill' 
        AND e.user_id = p_user_id
    LEFT JOIN graph_edges session_edge ON s.id = session_edge.target_node_id 
        AND session_edge.edge_type = 'has_skill'
        AND session_edge.user_id = p_user_id
    LEFT JOIN graph_nodes accomplishment ON accomplishment.user_id = p_user_id 
        AND accomplishment.node_type = 'accomplishment'
        AND accomplishment.properties ? 'skills'
        AND accomplishment.properties->'skills' ? s.label
        AND accomplishment.deleted_at IS NULL
    WHERE s.user_id = p_user_id 
        AND s.node_type = 'skill' 
        AND s.deleted_at IS NULL
    GROUP BY s.id, s.label, s.properties
    ORDER BY used_in_sessions DESC, s.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_skills_graph"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_skills_graph"("p_user_id" "uuid") IS 'Get all user skills with usage statistics';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at, preferences)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW(),
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
      NEW.updated_at = timezone('utc'::text, now());
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    name = NEW.raw_user_meta_data->>'name',
    full_name = NEW.raw_user_meta_data->>'full_name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NEW.updated_at
  WHERE user_id = NEW.id::text;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_voice_onboarding"("p_user_id" "uuid", "p_conversation_transcript" "text", "p_extracted_profile" "jsonb", "p_extracted_goal" "jsonb", "p_conversation_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_goal_id UUID;
    v_conversation_id UUID;
    v_profile_exists BOOLEAN;
    v_result JSONB;
BEGIN
    -- Check if user profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
    
    -- Create or update user profile with conversation-extracted data
    IF v_profile_exists THEN
        UPDATE profiles SET
            preferences = COALESCE(p_extracted_profile->'preferences', preferences),
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSE
        INSERT INTO profiles (
            id,
            preferences,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_extracted_profile->'preferences',
            NOW(),
            NOW()
        );
    END IF;

    -- Create the user's first goal from conversation
    INSERT INTO user_goals (
        user_id,
        goal_title,
        goal_description,
        goal_status,
        category_id,
        target_date,
        milestones,
        metadata,
        profile_id,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_extracted_goal->>'name',
        p_extracted_goal->>'description',
        'active',
        p_extracted_goal->>'category_id',
        CASE 
            WHEN p_extracted_goal->>'target_date' IS NOT NULL 
            THEN (p_extracted_goal->>'target_date')::TIMESTAMP 
            ELSE NULL 
        END,
        COALESCE(p_extracted_goal->'milestones', '[]'::JSONB),
        jsonb_build_object(
            'goal_type', COALESCE(p_extracted_goal->>'type', 'personal'),
            'priority_level', COALESCE((p_extracted_goal->>'priority')::INTEGER, 5),
            'source', 'voice_onboarding'
        ),
        p_user_id,
        NOW(),
        NOW()
    ) RETURNING id INTO v_goal_id;

    -- Log the onboarding conversation as the first session
    INSERT INTO voice_chat_conversations (
        created_by,
        conversation_id,
        agent_id,
        metadata,
        ended_at
    ) VALUES (
        p_user_id,
        'onboarding-' || p_user_id::TEXT,
        'OnboardingAgent',
        jsonb_build_object(
            'title', 'Welcome to LiveGuide - Onboarding',
            'description', 'Initial onboarding conversation to understand user goals and preferences',
            'status', 'completed',
            'conversation_type', 'onboarding',
            'transcript', p_conversation_transcript,
            'extracted_data', jsonb_build_object(
                'profile', p_extracted_profile,
                'goal', p_extracted_goal
            ),
            'conversation_metadata', p_conversation_metadata
        ),
        NOW()
    ) RETURNING id INTO v_conversation_id;

    -- Create success response
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'goal_id', v_goal_id,
        'conversation_id', v_conversation_id,
        'onboarding_completed', true,
        'message', 'Onboarding completed successfully',
        'next_steps', jsonb_build_array(
            'explore_dashboard',
            'start_first_coaching_session',
            'set_additional_goals'
        )
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Return error details for debugging
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE,
            'user_id', p_user_id
        );
END;
$$;


ALTER FUNCTION "public"."handle_voice_onboarding"("p_user_id" "uuid", "p_conversation_transcript" "text", "p_extracted_profile" "jsonb", "p_extracted_goal" "jsonb", "p_conversation_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hybrid_search"("query_embedding" "extensions"."vector", "query_text" "text", "kb_id_filter" "uuid", "match_count" integer DEFAULT 10, "semantic_weight" double precision DEFAULT 0.7) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "metadata" "jsonb", "similarity_score" double precision, "keyword_score" double precision, "combined_score" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT 
            d.id,
            d.title,
            d.content,
            d.metadata,
            1 - (d.embedding <=> query_embedding) AS similarity_score
        FROM public.knowledge_documents d
        WHERE d.kb_id = kb_id_filter
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT 
            d.id,
            d.title,
            d.content,
            d.metadata,
            ts_rank(d.search_vector, plainto_tsquery('english', query_text)) AS keyword_score
        FROM public.knowledge_documents d
        WHERE d.kb_id = kb_id_filter
            AND d.search_vector @@ plainto_tsquery('english', query_text)
        ORDER BY keyword_score DESC
        LIMIT match_count * 2
    ),
    combined AS (
        SELECT 
            COALESCE(s.id, k.id) AS id,
            COALESCE(s.title, k.title) AS title,
            COALESCE(s.content, k.content) AS content,
            COALESCE(s.metadata, k.metadata) AS metadata,
            COALESCE(s.similarity_score, 0) AS similarity_score,
            COALESCE(k.keyword_score, 0) AS keyword_score,
            (COALESCE(s.similarity_score, 0) * semantic_weight + 
             COALESCE(k.keyword_score, 0) * (1 - semantic_weight)) AS combined_score
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.id = k.id
    )
    SELECT * FROM combined
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."hybrid_search"("query_embedding" "extensions"."vector", "query_text" "text", "kb_id_filter" "uuid", "match_count" integer, "semantic_weight" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jsonb_diff"("old_val" "jsonb", "new_val" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."jsonb_diff"("old_val" "jsonb", "new_val" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_message_read"("p_message_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Update message read status
  UPDATE inbox_messages 
  SET is_read = true, updated_at = NOW()
  WHERE id = p_message_id AND user_id = v_user_id;
  
  -- Insert read receipt if not exists
  INSERT INTO message_read_receipts (message_id, user_id)
  VALUES (p_message_id, v_user_id)
  ON CONFLICT (message_id, user_id) DO NOTHING;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."mark_message_read"("p_message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_nodes"("query_embedding" "extensions"."vector", "match_threshold" double precision DEFAULT 0.8, "match_count" integer DEFAULT 10, "user_id_filter" "uuid" DEFAULT NULL::"uuid", "node_type_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "node_type" "text", "label" "text", "description" "text", "user_id" "uuid", "created_at" timestamp with time zone, "properties" "jsonb", "status" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT 
        gn.id,
        gn.node_type::text,
        gn.label,
        gn.description,
        gn.user_id,
        gn.created_at,
        gn.properties,
        gn.status::text,
        1 - (gn.embedding <=> query_embedding) as similarity
    FROM graph_nodes gn
    WHERE 
        gn.embedding IS NOT NULL
        AND (user_id_filter IS NULL OR gn.user_id = user_id_filter)
        AND (node_type_filter IS NULL OR gn.node_type::text = node_type_filter)
        AND 1 - (gn.embedding <=> query_embedding) > match_threshold
    ORDER BY gn.embedding <=> query_embedding
    LIMIT match_count;
$$;


ALTER FUNCTION "public"."match_nodes"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer, "user_id_filter" "uuid", "node_type_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_graph_event"("p_user_id" "uuid", "p_event_type" "public"."graph_event_type", "p_new_state" "jsonb", "p_node_id" "uuid" DEFAULT NULL::"uuid", "p_edge_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_previous_state" "jsonb" DEFAULT NULL::"jsonb", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."record_graph_event"("p_user_id" "uuid", "p_event_type" "public"."graph_event_type", "p_new_state" "jsonb", "p_node_id" "uuid", "p_edge_id" "uuid", "p_session_id" "uuid", "p_previous_state" "jsonb", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_knowledge_base"("query_embedding" "extensions"."vector", "similarity_threshold" double precision DEFAULT 0.7, "max_results" integer DEFAULT 5) RETURNS TABLE("content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.content,
        kb.metadata,
        1 - (kb.embedding <=> query_embedding) as similarity
    FROM knowledge_base kb
    WHERE 1 - (kb.embedding <=> query_embedding) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT max_results;
END;
$$;


ALTER FUNCTION "public"."search_knowledge_base"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "max_results" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_knowledge_base"("search_query" "text", "kb_id_filter" "uuid" DEFAULT NULL::"uuid", "limit_results" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "kb_id" "uuid", "kb_name" "text", "relevance_score" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kd.id,
        kd.title,
        kd.content,
        kd.kb_id,
        akb.name AS kb_name,
        ts_rank(kd.search_vector, plainto_tsquery('english', search_query)) AS relevance_score
    FROM public.knowledge_documents kd
    JOIN public.agent_knowledge_bases akb ON kd.kb_id = akb.id
    WHERE kd.search_vector @@ plainto_tsquery('english', search_query)
        AND (kb_id_filter IS NULL OR kd.kb_id = kb_id_filter)
        AND akb.is_active = true
    ORDER BY relevance_score DESC
    LIMIT limit_results;
END;
$$;


ALTER FUNCTION "public"."search_knowledge_base"("search_query" "text", "kb_id_filter" "uuid", "limit_results" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_knowledge_chunks"("query_embedding" "extensions"."vector", "knowledge_base_id_param" "uuid", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 5) RETURNS TABLE("chunk_id" "uuid", "document_id" "uuid", "document_title" "text", "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
      RETURN QUERY
      SELECT
          kc.id as chunk_id,
          kc.document_id,
          kd.title as document_title,
          kc.content,
          1 - (kc.embedding <=> query_embedding) as similarity
      FROM knowledge_chunks kc
      INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
      WHERE kd.knowledge_base_id = knowledge_base_id_param
          AND 1 - (kc.embedding <=> query_embedding) > match_threshold
      ORDER BY kc.embedding <=> query_embedding
      LIMIT match_count;
  END;
  $$;


ALTER FUNCTION "public"."search_knowledge_chunks"("query_embedding" "extensions"."vector", "knowledge_base_id_param" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_message_pin"("p_message_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE inbox_messages 
  SET is_pinned = NOT is_pinned, updated_at = NOW()
  WHERE id = p_message_id AND user_id = auth.uid();
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."toggle_message_pin"("p_message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "text", "p_intensity" numeric DEFAULT 0.5, "p_context" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_node_id UUID;
BEGIN
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        p_user_id,
        'emotion',
        p_emotion,
        COALESCE(p_context, 'Emotion: ' || p_emotion),
        jsonb_build_object(
            'intensity', p_intensity,
            'context', p_context,
            'timestamp', NOW()
        )
    )
    RETURNING id INTO v_node_id;
    
    RETURN v_node_id;
END;
$$;


ALTER FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "text", "p_intensity" numeric, "p_context" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "public"."emotion_type", "p_intensity" double precision DEFAULT 0.5, "p_context" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "public"."emotion_type", "p_intensity" double precision, "p_context" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "public"."emotion_type", "p_intensity" double precision, "p_context" "text") IS 'Helper function to track an emotional state at a point in time';



CREATE OR REPLACE FUNCTION "public"."update_document_access"("doc_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    UPDATE public.knowledge_documents
    SET 
        access_count = access_count + 1,
        last_accessed_at = TIMEZONE('utc', NOW())
    WHERE id = doc_id;
END;
$$;


ALTER FUNCTION "public"."update_document_access"("doc_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_journey"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Update or insert user journey record
    INSERT INTO public.user_coaching_journey (
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
        total_conversation_count = public.user_coaching_journey.total_conversation_count + 1,
        updated_at = TIMEZONE('utc', NOW());
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_journey"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "payload"."media" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "alt" "text",
    "filename" character varying NOT NULL,
    "mime_type" character varying,
    "filesize" numeric,
    "width" numeric,
    "height" numeric,
    "url" character varying
);


ALTER TABLE "payload"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payload"."payload_migrations" (
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "batch" integer,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "payload"."payload_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "payload"."payload_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "payload"."payload_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "payload"."payload_migrations_id_seq" OWNED BY "payload"."payload_migrations"."id";



CREATE TABLE IF NOT EXISTS "payload"."payload_preferences" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "key" character varying NOT NULL,
    "value" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "payload"."payload_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payload"."users" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "email" character varying NOT NULL,
    "reset_password_token" character varying,
    "reset_password_expiration" timestamp with time zone,
    "salt" character varying,
    "hash" character varying,
    "_verified" boolean DEFAULT false,
    "_verificationtoken" character varying,
    "loginAttempts" numeric DEFAULT 0,
    "lockUntil" timestamp with time zone,
    "enable_api_key" boolean DEFAULT false,
    "api_key" character varying,
    "api_key_index" character varying
);


ALTER TABLE "payload"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payload"."users_sessions" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "_order" integer DEFAULT 0 NOT NULL,
    "_parent_id" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "payload"."users_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_knowledge_bases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "indexing_status" "text" DEFAULT 'pending'::"text",
    "document_count" integer DEFAULT 0,
    "total_chunks" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "agent_knowledge_bases_indexing_status_check" CHECK (("indexing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."agent_knowledge_bases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_personae" (
    "uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id" "uuid",
    "Goal Category" "text",
    "Category" "text",
    "Name" "text",
    "Speciality" "text",
    "Key Features" "text",
    "Tone and Style" "text",
    "Personality" "text",
    "Backstory" "text",
    "Strengths" "text",
    "Image" "text",
    "JSONB" "jsonb",
    "11labs_agentID" "text",
    "voice_profile" "jsonb" DEFAULT '{}'::"jsonb",
    "response_templates" "jsonb" DEFAULT '{}'::"jsonb",
    "availability_status" "text",
    "average_rating" numeric,
    "video_intro" "text"
);


ALTER TABLE "public"."agent_personae" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coaching_effectiveness" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "total_conversations" integer DEFAULT 0,
    "total_duration_minutes" integer DEFAULT 0,
    "average_conversation_length" numeric(5,2),
    "conversation_frequency" "jsonb" DEFAULT '{}'::"jsonb",
    "goals_set" integer DEFAULT 0,
    "goals_completed" integer DEFAULT 0,
    "goals_in_progress" integer DEFAULT 0,
    "goal_completion_rate" numeric(3,2),
    "average_goal_duration_days" numeric(5,2),
    "milestones_reached" integer DEFAULT 0,
    "action_items_completed" integer DEFAULT 0,
    "user_satisfaction_score" numeric(3,2),
    "recommendation_likelihood" integer,
    "primary_coaching_areas" "text"[] DEFAULT '{}'::"text"[],
    "coaching_style_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."coaching_effectiveness" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "text" NOT NULL,
    "agent_id" "text" NOT NULL,
    "user_id" "uuid",
    "summary" "text",
    "topics" "text"[] DEFAULT '{}'::"text"[],
    "sentiment" "jsonb" DEFAULT '{}'::"jsonb",
    "goals_mentioned" "jsonb" DEFAULT '[]'::"jsonb",
    "action_items" "jsonb" DEFAULT '[]'::"jsonb",
    "coaching_areas" "text"[] DEFAULT '{}'::"text"[],
    "key_phrases" "jsonb" DEFAULT '[]'::"jsonb",
    "duration_seconds" integer,
    "message_count" integer DEFAULT 0,
    "tool_calls_count" integer DEFAULT 0,
    "engagement_score" numeric(3,2),
    "clarity_score" numeric(3,2),
    "progress_indicators" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."conversation_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "knowledge_base_id" "uuid" NOT NULL,
    "document_id" "uuid",
    "chunk_id" "uuid",
    "query_text" "text",
    "conversation_id" "text",
    "user_id" "uuid",
    "access_type" "text" DEFAULT 'search'::"text",
    "relevance_score" double precision,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "document_access_logs_access_type_check" CHECK (("access_type" = ANY (ARRAY['search'::"text", 'direct'::"text", 'suggestion'::"text"])))
);


ALTER TABLE "public"."document_access_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_categories" (
    "document_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."document_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "chunk_index" integer NOT NULL,
    "embedding" "extensions"."vector"(1536) NOT NULL,
    "previous_chunk_id" "uuid",
    "next_chunk_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."document_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."elevenlabs_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "agent_id" "text",
    "status" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "duration_minutes" integer,
    "scheduled_duration" integer,
    "call_type" "text",
    "interaction_metrics" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."elevenlabs_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embedding_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "node_id" "uuid",
    "content" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "error_message" "text",
    CONSTRAINT "embedding_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."embedding_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_categories" (
    "id" "text" NOT NULL,
    "title" "text",
    "display_color" "text",
    "icon_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."goal_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "milestone" "text" NOT NULL,
    "description" "text",
    "progress_percentage" integer DEFAULT 0,
    "conversation_id" "text",
    "evidence" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'in_progress'::"text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "goal_progress_progress_percentage_check" CHECK ((("progress_percentage" >= 0) AND ("progress_percentage" <= 100))),
    CONSTRAINT "goal_progress_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'verified'::"text"])))
);


ALTER TABLE "public"."goal_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."graph_edges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "edge_type" "public"."edge_type" NOT NULL,
    "source_node_id" "uuid" NOT NULL,
    "target_node_id" "uuid" NOT NULL,
    "properties" "jsonb" DEFAULT '{}'::"jsonb",
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_to" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discovered_at" timestamp with time zone DEFAULT "now"(),
    "strength_history" "jsonb" DEFAULT '[]'::"jsonb",
    "last_reinforced_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "different_nodes" CHECK (("source_node_id" <> "target_node_id")),
    CONSTRAINT "valid_temporal_range" CHECK ((("valid_to" IS NULL) OR ("valid_to" > "valid_from")))
);


ALTER TABLE "public"."graph_edges" OWNER TO "postgres";


COMMENT ON TABLE "public"."graph_edges" IS 'Stores relationships between nodes with temporal support for changing relationships';



CREATE TABLE IF NOT EXISTS "public"."graph_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "node_id" "uuid",
    "edge_id" "uuid",
    "session_id" "uuid",
    "event_type" "public"."graph_event_type" NOT NULL,
    "previous_state" "jsonb",
    "new_state" "jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "check_entity_reference" CHECK (((("node_id" IS NOT NULL) AND ("edge_id" IS NULL)) OR (("node_id" IS NULL) AND ("edge_id" IS NOT NULL)) OR (("node_id" IS NULL) AND ("edge_id" IS NULL))))
);


ALTER TABLE "public"."graph_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."graph_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "node_type" "public"."node_type" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "properties" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "status" "public"."node_status" DEFAULT 'draft_verbal'::"public"."node_status",
    "embedding" "extensions"."vector",
    "embedding_generated_at" timestamp with time zone,
    "embedding_status" "text" DEFAULT 'pending'::"text",
    "first_mentioned_at" timestamp with time zone DEFAULT "now"(),
    "last_discussed_at" timestamp with time zone DEFAULT "now"(),
    "session_mentions" "jsonb" DEFAULT '[]'::"jsonb",
    "evolution_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "valid_node_label" CHECK ((("char_length"("label") >= 1) AND ("char_length"("label") <= 255)))
);


ALTER TABLE "public"."graph_nodes" OWNER TO "postgres";


COMMENT ON TABLE "public"."graph_nodes" IS 'Stores all nodes in the coaching graph: goals, skills, emotions, sessions, and accomplishments';



CREATE OR REPLACE VIEW "public"."graph_monitoring_dashboard" AS
 SELECT "u"."id" AS "user_id",
    "u"."email",
    "count"("gn"."id") AS "total_nodes",
    "count"("gn"."embedding") AS "nodes_with_embeddings",
    "count"(*) FILTER (WHERE ("gn"."embedding_status" = 'pending'::"text")) AS "pending_embeddings",
    "count"(*) FILTER (WHERE ("gn"."embedding_status" = 'generating'::"text")) AS "generating_embeddings",
    "count"(*) FILTER (WHERE ("gn"."embedding_status" = 'failed'::"text")) AS "failed_embeddings",
    "count"("ge"."id") AS "total_edges",
    "count"(DISTINCT "ge"."edge_type") AS "unique_edge_types",
    "round"((("count"("ge"."id"))::numeric / (NULLIF("count"("gn"."id"), 0))::numeric), 2) AS "avg_edges_per_node",
    "max"("gn"."created_at") AS "last_node_created",
    "max"("ge"."created_at") AS "last_edge_created",
    "count"(*) FILTER (WHERE ("gn"."created_at" > ("now"() - '24:00:00'::interval))) AS "nodes_created_today",
    "count"(*) FILTER (WHERE ("ge"."created_at" > ("now"() - '24:00:00'::interval))) AS "edges_created_today"
   FROM (("auth"."users" "u"
     LEFT JOIN "public"."graph_nodes" "gn" ON ((("u"."id" = "gn"."user_id") AND ("gn"."deleted_at" IS NULL))))
     LEFT JOIN "public"."graph_edges" "ge" ON (("u"."id" = "ge"."user_id")))
  GROUP BY "u"."id", "u"."email"
 HAVING ("count"("gn"."id") > 0)
  ORDER BY ("count"("gn"."id")) DESC;


ALTER TABLE "public"."graph_monitoring_dashboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inbox_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sender_type" "text" DEFAULT 'ai_coach'::"text" NOT NULL,
    "sender_id" "text" NOT NULL,
    "sender_name" "text" NOT NULL,
    "sender_avatar_url" "text",
    "message_type" "public"."message_type" NOT NULL,
    "priority" "public"."message_priority" DEFAULT 'medium'::"public"."message_priority",
    "subject" "text" NOT NULL,
    "preview" "text" NOT NULL,
    "content" "jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_read" boolean DEFAULT false,
    "is_pinned" boolean DEFAULT false,
    "is_archived" boolean DEFAULT false,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inbox_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "extensions"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "source_type" character varying(50) DEFAULT 'manual'::character varying,
    "source_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_base" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "knowledge_base_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "parent_category_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."knowledge_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_chunks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "extensions"."vector"(1536),
    "chunk_index" integer NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."knowledge_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "knowledge_base_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "source_url" "text",
    "document_type" "text" DEFAULT 'text'::"text",
    "content_hash" "text" NOT NULL,
    "chunk_count" integer DEFAULT 0,
    "embedding" "extensions"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "knowledge_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['text'::"text", 'markdown'::"text", 'pdf'::"text", 'html'::"text"])))
);


ALTER TABLE "public"."knowledge_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "attachment_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "url" "text" NOT NULL,
    "thumbnail_url" "text",
    "duration_seconds" integer,
    "file_size_bytes" bigint,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_read_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"(),
    "device_info" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."message_read_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone,
    "full_name" "text",
    "locale" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_completed_at" timestamp with time zone,
    "coaching_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "selected_goals" "jsonb" DEFAULT '[]'::"jsonb",
    "goals_updated_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."selected_goals" IS 'Array of user-selected goals with structure: {id, title, category, timescale, confidence}';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text",
    "stripe_id" "text",
    "price_id" "text",
    "stripe_price_id" "text",
    "currency" "text",
    "interval" "text",
    "status" "text",
    "current_period_start" bigint,
    "current_period_end" bigint,
    "cancel_at_period_end" boolean,
    "amount" bigint,
    "started_at" bigint,
    "ends_at" bigint,
    "ended_at" bigint,
    "canceled_at" bigint,
    "customer_cancellation_reason" "text",
    "customer_cancellation_comment" "text",
    "metadata" "jsonb",
    "custom_field_data" "jsonb",
    "customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_coaching_journey" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "onboarding_completed" boolean DEFAULT false,
    "onboarding_completed_at" timestamp with time zone,
    "preferred_coaching_style" "text",
    "preferred_session_length" integer,
    "preferred_frequency" "text",
    "total_goals_set" integer DEFAULT 0,
    "total_goals_achieved" integer DEFAULT 0,
    "current_streak_days" integer DEFAULT 0,
    "longest_streak_days" integer DEFAULT 0,
    "last_conversation_at" timestamp with time zone,
    "total_conversation_count" integer DEFAULT 0,
    "interests" "text"[] DEFAULT '{}'::"text"[],
    "challenges" "text"[] DEFAULT '{}'::"text"[],
    "strengths" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_coaching_journey" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "goal_title" "text",
    "goal_description" "text",
    "goal_status" "text" DEFAULT 'pending'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "profile_id" "uuid",
    "category_id" "text",
    "target_date" timestamp with time zone,
    "milestones" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."user_goals" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_goals_graph" AS
 SELECT "g"."id",
    "g"."user_id",
    "g"."label" AS "title",
    "g"."description",
    ("g"."properties" ->> 'category'::"text") AS "category",
    (("g"."properties" ->> 'target_date'::"text"))::"date" AS "target_date",
    ("g"."properties" ->> 'priority'::"text") AS "priority",
    "g"."created_at",
    "g"."updated_at"
   FROM "public"."graph_nodes" "g"
  WHERE (("g"."node_type" = 'goal'::"public"."node_type") AND ("g"."deleted_at" IS NULL));


ALTER TABLE "public"."user_goals_graph" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."user_timeline" AS
 SELECT "event_counts"."user_id",
    "date_trunc"('hour'::"text", "event_counts"."created_at") AS "time_bucket",
    "count"(*) AS "event_count",
    "jsonb_agg"(DISTINCT "event_counts"."session_id") FILTER (WHERE ("event_counts"."session_id" IS NOT NULL)) AS "sessions",
    "jsonb_object_agg"(("event_counts"."event_type")::"text", "event_counts"."count") AS "event_types"
   FROM ( SELECT "graph_events"."user_id",
            "graph_events"."created_at",
            "graph_events"."session_id",
            "graph_events"."event_type",
            "count"(*) OVER (PARTITION BY "graph_events"."user_id", ("date_trunc"('hour'::"text", "graph_events"."created_at")), "graph_events"."event_type") AS "count"
           FROM "public"."graph_events") "event_counts"
  GROUP BY "event_counts"."user_id", ("date_trunc"('hour'::"text", "event_counts"."created_at"))
  WITH NO DATA;


ALTER TABLE "public"."user_timeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "avatar_url" "text",
    "user_id" "text",
    "token_identifier" "text" NOT NULL,
    "subscription" "text",
    "credits" "text",
    "image" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone,
    "email" "text",
    "name" "text",
    "full_name" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voice_chat_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "text" NOT NULL,
    "agent_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid"
);


ALTER TABLE "public"."voice_chat_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voice_chat_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "anonymous_id" "text",
    "conversation_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "voice_chat_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['agent_speech'::"text", 'user_response'::"text", 'goals_detected'::"text", 'goal_matched'::"text", 'category_matched'::"text"])))
);


ALTER TABLE "public"."voice_chat_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "type" "text" NOT NULL,
    "stripe_event_id" "text",
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


ALTER TABLE ONLY "payload"."payload_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"payload"."payload_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "payload"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payload"."payload_migrations"
    ADD CONSTRAINT "payload_migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "payload"."payload_migrations"
    ADD CONSTRAINT "payload_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payload"."payload_preferences"
    ADD CONSTRAINT "payload_preferences_key_key" UNIQUE ("key");



ALTER TABLE ONLY "payload"."payload_preferences"
    ADD CONSTRAINT "payload_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payload"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "payload"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payload"."users_sessions"
    ADD CONSTRAINT "users_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_knowledge_bases"
    ADD CONSTRAINT "agent_knowledge_bases_agent_id_name_key" UNIQUE ("agent_id", "name");



ALTER TABLE ONLY "public"."agent_knowledge_bases"
    ADD CONSTRAINT "agent_knowledge_bases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_personae"
    ADD CONSTRAINT "agent_personae_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."coaching_effectiveness"
    ADD CONSTRAINT "coaching_effectiveness_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coaching_effectiveness"
    ADD CONSTRAINT "coaching_effectiveness_user_id_period_start_period_end_key" UNIQUE ("user_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."conversation_insights"
    ADD CONSTRAINT "conversation_insights_conversation_id_key" UNIQUE ("conversation_id");



ALTER TABLE ONLY "public"."conversation_insights"
    ADD CONSTRAINT "conversation_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_access_logs"
    ADD CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_categories"
    ADD CONSTRAINT "document_categories_pkey" PRIMARY KEY ("document_id", "category_id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_document_id_chunk_index_key" UNIQUE ("document_id", "chunk_index");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elevenlabs_conversations"
    ADD CONSTRAINT "elevenlabs_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embedding_queue"
    ADD CONSTRAINT "embedding_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_categories"
    ADD CONSTRAINT "goal_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_progress"
    ADD CONSTRAINT "goal_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_progress"
    ADD CONSTRAINT "goal_progress_user_id_goal_id_milestone_key" UNIQUE ("user_id", "goal_id", "milestone");



ALTER TABLE ONLY "public"."graph_edges"
    ADD CONSTRAINT "graph_edges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."graph_events"
    ADD CONSTRAINT "graph_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."graph_nodes"
    ADD CONSTRAINT "graph_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inbox_messages"
    ADD CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_categories"
    ADD CONSTRAINT "knowledge_categories_knowledge_base_id_name_key" UNIQUE ("knowledge_base_id", "name");



ALTER TABLE ONLY "public"."knowledge_categories"
    ADD CONSTRAINT "knowledge_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_knowledge_base_id_content_hash_key" UNIQUE ("knowledge_base_id", "content_hash");



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_id_key" UNIQUE ("stripe_id");



ALTER TABLE ONLY "public"."user_coaching_journey"
    ADD CONSTRAINT "user_coaching_journey_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_coaching_journey"
    ADD CONSTRAINT "user_coaching_journey_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."voice_chat_conversations"
    ADD CONSTRAINT "voice_chat_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_chat_events"
    ADD CONSTRAINT "voice_chat_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



CREATE INDEX "media_created_at_idx" ON "payload"."media" USING "btree" ("created_at");



CREATE INDEX "users_created_at_idx" ON "payload"."users" USING "btree" ("created_at");



CREATE INDEX "users_email_idx" ON "payload"."users" USING "btree" ("email");



CREATE INDEX "users_sessions_expires_idx" ON "payload"."users_sessions" USING "btree" ("expires_at");



CREATE INDEX "users_sessions_parent_idx" ON "payload"."users_sessions" USING "btree" ("_parent_id");



CREATE INDEX "idx_agent_personae_category" ON "public"."agent_personae" USING "btree" ("Category");



CREATE INDEX "idx_agent_personae_elevenlabs_id" ON "public"."agent_personae" USING "btree" ("11labs_agentID");



CREATE INDEX "idx_coaching_effectiveness_user_period" ON "public"."coaching_effectiveness" USING "btree" ("user_id", "period_start");



CREATE INDEX "idx_conversation_insights_agent_id" ON "public"."conversation_insights" USING "btree" ("agent_id");



CREATE INDEX "idx_conversation_insights_created_at" ON "public"."conversation_insights" USING "btree" ("created_at");



CREATE INDEX "idx_conversation_insights_user_id" ON "public"."conversation_insights" USING "btree" ("user_id");



CREATE INDEX "idx_document_access_created" ON "public"."document_access_logs" USING "btree" ("created_at");



CREATE INDEX "idx_document_access_doc" ON "public"."document_access_logs" USING "btree" ("document_id");



CREATE INDEX "idx_document_access_kb" ON "public"."document_access_logs" USING "btree" ("knowledge_base_id");



CREATE INDEX "idx_document_chunks_doc_id" ON "public"."document_chunks" USING "btree" ("document_id");



CREATE INDEX "idx_document_chunks_embedding" ON "public"."document_chunks" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_elevenlabs_conversations_agent_id" ON "public"."elevenlabs_conversations" USING "btree" ("agent_id");



CREATE INDEX "idx_elevenlabs_conversations_created_at" ON "public"."elevenlabs_conversations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_elevenlabs_conversations_status" ON "public"."elevenlabs_conversations" USING "btree" ("status");



CREATE INDEX "idx_elevenlabs_conversations_user_id" ON "public"."elevenlabs_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_embedding_queue_node_id" ON "public"."embedding_queue" USING "btree" ("node_id");



CREATE INDEX "idx_embedding_queue_status" ON "public"."embedding_queue" USING "btree" ("status");



CREATE INDEX "idx_goal_categories_title" ON "public"."goal_categories" USING "btree" ("title");



CREATE INDEX "idx_goal_progress_status" ON "public"."goal_progress" USING "btree" ("status");



CREATE INDEX "idx_goal_progress_user_goal" ON "public"."goal_progress" USING "btree" ("user_id", "goal_id");



CREATE INDEX "idx_graph_edges_properties" ON "public"."graph_edges" USING "gin" ("properties");



CREATE INDEX "idx_graph_edges_source" ON "public"."graph_edges" USING "btree" ("source_node_id");



CREATE INDEX "idx_graph_edges_source_type" ON "public"."graph_edges" USING "btree" ("source_node_id", "edge_type");



CREATE INDEX "idx_graph_edges_target" ON "public"."graph_edges" USING "btree" ("target_node_id");



CREATE INDEX "idx_graph_edges_target_type" ON "public"."graph_edges" USING "btree" ("target_node_id", "edge_type");



CREATE INDEX "idx_graph_edges_temporal" ON "public"."graph_edges" USING "btree" ("valid_from", "valid_to");



CREATE INDEX "idx_graph_edges_type" ON "public"."graph_edges" USING "btree" ("edge_type");



CREATE INDEX "idx_graph_edges_user_id" ON "public"."graph_edges" USING "btree" ("user_id");



CREATE INDEX "idx_graph_edges_user_type" ON "public"."graph_edges" USING "btree" ("user_id", "edge_type");



CREATE INDEX "idx_graph_events_created_at" ON "public"."graph_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_graph_events_edge" ON "public"."graph_events" USING "btree" ("edge_id") WHERE ("edge_id" IS NOT NULL);



CREATE INDEX "idx_graph_events_node" ON "public"."graph_events" USING "btree" ("node_id") WHERE ("node_id" IS NOT NULL);



CREATE INDEX "idx_graph_events_session" ON "public"."graph_events" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_graph_events_type" ON "public"."graph_events" USING "btree" ("event_type");



CREATE INDEX "idx_graph_events_user_time" ON "public"."graph_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_graph_nodes_created_at" ON "public"."graph_nodes" USING "btree" ("created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_graph_nodes_properties" ON "public"."graph_nodes" USING "gin" ("properties") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_graph_nodes_type" ON "public"."graph_nodes" USING "btree" ("node_type") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_graph_nodes_unique_user_type_label" ON "public"."graph_nodes" USING "btree" ("user_id", "node_type", "label") WHERE ("deleted_at" IS NULL);



COMMENT ON INDEX "public"."idx_graph_nodes_unique_user_type_label" IS 'Ensures no duplicate nodes with same user_id, node_type, and label for non-deleted nodes';



CREATE INDEX "idx_graph_nodes_user_id" ON "public"."graph_nodes" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_inbox_messages_created_at" ON "public"."inbox_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_inbox_messages_expires_at" ON "public"."inbox_messages" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_inbox_messages_is_pinned" ON "public"."inbox_messages" USING "btree" ("is_pinned") WHERE "is_pinned";



CREATE INDEX "idx_inbox_messages_is_read" ON "public"."inbox_messages" USING "btree" ("is_read") WHERE (NOT "is_read");



CREATE INDEX "idx_inbox_messages_tags" ON "public"."inbox_messages" USING "gin" ("tags");



CREATE INDEX "idx_inbox_messages_user_id" ON "public"."inbox_messages" USING "btree" ("user_id");



CREATE INDEX "idx_knowledge_chunks_document_id" ON "public"."knowledge_chunks" USING "btree" ("document_id");



CREATE INDEX "idx_knowledge_chunks_embedding" ON "public"."knowledge_chunks" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_knowledge_documents_embedding" ON "public"."knowledge_documents" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_knowledge_documents_kb_id" ON "public"."knowledge_documents" USING "btree" ("knowledge_base_id");



CREATE INDEX "idx_message_attachments_message_id" ON "public"."message_attachments" USING "btree" ("message_id");



CREATE INDEX "idx_profiles_created_at" ON "public"."profiles" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_profiles_goals_updated_at" ON "public"."profiles" USING "btree" ("goals_updated_at");



CREATE INDEX "idx_profiles_onboarding_completed_at" ON "public"."profiles" USING "btree" ("onboarding_completed_at");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_user_goals_category_id" ON "public"."user_goals" USING "btree" ("category_id");



CREATE INDEX "idx_user_goals_created_at" ON "public"."user_goals" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_goals_profile_id" ON "public"."user_goals" USING "btree" ("profile_id");



CREATE INDEX "idx_user_goals_status" ON "public"."user_goals" USING "btree" ("goal_status");



CREATE INDEX "idx_user_goals_user_id" ON "public"."user_goals" USING "btree" ("user_id");



CREATE INDEX "idx_user_timeline_user_time" ON "public"."user_timeline" USING "btree" ("user_id", "time_bucket" DESC);



CREATE INDEX "idx_voice_chat_conversations_agent_id" ON "public"."voice_chat_conversations" USING "btree" ("agent_id");



CREATE INDEX "idx_voice_chat_conversations_conversation_id" ON "public"."voice_chat_conversations" USING "btree" ("conversation_id");



CREATE INDEX "idx_voice_chat_conversations_created_at" ON "public"."voice_chat_conversations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_voice_chat_conversations_created_by" ON "public"."voice_chat_conversations" USING "btree" ("created_by");



CREATE INDEX "idx_voice_chat_events_conversation_id" ON "public"."voice_chat_events" USING "btree" ("conversation_id");



CREATE INDEX "idx_voice_chat_events_created_at" ON "public"."voice_chat_events" USING "btree" ("created_at");



CREATE INDEX "idx_voice_chat_events_user_id" ON "public"."voice_chat_events" USING "btree" ("user_id");



CREATE INDEX "knowledge_base_created_at_idx" ON "public"."knowledge_base" USING "btree" ("created_at" DESC);



CREATE INDEX "knowledge_base_embedding_idx" ON "public"."knowledge_base" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "knowledge_base_metadata_idx" ON "public"."knowledge_base" USING "gin" ("metadata");



CREATE INDEX "knowledge_base_source_type_idx" ON "public"."knowledge_base" USING "btree" ("source_type");



CREATE INDEX "subscriptions_stripe_id_idx" ON "public"."subscriptions" USING "btree" ("stripe_id");



CREATE INDEX "subscriptions_user_id_idx" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "webhook_events_event_type_idx" ON "public"."webhook_events" USING "btree" ("event_type");



CREATE INDEX "webhook_events_stripe_event_id_idx" ON "public"."webhook_events" USING "btree" ("stripe_event_id");



CREATE INDEX "webhook_events_type_idx" ON "public"."webhook_events" USING "btree" ("type");



CREATE OR REPLACE TRIGGER "trigger_record_edge_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."graph_edges" FOR EACH ROW EXECUTE FUNCTION "public"."auto_record_edge_event"();



CREATE OR REPLACE TRIGGER "trigger_record_node_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."graph_nodes" FOR EACH ROW EXECUTE FUNCTION "public"."auto_record_node_event"();

ALTER TABLE "public"."graph_nodes" DISABLE TRIGGER "trigger_record_node_events";



CREATE OR REPLACE TRIGGER "update_graph_edges_updated_at" BEFORE UPDATE ON "public"."graph_edges" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_graph_nodes_updated_at" BEFORE UPDATE ON "public"."graph_nodes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_journey_on_conversation" AFTER INSERT ON "public"."conversation_insights" FOR EACH ROW WHEN (("new"."user_id" IS NOT NULL)) EXECUTE FUNCTION "public"."update_user_journey"();



CREATE OR REPLACE TRIGGER "update_knowledge_base_updated_at" BEFORE UPDATE ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_knowledge_chunks_updated_at" BEFORE UPDATE ON "public"."knowledge_chunks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "payload"."users_sessions"
    ADD CONSTRAINT "users_sessions__parent_id_fkey" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coaching_effectiveness"
    ADD CONSTRAINT "coaching_effectiveness_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversation_insights"
    ADD CONSTRAINT "conversation_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."document_access_logs"
    ADD CONSTRAINT "document_access_logs_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."document_chunks"("id");



ALTER TABLE ONLY "public"."document_access_logs"
    ADD CONSTRAINT "document_access_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id");



ALTER TABLE ONLY "public"."document_access_logs"
    ADD CONSTRAINT "document_access_logs_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."agent_knowledge_bases"("id");



ALTER TABLE ONLY "public"."document_access_logs"
    ADD CONSTRAINT "document_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."document_categories"
    ADD CONSTRAINT "document_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."knowledge_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_categories"
    ADD CONSTRAINT "document_categories_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_next_chunk_id_fkey" FOREIGN KEY ("next_chunk_id") REFERENCES "public"."document_chunks"("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_previous_chunk_id_fkey" FOREIGN KEY ("previous_chunk_id") REFERENCES "public"."document_chunks"("id");



ALTER TABLE ONLY "public"."elevenlabs_conversations"
    ADD CONSTRAINT "elevenlabs_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embedding_queue"
    ADD CONSTRAINT "embedding_queue_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_progress"
    ADD CONSTRAINT "goal_progress_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."user_goals"("id");



ALTER TABLE ONLY "public"."goal_progress"
    ADD CONSTRAINT "goal_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."graph_edges"
    ADD CONSTRAINT "graph_edges_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."graph_edges"
    ADD CONSTRAINT "graph_edges_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."graph_edges"
    ADD CONSTRAINT "graph_edges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."graph_events"
    ADD CONSTRAINT "graph_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."graph_events"
    ADD CONSTRAINT "graph_events_edge_id_fkey" FOREIGN KEY ("edge_id") REFERENCES "public"."graph_edges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."graph_events"
    ADD CONSTRAINT "graph_events_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."graph_events"
    ADD CONSTRAINT "graph_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."graph_nodes"("id");



ALTER TABLE ONLY "public"."graph_events"
    ADD CONSTRAINT "graph_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."graph_nodes"
    ADD CONSTRAINT "graph_nodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inbox_messages"
    ADD CONSTRAINT "inbox_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_categories"
    ADD CONSTRAINT "knowledge_categories_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."agent_knowledge_bases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_categories"
    ADD CONSTRAINT "knowledge_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."knowledge_categories"("id");



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."agent_knowledge_bases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."inbox_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."inbox_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read_receipts"
    ADD CONSTRAINT "message_read_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."user_coaching_journey"
    ADD CONSTRAINT "user_coaching_journey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."goal_categories"("id");



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_chat_conversations"
    ADD CONSTRAINT "voice_chat_conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_chat_events"
    ADD CONSTRAINT "voice_chat_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read access to agent personae" ON "public"."agent_personae" FOR SELECT USING (true);



COMMENT ON POLICY "Allow public read access to agent personae" ON "public"."agent_personae" IS 'Intentional public access - users need to see available AI coaches before authentication';



CREATE POLICY "Allow public read access to goal categories" ON "public"."goal_categories" FOR SELECT USING (true);



COMMENT ON POLICY "Allow public read access to goal categories" ON "public"."goal_categories" IS 'Intentional public access - goal categories need to be visible for onboarding flow';



CREATE POLICY "Allow read-only access to authenticated users" ON "public"."knowledge_base" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read knowledge chunks" ON "public"."knowledge_chunks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Deny all client-side access to webhook_events" ON "public"."webhook_events" USING (false) WITH CHECK (false);



CREATE POLICY "Service role can insert attachments" ON "public"."message_attachments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert messages" ON "public"."inbox_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage access logs" ON "public"."document_access_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage knowledge chunks" ON "public"."knowledge_chunks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."voice_chat_events" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role has full access to categories" ON "public"."knowledge_categories" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to chunks" ON "public"."document_chunks" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to document categories" ON "public"."document_categories" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to documents" ON "public"."knowledge_documents" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to effectiveness" ON "public"."coaching_effectiveness" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to goals" ON "public"."user_goals" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to insights" ON "public"."conversation_insights" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to journey" ON "public"."user_coaching_journey" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to knowledge bases" ON "public"."agent_knowledge_bases" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to progress" ON "public"."goal_progress" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can archive their own messages" ON "public"."inbox_messages" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND ("is_archived" = true)));



CREATE POLICY "Users can create own goals" ON "public"."user_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own edges" ON "public"."graph_edges" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own graph events" ON "public"."graph_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own nodes" ON "public"."graph_nodes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own edges" ON "public"."graph_edges" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own voice events" ON "public"."voice_chat_events" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (("auth"."uid"() IS NULL) AND ("anonymous_id" IS NOT NULL))));



CREATE POLICY "Users can insert their own read receipts" ON "public"."message_read_receipts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own conversations" ON "public"."elevenlabs_conversations" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own embedding queue" ON "public"."embedding_queue" USING ((EXISTS ( SELECT 1
   FROM "public"."graph_nodes"
  WHERE (("graph_nodes"."id" = "embedding_queue"."node_id") AND ("graph_nodes"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own goals" ON "public"."user_goals" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own voice chat conversations" ON "public"."voice_chat_conversations" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can read own voice events" ON "public"."voice_chat_events" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (("auth"."uid"() IS NULL) AND ("anonymous_id" IS NOT NULL))));



CREATE POLICY "Users can soft delete their own nodes" ON "public"."graph_nodes" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can update own goals" ON "public"."user_goals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own edges" ON "public"."graph_edges" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own goals" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own messages" ON "public"."inbox_messages" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own nodes" ON "public"."graph_nodes" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view and edit their own profile" ON "public"."profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view attachments for their messages" ON "public"."message_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."inbox_messages"
  WHERE (("inbox_messages"."id" = "message_attachments"."message_id") AND ("inbox_messages"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own coaching effectiveness" ON "public"."coaching_effectiveness" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own conversation insights" ON "public"."conversation_insights" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own data" ON "public"."users" FOR SELECT USING ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "Users can view own goal progress" ON "public"."goal_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own goals" ON "public"."user_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own journey" ON "public"."user_coaching_journey" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" FOR SELECT USING ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "Users can view their archived messages" ON "public"."inbox_messages" FOR SELECT USING ((("auth"."uid"() = "user_id") AND "is_archived"));



CREATE POLICY "Users can view their own edges" ON "public"."graph_edges" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own graph events" ON "public"."graph_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own messages" ON "public"."inbox_messages" FOR SELECT USING ((("auth"."uid"() = "user_id") AND (NOT "is_archived")));



CREATE POLICY "Users can view their own nodes" ON "public"."graph_nodes" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view their own read receipts" ON "public"."message_read_receipts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."agent_knowledge_bases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_personae" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coaching_effectiveness" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."elevenlabs_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embedding_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."graph_edges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."graph_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."graph_nodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inbox_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_read_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_coaching_journey" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_chat_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_chat_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_goals";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
















































GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";




















































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."archive_message"("p_message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_message"("p_message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_message"("p_message_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_record_edge_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_record_edge_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_record_edge_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_record_node_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_record_node_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_record_node_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("message_count" integer, "duration_seconds" integer, "tool_calls_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("message_count" integer, "duration_seconds" integer, "tool_calls_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("message_count" integer, "duration_seconds" integer, "tool_calls_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_goal_node"("p_user_id" "uuid", "p_title" "text", "p_category" "text", "p_properties" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_goal_node"("p_user_id" "uuid", "p_title" "text", "p_category" "text", "p_properties" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_goal_node"("p_user_id" "uuid", "p_title" "text", "p_category" "text", "p_properties" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration_minutes" integer, "p_summary" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration_minutes" integer, "p_summary" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration_minutes" integer, "p_summary" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration" integer, "p_summary" "text", "p_properties" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration" integer, "p_summary" "text", "p_properties" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_session_node"("p_user_id" "uuid", "p_goal_id" "uuid", "p_duration" integer, "p_summary" "text", "p_properties" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "text", "p_transferable_from" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "text", "p_transferable_from" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "text", "p_transferable_from" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "public"."skill_level", "p_transferable_from" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "public"."skill_level", "p_transferable_from" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_skill_node"("p_user_id" "uuid", "p_skill_name" "text", "p_level" "public"."skill_level", "p_transferable_from" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_connected_insights"("start_node_id" "uuid", "user_id_filter" "uuid", "max_depth" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_connected_insights"("start_node_id" "uuid", "user_id_filter" "uuid", "max_depth" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_connected_insights"("start_node_id" "uuid", "user_id_filter" "uuid", "max_depth" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";



GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agents_by_category"("category_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agents_by_category"("category_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agents_by_category"("category_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_graph_snapshot"("p_user_id" "uuid", "p_timestamp" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_graph_snapshot"("p_user_id" "uuid", "p_timestamp" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_graph_snapshot"("p_user_id" "uuid", "p_timestamp" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_node_evolution"("p_node_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_node_evolution"("p_node_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_node_evolution"("p_node_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_onboarding_status"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_onboarding_status"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_onboarding_status"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_goals_with_progress"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_goals_with_progress"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_goals_with_progress"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_skills_graph"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_skills_graph"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_skills_graph"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_voice_onboarding"("p_user_id" "uuid", "p_conversation_transcript" "text", "p_extracted_profile" "jsonb", "p_extracted_goal" "jsonb", "p_conversation_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_voice_onboarding"("p_user_id" "uuid", "p_conversation_transcript" "text", "p_extracted_profile" "jsonb", "p_extracted_goal" "jsonb", "p_conversation_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_voice_onboarding"("p_user_id" "uuid", "p_conversation_transcript" "text", "p_extracted_profile" "jsonb", "p_extracted_goal" "jsonb", "p_conversation_metadata" "jsonb") TO "service_role";






GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."jsonb_diff"("old_val" "jsonb", "new_val" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."jsonb_diff"("old_val" "jsonb", "new_val" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."jsonb_diff"("old_val" "jsonb", "new_val" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_message_read"("p_message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_message_read"("p_message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_message_read"("p_message_id" "uuid") TO "service_role";






GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_graph_event"("p_user_id" "uuid", "p_event_type" "public"."graph_event_type", "p_new_state" "jsonb", "p_node_id" "uuid", "p_edge_id" "uuid", "p_session_id" "uuid", "p_previous_state" "jsonb", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_graph_event"("p_user_id" "uuid", "p_event_type" "public"."graph_event_type", "p_new_state" "jsonb", "p_node_id" "uuid", "p_edge_id" "uuid", "p_session_id" "uuid", "p_previous_state" "jsonb", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_graph_event"("p_user_id" "uuid", "p_event_type" "public"."graph_event_type", "p_new_state" "jsonb", "p_node_id" "uuid", "p_edge_id" "uuid", "p_session_id" "uuid", "p_previous_state" "jsonb", "p_metadata" "jsonb") TO "service_role";






GRANT ALL ON FUNCTION "public"."search_knowledge_base"("search_query" "text", "kb_id_filter" "uuid", "limit_results" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_knowledge_base"("search_query" "text", "kb_id_filter" "uuid", "limit_results" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_knowledge_base"("search_query" "text", "kb_id_filter" "uuid", "limit_results" integer) TO "service_role";






GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_message_pin"("p_message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_message_pin"("p_message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_message_pin"("p_message_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "text", "p_intensity" numeric, "p_context" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "text", "p_intensity" numeric, "p_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "text", "p_intensity" numeric, "p_context" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "public"."emotion_type", "p_intensity" double precision, "p_context" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "public"."emotion_type", "p_intensity" double precision, "p_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_emotion"("p_user_id" "uuid", "p_emotion" "public"."emotion_type", "p_intensity" double precision, "p_context" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_document_access"("doc_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_document_access"("doc_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_document_access"("doc_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_journey"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_journey"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_journey"() TO "service_role";






























GRANT ALL ON TABLE "public"."agent_knowledge_bases" TO "anon";
GRANT ALL ON TABLE "public"."agent_knowledge_bases" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_knowledge_bases" TO "service_role";



GRANT ALL ON TABLE "public"."agent_personae" TO "anon";
GRANT ALL ON TABLE "public"."agent_personae" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_personae" TO "service_role";



GRANT ALL ON TABLE "public"."coaching_effectiveness" TO "anon";
GRANT ALL ON TABLE "public"."coaching_effectiveness" TO "authenticated";
GRANT ALL ON TABLE "public"."coaching_effectiveness" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_insights" TO "anon";
GRANT ALL ON TABLE "public"."conversation_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_insights" TO "service_role";



GRANT ALL ON TABLE "public"."document_access_logs" TO "anon";
GRANT ALL ON TABLE "public"."document_access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."document_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."document_categories" TO "anon";
GRANT ALL ON TABLE "public"."document_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."document_categories" TO "service_role";



GRANT ALL ON TABLE "public"."document_chunks" TO "anon";
GRANT ALL ON TABLE "public"."document_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."document_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."elevenlabs_conversations" TO "anon";
GRANT ALL ON TABLE "public"."elevenlabs_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."elevenlabs_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."embedding_queue" TO "anon";
GRANT ALL ON TABLE "public"."embedding_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."embedding_queue" TO "service_role";



GRANT ALL ON TABLE "public"."goal_categories" TO "anon";
GRANT ALL ON TABLE "public"."goal_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_categories" TO "service_role";



GRANT ALL ON TABLE "public"."goal_progress" TO "anon";
GRANT ALL ON TABLE "public"."goal_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_progress" TO "service_role";



GRANT ALL ON TABLE "public"."graph_edges" TO "anon";
GRANT ALL ON TABLE "public"."graph_edges" TO "authenticated";
GRANT ALL ON TABLE "public"."graph_edges" TO "service_role";



GRANT ALL ON TABLE "public"."graph_events" TO "anon";
GRANT ALL ON TABLE "public"."graph_events" TO "authenticated";
GRANT ALL ON TABLE "public"."graph_events" TO "service_role";



GRANT ALL ON TABLE "public"."graph_nodes" TO "anon";
GRANT ALL ON TABLE "public"."graph_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."graph_nodes" TO "service_role";



GRANT ALL ON TABLE "public"."graph_monitoring_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."graph_monitoring_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."graph_monitoring_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."inbox_messages" TO "anon";
GRANT ALL ON TABLE "public"."inbox_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."inbox_messages" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_categories" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_categories" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_chunks" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_documents" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_documents" TO "service_role";



GRANT ALL ON TABLE "public"."message_attachments" TO "anon";
GRANT ALL ON TABLE "public"."message_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."message_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."message_read_receipts" TO "anon";
GRANT ALL ON TABLE "public"."message_read_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."message_read_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_coaching_journey" TO "anon";
GRANT ALL ON TABLE "public"."user_coaching_journey" TO "authenticated";
GRANT ALL ON TABLE "public"."user_coaching_journey" TO "service_role";



GRANT ALL ON TABLE "public"."user_goals" TO "anon";
GRANT ALL ON TABLE "public"."user_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_goals" TO "service_role";



GRANT ALL ON TABLE "public"."user_goals_graph" TO "anon";
GRANT ALL ON TABLE "public"."user_goals_graph" TO "authenticated";
GRANT ALL ON TABLE "public"."user_goals_graph" TO "service_role";



GRANT ALL ON TABLE "public"."user_timeline" TO "anon";
GRANT ALL ON TABLE "public"."user_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."user_timeline" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."voice_chat_conversations" TO "anon";
GRANT ALL ON TABLE "public"."voice_chat_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_chat_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."voice_chat_events" TO "anon";
GRANT ALL ON TABLE "public"."voice_chat_events" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_chat_events" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "payload" GRANT ALL ON SEQUENCES  TO "postgres";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "payload" GRANT ALL ON FUNCTIONS  TO "postgres";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "payload" GRANT ALL ON TABLES  TO "postgres";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
