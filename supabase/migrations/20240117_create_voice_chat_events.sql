-- Create voice_chat_events table for storing conversation history
CREATE TABLE IF NOT EXISTS public.voice_chat_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT, -- For anonymous users
  conversation_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('agent_speech', 'user_response', 'goals_detected', 'goal_matched', 'category_matched')),
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_voice_chat_events_user_id ON public.voice_chat_events(user_id);
CREATE INDEX idx_voice_chat_events_conversation_id ON public.voice_chat_events(conversation_id);
CREATE INDEX idx_voice_chat_events_created_at ON public.voice_chat_events(created_at);

-- Enable RLS
ALTER TABLE public.voice_chat_events ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can insert their own events (including anonymous)
CREATE POLICY "Users can insert own voice events" ON public.voice_chat_events
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR (auth.uid() IS NOT NULL AND anonymous_id IS NOT NULL)
  );

-- Create policy: Users can read their own events (including anonymous)
CREATE POLICY "Users can read own voice events" ON public.voice_chat_events
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (auth.uid() IS NOT NULL AND anonymous_id IS NOT NULL)
  );

-- Create policy: Service role can do everything
CREATE POLICY "Service role full access" ON public.voice_chat_events
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT ALL ON public.voice_chat_events TO authenticated;
GRANT ALL ON public.voice_chat_events TO service_role;