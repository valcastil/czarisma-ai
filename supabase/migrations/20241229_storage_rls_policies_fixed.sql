-- =====================================================
-- Storage Bucket RLS Policies for Message Attachments
-- FIXED VERSION - Run this in Supabase Dashboard SQL Editor
-- =====================================================

-- Note: Storage policies must be created in the Supabase Dashboard
-- Go to: Storage > message-attachments > Policies

-- This file contains the policy definitions for reference
-- Copy and paste each policy individually in the Dashboard

-- =====================================================
-- POLICY 1: Upload to own folder
-- =====================================================
-- Name: Users can upload to own folder
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
bucket_id = 'message-attachments' AND
(storage.foldername(name))[1] = auth.uid()::text

-- =====================================================
-- POLICY 2: View own files
-- =====================================================
-- Name: Users can view own files
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression:
bucket_id = 'message-attachments' AND
(storage.foldername(name))[1] = auth.uid()::text

-- =====================================================
-- POLICY 3: View conversation files
-- =====================================================
-- Name: Users can view conversation files
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression:
bucket_id = 'message-attachments' AND
EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.attachment_url LIKE '%' || name
  AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
)

-- =====================================================
-- POLICY 4: Delete own files
-- =====================================================
-- Name: Users can delete own files
-- Allowed operation: DELETE
-- Target roles: authenticated
-- USING expression:
bucket_id = 'message-attachments' AND
(storage.foldername(name))[1] = auth.uid()::text

-- =====================================================
-- BUCKET CONFIGURATION
-- =====================================================
-- These settings must be configured in the Supabase Dashboard:
-- Go to: Storage > message-attachments > Configuration

-- 1. Public bucket: OFF (make it private)
-- 2. File size limit: 52428800 (50MB in bytes)
-- 3. Allowed MIME types:
--    - image/jpeg
--    - image/png
--    - image/gif
--    - image/webp
--    - video/mp4
--    - video/quicktime
--    - application/pdf
--    - application/msword
--    - application/vnd.openxmlformats-officedocument.wordprocessingml.document
--    - application/vnd.ms-excel
--    - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
--    - application/vnd.ms-powerpoint
--    - application/vnd.openxmlformats-officedocument.presentationml.presentation
--    - text/plain
--    - application/zip
