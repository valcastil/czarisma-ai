# Avatar Storage Setup SQL

Run these SQL commands in your Supabase SQL Editor (https://supabase.com/dashboard/project/gdgbuvgmzaqeajwxhldr/sql)

## Step 1: Create/Update Avatars Bucket (MUST be public)

```sql
-- Create avatars storage bucket as PUBLIC so avatars are accessible to all users
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- MUST be public for avatars to display for other users
  5242880, -- 5MB limit for avatars
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET public = true;
```

**If the bucket already exists but is private**, run this to make it public:
```sql
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
```

## Step 2: Create RLS Policies

```sql
-- Policy 1: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can view their own avatar
CREATE POLICY "Users can view own avatar" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Everyone can view avatars (for profile pictures)
CREATE POLICY "Everyone can view avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars'
);

-- Policy 5: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Step 3: Verify Setup

```sql
-- Check if bucket was created
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Check if policies were created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND table_schema = 'storage';
```

## After Running SQL

1. Test the avatar upload by going to Profile Settings
2. Update your profile picture
3. Check the console logs for upload progress
4. Ask another user to verify they can see your avatar

If you get permission errors, make sure the RLS policies were created correctly.
