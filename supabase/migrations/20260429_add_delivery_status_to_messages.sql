-- Add delivery_status column to messages table
-- Options: 'sent', 'delivered', 'read'
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON public.messages(delivery_status);

-- Update existing messages: is_read=true becomes 'read'
UPDATE public.messages SET delivery_status = 'read' WHERE is_read = true AND delivery_status IS NULL;
UPDATE public.messages SET delivery_status = 'sent' WHERE is_read = false AND delivery_status IS NULL;

-- Add current_conversation_id to profiles to track which chat user is actively viewing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_conversation_id UUID;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_current_conversation ON public.profiles(current_conversation_id) WHERE current_conversation_id IS NOT NULL;
