# Database Schema Synchronization: Production to Dev

## Overview

This document describes the schema differences found between production and development databases and the migration plan to synchronize them.

## Key Differences Identified

### 1. Missing Columns in Dev `graph_nodes` Table

Production has the following columns that are missing in dev:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `status` | `node_status` enum | `'draft_verbal'` | Tracks whether node is draft or curated |
| `embedding` | `vector` | NULL | Stores OpenAI embeddings for semantic search |
| `embedding_generated_at` | `timestamptz` | NULL | Timestamp when embedding was generated |
| `embedding_status` | `text` | `'pending'` | Status of embedding generation (pending/generating/completed/failed) |

### 2. Missing Custom Type in Dev

- **Type**: `node_status`
- **Values**: `'draft_verbal'`, `'curated'`
- **Usage**: Controls the lifecycle state of graph nodes

### 3. Missing View in Dev

- **View**: `graph_monitoring_dashboard`
- **Purpose**: Provides aggregated statistics for monitoring graph usage per user
- **Includes**: Node counts, edge counts, embedding statistics, activity metrics

### 4. Missing Indexes in Dev

Production has 27 indexes compared to dev's basic indexes:

**Critical Performance Indexes:**
- `idx_graph_nodes_embedding` - Vector similarity search
- `idx_graph_nodes_unique_user_type_label` - Prevents duplicate goals
- Multiple composite indexes for query optimization

## Migration Strategy

### Phase 1: Schema Migration

1. **Add enum type**: `node_status`
2. **Add columns**: All missing columns to `graph_nodes`
3. **Create view**: `graph_monitoring_dashboard`
4. **Add indexes**: All 27 production indexes

### Phase 2: Data Migration

1. **Migrate status from properties**: Move any status values stored in JSONB to proper column
2. **Clean properties**: Remove status field from JSONB after migration
3. **Set defaults**: Ensure all nodes have valid status

### Phase 3: Verification

1. **Column verification**: Ensure all columns match
2. **Index verification**: Confirm all indexes created
3. **View testing**: Verify monitoring dashboard works
4. **Application testing**: Test edge functions and queries

## Files Created

1. `/supabase/migrations/20250104_sync_dev_to_prod_schema.sql` - Main migration file
2. `/scripts/sync-dev-schema.sh` - Bash script to apply migration
3. `/scripts/verify-schema-sync.sql` - SQL verification queries
4. `/scripts/seed-dev-working.sql` - Updated to use status column

## Running the Migration

```bash
# 1. Switch to dev environment
cp .env.development .env.local

# 2. Run the migration
./scripts/sync-dev-schema.sh

# 3. Verify the changes
psql -f scripts/verify-schema-sync.sql
```

## Impact on Application

### Code Updates Needed

1. **Graph operations**: Update to handle `status` column
2. **Seed scripts**: Use status column instead of properties
3. **Type definitions**: Add status field to TypeScript types
4. **Queries**: Update to use new indexes for performance

### New Capabilities Enabled

1. **Semantic search**: Using pgvector embeddings
2. **Node lifecycle**: Draft vs curated states
3. **Performance monitoring**: Via monitoring dashboard
4. **Duplicate prevention**: Unique constraint on goals

## Important Notes

1. **Unique Constraint**: The new unique index prevents duplicate goals per user
2. **Status Migration**: Existing nodes with status in properties will be migrated
3. **Embedding Infrastructure**: Full pgvector support for RAG capabilities
4. **Performance**: New indexes significantly improve query performance

## Next Steps

After synchronization:
1. Test all edge functions
2. Update TypeScript types
3. Implement temporal graph features
4. Add embedding generation logic