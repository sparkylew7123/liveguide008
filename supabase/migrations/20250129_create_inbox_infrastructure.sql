-- Create Inbox Infrastructure for LiveGuide MVP
-- This migration creates tables for managing AI coach messages, attachments, and read status

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for message status and priority
CREATE TYPE message_status AS ENUM ('unread', 'read', 'archived');
CREATE TYPE message_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE attachment_type AS ENUM ('image', 'video', 'audio', 'document', 'link');

-- Create the inbox_messages table
-- This table stores messages from AI coaches to users
CREATE TABLE inbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    preview TEXT, -- Short preview of the message content
    
    -- Message metadata
    sender_agent_id TEXT NOT NULL, -- ElevenLabs agent ID
    sender_name TEXT NOT NULL, -- Human-readable name of the AI coach
    sender_avatar_url TEXT, -- URL to coach avatar image
    
    -- Categorization and priority
    category TEXT, -- e.g., 'goal_update', 'reminder', 'motivation', 'achievement'
    priority message_priority DEFAULT 'normal',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of tags for filtering
    
    -- Status tracking
    status message_status DEFAULT 'unread',
    is_pinned BOOLEAN DEFAULT false,
    is_starred BOOLEAN DEFAULT false,
    
    -- Graph relationship
    session_node_id UUID REFERENCES graph_nodes(id) ON DELETE SET NULL, -- Link to coaching session
    goal_node_id UUID REFERENCES graph_nodes(id) ON DELETE SET NULL, -- Link to specific goal
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for additional data
    expires_at TIMESTAMPTZ, -- Optional expiration date for time-sensitive messages
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_subject CHECK (char_length(subject) >= 1 AND char_length(subject) <= 255),
    CONSTRAINT valid_content CHECK (char_length(content) >= 1)
);

-- Create the message_attachments table
-- This table stores multimedia content associated with messages
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
    
    -- Attachment details
    type attachment_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Storage information
    storage_path TEXT, -- Path in Supabase storage
    url TEXT, -- Direct URL for external content
    mime_type TEXT,
    file_size_bytes BIGINT,
    
    -- Type-specific metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g., duration for audio/video, dimensions for images
    
    -- Processing status
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure either storage_path or url is provided
    CONSTRAINT attachment_source CHECK (storage_path IS NOT NULL OR url IS NOT NULL)
);

-- Create the message_read_receipts table
-- This table tracks detailed read status and user interactions
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Interaction tracking
    read_at TIMESTAMPTZ DEFAULT now(),
    read_duration_seconds INTEGER, -- How long user spent reading
    interaction_count INTEGER DEFAULT 1, -- Number of times opened
    
    -- Device/context information
    device_info JSONB DEFAULT '{}'::jsonb, -- Device type, OS, browser, etc.
    
    -- Ensure unique receipt per user per message
    CONSTRAINT unique_read_receipt UNIQUE (message_id, user_id)
);

-- Create indexes for optimal query performance
-- Message indexes
CREATE INDEX idx_messages_user_status ON inbox_messages(user_id, status) WHERE archived_at IS NULL;
CREATE INDEX idx_messages_user_priority ON inbox_messages(user_id, priority) WHERE status != 'archived';
CREATE INDEX idx_messages_user_created ON inbox_messages(user_id, created_at DESC);
CREATE INDEX idx_messages_user_pinned ON inbox_messages(user_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_messages_session ON inbox_messages(session_node_id) WHERE session_node_id IS NOT NULL;
CREATE INDEX idx_messages_goal ON inbox_messages(goal_node_id) WHERE goal_node_id IS NOT NULL;
CREATE INDEX idx_messages_category ON inbox_messages(user_id, category) WHERE category IS NOT NULL;
CREATE INDEX idx_messages_tags ON inbox_messages USING gin(tags);
CREATE INDEX idx_messages_expires ON inbox_messages(expires_at) WHERE expires_at IS NOT NULL;

-- Attachment indexes
CREATE INDEX idx_attachments_message ON message_attachments(message_id);
CREATE INDEX idx_attachments_type ON message_attachments(message_id, type);
CREATE INDEX idx_attachments_processed ON message_attachments(is_processed) WHERE is_processed = false;

-- Read receipt indexes
CREATE INDEX idx_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_receipts_user ON message_read_receipts(user_id);

-- Create updated_at trigger for inbox_messages
CREATE TRIGGER update_inbox_messages_updated_at
    BEFORE UPDATE ON inbox_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_graph_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Inbox Messages RLS Policies
-- Users can only see their own messages
CREATE POLICY "Users can view own messages" ON inbox_messages
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can create messages for any user
CREATE POLICY "Service role can create messages" ON inbox_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users WHERE id = user_id
        )
    );

-- Users can update their own messages (for status changes)
CREATE POLICY "Users can update own messages" ON inbox_messages
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete (archive) their own messages
CREATE POLICY "Users can delete own messages" ON inbox_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Message Attachments RLS Policies
-- Users can view attachments for their messages
CREATE POLICY "Users can view own message attachments" ON message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM inbox_messages 
            WHERE id = message_id AND user_id = auth.uid()
        )
    );

-- Service role can create attachments
CREATE POLICY "Service role can create attachments" ON message_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM inbox_messages WHERE id = message_id
        )
    );

-- Message Read Receipts RLS Policies
-- Users can view their own read receipts
CREATE POLICY "Users can view own read receipts" ON message_read_receipts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own read receipts
CREATE POLICY "Users can create own read receipts" ON message_read_receipts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM inbox_messages 
            WHERE id = message_id AND user_id = auth.uid()
        )
    );

-- Users can update their own read receipts
CREATE POLICY "Users can update own read receipts" ON message_read_receipts
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Helper functions for common inbox operations

-- Function to mark a message as read
CREATE OR REPLACE FUNCTION mark_message_as_read(
    p_message_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    -- Update message status
    UPDATE inbox_messages
    SET 
        status = 'read'::message_status,
        read_at = COALESCE(read_at, now())
    WHERE id = p_message_id 
        AND user_id = p_user_id 
        AND status = 'unread'::message_status;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
    
    -- Create or update read receipt
    INSERT INTO message_read_receipts (message_id, user_id)
    VALUES (p_message_id, p_user_id)
    ON CONFLICT (message_id, user_id) 
    DO UPDATE SET 
        interaction_count = message_read_receipts.interaction_count + 1,
        read_at = now();
    
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle message pin status
CREATE OR REPLACE FUNCTION toggle_message_pin(
    p_message_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE inbox_messages
    SET is_pinned = NOT is_pinned
    WHERE id = p_message_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive a message
CREATE OR REPLACE FUNCTION archive_message(
    p_message_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE inbox_messages
    SET 
        status = 'archived'::message_status,
        archived_at = now()
    WHERE id = p_message_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM inbox_messages
        WHERE user_id = p_user_id
            AND status = 'unread'::message_status
            AND archived_at IS NULL
            AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a message with attachments
CREATE OR REPLACE FUNCTION create_message_with_attachments(
    p_user_id UUID,
    p_subject TEXT,
    p_content TEXT,
    p_sender_agent_id TEXT,
    p_sender_name TEXT,
    p_category TEXT DEFAULT NULL,
    p_priority message_priority DEFAULT 'normal',
    p_session_node_id UUID DEFAULT NULL,
    p_goal_node_id UUID DEFAULT NULL,
    p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
    v_attachment JSONB;
BEGIN
    -- Create the message
    INSERT INTO inbox_messages (
        user_id, subject, content, preview,
        sender_agent_id, sender_name,
        category, priority,
        session_node_id, goal_node_id
    )
    VALUES (
        p_user_id, p_subject, p_content, 
        SUBSTRING(p_content, 1, 200),
        p_sender_agent_id, p_sender_name,
        p_category, p_priority,
        p_session_node_id, p_goal_node_id
    )
    RETURNING id INTO v_message_id;
    
    -- Create attachments if provided
    FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_attachments)
    LOOP
        INSERT INTO message_attachments (
            message_id, type, name, description,
            storage_path, url, mime_type, file_size_bytes,
            metadata
        )
        VALUES (
            v_message_id,
            (v_attachment->>'type')::attachment_type,
            v_attachment->>'name',
            v_attachment->>'description',
            v_attachment->>'storage_path',
            v_attachment->>'url',
            v_attachment->>'mime_type',
            (v_attachment->>'file_size_bytes')::BIGINT,
            COALESCE(v_attachment->'metadata', '{}'::jsonb)
        );
    END LOOP;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create views for common queries
CREATE OR REPLACE VIEW inbox_summary AS
SELECT 
    im.user_id,
    im.id as message_id,
    im.subject,
    im.preview,
    im.sender_name,
    im.sender_avatar_url,
    im.category,
    im.priority,
    im.status,
    im.is_pinned,
    im.is_starred,
    im.created_at,
    im.read_at,
    COALESCE(att.attachment_count, 0) as attachment_count,
    gn_session.label as session_label,
    gn_goal.label as goal_label
FROM inbox_messages im
LEFT JOIN (
    SELECT message_id, COUNT(*) as attachment_count
    FROM message_attachments
    GROUP BY message_id
) att ON im.id = att.message_id
LEFT JOIN graph_nodes gn_session ON im.session_node_id = gn_session.id
LEFT JOIN graph_nodes gn_goal ON im.goal_node_id = gn_goal.id
WHERE im.archived_at IS NULL
    AND (im.expires_at IS NULL OR im.expires_at > now());

-- Grant necessary permissions
GRANT ALL ON inbox_messages TO authenticated;
GRANT ALL ON message_attachments TO authenticated;
GRANT ALL ON message_read_receipts TO authenticated;
GRANT ALL ON inbox_summary TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION mark_message_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_message_pin TO authenticated;
GRANT EXECUTE ON FUNCTION archive_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
GRANT EXECUTE ON FUNCTION create_message_with_attachments TO authenticated;

-- Add helpful comments
COMMENT ON TABLE inbox_messages IS 'Stores messages from AI coaches to users with full tracking capabilities';
COMMENT ON TABLE message_attachments IS 'Stores multimedia content associated with inbox messages';
COMMENT ON TABLE message_read_receipts IS 'Tracks detailed read status and user interactions with messages';
COMMENT ON COLUMN inbox_messages.session_node_id IS 'Links message to a specific coaching session in the graph database';
COMMENT ON COLUMN inbox_messages.goal_node_id IS 'Links message to a specific goal in the graph database';

-- Migration rollback support
-- To rollback this migration, run:
-- DROP VIEW IF EXISTS inbox_summary;
-- DROP FUNCTION IF EXISTS create_message_with_attachments;
-- DROP FUNCTION IF EXISTS get_unread_message_count;
-- DROP FUNCTION IF EXISTS archive_message;
-- DROP FUNCTION IF EXISTS toggle_message_pin;
-- DROP FUNCTION IF EXISTS mark_message_as_read;
-- DROP TABLE IF EXISTS message_read_receipts;
-- DROP TABLE IF EXISTS message_attachments;
-- DROP TABLE IF EXISTS inbox_messages;
-- DROP TYPE IF EXISTS attachment_type;
-- DROP TYPE IF EXISTS message_priority;
-- DROP TYPE IF EXISTS message_status;