-- Comprehensive demo data for mark.lewis@sparkytek.com
-- This script creates a rich dataset to demonstrate LiveGuide's capabilities

-- User ID for mark.lewis@sparkytek.com
DO $$
DECLARE
    v_user_id UUID := 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';
    v_goal_category_ids UUID[];
    v_node_ids UUID[];
    v_goal_nodes UUID[];
    v_emotion_nodes UUID[];
    v_skill_nodes UUID[];
    v_session_nodes UUID[];
BEGIN
    -- Update profile with comprehensive information
    UPDATE profiles SET
        full_name = 'Mark Lewis',
        bio = 'Technology executive and founder passionate about AI, innovation, and personal growth. Building the future of AI-powered coaching.',
        goals = ARRAY[
            'Scale SparkyTek to $10M ARR',
            'Master AI/ML technologies',
            'Build meaningful tech communities',
            'Achieve work-life harmony',
            'Mentor 50 entrepreneurs'
        ],
        location = 'San Francisco, CA',
        industry = 'Technology / AI',
        experience_level = 'Expert',
        preferred_coaching_style = 'Strategic and data-driven with focus on rapid iteration',
        focus_areas = ARRAY['Leadership', 'AI/Technology', 'Business Growth', 'Innovation'],
        timezone = 'America/Los_Angeles',
        language_preference = 'en',
        coaching_frequency = 'Daily',
        session_duration_preference = 20,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    -- Create user goals across different categories
    INSERT INTO user_goals (user_id, title, description, category, priority, target_date, status, progress, created_at) VALUES
    -- Business Goals
    (v_user_id, 'Scale SparkyTek to $10M ARR', 'Grow the company from current $2M to $10M annual recurring revenue through product expansion and market penetration', 'Business', 'high', '2025-12-31', 'active', 20, NOW() - INTERVAL '3 months'),
    (v_user_id, 'Launch AI Coaching Platform', 'Release LiveGuide as a flagship product with 1000 active users', 'Business', 'high', '2025-06-30', 'active', 65, NOW() - INTERVAL '2 months'),
    (v_user_id, 'Secure Series A Funding', 'Raise $5M Series A round to accelerate growth and expand team', 'Business', 'high', '2025-09-30', 'active', 15, NOW() - INTERVAL '1 month'),
    
    -- Technical Goals
    (v_user_id, 'Master LLM Fine-tuning', 'Become proficient in fine-tuning large language models for specific use cases', 'Technical', 'medium', '2025-04-30', 'active', 40, NOW() - INTERVAL '2 weeks'),
    (v_user_id, 'Build Scalable Infrastructure', 'Architect system to handle 100k concurrent users with <100ms latency', 'Technical', 'high', '2025-05-31', 'active', 30, NOW() - INTERVAL '1 month'),
    (v_user_id, 'Implement Voice AI Pipeline', 'Create end-to-end voice processing system with emotion detection', 'Technical', 'medium', '2025-03-31', 'active', 75, NOW() - INTERVAL '3 weeks'),
    
    -- Personal Goals
    (v_user_id, 'Maintain Work-Life Balance', 'Dedicate quality time with family while building the company', 'Personal', 'high', '2025-12-31', 'active', 60, NOW() - INTERVAL '1 month'),
    (v_user_id, 'Complete Marathon', 'Train for and complete San Francisco Marathon', 'Health', 'medium', '2025-10-15', 'active', 25, NOW() - INTERVAL '2 months'),
    (v_user_id, 'Daily Meditation Practice', 'Establish consistent 20-minute morning meditation routine', 'Health', 'medium', '2025-02-28', 'active', 80, NOW() - INTERVAL '1 week'),
    
    -- Community Goals
    (v_user_id, 'Mentor 50 Entrepreneurs', 'Provide guidance to early-stage founders in AI/tech space', 'Community', 'medium', '2025-12-31', 'active', 35, NOW() - INTERVAL '2 months'),
    (v_user_id, 'Speak at 10 Conferences', 'Share knowledge about AI and entrepreneurship at major events', 'Community', 'low', '2025-12-31', 'active', 40, NOW() - INTERVAL '1 month');

    -- Create coaching journey entries
    INSERT INTO user_coaching_journey (user_id, milestone_type, milestone_title, milestone_description, achieved_at, reflection) VALUES
    (v_user_id, 'breakthrough', 'Product-Market Fit Realization', 'Discovered that AI coaches need to be emotionally intelligent, not just smart', NOW() - INTERVAL '2 months', 'The key insight was that users don''t just want answers - they want to feel heard and understood'),
    (v_user_id, 'achievement', 'First Paying Customer', 'Signed first enterprise client for LiveGuide platform', NOW() - INTERVAL '1 month', 'Validation that our vision resonates with the market'),
    (v_user_id, 'insight', 'Leadership Style Evolution', 'Shifted from directive to coaching-based leadership with team', NOW() - INTERVAL '2 weeks', 'Empowering the team led to 3x productivity increase'),
    (v_user_id, 'milestone', 'Team Expansion', 'Grew team from 5 to 15 people while maintaining culture', NOW() - INTERVAL '3 weeks', 'Culture-first hiring pays dividends in team cohesion');

    -- Create knowledge graph nodes
    -- Goal nodes
    INSERT INTO graph_nodes (user_id, type, title, description, metadata, status) VALUES
    (v_user_id, 'goal', 'Scale to $10M ARR', 'Primary business objective for 2025', 
     '{"category": "Business", "priority": "high", "progress": 20, "target_date": "2025-12-31"}'::jsonb, 'curated'),
    (v_user_id, 'goal', 'Launch AI Platform', 'Release LiveGuide with 1000 users', 
     '{"category": "Business", "priority": "high", "progress": 65, "target_date": "2025-06-30"}'::jsonb, 'curated'),
    (v_user_id, 'goal', 'Series A Funding', 'Raise $5M to accelerate growth', 
     '{"category": "Business", "priority": "high", "progress": 15, "target_date": "2025-09-30"}'::jsonb, 'curated'),
    (v_user_id, 'goal', 'Master LLM Technology', 'Become expert in AI/ML', 
     '{"category": "Technical", "priority": "medium", "progress": 40, "target_date": "2025-04-30"}'::jsonb, 'curated'),
    (v_user_id, 'goal', 'Work-Life Harmony', 'Balance family and startup life', 
     '{"category": "Personal", "priority": "high", "progress": 60, "target_date": "2025-12-31"}'::jsonb, 'curated')
    RETURNING id INTO v_goal_nodes;

    -- Emotion nodes
    INSERT INTO graph_nodes (user_id, type, title, description, metadata, status) VALUES
    (v_user_id, 'emotion', 'Excitement', 'About product launch and customer traction', 
     '{"valence": "positive", "arousal": "high", "trigger": "customer_feedback"}'::jsonb, 'curated'),
    (v_user_id, 'emotion', 'Determination', 'To overcome technical challenges', 
     '{"valence": "positive", "arousal": "medium", "trigger": "problem_solving"}'::jsonb, 'curated'),
    (v_user_id, 'emotion', 'Anxiety', 'About funding timeline and runway', 
     '{"valence": "negative", "arousal": "high", "trigger": "financial_pressure"}'::jsonb, 'curated'),
    (v_user_id, 'emotion', 'Pride', 'In team achievements and growth', 
     '{"valence": "positive", "arousal": "medium", "trigger": "team_success"}'::jsonb, 'curated'),
    (v_user_id, 'emotion', 'Gratitude', 'For supportive family and mentors', 
     '{"valence": "positive", "arousal": "low", "trigger": "reflection"}'::jsonb, 'curated')
    RETURNING id INTO v_emotion_nodes;

    -- Skill nodes
    INSERT INTO graph_nodes (user_id, type, title, description, metadata, status) VALUES
    (v_user_id, 'skill', 'AI/ML Engineering', 'Expertise in LLMs, embeddings, and ML pipelines', 
     '{"level": "expert", "years": 5, "certifications": ["AWS ML", "Google AI"]}'::jsonb, 'curated'),
    (v_user_id, 'skill', 'Product Management', 'User-centric product development and iteration', 
     '{"level": "advanced", "years": 8, "frameworks": ["Agile", "Lean Startup"]}'::jsonb, 'curated'),
    (v_user_id, 'skill', 'Leadership', 'Building and scaling high-performance teams', 
     '{"level": "advanced", "years": 10, "team_size": 15}'::jsonb, 'curated'),
    (v_user_id, 'skill', 'Fundraising', 'Pitching to investors and negotiating terms', 
     '{"level": "intermediate", "years": 3, "raised": "$2M seed"}'::jsonb, 'curated'),
    (v_user_id, 'skill', 'Public Speaking', 'Conference talks and team presentations', 
     '{"level": "intermediate", "years": 5, "events": 25}'::jsonb, 'curated')
    RETURNING id INTO v_skill_nodes;

    -- Session nodes
    INSERT INTO graph_nodes (user_id, type, title, description, metadata, status) VALUES
    (v_user_id, 'session', 'Strategic Planning Session', 'Q1 2025 roadmap and OKR setting', 
     '{"duration": 45, "date": "2025-01-15", "insights": 3, "agent": "Strategic Coach"}'::jsonb, 'curated'),
    (v_user_id, 'session', 'Technical Deep Dive', 'Architecture review for scaling', 
     '{"duration": 60, "date": "2025-01-20", "insights": 5, "agent": "Tech Mentor"}'::jsonb, 'curated'),
    (v_user_id, 'session', 'Emotional Check-in', 'Processing startup stress and anxiety', 
     '{"duration": 30, "date": "2025-01-22", "insights": 2, "agent": "Wellness Coach"}'::jsonb, 'curated'),
    (v_user_id, 'session', 'Investor Prep', 'Pitch deck review and practice', 
     '{"duration": 90, "date": "2025-01-25", "insights": 4, "agent": "Fundraising Expert"}'::jsonb, 'curated')
    RETURNING id INTO v_session_nodes;

    -- Accomplishment nodes
    INSERT INTO graph_nodes (user_id, type, title, description, metadata, status) VALUES
    (v_user_id, 'accomplishment', 'First Enterprise Client', 'Signed Fortune 500 company as customer', 
     '{"date": "2024-12-15", "impact": "high", "revenue": "$100k ARR"}'::jsonb, 'curated'),
    (v_user_id, 'accomplishment', 'Team Milestone', 'Hired 10th team member', 
     '{"date": "2024-11-01", "impact": "medium", "department": "Engineering"}'::jsonb, 'curated'),
    (v_user_id, 'accomplishment', 'Product Launch', 'Released LiveGuide MVP', 
     '{"date": "2024-10-15", "impact": "high", "users": 100}'::jsonb, 'curated');

    -- Create meaningful edges between nodes
    INSERT INTO graph_edges (user_id, source_id, target_id, relationship_type, properties, strength) 
    SELECT 
        v_user_id,
        s.source_id,
        s.target_id,
        s.relationship_type,
        s.properties,
        s.strength
    FROM (
        -- Goals connected to emotions
        SELECT v_goal_nodes[1] as source_id, v_emotion_nodes[1] as target_id, 'drives' as relationship_type, 
               '{"context": "Revenue growth creates excitement"}'::jsonb as properties, 0.9 as strength
        UNION ALL
        SELECT v_goal_nodes[3] as source_id, v_emotion_nodes[3] as target_id, 'causes' as relationship_type,
               '{"context": "Funding pressure creates anxiety"}'::jsonb as properties, 0.8 as strength
        UNION ALL
        SELECT v_goal_nodes[5] as source_id, v_emotion_nodes[5] as target_id, 'creates' as relationship_type,
               '{"context": "Work-life balance brings gratitude"}'::jsonb as properties, 0.7 as strength
        UNION ALL
        -- Skills supporting goals
        SELECT v_skill_nodes[1] as source_id, v_goal_nodes[2] as target_id, 'enables' as relationship_type,
               '{"context": "AI expertise enables platform launch"}'::jsonb as properties, 0.95 as strength
        UNION ALL
        SELECT v_skill_nodes[4] as source_id, v_goal_nodes[3] as target_id, 'supports' as relationship_type,
               '{"context": "Fundraising skills support Series A"}'::jsonb as properties, 0.85 as strength
        UNION ALL
        -- Sessions addressing goals
        SELECT v_session_nodes[1] as source_id, v_goal_nodes[1] as target_id, 'advances' as relationship_type,
               '{"context": "Strategic planning advances revenue goal"}'::jsonb as properties, 0.8 as strength
        UNION ALL
        SELECT v_session_nodes[4] as source_id, v_goal_nodes[3] as target_id, 'prepares' as relationship_type,
               '{"context": "Investor prep for Series A"}'::jsonb as properties, 0.9 as strength
        UNION ALL
        -- Emotions from sessions
        SELECT v_session_nodes[3] as source_id, v_emotion_nodes[3] as target_id, 'addresses' as relationship_type,
               '{"context": "Emotional check-in addresses anxiety"}'::jsonb as properties, 0.75 as strength
        UNION ALL
        -- Inter-goal relationships
        SELECT v_goal_nodes[2] as source_id, v_goal_nodes[1] as target_id, 'contributes_to' as relationship_type,
               '{"context": "Platform launch contributes to revenue"}'::jsonb as properties, 0.85 as strength
        UNION ALL
        SELECT v_goal_nodes[3] as source_id, v_goal_nodes[1] as target_id, 'accelerates' as relationship_type,
               '{"context": "Funding accelerates growth"}'::jsonb as properties, 0.9 as strength
    ) s;

    -- Create voice chat events
    INSERT INTO voice_chat_events (user_id, conversation_id, event_type, timestamp, data) VALUES
    (v_user_id, gen_random_uuid(), 'session_start', NOW() - INTERVAL '2 hours', 
     '{"agent": "Strategic Coach", "topic": "Q1 Planning"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'insight_captured', NOW() - INTERVAL '1 hour 45 minutes',
     '{"insight": "Focus on retention over acquisition for Q1", "confidence": 0.92}'::jsonb),
    (v_user_id, gen_random_uuid(), 'emotion_detected', NOW() - INTERVAL '1 hour 30 minutes',
     '{"emotion": "determination", "intensity": 0.85, "context": "discussing challenges"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'action_item_created', NOW() - INTERVAL '1 hour',
     '{"action": "Review churn data with team", "deadline": "2025-02-01"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'session_end', NOW() - INTERVAL '45 minutes',
     '{"duration": 4500, "insights_count": 5, "satisfaction": 4.8}'::jsonb);

    -- Create knowledge base entries
    INSERT INTO knowledge_base (user_id, title, content, category, tags, source, created_at) VALUES
    (v_user_id, 'Scaling SaaS to $10M ARR', 
     'Key strategies: 1) Focus on enterprise clients, 2) Build predictable sales process, 3) Invest in customer success, 4) Optimize unit economics',
     'Business Strategy', ARRAY['saas', 'growth', 'revenue'], 'coaching_session', NOW() - INTERVAL '1 week'),
    (v_user_id, 'LLM Fine-tuning Best Practices',
     'Use domain-specific data, implement RLHF for quality, monitor for drift, version control training data',
     'Technical', ARRAY['ai', 'llm', 'machine-learning'], 'personal_research', NOW() - INTERVAL '2 weeks'),
    (v_user_id, 'Leadership During Hypergrowth',
     'Maintain culture through explicit values, over-communicate vision, delegate but verify, invest in middle management',
     'Leadership', ARRAY['management', 'culture', 'scaling'], 'mentorship', NOW() - INTERVAL '3 days'),
    (v_user_id, 'Fundraising Pitch Framework',
     'Structure: Problem magnitude, unique solution, traction proof, market size, team credibility, clear ask',
     'Fundraising', ARRAY['pitch', 'investors', 'series-a'], 'advisor_feedback', NOW() - INTERVAL '5 days');

    -- Create conversation insights
    INSERT INTO conversation_insights (conversation_id, user_id, insight_type, insight_content, confidence_score, created_at) VALUES
    (gen_random_uuid(), v_user_id, 'pattern', 
     'Consistently mentions team wellbeing when discussing growth - strong servant leadership tendency', 0.88, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), v_user_id, 'recommendation',
     'Consider implementing weekly 1:1s with direct reports to maintain connection during scaling', 0.92, NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), v_user_id, 'breakthrough',
     'Realized that technical debt is actually slowing revenue growth more than sales pipeline', 0.95, NOW() - INTERVAL '3 days');

    -- Add some accomplishments to goal_progress
    INSERT INTO goal_progress (goal_id, user_id, progress_value, notes, created_at)
    SELECT 
        ug.id,
        v_user_id,
        ug.progress + 5,
        'Weekly progress update from coaching session',
        NOW() - INTERVAL '1 day'
    FROM user_goals ug
    WHERE ug.user_id = v_user_id
    LIMIT 3;

    RAISE NOTICE 'Successfully seeded comprehensive demo data for mark.lewis@sparkytek.com';
END $$;