-- Production Data Export/Import Helper
-- Use this to selectively copy data from production to dev

-- 1. Export reference data from production (run in PRODUCTION)
-- Creates CSV files that can be imported into dev

\copy goal_categories TO '/tmp/goal_categories_export.csv' WITH CSV HEADER;
\copy agent_personae (uuid, "Name", "Speciality", "Category", "Personality", "Backstory") TO '/tmp/agent_personae_export.csv' WITH CSV HEADER;

-- 2. Export user data with anonymization (run in PRODUCTION)
-- Replace real user IDs with dev user IDs during import
\copy (
    SELECT 
        'DEV_USER_ID_PLACEHOLDER' as user_id,  -- Will be replaced during import
        node_type,
        label,
        description,
        properties,
        status,
        now() as created_at,
        now() as updated_at
    FROM graph_nodes 
    WHERE user_id = 'PROD_USER_ID_HERE'
    AND node_type IN ('goal', 'skill')  -- Only export certain types
) TO '/tmp/sample_nodes_export.csv' WITH CSV HEADER;

-- 3. Import into dev (run in DEV)
-- First, create a staging table
CREATE TEMP TABLE staging_nodes (
    user_id text,
    node_type text,
    label text,
    description text,
    properties jsonb,
    status text,
    created_at timestamptz,
    updated_at timestamptz
);

-- Import the data
\copy staging_nodes FROM '/tmp/sample_nodes_export.csv' WITH CSV HEADER;

-- Insert with proper user ID mapping and deduplication
INSERT INTO graph_nodes (user_id, node_type, label, description, properties, status)
SELECT 
    '907f679d-b36a-42a8-8b60-ce0d9cc11726'::uuid,  -- Dev user ID
    node_type::node_type,
    label,
    description,
    properties,
    status::node_status
FROM staging_nodes
ON CONFLICT (user_id, node_type, label) WHERE deleted_at IS NULL
DO UPDATE SET
    description = EXCLUDED.description,
    properties = EXCLUDED.properties,
    status = EXCLUDED.status,
    updated_at = now();

-- 4. Helper function to map users between environments
CREATE OR REPLACE FUNCTION map_prod_to_dev_user(prod_email text)
RETURNS uuid AS $$
DECLARE
    dev_user_id uuid;
BEGIN
    -- Map known users
    CASE prod_email
        WHEN 'mark.lewis@sparkytek.com' THEN 
            dev_user_id := '907f679d-b36a-42a8-8b60-ce0d9cc11726';
        ELSE
            -- Return a default test user or NULL
            dev_user_id := NULL;
    END CASE;
    
    RETURN dev_user_id;
END;
$$ LANGUAGE plpgsql;