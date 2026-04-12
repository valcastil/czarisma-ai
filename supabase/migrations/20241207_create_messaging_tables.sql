-- =====================================================
-- Real-Time Messaging System Database Schema
-- =====================================================
-- This migration creates the necessary tables for real-time user-to-user messaging
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
-- Stores user profile information synced with auth.users

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile Information
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    
    -- Status
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

-- =====================================================
-- 2. MESSAGES TABLE
-- =====================================================
-- Stores all chat messages between users

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Message participants
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    
    -- Message status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
    CONSTRAINT content_max_length CHECK (char_length(content) <= 5000),
    CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, is_read) WHERE is_read = false;

-- =====================================================
-- 3. CONVERSATIONS TABLE
-- =====================================================
-- Stores conversation metadata for quick list display

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Conversation participants
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Last message info
    last_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    last_message_content TEXT,
    last_message_timestamp TIMESTAMPTZ,
    last_message_sender_id UUID,
    
    -- Conversation status
    unread_count INTEGER DEFAULT 0,
    is_muted BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_conversation UNIQUE(user_id, participant_id),
    CONSTRAINT different_participants CHECK (user_id != participant_id),
    CONSTRAINT unread_count_positive CHECK (unread_count >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_id ON public.conversations(participant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread ON public.conversations(user_id, unread_count) WHERE unread_count > 0;

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Messages Policies
CREATE POLICY "Users can view messages they sent or received"
    ON public.messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they sent or received (for read status and reactions)"
    ON public.messages FOR UPDATE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete messages they sent"
    ON public.messages FOR DELETE
    USING (auth.uid() = sender_id);

-- Conversations Policies
CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON public.conversations FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 5. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to update conversation on new message
-- SECURITY DEFINER is required to bypass RLS and create conversation records for both sender and receiver
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update conversation for sender
    INSERT INTO public.conversations (
        user_id,
        participant_id,
        last_message_id,
        last_message_content,
        last_message_timestamp,
        last_message_sender_id,
        unread_count
    ) VALUES (
        NEW.sender_id,
        NEW.receiver_id,
        NEW.id,
        NEW.content,
        NEW.created_at,
        NEW.sender_id,
        0
    )
    ON CONFLICT (user_id, participant_id)
    DO UPDATE SET
        last_message_id = NEW.id,
        last_message_content = NEW.content,
        last_message_timestamp = NEW.created_at,
        last_message_sender_id = NEW.sender_id,
        updated_at = NOW();
    
    -- Update conversation for receiver
    INSERT INTO public.conversations (
        user_id,
        participant_id,
        last_message_id,
        last_message_content,
        last_message_timestamp,
        last_message_sender_id,
        unread_count
    ) VALUES (
        NEW.receiver_id,
        NEW.sender_id,
        NEW.id,
        NEW.content,
        NEW.created_at,
        NEW.sender_id,
        1
    )
    ON CONFLICT (user_id, participant_id)
    DO UPDATE SET
        last_message_id = NEW.id,
        last_message_content = NEW.content,
        last_message_timestamp = NEW.created_at,
        last_message_sender_id = NEW.sender_id,
        unread_count = public.conversations.unread_count + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversations on new message
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_on_message();

-- Function to update conversation when message is read
CREATE OR REPLACE FUNCTION public.update_conversation_on_read()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = true AND OLD.is_read = false THEN
        UPDATE public.conversations
        SET unread_count = GREATEST(0, unread_count - 1)
        WHERE user_id = NEW.receiver_id
        AND participant_id = NEW.sender_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation when message is read
CREATE TRIGGER update_conversation_on_message_read
    AFTER UPDATE ON public.messages
    FOR EACH ROW
    WHEN (NEW.is_read IS DISTINCT FROM OLD.is_read)
    EXECUTE FUNCTION public.update_conversation_on_read();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    random_username TEXT;
    username_exists BOOLEAN;
BEGIN
    -- Generate unique username
    LOOP
        random_username := 'user_' || LPAD(floor(random() * 10000000)::TEXT, 7, '0');
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = random_username) INTO username_exists;
        EXIT WHEN NOT username_exists;
    END LOOP;
    
    -- Create profile
    INSERT INTO public.profiles (id, username, name, is_online)
    VALUES (
        NEW.id,
        random_username,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        true
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- =====================================================
-- 7. GRANTS
-- =====================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.conversations TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.conversations TO service_role;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles synced with auth.users';
COMMENT ON TABLE public.messages IS 'Chat messages between users';
COMMENT ON TABLE public.conversations IS 'Conversation metadata for quick list display';

COMMENT ON COLUMN public.profiles.is_online IS 'Whether user is currently online';
COMMENT ON COLUMN public.profiles.last_seen IS 'Last time user was active';
COMMENT ON COLUMN public.messages.is_read IS 'Whether message has been read by receiver';
COMMENT ON COLUMN public.conversations.unread_count IS 'Number of unread messages in conversation';
