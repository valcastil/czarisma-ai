-- =====================================================
-- Add phone column to profiles for Firebase phone auth
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

COMMENT ON COLUMN public.profiles.phone IS 'Phone number from Firebase phone auth (E.164 format)';
