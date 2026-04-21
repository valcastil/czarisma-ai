-- =====================================================
-- Live location sharing (WhatsApp-style)
-- =====================================================
-- A message of type 'location' can be either:
--   (a) a one-shot location snapshot (attachment meta holds lat/lng/label)
--   (b) a live share: attachment holds live_share_id -> row in live_locations
--       whose (latitude, longitude, updated_at) change over time.

BEGIN;

-- Location-attachment columns on messages (reuse attachment_* pattern).
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_latitude        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS attachment_longitude       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS attachment_location_label  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_live_share_id   UUID,
  ADD COLUMN IF NOT EXISTS attachment_live_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.live_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id  UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  accuracy    DOUBLE PRECISION,
  heading     DOUBLE PRECISION,
  speed       DOUBLE PRECISION,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at  TIMESTAMPTZ,
  CONSTRAINT live_locations_duration_cap
    CHECK (expires_at <= started_at + INTERVAL '8 hours'),
  CONSTRAINT live_locations_latitude_range
    CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT live_locations_longitude_range
    CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_live_locations_message  ON public.live_locations(message_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_expires  ON public.live_locations(expires_at);
CREATE INDEX IF NOT EXISTS idx_live_locations_sharer   ON public.live_locations(sharer_id);

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- Sharer owns their rows.
DROP POLICY IF EXISTS "sharer writes own live" ON public.live_locations;
CREATE POLICY "sharer writes own live"
  ON public.live_locations FOR ALL
  USING (sharer_id = auth.uid())
  WITH CHECK (sharer_id = auth.uid());

-- Either party of the parent message can read live updates.
DROP POLICY IF EXISTS "participants read live" ON public.live_locations;
CREATE POLICY "participants read live"
  ON public.live_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = live_locations.message_id
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

-- Helper: is a given live share still active?
CREATE OR REPLACE FUNCTION public.is_live_location_active(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_locations
    WHERE id = p_id
      AND stopped_at IS NULL
      AND expires_at > now()
  );
$$;

-- Touch updated_at automatically on position updates.
CREATE OR REPLACE FUNCTION public._live_locations_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS live_locations_touch ON public.live_locations;
CREATE TRIGGER live_locations_touch
  BEFORE UPDATE ON public.live_locations
  FOR EACH ROW
  EXECUTE FUNCTION public._live_locations_touch();

COMMIT;
