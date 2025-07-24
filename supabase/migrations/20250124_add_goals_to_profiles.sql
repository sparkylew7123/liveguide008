-- Add columns to store user goals in profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS selected_goals jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS goals_updated_at timestamp with time zone;

-- Add comment to explain the structure
COMMENT ON COLUMN public.profiles.selected_goals IS 'Array of user-selected goals with structure: {id, title, category, timescale, confidence}';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_goals_updated_at ON public.profiles(goals_updated_at);

-- Update RLS policies to allow users to update their own goals
CREATE POLICY "Users can update their own goals" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);