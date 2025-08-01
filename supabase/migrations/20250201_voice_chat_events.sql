-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create voice_chat_events table for storing conversation history
CREATE TABLE IF NOT EXISTS public.voice_chat_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    anonymous_id TEXT,
    conversation_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('user_speech', 'agent_speech', 'goal_detected', 'phase_completed', 'conversation_started', 'conversation_ended')),
    event_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_voice_chat_events_user_id ON public.voice_chat_events(user_id);
CREATE INDEX idx_voice_chat_events_anonymous_id ON public.voice_chat_events(anonymous_id);
CREATE INDEX idx_voice_chat_events_conversation_id ON public.voice_chat_events(conversation_id);
CREATE INDEX idx_voice_chat_events_created_at ON public.voice_chat_events(created_at DESC);
CREATE INDEX idx_voice_chat_events_event_type ON public.voice_chat_events(event_type);

-- Enable RLS
ALTER TABLE public.voice_chat_events ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own events
CREATE POLICY "Users can view own voice chat events" ON public.voice_chat_events
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
    );

-- Users can insert their own events
CREATE POLICY "Users can insert own voice chat events" ON public.voice_chat_events
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
    );

-- Users can update their own events
CREATE POLICY "Users can update own voice chat events" ON public.voice_chat_events
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users cannot delete events (for audit trail)
-- No delete policy created

-- Create updated_at trigger
CREATE TRIGGER update_voice_chat_events_updated_at
    BEFORE UPDATE ON public.voice_chat_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.voice_chat_events TO authenticated;
GRANT SELECT, INSERT ON public.voice_chat_events TO anon;