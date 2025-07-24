-- First, let's check the structure of user_goals table
-- This migration syncs goals from profiles.selected_goals to user_goals table

-- Create user_goals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_goals (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id uuid,
    title text NOT NULL,
    description text,
    category text,
    target_date timestamp with time zone,
    goal_status text DEFAULT 'active',
    selection_method text DEFAULT 'voice',
    selection_context jsonb DEFAULT '{}'::jsonb,
    voice_confidence float DEFAULT 0.8,
    achieved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_profile_id ON public.user_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_category ON public.user_goals(category);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON public.user_goals(goal_status);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_goals' 
        AND policyname = 'Users can view their own goals'
    ) THEN
        CREATE POLICY "Users can view their own goals" ON public.user_goals
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_goals' 
        AND policyname = 'Users can create their own goals'
    ) THEN
        CREATE POLICY "Users can create their own goals" ON public.user_goals
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_goals' 
        AND policyname = 'Users can update their own goals'
    ) THEN
        CREATE POLICY "Users can update their own goals" ON public.user_goals
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_goals' 
        AND policyname = 'Users can delete their own goals'
    ) THEN
        CREATE POLICY "Users can delete their own goals" ON public.user_goals
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function to sync goals from profiles to user_goals
CREATE OR REPLACE FUNCTION sync_profile_goals_to_user_goals()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    profile_record RECORD;
    goal_data jsonb;
    goal_item jsonb;
BEGIN
    -- Loop through all profiles with selected_goals
    FOR profile_record IN 
        SELECT id, selected_goals 
        FROM profiles 
        WHERE selected_goals IS NOT NULL 
        AND jsonb_array_length(selected_goals) > 0
    LOOP
        -- Loop through each goal in the selected_goals array
        FOR goal_item IN SELECT * FROM jsonb_array_elements(profile_record.selected_goals)
        LOOP
            -- Check if this goal already exists to avoid duplicates
            IF NOT EXISTS (
                SELECT 1 FROM user_goals 
                WHERE user_id = profile_record.id 
                AND title = (goal_item->>'title')::text
            ) THEN
                -- Insert the goal into user_goals table
                INSERT INTO user_goals (
                    user_id,
                    profile_id,
                    title,
                    category,
                    selection_method,
                    voice_confidence,
                    selection_context
                ) VALUES (
                    profile_record.id,
                    profile_record.id,
                    (goal_item->>'title')::text,
                    COALESCE((goal_item->>'category')::text, 'Personal Growth'),
                    'voice',
                    COALESCE((goal_item->>'confidence')::float, 0.8),
                    jsonb_build_object(
                        'timescale', COALESCE(goal_item->>'timescale', '3-months'),
                        'original_id', COALESCE(goal_item->>'id', ''),
                        'synced_from_profile', true,
                        'synced_at', now()
                    )
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- Execute the sync function
SELECT sync_profile_goals_to_user_goals();

-- Create trigger to automatically sync new goals from profiles
CREATE OR REPLACE FUNCTION auto_sync_profile_goals()
RETURNS TRIGGER AS $$
DECLARE
    goal_item jsonb;
BEGIN
    -- Only process if selected_goals has changed and is not empty
    IF NEW.selected_goals IS DISTINCT FROM OLD.selected_goals 
       AND NEW.selected_goals IS NOT NULL 
       AND jsonb_array_length(NEW.selected_goals) > 0 THEN
        
        -- Loop through each goal in the new selected_goals
        FOR goal_item IN SELECT * FROM jsonb_array_elements(NEW.selected_goals)
        LOOP
            -- Check if this goal already exists
            IF NOT EXISTS (
                SELECT 1 FROM user_goals 
                WHERE user_id = NEW.id 
                AND title = (goal_item->>'title')::text
            ) THEN
                -- Insert the goal
                INSERT INTO user_goals (
                    user_id,
                    profile_id,
                    title,
                    category,
                    selection_method,
                    voice_confidence,
                    selection_context
                ) VALUES (
                    NEW.id,
                    NEW.id,
                    (goal_item->>'title')::text,
                    COALESCE((goal_item->>'category')::text, 'Personal Growth'),
                    'voice',
                    COALESCE((goal_item->>'confidence')::float, 0.8),
                    jsonb_build_object(
                        'timescale', COALESCE(goal_item->>'timescale', '3-months'),
                        'original_id', COALESCE(goal_item->>'id', ''),
                        'synced_from_profile', true,
                        'synced_at', now()
                    )
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS sync_profile_goals_trigger ON profiles;
CREATE TRIGGER sync_profile_goals_trigger
    AFTER INSERT OR UPDATE OF selected_goals ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_sync_profile_goals();

-- Update trigger for updated_at on user_goals
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_goals_updated_at
    BEFORE UPDATE ON public.user_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();