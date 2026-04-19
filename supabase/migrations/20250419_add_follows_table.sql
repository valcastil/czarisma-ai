-- =====================================================
-- Follow System Migration
-- =====================================================
-- Adds follows table and follower/following counts to profiles

-- =====================================================
-- 1. ADD COLUMNS TO PROFILES TABLE
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- 2. FOLLOWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see follows
CREATE POLICY "Users can view all follows"
    ON public.follows FOR SELECT
    USING (true);

-- Users can only create follows as themselves
CREATE POLICY "Users can follow others"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

-- Users can only delete their own follows
CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

-- =====================================================
-- 4. TRIGGER: Auto-update follower/following counts
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment following_count for follower
        UPDATE public.profiles
        SET following_count = following_count + 1
        WHERE id = NEW.follower_id;

        -- Increment follower_count for the followed user
        UPDATE public.profiles
        SET follower_count = follower_count + 1
        WHERE id = NEW.following_id;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement following_count for follower
        UPDATE public.profiles
        SET following_count = GREATEST(0, following_count - 1)
        WHERE id = OLD.follower_id;

        -- Decrement follower_count for the followed user
        UPDATE public.profiles
        SET follower_count = GREATEST(0, follower_count - 1)
        WHERE id = OLD.following_id;

        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_counts_on_change
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_follow_counts();

-- =====================================================
-- 5. GRANTS
-- =====================================================

GRANT ALL ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

-- =====================================================
-- 6. REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE public.follows IS 'User follow relationships';
COMMENT ON COLUMN public.profiles.follower_count IS 'Number of users following this profile';
COMMENT ON COLUMN public.profiles.following_count IS 'Number of users this profile follows';
COMMENT ON COLUMN public.profiles.social_links IS 'JSON object of social media links';
