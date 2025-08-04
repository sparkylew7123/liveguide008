-- Selective Data Sync Script
-- Copies specific reference data from production to dev without breaking environment-specific data

-- 1. Reference data that should be identical across environments
BEGIN;

-- Copy goal_categories (reference data)
TRUNCATE TABLE goal_categories CASCADE;
COPY goal_categories FROM '/tmp/goal_categories_prod.csv' WITH CSV HEADER;

-- Copy agent_personae (if you want same agents in dev)
-- But preserve environment-specific fields
INSERT INTO agent_personae (
    uuid, "Goal Category", "Category", "Name", "Speciality", 
    "Key Features", "Tone and Style", "Personality", "Backstory", 
    "Strengths", "Image", "JSONB", voice_profile, response_templates
)
SELECT 
    uuid, "Goal Category", "Category", "Name", "Speciality", 
    "Key Features", "Tone and Style", "Personality", "Backstory", 
    "Strengths", "Image", "JSONB", voice_profile, response_templates
FROM prod_agent_personae_temp
ON CONFLICT (uuid) DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Speciality" = EXCLUDED."Speciality",
    -- Don't update 11labs_agentID - environment specific!
    "Key Features" = EXCLUDED."Key Features";

COMMIT;

-- 2. Data to NEVER sync (environment-specific)
-- NEVER sync these tables:
-- - users (different auth IDs)
-- - profiles (linked to users)
-- - api_keys
-- - webhook_events (environment-specific)
-- - elevenlabs_conversations (different agent IDs)

-- 3. User data migration helper
-- If you need to map production user data to dev users:
CREATE TEMPORARY TABLE user_mapping (
    prod_user_id uuid,
    dev_user_id uuid,
    email text
);

-- Insert known mappings
INSERT INTO user_mapping VALUES
('a6c2193a-fbed-4e35-97a9-c14f7caeb597', '907f679d-b36a-42a8-8b60-ce0d9cc11726', 'mark.lewis@sparkytek.com');

-- Use mapping to copy user-specific data with correct IDs
INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status)
SELECT 
    m.dev_user_id,  -- Map to dev user ID
    p.node_type,
    p.label,
    p.description,
    p.properties,
    p.status
FROM prod_graph_nodes_temp p
JOIN user_mapping m ON p.user_id = m.prod_user_id
WHERE NOT EXISTS (
    SELECT 1 FROM graph_nodes 
    WHERE user_id = m.dev_user_id 
    AND node_type = p.node_type 
    AND label = p.label
);