-- =====================================================
-- Create Shared Links Table for Link Sharing Feature
-- =====================================================

-- Create shared_links table
CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Link data
  url TEXT NOT NULL,
  original_url TEXT,
  domain TEXT,
  platform TEXT,
  
  -- Metadata (from Open Graph or platform APIs)
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  author TEXT,
  duration INTEGER CHECK (duration > 0),
  
  -- Status tracking
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'shared')),
  is_favorite BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  
  -- Sharing metadata
  shared_to_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  shared_at TIMESTAMPTZ,
  
  -- Tags and notes
  tags TEXT[],
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_links_user_id 
  ON public.shared_links(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_links_status 
  ON public.shared_links(status) 
  WHERE status = 'unread';

CREATE INDEX IF NOT EXISTS idx_shared_links_platform 
  ON public.shared_links(platform);

CREATE INDEX IF NOT EXISTS idx_shared_links_created_at 
  ON public.shared_links(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_links_tags 
  ON public.shared_links USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_shared_links_user_status 
  ON public.shared_links(user_id, status, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own shared links
CREATE POLICY "Users can view own shared links"
  ON public.shared_links
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own shared links
CREATE POLICY "Users can insert own shared links"
  ON public.shared_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own shared links
CREATE POLICY "Users can update own shared links"
  ON public.shared_links
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own shared links
CREATE POLICY "Users can delete own shared links"
  ON public.shared_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shared_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_shared_links_updated_at_trigger
  BEFORE UPDATE ON public.shared_links
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_links_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.shared_links IS 'Stores links shared from external apps (YouTube, TikTok, Instagram, etc.)';
COMMENT ON COLUMN public.shared_links.url IS 'The shared URL';
COMMENT ON COLUMN public.shared_links.original_url IS 'Original URL before any redirects';
COMMENT ON COLUMN public.shared_links.domain IS 'Domain extracted from URL (e.g., youtube.com)';
COMMENT ON COLUMN public.shared_links.platform IS 'Platform identifier (youtube, tiktok, instagram, web)';
COMMENT ON COLUMN public.shared_links.title IS 'Title extracted from metadata';
COMMENT ON COLUMN public.shared_links.description IS 'Description extracted from metadata';
COMMENT ON COLUMN public.shared_links.thumbnail_url IS 'Thumbnail/preview image URL';
COMMENT ON COLUMN public.shared_links.author IS 'Content author/creator name';
COMMENT ON COLUMN public.shared_links.duration IS 'Video/audio duration in seconds';
COMMENT ON COLUMN public.shared_links.status IS 'Link status: unread, read, archived, or shared';
COMMENT ON COLUMN public.shared_links.is_favorite IS 'Whether user marked this link as favorite';
COMMENT ON COLUMN public.shared_links.tags IS 'User-defined tags for organization';
COMMENT ON COLUMN public.shared_links.notes IS 'User notes about the link';
