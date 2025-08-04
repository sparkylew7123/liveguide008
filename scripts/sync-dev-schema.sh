#!/bin/bash

# Script to sync dev database schema with production
# This applies the migration to add missing columns and views

echo "🔄 Syncing dev database schema with production..."

# Set the dev branch as active
echo "📝 Switching to dev branch..."
cp .env.development .env.local

# Apply the migration
echo "🚀 Applying schema sync migration..."
supabase migration up --file supabase/migrations/20250104_sync_dev_to_prod_schema.sql

# Verify the changes
echo "✅ Verifying schema changes..."
supabase db diff

echo "📊 Checking graph_nodes columns..."
supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'graph_nodes' ORDER BY ordinal_position;"

echo "🔍 Checking if graph_monitoring_dashboard view exists..."
supabase db query "SELECT table_name, table_type FROM information_schema.tables WHERE table_name = 'graph_monitoring_dashboard';"

echo "✨ Schema sync complete!"
echo ""
echo "Next steps:"
echo "1. Test the application with the updated schema"
echo "2. Update any seed scripts that need the new columns"
echo "3. Verify edge functions work correctly"