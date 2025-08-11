-- Add comprehensive edges for temporal graph visualization
-- Using only valid edge types: works_on, has_skill, derived_from, feels, achieves

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

  -- Session connections to goals (works_on)
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Project Kickoff -> Define MVP Scope
  (gen_random_uuid(), v_user_id, '10000001-0000-0000-0000-000000000001', '10000002-0000-0000-0000-000000000002', 'works_on', jsonb_build_object('weight', 0.9, 'label', 'creates'), '2025-07-08 20:46:33.606053+00'),
  -- Sprint Planning -> Build Core Features
  (gen_random_uuid(), v_user_id, '10000007-0000-0000-0000-000000000007', '10000008-0000-0000-0000-000000000008', 'works_on', jsonb_build_object('weight', 0.9, 'label', 'plans'), '2025-07-17 21:16:33.606053+00'),
  -- Mid-Sprint Review -> User Feedback goal
  (gen_random_uuid(), v_user_id, '10000011-0000-0000-0000-000000000011', '10000013-0000-0000-0000-000000000013', 'works_on', jsonb_build_object('weight', 0.85, 'label', 'identifies'), '2025-07-26 20:46:33.606053+00'),
  -- Final Push -> Launch Ready goal
  (gen_random_uuid(), v_user_id, '10000019-0000-0000-0000-000000000019', '10000020-0000-0000-0000-000000000020', 'works_on', jsonb_build_object('weight', 0.95, 'label', 'targets'), '2025-08-03 21:46:33.606053+00');

  -- Session to emotion connections (feels)
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Project Kickoff -> Excited
  (gen_random_uuid(), v_user_id, '10000001-0000-0000-0000-000000000001', '10000003-0000-0000-0000-000000000003', 'feels', jsonb_build_object('weight', 0.8, 'label', 'evokes'), '2025-07-08 22:46:33.606053+00'),
  -- Sprint Planning -> Focused emotion
  (gen_random_uuid(), v_user_id, '10000007-0000-0000-0000-000000000007', '10000009-0000-0000-0000-000000000009', 'feels', jsonb_build_object('weight', 0.75), '2025-07-20 20:46:33.606053+00'),
  -- Mid-Sprint Review -> Anxious emotion
  (gen_random_uuid(), v_user_id, '10000011-0000-0000-0000-000000000011', '10000014-0000-0000-0000-000000000014', 'feels', jsonb_build_object('weight', 0.7, 'label', 'triggers'), '2025-07-26 21:46:33.606053+00'),
  -- Pivot Meeting -> Determined emotion
  (gen_random_uuid(), v_user_id, '10000015-0000-0000-0000-000000000015', '10000018-0000-0000-0000-000000000018', 'feels', jsonb_build_object('weight', 0.8, 'label', 'transforms to'), '2025-08-01 22:46:33.606053+00'),
  -- Launch Day -> Triumphant emotion
  (gen_random_uuid(), v_user_id, '10000021-0000-0000-0000-000000000021', '10000022-0000-0000-0000-000000000022', 'feels', jsonb_build_object('weight', 0.95), '2025-08-04 20:16:33.606053+00');

  -- Session to skill connections (has_skill)
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Team Assembly -> Leadership skill
  (gen_random_uuid(), v_user_id, '10000004-0000-0000-0000-000000000004', '10000005-0000-0000-0000-000000000005', 'has_skill', jsonb_build_object('weight', 0.85, 'label', 'develops'), '2025-07-11 21:46:33.606053+00'),
  -- Sprint Planning -> React Development skill
  (gen_random_uuid(), v_user_id, '10000007-0000-0000-0000-000000000007', '10000010-0000-0000-0000-000000000010', 'has_skill', jsonb_build_object('weight', 0.8, 'label', 'requires'), '2025-07-20 23:46:33.606053+00'),
  -- Pivot Meeting -> Adaptability skill
  (gen_random_uuid(), v_user_id, '10000015-0000-0000-0000-000000000015', '10000016-0000-0000-0000-000000000016', 'has_skill', jsonb_build_object('weight', 0.9, 'label', 'develops'), '2025-07-29 21:16:33.606053+00');

  -- Session to accomplishment connections (achieves)
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Team Assembly -> Team Formed accomplishment
  (gen_random_uuid(), v_user_id, '10000004-0000-0000-0000-000000000004', '10000006-0000-0000-0000-000000000006', 'achieves', jsonb_build_object('weight', 0.95), '2025-07-14 20:46:33.606053+00'),
  -- Mid-Sprint Review -> Alpha Release
  (gen_random_uuid(), v_user_id, '10000011-0000-0000-0000-000000000011', '10000012-0000-0000-0000-000000000012', 'achieves', jsonb_build_object('weight', 0.9, 'label', 'produces'), '2025-07-23 22:46:33.606053+00'),
  -- Pivot Meeting -> New Direction Set
  (gen_random_uuid(), v_user_id, '10000015-0000-0000-0000-000000000015', '10000017-0000-0000-0000-000000000017', 'achieves', jsonb_build_object('weight', 0.95, 'label', 'results in'), '2025-08-01 20:46:33.606053+00'),
  -- Launch Day achieves Launch Ready (reverse connection to show completion)
  (gen_random_uuid(), v_user_id, '10000021-0000-0000-0000-000000000021', '10000020-0000-0000-0000-000000000020', 'achieves', jsonb_build_object('weight', 0.9, 'label', 'completes'), '2025-08-04 18:46:33.606053+00');

  -- Strategic connections using derived_from
  INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, properties, created_at) VALUES
  -- Build Core Features derived from Define MVP Scope
  (gen_random_uuid(), v_user_id, '10000008-0000-0000-0000-000000000008', '10000002-0000-0000-0000-000000000002', 'derived_from', jsonb_build_object('weight', 0.8, 'label', 'refines'), '2025-07-17 21:16:33.606053+00'),
  -- Alpha Release derived from Build Core Features
  (gen_random_uuid(), v_user_id, '10000012-0000-0000-0000-000000000012', '10000008-0000-0000-0000-000000000008', 'derived_from', jsonb_build_object('weight', 0.85, 'label', 'delivers'), '2025-07-23 22:46:33.606053+00'),
  -- User Feedback derived from Alpha Release
  (gen_random_uuid(), v_user_id, '10000013-0000-0000-0000-000000000013', '10000012-0000-0000-0000-000000000012', 'derived_from', jsonb_build_object('weight', 0.8, 'label', 'follows'), '2025-07-26 20:46:33.606053+00'),
  -- Pivot Meeting derived from User Feedback
  (gen_random_uuid(), v_user_id, '10000015-0000-0000-0000-000000000015', '10000013-0000-0000-0000-000000000013', 'derived_from', jsonb_build_object('weight', 0.85, 'label', 'informed by'), '2025-07-29 20:46:33.606053+00'),
  -- Final Push derived from New Direction Set
  (gen_random_uuid(), v_user_id, '10000019-0000-0000-0000-000000000019', '10000017-0000-0000-0000-000000000017', 'derived_from', jsonb_build_object('weight', 0.85, 'label', 'enabled by'), '2025-08-03 20:46:33.606053+00'),
  -- Launch Ready derived from Adaptability
  (gen_random_uuid(), v_user_id, '10000020-0000-0000-0000-000000000020', '10000016-0000-0000-0000-000000000016', 'derived_from', jsonb_build_object('weight', 0.75, 'label', 'facilitated by'), '2025-08-03 21:46:33.606053+00'),
  -- Determined emotion derived from Anxious (transformation)
  (gen_random_uuid(), v_user_id, '10000018-0000-0000-0000-000000000018', '10000014-0000-0000-0000-000000000014', 'derived_from', jsonb_build_object('weight', 0.75, 'label', 'evolves from'), '2025-08-01 22:46:33.606053+00'),
  -- Triumphant derived from Excited (emotional journey)
  (gen_random_uuid(), v_user_id, '10000022-0000-0000-0000-000000000022', '10000003-0000-0000-0000-000000000003', 'derived_from', jsonb_build_object('weight', 0.7, 'label', 'culminates from'), '2025-08-04 20:16:33.606053+00'),
  -- Sprint Planning derived from Team Formed
  (gen_random_uuid(), v_user_id, '10000007-0000-0000-0000-000000000007', '10000006-0000-0000-0000-000000000006', 'derived_from', jsonb_build_object('weight', 0.8, 'label', 'enabled by'), '2025-07-17 20:46:33.606053+00'),
  -- React Development skill derived from Build Core Features goal
  (gen_random_uuid(), v_user_id, '10000010-0000-0000-0000-000000000010', '10000008-0000-0000-0000-000000000008', 'derived_from', jsonb_build_object('weight', 0.85, 'label', 'required by'), '2025-07-20 23:46:33.606053+00');

  RAISE NOTICE 'Added % edges for temporal graph', 26;
  
END $$;