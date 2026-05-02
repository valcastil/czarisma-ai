-- Fix: Allow both sender and receiver to update messages for reactions
-- This fixes the issue where reaction emojis were not working in chat

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can update messages they received (for read status)" ON public.messages;

-- Drop the new policy if it exists (to handle re-runs)
DROP POLICY IF EXISTS "Users can update messages they sent or received (for read status and reactions)" ON public.messages;

-- Create new policy that allows both sender and receiver to update messages
CREATE POLICY "Users can update messages they sent or received (for read status and reactions)"
    ON public.messages FOR UPDATE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
