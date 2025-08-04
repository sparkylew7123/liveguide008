-- Seed comprehensive demo data for mark.lewis@sparkytek.com
-- User ID: a6c2193a-fbed-4e35-97a9-c14f7caeb597

BEGIN;

-- Update profile
UPDATE profiles SET
    full_name = 'Mark Lewis',
    username = 'marklewis',
    preferences = jsonb_build_object(
        'bio', 'Technology executive and founder passionate about AI, innovation, and personal growth. Building the future of AI-powered coaching.',
        'location', 'San Francisco, CA',
        'industry', 'Technology / AI',
        'experience_level', 'Expert',
        'focus_areas', ARRAY['Leadership', 'AI/Technology', 'Business Growth', 'Innovation'],
        'timezone', 'America/Los_Angeles',
        'language', 'en'
    ),
    coaching_preferences = jsonb_build_object(
        'style', 'Strategic and data-driven with focus on rapid iteration',
        'frequency', 'Daily',
        'session_duration', 20,
        'preferred_topics', ARRAY['Business Strategy', 'Technical Leadership', 'Work-Life Balance', 'Team Building']
    ),
    selected_goals = to_jsonb(ARRAY[
        'Scale SparkyTek to $10M ARR',
        'Master AI/ML technologies',
        'Build meaningful tech communities',
        'Achieve work-life harmony',
        'Mentor 50 entrepreneurs'
    ]),
    onboarding_completed_at = NOW() - INTERVAL '3 months',
    updated_at = NOW()
WHERE id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';

-- Create user goals
INSERT INTO user_goals (user_id, goal_title, goal_description, goal_status, category_id, target_date, metadata, created_at) VALUES
-- Business Goals
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Scale SparkyTek to $10M ARR', 'Grow from $2M to $10M through product expansion', 'active', 'business', '2025-12-31', '{"priority": "high", "progress": 20}'::jsonb, NOW() - INTERVAL '3 months'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Launch AI Coaching Platform', 'Release LiveGuide with 1000 active users', 'active', 'business', '2025-06-30', '{"priority": "high", "progress": 65}'::jsonb, NOW() - INTERVAL '2 months'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Secure Series A Funding', 'Raise $5M to accelerate growth', 'active', 'business', '2025-09-30', '{"priority": "high", "progress": 15}'::jsonb, NOW() - INTERVAL '1 month'),
-- Technical Goals
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Master LLM Fine-tuning', 'Become proficient in fine-tuning LLMs', 'active', 'technical', '2025-04-30', '{"priority": "medium", "progress": 40}'::jsonb, NOW() - INTERVAL '2 weeks'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Build Scalable Infrastructure', 'Handle 100k concurrent users', 'active', 'technical', '2025-05-31', '{"priority": "high", "progress": 30}'::jsonb, NOW() - INTERVAL '1 month'),
-- Personal Goals
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Maintain Work-Life Balance', 'Quality time with family', 'active', 'personal', '2025-12-31', '{"priority": "high", "progress": 60}'::jsonb, NOW() - INTERVAL '1 month'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Complete Marathon', 'Train for SF Marathon', 'active', 'health', '2025-10-15', '{"priority": "medium", "progress": 25}'::jsonb, NOW() - INTERVAL '2 months'),
-- Community Goals
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Mentor 50 Entrepreneurs', 'Guide early-stage founders', 'active', 'community', '2025-12-31', '{"priority": "medium", "progress": 35}'::jsonb, NOW() - INTERVAL '2 months');

-- Create Goal nodes in graph
INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'goal', 'Scale to $10M ARR', 'Primary business objective', '{"category": "Business", "priority": "high", "progress": 20}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'goal', 'Launch AI Platform', 'Release LiveGuide', '{"category": "Product", "priority": "high", "progress": 65}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'goal', 'Series A Funding', 'Raise $5M growth capital', '{"category": "Fundraising", "priority": "high", "progress": 15}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'goal', 'Master LLM Tech', 'AI/ML expertise', '{"category": "Technical", "priority": "medium", "progress": 40}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'goal', 'Work-Life Harmony', 'Balance family and startup', '{"category": "Personal", "priority": "high", "progress": 60}'::jsonb, 'curated');

-- Create Emotion nodes
INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'emotion', 'Excitement', 'Product launch enthusiasm', '{"valence": "positive", "arousal": "high", "trigger": "customer_traction"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'emotion', 'Determination', 'Overcoming challenges', '{"valence": "positive", "arousal": "medium", "trigger": "problem_solving"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'emotion', 'Anxiety', 'Funding runway concerns', '{"valence": "negative", "arousal": "high", "trigger": "burn_rate"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'emotion', 'Pride', 'Team achievements', '{"valence": "positive", "arousal": "medium", "trigger": "team_wins"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'emotion', 'Gratitude', 'Support system', '{"valence": "positive", "arousal": "low", "trigger": "reflection"}'::jsonb, 'curated');

-- Create Skill nodes
INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'skill', 'AI/ML Engineering', 'LLMs and ML expertise', '{"level": "expert", "years": 5}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'skill', 'Product Leadership', 'User-centric development', '{"level": "advanced", "years": 8}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'skill', 'Team Building', 'Scaling teams', '{"level": "advanced", "years": 10}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'skill', 'Fundraising', 'Investor relations', '{"level": "intermediate", "years": 3}'::jsonb, 'curated');

-- Create Session nodes
INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'session', 'Q1 Strategic Planning', 'Roadmap setting', '{"duration_min": 45, "date": "2025-01-15"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'session', 'Architecture Review', 'Scaling design', '{"duration_min": 60, "date": "2025-01-20"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'session', 'Emotional Check-in', 'Stress management', '{"duration_min": 30, "date": "2025-01-22"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'session', 'Pitch Practice', 'Series A prep', '{"duration_min": 90, "date": "2025-01-25"}'::jsonb, 'curated');

-- Create Accomplishment nodes
INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'accomplishment', 'First Enterprise Client', 'Fortune 500 signed', '{"date": "2024-12-15", "impact": "high"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'accomplishment', '10th Team Member', 'Engineering milestone', '{"date": "2024-11-01", "impact": "medium"}'::jsonb, 'curated'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'accomplishment', 'LiveGuide MVP', 'Product launch', '{"date": "2024-10-15", "impact": "high"}'::jsonb, 'curated');

-- Create edges between nodes
WITH node_mapping AS (
    SELECT 
        id,
        node_type,
        label,
        ROW_NUMBER() OVER (PARTITION BY node_type ORDER BY created_at) as type_index
    FROM graph_nodes 
    WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597'
)
INSERT INTO graph_edges (user_id, source_id, target_id, relationship_type, properties, strength)
SELECT 
    'a6c2193a-fbed-4e35-97a9-c14f7caeb597',
    s.id,
    t.id,
    CASE 
        WHEN s.node_type = 'goal' AND t.node_type = 'emotion' THEN 'drives'
        WHEN s.node_type = 'skill' AND t.node_type = 'goal' THEN 'enables'
        WHEN s.node_type = 'session' AND t.node_type = 'goal' THEN 'advances'
        WHEN s.node_type = 'accomplishment' AND t.node_type = 'goal' THEN 'validates'
        WHEN s.node_type = 'goal' AND t.node_type = 'goal' THEN 'contributes_to'
        ELSE 'relates_to'
    END,
    jsonb_build_object('created_at', NOW()),
    CASE 
        WHEN s.node_type = 'skill' AND t.node_type = 'goal' THEN 0.9
        WHEN s.node_type = 'goal' AND t.node_type = 'emotion' THEN 0.8
        ELSE 0.7
    END
FROM node_mapping s
CROSS JOIN node_mapping t
WHERE s.id != t.id
AND (
    -- Goals to emotions (select specific mappings)
    (s.label = 'Scale to $10M ARR' AND t.label = 'Excitement')
    OR (s.label = 'Series A Funding' AND t.label = 'Anxiety')
    OR (s.label = 'Work-Life Harmony' AND t.label = 'Gratitude')
    -- Skills to goals
    OR (s.label = 'AI/ML Engineering' AND t.label = 'Launch AI Platform')
    OR (s.label = 'Fundraising' AND t.label = 'Series A Funding')
    OR (s.label = 'Team Building' AND t.label = 'Scale to $10M ARR')
    -- Sessions to goals
    OR (s.label = 'Q1 Strategic Planning' AND t.label = 'Scale to $10M ARR')
    OR (s.label = 'Pitch Practice' AND t.label = 'Series A Funding')
    -- Accomplishments to goals
    OR (s.label = 'First Enterprise Client' AND t.label = 'Scale to $10M ARR')
    OR (s.label = 'LiveGuide MVP' AND t.label = 'Launch AI Platform')
    -- Inter-goal relationships
    OR (s.label = 'Launch AI Platform' AND t.label = 'Scale to $10M ARR')
    OR (s.label = 'Series A Funding' AND t.label = 'Scale to $10M ARR')
);

-- Create voice chat events
INSERT INTO voice_chat_events (user_id, conversation_id, event_type, timestamp, data) VALUES
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', gen_random_uuid(), 'session_start', NOW() - INTERVAL '2 hours', '{"agent": "Strategic Coach", "topic": "Q1 Planning"}'::jsonb),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', gen_random_uuid(), 'insight_captured', NOW() - INTERVAL '1 hour 45 minutes', '{"insight": "Focus on retention over acquisition", "confidence": 0.92}'::jsonb),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', gen_random_uuid(), 'emotion_detected', NOW() - INTERVAL '1 hour 30 minutes', '{"emotion": "determination", "intensity": 0.85}'::jsonb),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', gen_random_uuid(), 'goal_mentioned', NOW() - INTERVAL '1 hour 15 minutes', '{"goal": "Scale to $10M ARR", "sentiment": "optimistic"}'::jsonb),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', gen_random_uuid(), 'action_item_created', NOW() - INTERVAL '1 hour', '{"action": "Review churn data", "deadline": "2025-02-01"}'::jsonb),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', gen_random_uuid(), 'session_end', NOW() - INTERVAL '30 minutes', '{"duration": 5400, "insights_count": 5, "satisfaction": 4.8}'::jsonb);

-- Create knowledge base entries
INSERT INTO knowledge_base (user_id, title, content, category, tags, source, created_at) VALUES
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Scaling SaaS to $10M ARR', 
 E'Key strategies:\n1. Focus on enterprise clients\n2. Build predictable sales process\n3. Invest in customer success\n4. Optimize unit economics',
 'Business Strategy', ARRAY['saas', 'growth', 'revenue'], 'coaching_session', NOW() - INTERVAL '1 week'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'LLM Fine-tuning Best Practices',
 E'Technical insights:\n- Use domain-specific data\n- Implement RLHF\n- Monitor for drift\n- Version control training data',
 'Technical', ARRAY['ai', 'llm', 'machine-learning'], 'personal_research', NOW() - INTERVAL '2 weeks'),
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', 'Leadership During Hypergrowth',
 E'Principles:\n- Maintain culture through values\n- Over-communicate vision\n- Delegate but verify\n- Document everything',
 'Leadership', ARRAY['management', 'culture', 'scaling'], 'mentorship', NOW() - INTERVAL '3 days');

-- Update embedding status for all new nodes
UPDATE graph_nodes 
SET embedding_status = 'pending'
WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597'
AND embedding IS NULL;

COMMIT;

-- Display summary
SELECT 
    'Summary for mark.lewis@sparkytek.com' as info,
    (SELECT COUNT(*) FROM graph_nodes WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597') as total_nodes,
    (SELECT COUNT(*) FROM graph_edges WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597') as total_edges,
    (SELECT COUNT(*) FROM user_goals WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597') as total_goals,
    (SELECT COUNT(*) FROM knowledge_base WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597') as knowledge_items;