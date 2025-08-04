-- Comprehensive demo data for mark.lewis@sparkytek.com
-- Demonstrates LiveGuide's capabilities with rich, interconnected data

DO $$
DECLARE
    v_user_id UUID := 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';
    v_goal_nodes UUID[] := ARRAY[]::UUID[];
    v_emotion_nodes UUID[] := ARRAY[]::UUID[];
    v_skill_nodes UUID[] := ARRAY[]::UUID[];
    v_session_nodes UUID[] := ARRAY[]::UUID[];
    v_accomplishment_nodes UUID[] := ARRAY[]::UUID[];
    v_node_id UUID;
BEGIN
    -- Update profile with comprehensive information
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
    WHERE id = v_user_id;

    -- Create user goals
    INSERT INTO user_goals (user_id, title, description, category, priority, target_date, status, progress, created_at) VALUES
    -- Business Goals
    (v_user_id, 'Scale SparkyTek to $10M ARR', 'Grow from $2M to $10M through product expansion and market penetration', 'Business', 'high', '2025-12-31', 'active', 20, NOW() - INTERVAL '3 months'),
    (v_user_id, 'Launch AI Coaching Platform', 'Release LiveGuide with 1000 active users', 'Business', 'high', '2025-06-30', 'active', 65, NOW() - INTERVAL '2 months'),
    (v_user_id, 'Secure Series A Funding', 'Raise $5M to accelerate growth', 'Business', 'high', '2025-09-30', 'active', 15, NOW() - INTERVAL '1 month'),
    -- Technical Goals
    (v_user_id, 'Master LLM Fine-tuning', 'Become proficient in fine-tuning large language models', 'Technical', 'medium', '2025-04-30', 'active', 40, NOW() - INTERVAL '2 weeks'),
    (v_user_id, 'Build Scalable Infrastructure', 'Handle 100k concurrent users with <100ms latency', 'Technical', 'high', '2025-05-31', 'active', 30, NOW() - INTERVAL '1 month'),
    -- Personal Goals
    (v_user_id, 'Maintain Work-Life Balance', 'Quality time with family while building company', 'Personal', 'high', '2025-12-31', 'active', 60, NOW() - INTERVAL '1 month'),
    (v_user_id, 'Complete Marathon', 'Train for SF Marathon', 'Health', 'medium', '2025-10-15', 'active', 25, NOW() - INTERVAL '2 months'),
    -- Community Goals
    (v_user_id, 'Mentor 50 Entrepreneurs', 'Guide early-stage founders', 'Community', 'medium', '2025-12-31', 'active', 35, NOW() - INTERVAL '2 months');

    -- Create Goal nodes in graph
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
    (v_user_id, 'goal'::node_type, 'Scale to $10M ARR', 'Primary business objective for 2025', 
     '{"category": "Business", "priority": "high", "progress": 20, "metrics": {"current_arr": "$2M", "target_arr": "$10M"}}'::jsonb, 'curated'::node_status),
    (v_user_id, 'goal'::node_type, 'Launch AI Platform', 'Release LiveGuide with 1000 users', 
     '{"category": "Product", "priority": "high", "progress": 65, "metrics": {"current_users": 100, "target_users": 1000}}'::jsonb, 'curated'::node_status),
    (v_user_id, 'goal'::node_type, 'Series A Funding', 'Raise $5M growth capital', 
     '{"category": "Fundraising", "priority": "high", "progress": 15, "metrics": {"target": "$5M", "timeline": "Q3 2025"}}'::jsonb, 'curated'::node_status),
    (v_user_id, 'goal'::node_type, 'Master LLM Tech', 'AI/ML expertise development', 
     '{"category": "Technical", "priority": "medium", "progress": 40, "skills": ["fine-tuning", "RAG", "embeddings"]}'::jsonb, 'curated'::node_status),
    (v_user_id, 'goal'::node_type, 'Work-Life Harmony', 'Balance family and startup', 
     '{"category": "Personal", "priority": "high", "progress": 60, "metrics": {"family_time": "2hrs/day", "vacation": "2 weeks/year"}}'::jsonb, 'curated'::node_status)
    RETURNING id INTO v_goal_nodes;

    -- Create Emotion nodes
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
    (v_user_id, 'emotion'::node_type, 'Excitement', 'Product launch enthusiasm', 
     '{"valence": "positive", "arousal": "high", "trigger": "customer_traction", "frequency": "daily"}'::jsonb, 'curated'::node_status),
    (v_user_id, 'emotion'::node_type, 'Determination', 'Overcoming challenges', 
     '{"valence": "positive", "arousal": "medium", "trigger": "technical_problems", "frequency": "weekly"}'::jsonb, 'curated'::node_status),
    (v_user_id, 'emotion'::node_type, 'Anxiety', 'Funding runway concerns', 
     '{"valence": "negative", "arousal": "high", "trigger": "burn_rate", "frequency": "bi-weekly"}'::jsonb, 'curated'::node_status),
    (v_user_id, 'emotion'::node_type, 'Pride', 'Team achievements', 
     '{"valence": "positive", "arousal": "medium", "trigger": "team_wins", "frequency": "weekly"}'::jsonb, 'curated'::node_status),
    (v_user_id, 'emotion'::node_type, 'Gratitude', 'Support system appreciation', 
     '{"valence": "positive", "arousal": "low", "trigger": "reflection", "frequency": "daily"}'::jsonb, 'curated'::node_status)
    RETURNING id INTO v_emotion_nodes;

    -- Create Skill nodes
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
    (v_user_id, 'skill'::node_type, 'AI/ML Engineering', 'LLMs and ML pipelines expertise', 
     '{"level": "expert", "years": 5, "technologies": ["GPT", "Claude", "Embeddings", "Fine-tuning"]}'::jsonb, 'curated'::node_status),
    (v_user_id, 'skill'::node_type, 'Product Leadership', 'User-centric development', 
     '{"level": "advanced", "years": 8, "frameworks": ["Agile", "Lean", "Design Thinking"]}'::jsonb, 'curated'::node_status),
    (v_user_id, 'skill'::node_type, 'Team Building', 'Scaling high-performance teams', 
     '{"level": "advanced", "years": 10, "team_size": 15, "retention": "95%"}'::jsonb, 'curated'::node_status),
    (v_user_id, 'skill'::node_type, 'Fundraising', 'Investor relations', 
     '{"level": "intermediate", "years": 3, "raised": "$2M seed", "investors": 12}'::jsonb, 'curated'::node_status)
    RETURNING id INTO v_skill_nodes;

    -- Create Session nodes
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
    (v_user_id, 'session'::node_type, 'Q1 Strategic Planning', 'Roadmap and OKR setting', 
     '{"duration_min": 45, "date": "2025-01-15", "agent": "Strategic Coach", "insights": 3}'::jsonb, 'curated'::node_status),
    (v_user_id, 'session'::node_type, 'Architecture Review', 'Scaling infrastructure design', 
     '{"duration_min": 60, "date": "2025-01-20", "agent": "Tech Mentor", "insights": 5}'::jsonb, 'curated'::node_status),
    (v_user_id, 'session'::node_type, 'Emotional Check-in', 'Startup stress management', 
     '{"duration_min": 30, "date": "2025-01-22", "agent": "Wellness Coach", "insights": 2}'::jsonb, 'curated'::node_status),
    (v_user_id, 'session'::node_type, 'Pitch Practice', 'Series A preparation', 
     '{"duration_min": 90, "date": "2025-01-25", "agent": "Fundraising Expert", "insights": 4}'::jsonb, 'curated'::node_status)
    RETURNING id INTO v_session_nodes;

    -- Create Accomplishment nodes
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status) VALUES
    (v_user_id, 'accomplishment'::node_type, 'First Enterprise Client', 'Fortune 500 customer signed', 
     '{"date": "2024-12-15", "impact": "high", "revenue": "$100k ARR", "company": "Tech Corp"}'::jsonb, 'curated'::node_status),
    (v_user_id, 'accomplishment'::node_type, '10th Team Member', 'Engineering team milestone', 
     '{"date": "2024-11-01", "impact": "medium", "role": "Senior ML Engineer"}'::jsonb, 'curated'::node_status),
    (v_user_id, 'accomplishment'::node_type, 'LiveGuide MVP Launch', 'Product goes live', 
     '{"date": "2024-10-15", "impact": "high", "users": 100, "feedback": "4.8/5"}'::jsonb, 'curated'::node_status)
    RETURNING id INTO v_accomplishment_nodes;

    -- Create meaningful edges
    -- Goals to Emotions
    INSERT INTO graph_edges (user_id, source_id, target_id, relationship_type, properties, strength) VALUES
    (v_user_id, v_goal_nodes[1], v_emotion_nodes[1], 'drives', '{"context": "Revenue growth creates excitement"}'::jsonb, 0.9),
    (v_user_id, v_goal_nodes[3], v_emotion_nodes[3], 'causes', '{"context": "Funding pressure creates anxiety"}'::jsonb, 0.8),
    (v_user_id, v_goal_nodes[5], v_emotion_nodes[5], 'creates', '{"context": "Balance brings gratitude"}'::jsonb, 0.7),
    
    -- Skills to Goals
    (v_user_id, v_skill_nodes[1], v_goal_nodes[2], 'enables', '{"context": "AI expertise enables platform"}'::jsonb, 0.95),
    (v_user_id, v_skill_nodes[4], v_goal_nodes[3], 'supports', '{"context": "Fundraising skills for Series A"}'::jsonb, 0.85),
    (v_user_id, v_skill_nodes[3], v_goal_nodes[1], 'accelerates', '{"context": "Team building drives growth"}'::jsonb, 0.8),
    
    -- Sessions to Goals
    (v_user_id, v_session_nodes[1], v_goal_nodes[1], 'advances', '{"context": "Strategic planning for revenue"}'::jsonb, 0.8),
    (v_user_id, v_session_nodes[4], v_goal_nodes[3], 'prepares', '{"context": "Pitch practice for Series A"}'::jsonb, 0.9),
    
    -- Sessions to Emotions
    (v_user_id, v_session_nodes[3], v_emotion_nodes[3], 'addresses', '{"context": "Managing startup anxiety"}'::jsonb, 0.75),
    
    -- Accomplishments to Goals
    (v_user_id, v_accomplishment_nodes[1], v_goal_nodes[1], 'validates', '{"context": "Enterprise client validates model"}'::jsonb, 0.85),
    (v_user_id, v_accomplishment_nodes[3], v_goal_nodes[2], 'progresses', '{"context": "MVP launch progresses platform goal"}'::jsonb, 0.9),
    
    -- Inter-goal relationships
    (v_user_id, v_goal_nodes[2], v_goal_nodes[1], 'contributes_to', '{"context": "Platform drives revenue"}'::jsonb, 0.85),
    (v_user_id, v_goal_nodes[3], v_goal_nodes[1], 'accelerates', '{"context": "Funding accelerates growth"}'::jsonb, 0.9),
    (v_user_id, v_goal_nodes[4], v_goal_nodes[2], 'enhances', '{"context": "ML expertise improves product"}'::jsonb, 0.8);

    -- Create voice chat events
    INSERT INTO voice_chat_events (user_id, conversation_id, event_type, timestamp, data) VALUES
    (v_user_id, gen_random_uuid(), 'session_start', NOW() - INTERVAL '2 hours', 
     '{"agent": "Strategic Coach", "topic": "Q1 Planning", "mood": "focused"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'insight_captured', NOW() - INTERVAL '1 hour 45 minutes',
     '{"insight": "Focus on retention over acquisition", "confidence": 0.92, "category": "strategy"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'emotion_detected', NOW() - INTERVAL '1 hour 30 minutes',
     '{"emotion": "determination", "intensity": 0.85, "context": "discussing challenges"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'goal_mentioned', NOW() - INTERVAL '1 hour 15 minutes',
     '{"goal": "Scale to $10M ARR", "context": "discussing metrics", "sentiment": "optimistic"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'action_item_created', NOW() - INTERVAL '1 hour',
     '{"action": "Review churn data with team", "deadline": "2025-02-01", "priority": "high"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'breakthrough_moment', NOW() - INTERVAL '45 minutes',
     '{"realization": "Product stickiness more important than features", "impact": "high"}'::jsonb),
    (v_user_id, gen_random_uuid(), 'session_end', NOW() - INTERVAL '30 minutes',
     '{"duration": 5400, "insights_count": 5, "satisfaction": 4.8, "next_session": "2025-02-01"}'::jsonb);

    -- Create knowledge base entries
    INSERT INTO knowledge_base (user_id, title, content, category, tags, source, created_at) VALUES
    (v_user_id, 'Scaling SaaS to $10M ARR', 
     E'Key strategies learned:\n1. Focus on enterprise clients (higher ACV)\n2. Build predictable sales process\n3. Invest heavily in customer success\n4. Optimize unit economics before scaling\n5. Hire ahead of the curve for key roles',
     'Business Strategy', ARRAY['saas', 'growth', 'revenue', 'scaling'], 'coaching_session', NOW() - INTERVAL '1 week'),
    
    (v_user_id, 'LLM Fine-tuning Best Practices',
     E'Technical insights:\n- Use domain-specific data (min 10k examples)\n- Implement RLHF for quality improvements\n- Monitor for model drift weekly\n- Version control training data\n- A/B test in production',
     'Technical', ARRAY['ai', 'llm', 'machine-learning', 'fine-tuning'], 'personal_research', NOW() - INTERVAL '2 weeks'),
    
    (v_user_id, 'Leadership During Hypergrowth',
     E'Leadership principles that scale:\n- Maintain culture through explicit values\n- Over-communicate vision (weekly all-hands)\n- Delegate but verify with metrics\n- Invest in middle management early\n- Document everything',
     'Leadership', ARRAY['management', 'culture', 'scaling', 'team-building'], 'mentorship', NOW() - INTERVAL '3 days');

    -- Create agent personas interactions
    INSERT INTO inbox_messages (id, user_id, agent_id, content, is_from_user, created_at) VALUES
    (gen_random_uuid(), v_user_id, 'strategic-advisor', 'Based on your current metrics, focusing on reducing churn by 2% would have more impact than acquiring 100 new customers.', false, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), v_user_id, 'tech-mentor', 'Consider implementing vector embeddings for your customer similarity matching. It could improve recommendation accuracy by 40%.', false, NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), v_user_id, 'wellness-coach', 'I noticed increased stress markers in our last session. Let''s schedule a check-in to discuss sustainable pace strategies.', false, NOW() - INTERVAL '3 days');

    -- Update embedding status for nodes
    UPDATE graph_nodes 
    SET embedding_status = 'pending'
    WHERE user_id = v_user_id 
    AND embedding IS NULL;

    RAISE NOTICE 'Successfully seeded comprehensive demo data for mark.lewis@sparkytek.com';
    RAISE NOTICE 'Created: % goals, % emotions, % skills, % sessions, % accomplishments', 
        array_length(v_goal_nodes, 1), 
        array_length(v_emotion_nodes, 1),
        array_length(v_skill_nodes, 1),
        array_length(v_session_nodes, 1),
        array_length(v_accomplishment_nodes, 1);
    RAISE NOTICE 'Total nodes: %, Total edges: %', 
        (SELECT COUNT(*) FROM graph_nodes WHERE user_id = v_user_id),
        (SELECT COUNT(*) FROM graph_edges WHERE user_id = v_user_id);
END $$;