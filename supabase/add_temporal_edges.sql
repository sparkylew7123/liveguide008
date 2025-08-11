-- Add comprehensive edges for temporal graph visualization
-- This creates meaningful connections between nodes

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'mark.lewis@sparkytek.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;

  -- Clear existing edges for clean slate
  DELETE FROM graph_edges WHERE user_id = v_user_id;

  -- Session 1: Project Kickoff connections
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Project Kickoff -> Define MVP Scope
  (gen_random_uuid(), v_user_id, '10000001-0000-0000-0000-000000000001', '10000002-0000-0000-0000-000000000002', 'creates', jsonb_build_object('weight', 0.9), '2025-07-08 20:46:33.606053+00'),
  -- Project Kickoff -> Excited
  (gen_random_uuid(), v_user_id, '10000001-0000-0000-0000-000000000001', '10000003-0000-0000-0000-000000000003', 'evokes', jsonb_build_object('weight', 0.8), '2025-07-08 22:46:33.606053+00');

  -- Session 2: Team Assembly connections
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Team Assembly -> Leadership skill
  (gen_random_uuid(), v_user_id, '10000004-0000-0000-0000-000000000004', '10000005-0000-0000-0000-000000000005', 'develops', jsonb_build_object('weight', 0.85), '2025-07-11 21:46:33.606053+00'),
  -- Team Assembly -> Team Formed accomplishment
  (gen_random_uuid(), v_user_id, '10000004-0000-0000-0000-000000000004', '10000006-0000-0000-0000-000000000006', 'achieves', jsonb_build_object('weight', 0.95), '2025-07-14 20:46:33.606053+00'),
  -- Leadership -> Team Formed (skill enables accomplishment)
  (gen_random_uuid(), v_user_id, '10000005-0000-0000-0000-000000000005', '10000006-0000-0000-0000-000000000006', 'enables', jsonb_build_object('weight', 0.7), '2025-07-14 21:46:33.606053+00');

  -- Session 3: Sprint Planning connections
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Sprint Planning -> Build Core Features
  (gen_random_uuid(), v_user_id, '10000007-0000-0000-0000-000000000007', '10000008-0000-0000-0000-000000000008', 'plans', jsonb_build_object('weight', 0.9), '2025-07-17 21:16:33.606053+00'),
  -- Sprint Planning -> Focused emotion
  (gen_random_uuid(), v_user_id, '10000007-0000-0000-0000-000000000007', '10000009-0000-0000-0000-000000000009', 'creates', jsonb_build_object('weight', 0.75), '2025-07-20 20:46:33.606053+00'),
  -- Sprint Planning -> React Development skill
  (gen_random_uuid(), v_user_id, '10000007-0000-0000-0000-000000000007', '10000010-0000-0000-0000-000000000010', 'requires', jsonb_build_object('weight', 0.8), '2025-07-20 23:46:33.606053+00'),
  -- Build Core Features -> React Development (goal requires skill)
  (gen_random_uuid(), v_user_id, '10000008-0000-0000-0000-000000000008', '10000010-0000-0000-0000-000000000010', 'depends_on', jsonb_build_object('weight', 0.85), '2025-07-20 23:46:33.606053+00');

  -- Session 4: Mid-Sprint Review connections
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Mid-Sprint Review -> Alpha Release
  (gen_random_uuid(), v_user_id, '10000011-0000-0000-0000-000000000011', '10000012-0000-0000-0000-000000000012', 'produces', jsonb_build_object('weight', 0.9), '2025-07-23 22:46:33.606053+00'),
  -- Mid-Sprint Review -> User Feedback goal
  (gen_random_uuid(), v_user_id, '10000011-0000-0000-0000-000000000011', '10000013-0000-0000-0000-000000000013', 'identifies', jsonb_build_object('weight', 0.85), '2025-07-26 20:46:33.606053+00'),
  -- Mid-Sprint Review -> Anxious emotion
  (gen_random_uuid(), v_user_id, '10000011-0000-0000-0000-000000000011', '10000014-0000-0000-0000-000000000014', 'triggers', jsonb_build_object('weight', 0.7), '2025-07-26 21:46:33.606053+00'),
  -- Alpha Release -> User Feedback (accomplishment leads to new goal)
  (gen_random_uuid(), v_user_id, '10000012-0000-0000-0000-000000000012', '10000013-0000-0000-0000-000000000013', 'leads_to', jsonb_build_object('weight', 0.8), '2025-07-26 20:46:33.606053+00');

  -- Session 5: Pivot Meeting connections
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Pivot Meeting -> Adaptability skill
  (gen_random_uuid(), v_user_id, '10000015-0000-0000-0000-000000000015', '10000016-0000-0000-0000-000000000016', 'develops', jsonb_build_object('weight', 0.9), '2025-07-29 21:16:33.606053+00'),
  -- Pivot Meeting -> New Direction Set
  (gen_random_uuid(), v_user_id, '10000015-0000-0000-0000-000000000015', '10000017-0000-0000-0000-000000000017', 'results_in', jsonb_build_object('weight', 0.95), '2025-08-01 20:46:33.606053+00'),
  -- Pivot Meeting -> Determined emotion
  (gen_random_uuid(), v_user_id, '10000015-0000-0000-0000-000000000015', '10000018-0000-0000-0000-000000000018', 'transforms_to', jsonb_build_object('weight', 0.8), '2025-08-01 22:46:33.606053+00'),
  -- User Feedback -> Pivot Meeting (feedback triggered pivot)
  (gen_random_uuid(), v_user_id, '10000013-0000-0000-0000-000000000013', '10000015-0000-0000-0000-000000000015', 'informs', jsonb_build_object('weight', 0.85), '2025-07-29 20:46:33.606053+00'),
  -- Anxious -> Determined (emotion transformation)
  (gen_random_uuid(), v_user_id, '10000014-0000-0000-0000-000000000014', '10000018-0000-0000-0000-000000000018', 'evolves_to', jsonb_build_object('weight', 0.75), '2025-08-01 22:46:33.606053+00');

  -- Session 6: Final Push connections
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Final Push -> Launch Ready goal
  (gen_random_uuid(), v_user_id, '10000019-0000-0000-0000-000000000019', '10000020-0000-0000-0000-000000000020', 'targets', jsonb_build_object('weight', 0.95), '2025-08-03 21:46:33.606053+00'),
  -- New Direction Set -> Final Push (accomplishment enables session)
  (gen_random_uuid(), v_user_id, '10000017-0000-0000-0000-000000000017', '10000019-0000-0000-0000-000000000019', 'enables', jsonb_build_object('weight', 0.85), '2025-08-03 20:46:33.606053+00'),
  -- Determined -> Final Push (emotion drives action)
  (gen_random_uuid(), v_user_id, '10000018-0000-0000-0000-000000000018', '10000019-0000-0000-0000-000000000019', 'motivates', jsonb_build_object('weight', 0.8), '2025-08-03 20:46:33.606053+00');

  -- Session 7: Launch Day connections
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Launch Day -> Triumphant emotion
  (gen_random_uuid(), v_user_id, '10000021-0000-0000-0000-000000000021', '10000022-0000-0000-0000-000000000022', 'creates', jsonb_build_object('weight', 0.95), '2025-08-04 20:16:33.606053+00'),
  -- Launch Ready -> Launch Day (goal achievement)
  (gen_random_uuid(), v_user_id, '10000020-0000-0000-0000-000000000020', '10000021-0000-0000-0000-000000000021', 'achieved_by', jsonb_build_object('weight', 0.9), '2025-08-04 18:46:33.606053+00');

  -- Cross-session strategic connections
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Define MVP Scope -> Build Core Features (goals connection)
  (gen_random_uuid(), v_user_id, '10000002-0000-0000-0000-000000000002', '10000008-0000-0000-0000-000000000008', 'refines_to', jsonb_build_object('weight', 0.8), '2025-07-17 21:16:33.606053+00'),
  -- Build Core Features -> Alpha Release (goal leads to accomplishment)
  (gen_random_uuid(), v_user_id, '10000008-0000-0000-0000-000000000008', '10000012-0000-0000-0000-000000000012', 'delivers', jsonb_build_object('weight', 0.85), '2025-07-23 22:46:33.606053+00'),
  -- Team Formed -> Sprint Planning (accomplishment enables session)
  (gen_random_uuid(), v_user_id, '10000006-0000-0000-0000-000000000006', '10000007-0000-0000-0000-000000000007', 'enables', jsonb_build_object('weight', 0.8), '2025-07-17 20:46:33.606053+00'),
  -- Adaptability -> Launch Ready (skill enables goal)
  (gen_random_uuid(), v_user_id, '10000016-0000-0000-0000-000000000016', '10000020-0000-0000-0000-000000000020', 'facilitates', jsonb_build_object('weight', 0.75), '2025-08-03 21:46:33.606053+00'),
  -- Excited -> Triumphant (emotional journey)
  (gen_random_uuid(), v_user_id, '10000003-0000-0000-0000-000000000003', '10000022-0000-0000-0000-000000000022', 'culminates_in', jsonb_build_object('weight', 0.7), '2025-08-04 20:16:33.606053+00');

  RAISE NOTICE 'Added % edges for temporal graph', 30;
  
END $$;