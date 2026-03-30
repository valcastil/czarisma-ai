# 🚀 Real-Time Messaging Setup Guide

This guide will help you set up the Supabase database for real-time messaging functionality.

## Prerequisites

- Supabase account (free tier is sufficient)
- Access to your Supabase dashboard
- Your app's Supabase project

## Step 1: Access Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **gdgbuvgmzaqeajwxhldr**
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

## Step 2: Run the Migration

1. Open the migration file: `supabase/migrations/20241207_create_messaging_tables.sql`
2. Copy the ENTIRE contents of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Expected Output

You should see:
```
Success. No rows returned
```

This means all tables, triggers, and policies were created successfully.

## Step 3: Enable Realtime

1. In your Supabase dashboard, go to **Database** → **Replication**
2. Find these tables and enable realtime for each:
   - `profiles`
   - `messages`
   - `conversations`
3. Click the toggle switch next to each table to enable realtime

## Step 4: Verify Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should see three new tables:
   - ✅ `profiles` - User profile information
   - ✅ `messages` - Chat messages
   - ✅ `conversations` - Conversation metadata

## Step 5: Test the Setup

### Option A: Using SQL Editor

Run this query to verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'messages', 'conversations');
```

You should see all 3 tables listed.

### Option B: Using the App

1. Make sure you're signed in to the app
2. A profile should be automatically created for you
3. Go to **Table Editor** → **profiles**
4. You should see your user profile with:
   - Your user ID
   - Auto-generated username (e.g., `user_1234567`)
   - Your name
   - `is_online` = true

## Step 6: Test Messaging (Multi-Device)

To test real-time messaging:

1. **Device 1**: Sign in with Account A
2. **Device 2**: Sign in with Account B
3. **Device 1**: Go to Messages → New Message → Search for Account B
4. **Device 1**: Send a message
5. **Device 2**: The message should appear instantly! 🎉

## Troubleshooting

### Error: "relation 'profiles' does not exist"

**Solution**: The migration didn't run successfully. Try running it again.

### Error: "permission denied for table profiles"

**Solution**: Check that Row Level Security (RLS) policies were created. Run this query:

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

You should see multiple policies for each table.

### Messages not appearing in real-time

**Solution**: 
1. Check that Realtime is enabled for all 3 tables (Step 3)
2. Verify in **Database** → **Replication** that the tables show "Realtime enabled"
3. Restart your app

### "No users found" when searching

**Solution**:
1. Make sure you're signed in
2. Check that your profile was created in the `profiles` table
3. Have another user sign up and check they appear in the search

## Database Schema Overview

### `profiles` Table
Stores user information:
- `id` - User ID (linked to auth.users)
- `username` - Unique username (auto-generated)
- `name` - Display name
- `avatar_url` - Profile picture URL
- `is_online` - Online status
- `last_seen` - Last activity timestamp

### `messages` Table
Stores all chat messages:
- `id` - Message ID
- `sender_id` - Who sent the message
- `receiver_id` - Who receives the message
- `content` - Message text
- `is_read` - Read status
- `created_at` - When message was sent

### `conversations` Table
Stores conversation metadata (auto-updated by triggers):
- `id` - Conversation ID
- `user_id` - Owner of this conversation view
- `participant_id` - The other person in the conversation
- `last_message_content` - Preview of last message
- `unread_count` - Number of unread messages
- `updated_at` - Last activity

## Next Steps

Once the database is set up:

1. ✅ Users can now find each other in the app
2. ✅ Messages are stored in the cloud
3. ✅ Real-time delivery works across devices
4. ✅ Conversation list updates automatically
5. ✅ Read receipts work

## Support

If you encounter any issues:

1. Check the Supabase logs: **Logs** → **Postgres Logs**
2. Verify your Supabase credentials in `.env`
3. Make sure you're using the correct project URL and anon key

## Security Notes

- ✅ Row Level Security (RLS) is enabled on all tables
- ✅ Users can only see their own messages and conversations
- ✅ Users can only update their own profiles
- ✅ All database operations are authenticated

---

**Congratulations! 🎉** Your real-time messaging system is now set up and ready to use!
