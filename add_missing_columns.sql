-- Add missing columns to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS coaching_preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS onboarding_method TEXT CHECK (onboarding_method IN ('voice', 'visual', 'mixed')),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have empty coaching_preferences if null
UPDATE public.profiles 
SET coaching_preferences = '{}'::jsonb 
WHERE coaching_preferences IS NULL;