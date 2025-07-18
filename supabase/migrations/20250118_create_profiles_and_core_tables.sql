-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_method TEXT CHECK (onboarding_method IN ('voice', 'visual', 'mixed')),
  coaching_preferences JSONB DEFAULT '{}'::jsonb
);

-- Create user_goals table
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  selection_method TEXT CHECK (selection_method IN ('voice', 'visual', 'manual')),
  selection_context JSONB DEFAULT '{}'::jsonb,
  voice_confidence REAL DEFAULT 0.0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_matching_sessions table
CREATE TABLE IF NOT EXISTS public.agent_matching_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_goals TEXT[] DEFAULT '{}',
  coaching_preferences JSONB DEFAULT '{}'::jsonb,
  matched_agents JSONB DEFAULT '[]'::jsonb,
  selected_agent_id TEXT,
  matching_algorithm_version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goals catalog table
CREATE TABLE IF NOT EXISTS public.goals_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed_at);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_profile_id ON public.user_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_category ON public.user_goals(category);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON public.user_goals(status);
CREATE INDEX IF NOT EXISTS idx_agent_matching_sessions_user_id ON public.agent_matching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_catalog_category ON public.goals_catalog(category);
CREATE INDEX IF NOT EXISTS idx_goals_catalog_goal_id ON public.goals_catalog(goal_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_matching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals_catalog ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for user_goals
CREATE POLICY "Users can view own goals" ON public.user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.user_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.user_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for agent_matching_sessions
CREATE POLICY "Users can view own agent sessions" ON public.agent_matching_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent sessions" ON public.agent_matching_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent sessions" ON public.agent_matching_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for goals_catalog (read-only for users)
CREATE POLICY "Anyone can view goals catalog" ON public.goals_catalog
  FOR SELECT USING (true);

-- Service role policies
CREATE POLICY "Service role full access profiles" ON public.profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access user_goals" ON public.user_goals
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access agent_matching_sessions" ON public.agent_matching_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access goals_catalog" ON public.goals_catalog
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_goals TO authenticated;
GRANT ALL ON public.agent_matching_sessions TO authenticated;
GRANT SELECT ON public.goals_catalog TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_goals TO service_role;
GRANT ALL ON public.agent_matching_sessions TO service_role;
GRANT ALL ON public.goals_catalog TO service_role;

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample goals into the catalog
INSERT INTO public.goals_catalog (goal_id, title, category, description, keywords) VALUES
  ('lose_weight', 'Lose Weight', 'Health & Wellness', 'Achieve and maintain a healthy weight through diet and exercise', ARRAY['weight', 'diet', 'exercise', 'health', 'fitness']),
  ('build_muscle', 'Build Muscle', 'Health & Wellness', 'Increase muscle mass and strength through resistance training', ARRAY['muscle', 'strength', 'gym', 'fitness', 'bodybuilding']),
  ('learn_language', 'Learn a New Language', 'Education', 'Become fluent in a foreign language', ARRAY['language', 'fluent', 'speak', 'learn', 'education']),
  ('start_business', 'Start a Business', 'Professional', 'Launch and grow a successful business venture', ARRAY['business', 'entrepreneur', 'startup', 'company', 'venture']),
  ('get_promotion', 'Get a Promotion', 'Professional', 'Advance in current career and achieve leadership roles', ARRAY['promotion', 'career', 'leadership', 'advance', 'work']),
  ('save_money', 'Save Money', 'Financial', 'Build emergency fund and increase savings', ARRAY['save', 'money', 'budget', 'emergency', 'fund']),
  ('buy_house', 'Buy a House', 'Financial', 'Purchase a home and become a homeowner', ARRAY['house', 'home', 'mortgage', 'property', 'real estate']),
  ('improve_relationships', 'Improve Relationships', 'Relationships', 'Strengthen bonds with family and friends', ARRAY['relationships', 'family', 'friends', 'love', 'connection']),
  ('find_love', 'Find Love', 'Relationships', 'Meet someone special and build a meaningful relationship', ARRAY['love', 'relationship', 'dating', 'partner', 'romance']),
  ('learn_instrument', 'Learn an Instrument', 'Creative', 'Master playing a musical instrument', ARRAY['music', 'instrument', 'play', 'learn', 'creative']),
  ('write_book', 'Write a Book', 'Creative', 'Complete and publish a book or novel', ARRAY['write', 'book', 'novel', 'author', 'publish']),
  ('travel_world', 'Travel the World', 'Personal Growth', 'Explore different countries and cultures', ARRAY['travel', 'world', 'explore', 'culture', 'adventure']),
  ('meditate_daily', 'Meditate Daily', 'Spiritual', 'Develop a consistent meditation practice', ARRAY['meditation', 'mindfulness', 'peace', 'spiritual', 'calm']),
  ('get_degree', 'Get a Degree', 'Education', 'Complete formal education and earn a degree', ARRAY['degree', 'education', 'college', 'university', 'study']),
  ('quit_smoking', 'Quit Smoking', 'Health & Wellness', 'Stop smoking and improve overall health', ARRAY['quit', 'smoking', 'health', 'addiction', 'stop'])
ON CONFLICT (goal_id) DO NOTHING;