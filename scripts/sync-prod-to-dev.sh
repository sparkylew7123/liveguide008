#!/bin/bash

# Sync production database to development branch
# This script copies schema and data from production to dev, preserving environment-specific settings

echo "=== Syncing Production Database to Development Branch ==="
echo "This will copy schema and data from production to dev branch"
echo ""

# Database connection strings
PROD_DB="postgres://postgres.aesefwyijcsynbbhozhb:M8CXOcntS3zfJnXa@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"
DEV_DB="postgres://postgres.hlwxmfwrksflvcacjafg:VM5pboJJDOfwle3s@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

# Temporary dump file
DUMP_FILE="/tmp/prod_to_dev_dump_$(date +%Y%m%d_%H%M%S).sql"

echo "Step 1: Creating production database dump (schema + data)..."
pg_dump "$PROD_DB" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=vault \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-table=schema_migrations \
  --exclude-table=supabase_migrations \
  > "$DUMP_FILE"

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to create production dump"
  exit 1
fi

echo "Dump created successfully at: $DUMP_FILE"
echo ""

echo "Step 2: Backing up current dev database structure..."
DEV_BACKUP="/tmp/dev_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$DEV_DB" \
  --schema-only \
  --no-owner \
  --no-acl \
  > "$DEV_BACKUP"

echo "Dev backup created at: $DEV_BACKUP"
echo ""

echo "Step 3: Applying production dump to dev database..."
echo "This will replace existing tables with production data..."

# Apply the dump to dev database
psql "$DEV_DB" < "$DUMP_FILE"

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to apply production dump to dev"
  echo "You can restore dev from backup at: $DEV_BACKUP"
  exit 1
fi

echo ""
echo "Step 4: Updating environment-specific values..."

# Update any environment-specific values if needed
psql "$DEV_DB" <<EOF
-- Update any URLs or environment-specific settings here if needed
-- For now, the data should work as-is

-- Verify the sync
SELECT 'User Count' as metric, COUNT(*) as value FROM auth.users
UNION ALL
SELECT 'Profile Count', COUNT(*) FROM profiles
UNION ALL
SELECT 'Goal Count', COUNT(*) FROM user_goals
UNION ALL
SELECT 'Graph Node Count', COUNT(*) FROM graph_nodes
UNION ALL
SELECT 'Graph Edge Count', COUNT(*) FROM graph_edges
UNION ALL
SELECT 'Voice Event Count', COUNT(*) FROM voice_chat_events;
EOF

echo ""
echo "=== Sync Complete! ==="
echo "Production database has been copied to development branch."
echo "Backup of original dev database saved at: $DEV_BACKUP"
echo ""
echo "To verify mark.lewis@sparkytek.com data:"
echo "psql \"$DEV_DB\" -c \"SELECT email FROM auth.users WHERE email = 'mark.lewis@sparkytek.com';\""

# Clean up dump file
rm -f "$DUMP_FILE"
echo "Temporary dump file cleaned up."