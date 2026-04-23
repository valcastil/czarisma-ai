-- =====================================================
-- Shared Links RLS: allow followers to read
-- =====================================================
-- Adds a SELECT policy so users can see the shared links
-- (YouTube/TikTok/Instagram videos etc.) of accounts they follow.
-- Owner-only write policies remain unchanged.

BEGIN;

-- Idempotent: drop prior versions of the follower-read policy.
DROP POLICY IF EXISTS "shared_links follower read" ON public.shared_links;

CREATE POLICY "shared_links follower read"
  ON public.shared_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = auth.uid()
        AND f.following_id = shared_links.user_id
    )
  );

COMMIT;
