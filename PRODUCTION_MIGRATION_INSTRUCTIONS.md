# Production Migration Instructions for Knowledge Upload Fix

## Issue
The knowledge upload returns 500 error on production (liveguide.ai) because:
1. The required database tables may not exist
2. The storage bucket for documents may not be configured

## Steps to Fix

### 1. Run Database Migration

Go to your production Supabase dashboard:
1. Navigate to SQL Editor
2. Copy and paste the contents of `apply_rag_migrations.sql`
3. Execute the migration

**Important**: The migration includes:
- `agent_knowledge_bases` table
- `knowledge_documents` table  
- `document_chunks` table
- `knowledge_categories` table
- Required indexes and RLS policies

### 2. Create Storage Bucket

In Supabase Storage:
1. Go to Storage in your dashboard
2. Create a new bucket named `documents`
3. Set it as private (not public)
4. Configure allowed MIME types:
   - text/plain
   - text/markdown
   - application/pdf
   - text/html

### 3. Verify Initial Data

Run this SQL to create the initial knowledge base for Maya:

```sql
-- Check if knowledge base exists
SELECT * FROM agent_knowledge_bases WHERE agent_id = 'SuIlXQ4S6dyjrNViOrQ8';

-- If not exists, create it
INSERT INTO agent_knowledge_bases (
    agent_id, 
    name, 
    description,
    document_count,
    total_chunks,
    indexing_status
)
VALUES (
    'SuIlXQ4S6dyjrNViOrQ8',
    'Maya Coaching Knowledge Base',
    'Knowledge base for Maya AI coach',
    0,
    0,
    'pending'
)
ON CONFLICT (agent_id, name) DO NOTHING;
```

### 4. Test the Upload

After completing the above steps:
1. Go to https://liveguide.ai/admin/knowledge
2. Try uploading a test document
3. Check browser console for any errors

### 5. Monitor Logs

If issues persist, check:
- Supabase Function logs for API errors
- Browser console for client-side errors
- Network tab for response details

## Rollback Plan

If needed, you can remove the tables:

```sql
-- Remove in reverse order due to foreign keys
DROP TABLE IF EXISTS document_access_logs CASCADE;
DROP TABLE IF EXISTS document_categories CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS knowledge_documents CASCADE;
DROP TABLE IF EXISTS knowledge_categories CASCADE;
DROP TABLE IF EXISTS agent_knowledge_bases CASCADE;
```

## Environment Variables

Ensure production has all required env vars:
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side operations)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`