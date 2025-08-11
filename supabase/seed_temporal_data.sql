-- Temporal seed data for graph visualization
-- This creates a realistic temporal dataset spread over 30 days

-- Get the user ID (you may need to adjust this based on your actual user)
DO $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_node_id UUID;
  v_base_time TIMESTAMP;
  v_current_time TIMESTAMP;
BEGIN
  -- Get a user ID (adjust this query based on your needs)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No user found. Please ensure you have at least one user in the database.';
    RETURN;
  END IF;

  -- Clear existing data for clean temporal dataset
  DELETE FROM graph_edges WHERE user_id = v_user_id;
  DELETE FROM graph_nodes WHERE user_id = v_user_id;

  -- Set base time to 30 days ago
  v_base_time := NOW() - INTERVAL '30 days';
  v_current_time := v_base_time;

  -- Session 1: Initial Planning (Day 1)
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Project Kickoff',
    'curated',
    v_current_time,
    v_current_time
  ) RETURNING id INTO v_session_id;

  -- Add some goals
  v_current_time := v_current_time + INTERVAL '5 minutes';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at, properties)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'goal',
    'Launch MVP',
    'curated',
    v_current_time,
    v_current_time,
    jsonb_build_object('session_id', v_session_id, 'priority', 'high')
  ) RETURNING id INTO v_node_id;

  -- Create edge
  INSERT INTO graph_edges (id, user_id, source_id, target_id, edge_type, weight, created_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_session_id,
    v_node_id,
    'discusses',
    0.9,
    v_current_time
  );

  -- Session 2: Technical Planning (Day 3)
  v_current_time := v_base_time + INTERVAL '3 days';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Technical Architecture',
    'curated',
    v_current_time,
    v_current_time
  ) RETURNING id INTO v_session_id;

  -- Add technical skills
  v_current_time := v_current_time + INTERVAL '10 minutes';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at, properties)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'skill',
    'System Design',
    'curated',
    v_current_time,
    v_current_time,
    jsonb_build_object('session_id', v_session_id, 'level', 'expert')
  );

  -- Session 3: Progress Review (Day 7)
  v_current_time := v_base_time + INTERVAL '7 days';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Week 1 Review',
    'curated',
    v_current_time,
    v_current_time
  ) RETURNING id INTO v_session_id;

  -- Add emotion node
  v_current_time := v_current_time + INTERVAL '15 minutes';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at, properties)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'emotion',
    'Motivated',
    'curated',
    v_current_time,
    v_current_time,
    jsonb_build_object('session_id', v_session_id, 'intensity', 0.8)
  );

  -- Session 4: Challenges (Day 10)
  v_current_time := v_base_time + INTERVAL '10 days';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Problem Solving',
    'curated',
    v_current_time,
    v_current_time
  );

  -- Session 5: Breakthrough (Day 14)
  v_current_time := v_base_time + INTERVAL '14 days';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Major Breakthrough',
    'curated',
    v_current_time,
    v_current_time
  ) RETURNING id INTO v_session_id;

  -- Add value node
  v_current_time := v_current_time + INTERVAL '20 minutes';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at, properties)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'value',
    'Innovation',
    'curated',
    v_current_time,
    v_current_time,
    jsonb_build_object('session_id', v_session_id)
  );

  -- Session 6: Team Building (Day 18)
  v_current_time := v_base_time + INTERVAL '18 days';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Team Collaboration',
    'curated',
    v_current_time,
    v_current_time
  );

  -- Session 7: Strategy Refinement (Day 21)
  v_current_time := v_base_time + INTERVAL '21 days';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Strategy Pivot',
    'curated',
    v_current_time,
    v_current_time
  ) RETURNING id INTO v_session_id;

  -- Add strength node
  v_current_time := v_current_time + INTERVAL '25 minutes';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at, properties)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'strength',
    'Adaptability',
    'curated',
    v_current_time,
    v_current_time,
    jsonb_build_object('session_id', v_session_id)
  );

  -- Session 8: Final Push (Day 25)
  v_current_time := v_base_time + INTERVAL '25 days';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Final Sprint',
    'curated',
    v_current_time,
    v_current_time
  );

  -- Session 9: Launch Prep (Day 28)
  v_current_time := v_base_time + INTERVAL '28 days';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Launch Preparation',
    'curated',
    v_current_time,
    v_current_time
  );

  -- Session 10: Today's Session (Today)
  v_current_time := NOW() - INTERVAL '2 hours';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'session',
    'Post-Launch Review',
    'curated',
    v_current_time,
    v_current_time
  ) RETURNING id INTO v_session_id;

  -- Add recent nodes
  v_current_time := v_current_time + INTERVAL '30 minutes';
  INSERT INTO graph_nodes (id, user_id, node_type, label, status, created_at, updated_at, properties)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'emotion',
    'Accomplished',
    'curated',
    v_current_time,
    v_current_time,
    jsonb_build_object('session_id', v_session_id, 'intensity', 0.95)
  );

  -- Add some cross-session connections
  -- Connect related goals across sessions
  INSERT INTO graph_edges (id, user_id, source_id, target_id, edge_type, weight, created_at)
  SELECT 
    gen_random_uuid(),
    v_user_id,
    n1.id,
    n2.id,
    'relates_to',
    0.7,
    GREATEST(n1.created_at, n2.created_at) + INTERVAL '1 hour'
  FROM graph_nodes n1
  CROSS JOIN graph_nodes n2
  WHERE n1.user_id = v_user_id
    AND n2.user_id = v_user_id
    AND n1.id != n2.id
    AND n1.node_type = 'goal'
    AND n2.node_type IN ('skill', 'value')
    AND n1.created_at < n2.created_at
  LIMIT 5;

  RAISE NOTICE 'Temporal seed data created successfully!';
  RAISE NOTICE 'Created sessions spanning from % to now', v_base_time;
  
END $$;