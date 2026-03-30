-- =====================================================
-- Add Attachment Support to Messages Table
-- =====================================================

-- Add attachment columns
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachment_type TEXT CHECK (
  attachment_type IN ('image', 'video', 'audio', 'document', 'location', 'contact', 'charisma_entry')
),
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER CHECK (attachment_size > 0),
ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_duration INTEGER CHECK (attachment_duration > 0),
ADD COLUMN IF NOT EXISTS attachment_width INTEGER CHECK (attachment_width > 0),
ADD COLUMN IF NOT EXISTS attachment_height INTEGER CHECK (attachment_height > 0);

-- Add forward metadata columns
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS forwarded_from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS forwarded_from_username TEXT,
ADD COLUMN IF NOT EXISTS forwarded_from_name TEXT,
ADD COLUMN IF NOT EXISTS forwarded_from_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS forward_count INTEGER DEFAULT 0 CHECK (forward_count >= 0),
ADD COLUMN IF NOT EXISTS forward_chain JSONB DEFAULT '[]'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_attachment_type 
  ON public.messages(attachment_type) 
  WHERE attachment_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_forwarded 
  ON public.messages(is_forwarded) 
  WHERE is_forwarded = true;

CREATE INDEX IF NOT EXISTS idx_messages_forward_chain 
  ON public.messages USING GIN(forward_chain);

-- Add constraint for attachment URL when type is set
ALTER TABLE public.messages
ADD CONSTRAINT attachment_url_required CHECK (
  (attachment_type IS NULL AND attachment_url IS NULL) OR
  (attachment_type IS NOT NULL AND attachment_url IS NOT NULL)
);

-- Update content constraint to allow empty content if attachment exists
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS content_not_empty;

ALTER TABLE public.messages
ADD CONSTRAINT content_or_attachment_required CHECK (
  (char_length(trim(content)) > 0) OR (attachment_type IS NOT NULL)
);

-- Comments
COMMENT ON COLUMN public.messages.attachment_type IS 'Type of attachment: image, video, audio, document, location, contact, charisma_entry';
COMMENT ON COLUMN public.messages.attachment_url IS 'URL to the attachment file in Supabase Storage';
COMMENT ON COLUMN public.messages.attachment_thumbnail_url IS 'URL to thumbnail (for videos and large images)';
COMMENT ON COLUMN public.messages.attachment_duration IS 'Duration in seconds (for audio/video)';
COMMENT ON COLUMN public.messages.is_forwarded IS 'Whether this message was forwarded from another message';
COMMENT ON COLUMN public.messages.forward_count IS 'Number of times this message has been forwarded';
COMMENT ON COLUMN public.messages.forward_chain IS 'Array of {userId, username, name, timestamp} tracking forward history';
