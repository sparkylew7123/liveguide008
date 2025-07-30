-- LiveGuide Graph Database - Example Queries and Usage Patterns
-- This file demonstrates how to use the graph schema for common operations

-- ============================================
-- CREATING NODES AND RELATIONSHIPS
-- ============================================

-- Example 1: Create a career transition goal
WITH new_goal AS (
    SELECT create_goal_node(
        auth.uid(),
        'Transition to Product Management',
        'Move from caregiving role to product management position',
        'career',
        '2024-12-31'::timestamptz,
        'high'
    ) as goal_id
)
SELECT goal_id FROM new_goal;

-- Example 2: Create skills derived from caregiving experience
WITH new_skills AS (
    SELECT 
        create_skill_node(
            auth.uid(),
            'Crisis Management',
            'Ability to stay calm and make decisions under pressure',
            'advanced'::skill_level,
            ARRAY['caregiving', 'emergency_response']
        ) as skill_id
    UNION ALL
    SELECT 
        create_skill_node(
            auth.uid(),
            'Stakeholder Communication',
            'Clear communication with multiple parties including families and medical staff',
            'expert'::skill_level,
            ARRAY['caregiving', 'family_liaison']
        )
)
SELECT skill_id FROM new_skills;

-- Example 3: Create a coaching session and link to goals
WITH session_creation AS (
    SELECT create_session_node(
        auth.uid(),
        'Interview Preparation Session',
        'Practiced translating caregiving experience to PM skills',
        'agent_123',
        30,
        ARRAY[
            (SELECT id FROM graph_nodes 
             WHERE user_id = auth.uid() 
             AND node_type = 'goal' 
             AND label = 'Transition to Product Management'
             LIMIT 1)
        ]::UUID[]
    ) as session_id
)
SELECT session_id FROM session_creation;

-- Example 4: Track emotional state
SELECT track_emotion(
    auth.uid(),
    'confident'::emotion_type,
    0.8,
    'After successful mock interview'
);

-- Example 5: Create an accomplishment from a session
WITH accomplishment AS (
    INSERT INTO graph_nodes (user_id, node_type, label, description, properties)
    VALUES (
        auth.uid(),
        'accomplishment',
        'Completed STAR interview responses',
        'Created 5 STAR format responses translating caregiving to PM skills',
        jsonb_build_object(
            'completed', true,
            'evidence', 'Document saved with interview responses',
            'impact', 'high'
        )
    )
    RETURNING id
),
link_to_session AS (
    INSERT INTO graph_edges (user_id, edge_type, source_node_id, target_node_id)
    SELECT 
        auth.uid(),
        'derived_from'::edge_type,
        (SELECT id FROM graph_nodes 
         WHERE user_id = auth.uid() 
         AND node_type = 'session' 
         AND label = 'Interview Preparation Session'
         ORDER BY created_at DESC 
         LIMIT 1),
        accomplishment.id
    FROM accomplishment
    RETURNING id
)
SELECT * FROM accomplishment;

-- ============================================
-- QUERYING THE GRAPH
-- ============================================

-- Query 1: Get all goals with their progress and related sessions
SELECT * FROM get_user_goals_with_progress(auth.uid());

-- Query 2: Get skill network with related goals
SELECT * FROM get_user_skills_graph(auth.uid());

-- Query 3: Get emotional journey over time
SELECT 
    n.label as emotion,
    (n.properties->>'intensity')::DECIMAL as intensity,
    n.description as context,
    n.created_at
FROM graph_nodes n
WHERE n.user_id = auth.uid()
    AND n.node_type = 'emotion'
    AND n.deleted_at IS NULL
ORDER BY n.created_at DESC;

-- Query 4: Get accomplishments by goal
SELECT 
    g.label as goal,
    a.label as accomplishment,
    a.description,
    a.created_at,
    s.label as from_session
FROM graph_nodes g
JOIN graph_edges e1 ON g.id = e1.target_node_id 
    AND e1.edge_type = 'works_on'
JOIN graph_nodes s ON e1.source_node_id = s.id 
    AND s.node_type = 'session'
JOIN graph_edges e2 ON s.id = e2.source_node_id 
    AND e2.edge_type = 'derived_from'
JOIN graph_nodes a ON e2.target_node_id = a.id 
    AND a.node_type = 'accomplishment'
WHERE g.user_id = auth.uid()
    AND g.node_type = 'goal'
    AND g.deleted_at IS NULL
ORDER BY a.created_at DESC;

-- Query 5: Find skills that could help with a specific goal
WITH goal_skills AS (
    SELECT DISTINCT
        sk.id,
        sk.label as skill,
        sk.properties->>'level' as level,
        COUNT(DISTINCT s.id) as usage_count
    FROM graph_nodes g
    JOIN graph_edges e1 ON g.id = e1.target_node_id 
        AND e1.edge_type = 'works_on'
    JOIN graph_nodes s ON e1.source_node_id = s.id 
        AND s.node_type = 'session'
    JOIN graph_edges e2 ON s.id = e2.target_node_id 
        AND e2.edge_type = 'has_skill'
    JOIN graph_nodes sk ON e2.source_node_id = sk.id 
        AND sk.node_type = 'skill'
    WHERE g.user_id = auth.uid()
        AND g.label = 'Transition to Product Management'
        AND g.deleted_at IS NULL
    GROUP BY sk.id, sk.label, sk.properties
)
SELECT * FROM goal_skills ORDER BY usage_count DESC;

-- ============================================
-- GRAPH TRAVERSAL PATTERNS
-- ============================================

-- Pattern 1: Find learning path (sessions → goals → skills needed)
WITH RECURSIVE learning_path AS (
    -- Start with a goal
    SELECT 
        n.id,
        n.label,
        n.node_type,
        0 as depth,
        ARRAY[n.id] as path
    FROM graph_nodes n
    WHERE n.user_id = auth.uid()
        AND n.node_type = 'goal'
        AND n.label = 'Transition to Product Management'
    
    UNION ALL
    
    -- Traverse edges
    SELECT 
        n.id,
        n.label,
        n.node_type,
        lp.depth + 1,
        lp.path || n.id
    FROM learning_path lp
    JOIN graph_edges e ON lp.id = e.source_node_id OR lp.id = e.target_node_id
    JOIN graph_nodes n ON (
        CASE 
            WHEN e.source_node_id = lp.id THEN e.target_node_id
            ELSE e.source_node_id
        END = n.id
    )
    WHERE n.user_id = auth.uid()
        AND NOT n.id = ANY(lp.path)
        AND lp.depth < 3
)
SELECT DISTINCT ON (id) * FROM learning_path ORDER BY id, depth;

-- Pattern 2: Emotion correlation with accomplishments
SELECT 
    e.label as emotion,
    AVG((e.properties->>'intensity')::DECIMAL) as avg_intensity,
    COUNT(DISTINCT a.id) as accomplishments_nearby
FROM graph_nodes e
LEFT JOIN graph_nodes a ON a.user_id = e.user_id 
    AND a.node_type = 'accomplishment'
    AND a.created_at BETWEEN e.created_at - INTERVAL '1 day' AND e.created_at + INTERVAL '1 day'
WHERE e.user_id = auth.uid()
    AND e.node_type = 'emotion'
    AND e.deleted_at IS NULL
GROUP BY e.label
ORDER BY accomplishments_nearby DESC;

-- ============================================
-- UPDATE OPERATIONS
-- ============================================

-- Update goal progress based on accomplishments
UPDATE graph_nodes g
SET properties = properties || 
    jsonb_build_object('progress', 
        LEAST(1.0, (
            SELECT COUNT(*)::DECIMAL / 10 -- Assuming 10 accomplishments = 100%
            FROM graph_edges e1
            JOIN graph_nodes s ON e1.source_node_id = s.id AND s.node_type = 'session'
            JOIN graph_edges e2 ON s.id = e2.source_node_id AND e2.edge_type = 'derived_from'
            JOIN graph_nodes a ON e2.target_node_id = a.id AND a.node_type = 'accomplishment'
            WHERE e1.target_node_id = g.id AND e1.edge_type = 'works_on'
        ))
    )
WHERE g.user_id = auth.uid()
    AND g.node_type = 'goal'
    AND g.label = 'Transition to Product Management';

-- Mark a session as completed
UPDATE graph_nodes
SET properties = properties || jsonb_build_object('completed', true)
WHERE user_id = auth.uid()
    AND node_type = 'session'
    AND id = 'session_uuid_here';

-- ============================================
-- ANALYTICS QUERIES
-- ============================================

-- Weekly progress report
SELECT 
    date_trunc('week', s.created_at) as week,
    COUNT(DISTINCT s.id) as sessions,
    COUNT(DISTINCT a.id) as accomplishments,
    AVG((e.properties->>'intensity')::DECIMAL) as avg_confidence
FROM graph_nodes s
LEFT JOIN graph_edges ea ON s.id = ea.source_node_id AND ea.edge_type = 'derived_from'
LEFT JOIN graph_nodes a ON ea.target_node_id = a.id AND a.node_type = 'accomplishment'
LEFT JOIN graph_nodes e ON e.user_id = s.user_id 
    AND e.node_type = 'emotion' 
    AND e.label = 'confident'
    AND e.created_at BETWEEN s.created_at - INTERVAL '1 hour' AND s.created_at + INTERVAL '1 hour'
WHERE s.user_id = auth.uid()
    AND s.node_type = 'session'
    AND s.created_at > CURRENT_DATE - INTERVAL '3 months'
GROUP BY date_trunc('week', s.created_at)
ORDER BY week DESC;

-- Skill development trajectory
SELECT 
    s.label as skill,
    s.properties->>'level' as current_level,
    MIN(e.created_at) as first_used,
    MAX(e.created_at) as last_used,
    COUNT(DISTINCT e.id) as times_applied
FROM graph_nodes s
LEFT JOIN graph_edges e ON s.id = e.source_node_id AND e.edge_type = 'has_skill'
WHERE s.user_id = auth.uid()
    AND s.node_type = 'skill'
GROUP BY s.id, s.label, s.properties
ORDER BY times_applied DESC;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Soft delete old emotion nodes (keep last 100)
UPDATE graph_nodes
SET deleted_at = now()
WHERE id IN (
    SELECT id 
    FROM graph_nodes
    WHERE user_id = auth.uid()
        AND node_type = 'emotion'
        AND deleted_at IS NULL
    ORDER BY created_at DESC
    OFFSET 100
);

-- Archive completed goals
UPDATE graph_edges
SET valid_to = now()
WHERE user_id = auth.uid()
    AND edge_type = 'works_on'
    AND target_node_id IN (
        SELECT id 
        FROM graph_nodes
        WHERE user_id = auth.uid()
            AND node_type = 'goal'
            AND (properties->>'progress')::DECIMAL >= 1.0
    );

-- ============================================
-- INTEGRATION WITH EXISTING TABLES
-- ============================================

-- Migrate existing user_goals to graph structure
INSERT INTO graph_nodes (user_id, node_type, label, description, properties, created_at)
SELECT 
    COALESCE(profile_id, user_id),
    'goal'::node_type,
    goal_title,
    goal_description,
    jsonb_build_object(
        'category', category_id,
        'target_date', target_date,
        'status', goal_status,
        'milestones', milestones,
        'original_id', id
    ),
    created_at
FROM user_goals
WHERE NOT EXISTS (
    SELECT 1 FROM graph_nodes 
    WHERE properties->>'original_id' = user_goals.id::TEXT
);

-- Link voice conversations to session nodes
INSERT INTO graph_edges (user_id, edge_type, source_node_id, target_node_id, properties)
SELECT 
    vc.created_by,
    'derived_from'::edge_type,
    s.id,
    s.id, -- Self-reference for now, could link to accomplishments
    jsonb_build_object(
        'conversation_id', vc.conversation_id,
        'agent_id', vc.agent_id,
        'duration', vc.metadata->>'duration'
    )
FROM voice_chat_conversations vc
JOIN graph_nodes s ON s.user_id = vc.created_by 
    AND s.node_type = 'session'
    AND s.properties->>'agent_id' = vc.agent_id
    AND s.created_at BETWEEN vc.created_at - INTERVAL '1 minute' AND vc.created_at + INTERVAL '1 minute'
WHERE vc.created_by IS NOT NULL;