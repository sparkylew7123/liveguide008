-- Storage policies for documents bucket
-- Run these in Supabase SQL Editor to enable file operations

-- 1. Allow service role to upload files (for API uploads)
CREATE POLICY "Service role can upload documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'documents');

-- 2. Allow service role to update files
CREATE POLICY "Service role can update documents"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'documents');

-- 3. Allow service role to delete files
CREATE POLICY "Service role can delete documents"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'documents');

-- 4. Allow authenticated users to read their own files
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Alternative: If you want authenticated users to read all documents
-- CREATE POLICY "Authenticated users can read all documents"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'documents');

-- 5. Allow service role to read all files
CREATE POLICY "Service role can read all documents"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'documents');

-- Optional: If you want users to upload their own files directly
-- CREATE POLICY "Users can upload to their folder"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--     bucket_id = 'documents' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
-- );