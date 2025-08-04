-- Manual sync script to copy data from production to dev
-- Run each section separately in the appropriate database

-- ============================================
-- STEP 1: Run this on PRODUCTION to export data
-- ============================================

-- Export goal_categories
SELECT json_agg(row_to_json(t)) FROM goal_categories t;

-- Export profiles  
SELECT json_agg(row_to_json(t)) FROM profiles t WHERE id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';

-- Export user_goals
SELECT json_agg(row_to_json(t)) FROM user_goals t WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';

-- Export graph_nodes
SELECT json_agg(row_to_json(t)) FROM graph_nodes t WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';

-- Export graph_edges
SELECT json_agg(row_to_json(t)) FROM graph_edges t WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';

-- Export voice_chat_events
SELECT json_agg(row_to_json(t)) FROM voice_chat_events t WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';

-- ============================================
-- STEP 2: Run this on DEV to import data
-- ============================================

-- Clear existing data for this user
DELETE FROM graph_edges WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';
DELETE FROM graph_nodes WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';
DELETE FROM voice_chat_events WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';
DELETE FROM user_goals WHERE user_id = 'a6c2193a-fbed-4e35-97a9-c14f7caeb597';

-- Insert goal_categories (paste the JSON result from production)
INSERT INTO goal_categories 
SELECT * FROM json_populate_recordset(null::goal_categories, 'PASTE_JSON_HERE'::json);

-- Insert profiles (paste the JSON result from production)
INSERT INTO profiles 
SELECT * FROM json_populate_recordset(null::profiles, 'PASTE_JSON_HERE'::json)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    preferences = EXCLUDED.preferences,
    coaching_preferences = EXCLUDED.coaching_preferences,
    selected_goals = EXCLUDED.selected_goals,
    onboarding_completed_at = EXCLUDED.onboarding_completed_at,
    updated_at = EXCLUDED.updated_at;

-- Continue with other tables...