-- Updated storage policies for documents bucket
-- These policies allow the current file structure: knowledge/{agentId}/{fileName}

-- First, drop existing policies
DROP POLICY IF EXISTS "Service role can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read all documents" ON storage.objects;

-- 1. Allow service role full access (for API uploads)
CREATE POLICY "Service role can upload documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Service role can update documents"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'documents');

CREATE POLICY "Service role can delete documents"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'documents');

CREATE POLICY "Service role can read all documents"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'documents');

-- 2. Allow authenticated users to read all knowledge base documents
-- Since knowledge is shared across users for AI coaching
CREATE POLICY "Authenticated users can read all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Alternative: If you want to restrict by user, you'd need to change the upload path
-- to include user_id: documents/{user_id}/knowledge/{agentId}/{fileName}
-- Then use this policy instead:
-- CREATE POLICY "Users can read own documents"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--     bucket_id = 'documents' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
-- );