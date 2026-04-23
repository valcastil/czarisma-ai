-- =====================================================
-- Charisma Entries RLS: allow followers to read
-- =====================================================
-- Problem: User Profile modal's "Charisma Collection" section
-- returns zero entries for followers, because charisma_entries RLS
-- currently only allows owners to read their own rows.
--
-- Fix: add a SELECT policy that lets:
--   (a) the owner read their own entries (unchanged), and
--   (b) any authenticated user who follows the owner read the entries.
--
-- UPDATE/INSERT/DELETE remain owner-only — we do NOT grant write access
-- to followers.

BEGIN;

ALTER TABLE public.charisma_entries ENABLE ROW LEVEL SECURITY;

-- Drop any prior SELECT policies we own so this migration is idempotent.
DROP POLICY IF EXISTS "charisma_entries owner read" ON public.charisma_entries;
DROP POLICY IF EXISTS "charisma_entries follower read" ON public.charisma_entries;
DROP POLICY IF EXISTS "charisma_entries select own" ON public.charisma_entries;

-- Owner can always read their own entries.
CREATE POLICY "charisma_entries owner read"
  ON public.charisma_entries
  FOR SELECT
  USING (user_id = auth.uid());

-- Followers can read the owner's entries.
CREATE POLICY "charisma_entries follower read"
  ON public.charisma_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = auth.uid()
        AND f.following_id = charisma_entries.user_id
    )
  );

-- Ensure write policies are owner-only (recreate defensively).
DROP POLICY IF EXISTS "charisma_entries owner write" ON public.charisma_entries;
DROP POLICY IF EXISTS "charisma_entries owner update" ON public.charisma_entries;
DROP POLICY IF EXISTS "charisma_entries owner delete" ON public.charisma_entries;

CREATE POLICY "charisma_entries owner write"
  ON public.charisma_entries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "charisma_entries owner update"
  ON public.charisma_entries
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "charisma_entries owner delete"
  ON public.charisma_entries
  FOR DELETE
  USING (user_id = auth.uid());

COMMIT;
