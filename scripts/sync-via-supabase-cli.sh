#!/bin/bash

# Alternative approach: Use Supabase CLI to sync databases
# This requires supabase CLI to be installed and configured

echo "=== Syncing Production to Dev using Supabase CLI ==="
echo ""

# First, let's create SQL scripts to export and import data
echo "Creating export/import SQL scripts..."

# Create export script
cat > /tmp/export_prod_data.sql << 'EOF'
-- Export all data from production tables (excluding system tables)
-- This creates INSERT statements for all user data

-- Goal categories
COPY (SELECT * FROM goal_categories) TO STDOUT WITH (FORMAT CSV, HEADER);

-- Profiles
COPY (SELECT * FROM profiles) TO STDOUT WITH (FORMAT CSV, HEADER);

-- User goals
COPY (SELECT * FROM user_goals) TO STDOUT WITH (FORMAT CSV, HEADER);

-- Graph nodes
COPY (SELECT * FROM graph_nodes) TO STDOUT WITH (FORMAT CSV, HEADER);

-- Graph edges  
COPY (SELECT * FROM graph_edges) TO STDOUT WITH (FORMAT CSV, HEADER);

-- Voice chat events
COPY (SELECT * FROM voice_chat_events) TO STDOUT WITH (FORMAT CSV, HEADER);

-- Knowledge base (if exists)
COPY (SELECT * FROM knowledge_base) TO STDOUT WITH (FORMAT CSV, HEADER);
EOF

echo "SQL scripts created."
echo ""

# Alternative: Direct table-by-table copy using the credentials we have
echo "Attempting direct table sync..."

# Let me try with the service role key approach
PROD_PROJECT_REF="aesefwyijcsynbbhozhb"
DEV_PROJECT_REF="hlwxmfwrksflvcacjafg"

# Create a Node.js script to handle the sync
cat > /tmp/sync_databases.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

// Production Supabase (from MCP config)
const prodUrl = 'https://aesefwyijcsynbbhozhb.supabase.co';
const prodServiceKey = process.env.PROD_SERVICE_KEY;

// Development Supabase (from .env.local)  
const devUrl = 'https://hlwxmfwrksflvcacjafg.supabase.co';
const devServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsd3htZndya3NmbHZjYWNqYWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEzMDczNSwiZXhwIjoyMDY5NzA2NzM1fQ.LObdbXRL1yg4jBHLubiXx5Qqx339Q66WbPb3eiOAsNo';

async function syncDatabases() {
  console.log('Starting database sync...');
  
  const prodSupabase = createClient(prodUrl, prodServiceKey);
  const devSupabase = createClient(devUrl, devServiceKey);
  
  try {
    // Tables to sync (in order due to foreign keys)
    const tables = [
      'goal_categories',
      'profiles', 
      'user_goals',
      'graph_nodes',
      'graph_edges',
      'voice_chat_events',
      'knowledge_base'
    ];
    
    for (const table of tables) {
      console.log(`\nSyncing table: ${table}`);
      
      // Fetch all data from production
      const { data: prodData, error: fetchError } = await prodSupabase
        .from(table)
        .select('*');
        
      if (fetchError) {
        console.error(`Error fetching from ${table}:`, fetchError.message);
        continue;
      }
      
      if (!prodData || prodData.length === 0) {
        console.log(`No data in ${table}`);
        continue;
      }
      
      console.log(`Found ${prodData.length} records in ${table}`);
      
      // Clear existing data in dev
      const { error: deleteError } = await devSupabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
      if (deleteError) {
        console.error(`Error clearing ${table}:`, deleteError.message);
      }
      
      // Insert data into dev
      const { error: insertError } = await devSupabase
        .from(table)
        .insert(prodData);
        
      if (insertError) {
        console.error(`Error inserting into ${table}:`, insertError.message);
      } else {
        console.log(`✓ Successfully synced ${prodData.length} records to ${table}`);
      }
    }
    
    console.log('\n=== Sync Complete! ===');
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

syncDatabases();
EOF

echo "Sync script created. This approach will use Supabase JS client to copy data."
echo ""
echo "Note: This requires the production service role key to be set."
echo "The production service key should be available from your Supabase dashboard."
echo ""
echo "To run the sync manually:"
echo "1. Get the production service role key from Supabase dashboard"
echo "2. Run: PROD_SERVICE_KEY='your-prod-key' node /tmp/sync_databases.js"
EOF