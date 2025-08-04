-- Successful seeding script for dev database 
-- Adapted to match the actual dev database schema

BEGIN;

-- First, ensure we have goal categories
INSERT INTO goal_categories (id, title, display_color, icon_name) VALUES
('career', 'Career', '#3B82F6', 'briefcase'),
('health', 'Health & Fitness', '#10B981', 'heart'),
('wellbeing', 'Personal Growth', '#8B5CF6', 'sparkles'),
('Mindfulness', 'Mindfulness', '#F59E0B', 'brain')
ON CONFLICT (id) DO NOTHING;

-- Update profile
INSERT INTO profiles (
    id,
    full_name,
    username,
    preferences,
    coaching_preferences,
    selected_goals,
    onboarding_completed_at,
    updated_at
) VALUES (
    '907f679d-b36a-42a8-8b60-ce0d9cc11726',
    'Mark Lewis',
    'marklewis',
    jsonb_build_object(
        'bio', 'Technology executive and founder passionate about AI, innovation, and personal growth. Building the future of AI-powered coaching.',
        'location', 'San Francisco, CA',
        'industry', 'Technology / AI',
        'experience_level', 'Expert',
        'focus_areas', ARRAY['Leadership', 'AI/Technology', 'Business Growth', 'Innovation'],
        'timezone', 'America/Los_Angeles',
        'language', 'en'
    ),
    jsonb_build_object(
        'style', 'Strategic and data-driven with focus on rapid iteration',
        'frequency', 'Daily',
        'session_duration', 20,
        'preferred_topics', ARRAY['Business Strategy', 'Technical Leadership', 'Work-Life Balance', 'Team Building']
    ),
    to_jsonb(ARRAY[
        'Scale SparkyTek to $10M ARR',
        'Master AI/ML technologies',
        'Build meaningful tech communities',
        'Achieve work-life harmony',
        'Mentor 50 entrepreneurs'
    ]),
    NOW() - INTERVAL '3 months',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    preferences = EXCLUDED.preferences,
    coaching_preferences = EXCLUDED.coaching_preferences,
    selected_goals = EXCLUDED.selected_goals,
    onboarding_completed_at = EXCLUDED.onboarding_completed_at,
    updated_at = EXCLUDED.updated_at;

-- Create user goals
INSERT INTO user_goals (user_id, goal_title, goal_description, goal_status, category_id, target_date, metadata) VALUES
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'Scale SparkyTek to $10M ARR', 'Grow from $2M to $10M through product expansion', 'active', 'career', '2025-12-31', '{"priority": "high", "progress": 20}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'Launch AI Coaching Platform', 'Release LiveGuide with 1000 active users', 'active', 'career', '2025-06-30', '{"priority": "high", "progress": 65}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'Master LLM Fine-tuning', 'Become proficient in fine-tuning LLMs', 'active', 'career', '2025-04-30', '{"priority": "medium", "progress": 40}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'Maintain Work-Life Balance', 'Quality time with family', 'active', 'wellbeing', '2025-12-31', '{"priority": "high", "progress": 60}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'Complete Marathon', 'Train for SF Marathon', 'active', 'health', '2025-10-15', '{"priority": "medium", "progress": 25}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'Daily Meditation', 'Establish consistent practice', 'active', 'Mindfulness', '2025-02-28', '{"priority": "medium", "progress": 80}'::jsonb);

-- Create graph nodes (without status column)
INSERT INTO graph_nodes (user_id, node_type, label, description, properties) VALUES
-- Goals
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'goal', 'Scale to $10M ARR', 'Grow SparkyTek revenue 5x', '{"category": "Business", "priority": "high", "progress": 20, "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'goal', 'Launch AI Platform', 'Release LiveGuide', '{"category": "Product", "priority": "high", "progress": 65, "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'goal', 'Series A Funding', 'Raise $5M growth capital', '{"category": "Fundraising", "priority": "high", "progress": 15, "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'goal', 'Master LLM Tech', 'AI/ML expertise', '{"category": "Technical", "priority": "medium", "progress": 40, "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'goal', 'Work-Life Harmony', 'Balance family and startup', '{"category": "Personal", "priority": "high", "progress": 60, "status": "curated"}'::jsonb),
-- Emotions
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'emotion', 'Excitement', 'Product launch enthusiasm', '{"valence": "positive", "arousal": "high", "trigger": "customer_traction", "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'emotion', 'Determination', 'Overcoming challenges', '{"valence": "positive", "arousal": "medium", "trigger": "problem_solving", "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'emotion', 'Anxiety', 'Funding runway concerns', '{"valence": "negative", "arousal": "high", "trigger": "burn_rate", "status": "curated"}'::jsonb),
-- Skills
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'skill', 'AI/ML Engineering', 'LLMs and ML expertise', '{"level": "expert", "years": 5, "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'skill', 'Product Leadership', 'User-centric development', '{"level": "advanced", "years": 8, "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'skill', 'Team Building', 'Scaling teams', '{"level": "advanced", "years": 10, "status": "curated"}'::jsonb),
-- Sessions
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'session', 'Q1 Strategic Planning', 'Roadmap setting', '{"duration_min": 45, "date": "2025-01-15", "status": "curated"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'session', 'Architecture Review', 'Scaling design', '{"duration_min": 60, "date": "2025-01-20", "status": "curated"}'::jsonb);

-- Create edges with correct column names for dev schema
WITH node_mapping AS (
    SELECT 
        id,
        node_type,
        label,
        ROW_NUMBER() OVER (PARTITION BY node_type ORDER BY created_at) as type_index
    FROM graph_nodes 
    WHERE user_id = '907f679d-b36a-42a8-8b60-ce0d9cc11726'
)
INSERT INTO graph_edges (user_id, source_node_id, target_node_id, edge_type, properties)
SELECT 
    '907f679d-b36a-42a8-8b60-ce0d9cc11726',
    s.id,
    t.id,
    CASE 
        WHEN s.node_type = 'skill' AND t.node_type = 'goal' THEN 'has_skill'
        WHEN s.node_type = 'session' AND t.node_type = 'goal' THEN 'works_on'
        WHEN s.node_type = 'goal' AND t.node_type = 'emotion' THEN 'feels'
        ELSE 'relates_to'
    END::edge_type,
    jsonb_build_object('created_at', NOW(), 'strength', 0.8)
FROM node_mapping s
CROSS JOIN node_mapping t
WHERE s.id != t.id
AND (
    (s.label = 'AI/ML Engineering' AND t.label = 'Launch AI Platform')
    OR (s.label = 'Q1 Strategic Planning' AND t.label = 'Scale to $10M ARR')
    OR (s.label = 'Scale to $10M ARR' AND t.label = 'Excitement')
)
LIMIT 5;

-- Add voice events
INSERT INTO voice_chat_events (user_id, conversation_id, event_type, timestamp, data) VALUES
('907f679d-b36a-42a8-8b60-ce0d9cc11726', gen_random_uuid(), 'session_start', NOW() - INTERVAL '2 hours', '{"agent": "Strategic Coach", "topic": "Q1 Planning"}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', gen_random_uuid(), 'insight_captured', NOW() - INTERVAL '1 hour 45 minutes', '{"insight": "Focus on retention over acquisition", "confidence": 0.92}'::jsonb),
('907f679d-b36a-42a8-8b60-ce0d9cc11726', gen_random_uuid(), 'emotion_detected', NOW() - INTERVAL '1 hour 30 minutes', '{"emotion": "determination", "intensity": 0.85}'::jsonb);

COMMIT;

-- Verify the data
SELECT 
    'Profiles' as table_name, COUNT(*) as count 
FROM profiles 
WHERE id = '907f679d-b36a-42a8-8b60-ce0d9cc11726'
UNION ALL
SELECT 'User Goals', COUNT(*) 
FROM user_goals 
WHERE user_id = '907f679d-b36a-42a8-8b60-ce0d9cc11726'
UNION ALL
SELECT 'Graph Nodes', COUNT(*) 
FROM graph_nodes 
WHERE user_id = '907f679d-b36a-42a8-8b60-ce0d9cc11726'
UNION ALL
SELECT 'Graph Edges', COUNT(*) 
FROM graph_edges 
WHERE user_id = '907f679d-b36a-42a8-8b60-ce0d9cc11726'
UNION ALL
SELECT 'Voice Events', COUNT(*) 
FROM voice_chat_events 
WHERE user_id = '907f679d-b36a-42a8-8b60-ce0d9cc11726';