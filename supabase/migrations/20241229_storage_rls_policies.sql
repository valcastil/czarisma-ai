-- =====================================================
-- Storage Bucket RLS Policies for Message Attachments
-- =====================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view files they uploaded
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view files in conversations they're part of
CREATE POLICY "Users can view conversation files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.attachment_url LIKE '%' || name
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access for authenticated users
-- (This is needed for displaying attachments in messages)
CREATE POLICY "Authenticated users can view message attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

-- Update bucket to be private (not public)
UPDATE storage.buckets
SET public = false
WHERE id = 'message-attachments';

-- Add file size limit at storage level (50MB)
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'message-attachments';

-- Add allowed MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip'
]
WHERE id = 'message-attachments';

-- Comments
COMMENT ON POLICY "Users can upload to own folder" ON storage.objects IS 
  'Allows authenticated users to upload files only to their own user folder';

COMMENT ON POLICY "Users can view conversation files" ON storage.objects IS 
  'Allows users to view attachments from messages they sent or received';
