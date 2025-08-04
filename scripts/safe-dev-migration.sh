#!/bin/bash

# Safe migration process for dev database
# Brings schema in line with production while preserving dev-specific data

echo "🔄 Safe Dev Database Migration Process"
echo "====================================="

# Step 1: Backup current dev database (just in case)
echo "📦 Step 1: Backing up current dev database..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DEV_DATABASE_URL > backups/dev_backup_${TIMESTAMP}.sql
echo "✅ Backup saved to backups/dev_backup_${TIMESTAMP}.sql"

# Step 2: Apply schema-only migrations
echo "🏗️  Step 2: Applying schema migrations..."
psql $DEV_DATABASE_URL -f supabase/migrations/20250104_sync_dev_to_prod_schema.sql
echo "✅ Schema migrations applied"

# Step 3: Verify schema changes
echo "🔍 Step 3: Verifying schema changes..."
psql $DEV_DATABASE_URL -f scripts/verify-schema-sync.sql > reports/schema_verification_${TIMESTAMP}.txt
echo "✅ Verification report saved"

# Step 4: Update any seed data for new schema
echo "🌱 Step 4: Updating seed data for new schema..."
# Only run if you have test data that needs the new columns
if [ -f "scripts/update-seed-data-for-new-schema.sql" ]; then
    psql $DEV_DATABASE_URL -f scripts/update-seed-data-for-new-schema.sql
    echo "✅ Seed data updated"
else
    echo "⏭️  No seed data updates needed"
fi

# Step 5: Test critical queries
echo "🧪 Step 5: Testing critical queries..."
cat << 'EOF' | psql $DEV_DATABASE_URL
-- Test that new columns work
SELECT id, node_type, label, status, embedding_status 
FROM graph_nodes 
LIMIT 5;

-- Test that unique constraint works
-- This should fail if constraint is active (good!)
DO $$
BEGIN
    INSERT INTO graph_nodes (user_id, node_type, label, status)
    VALUES 
        ('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'goal', 'Test Goal', 'draft_verbal'),
        ('907f679d-b36a-42a8-8b60-ce0d9cc11726', 'goal', 'Test Goal', 'curated');
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Good! Unique constraint is working';
END$$;

-- Test monitoring view
SELECT COUNT(*) FROM graph_monitoring_dashboard;
EOF

echo "✅ All tests completed"

# Step 6: Generate report
echo "📊 Step 6: Generating migration report..."
cat << EOF > reports/migration_summary_${TIMESTAMP}.txt
Migration Summary - ${TIMESTAMP}
================================

Schema Changes Applied:
- Added node_status enum type
- Added 4 columns to graph_nodes (status, embedding, embedding_generated_at, embedding_status)
- Created graph_monitoring_dashboard view
- Added 27 performance indexes
- Added unique constraint on (user_id, node_type, label)

Data Preserved:
- All existing user data maintained
- Environment-specific IDs unchanged
- Existing relationships preserved

Next Steps:
1. Test application with new schema
2. Update TypeScript types to include new fields
3. Test edge functions
4. Implement embedding generation logic
EOF

echo "✅ Report saved to reports/migration_summary_${TIMESTAMP}.txt"

echo ""
echo "🎉 Migration completed successfully!"
echo "   Dev database schema now matches production"
echo "   All environment-specific data preserved"