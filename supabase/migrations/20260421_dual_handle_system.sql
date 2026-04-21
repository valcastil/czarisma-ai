-- =====================================================
-- Dual-Handle (@ / #) Username System + Reserved Handles
-- =====================================================
-- @handle  -> tied to email-linked profiles
-- #handle  -> tied to phone-linked profiles
-- Namespaces are INDEPENDENT: @john and #john can both exist.
-- 30-day cooldown between changes; 90-day quarantine on release.
-- Reserved words live in public.reserved_handles; is_official bypasses.

BEGIN;

-- ---------- 1. Columns on profiles ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle_at              TEXT,
  ADD COLUMN IF NOT EXISTS handle_hash            TEXT,
  ADD COLUMN IF NOT EXISTS handle_at_changed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handle_hash_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_official            BOOLEAN NOT NULL DEFAULT false;

-- Independent uniqueness per namespace (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle_at
  ON public.profiles (lower(handle_at))
  WHERE handle_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle_hash
  ON public.profiles (lower(handle_hash))
  WHERE handle_hash IS NOT NULL;

-- Shape constraints: 3-30 chars, must start with a letter, then [a-z0-9_].
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'handle_at_shape'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT handle_at_shape
      CHECK (handle_at IS NULL OR handle_at ~ '^[a-z][a-z0-9_]{2,29}$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'handle_hash_shape'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT handle_hash_shape
      CHECK (handle_hash IS NULL OR handle_hash ~ '^[a-z][a-z0-9_]{2,29}$');
  END IF;
END$$;

-- ---------- 2. Released handles (90-day quarantine) ----------
CREATE TABLE IF NOT EXISTS public.released_handles (
  prefix      CHAR(1)      NOT NULL CHECK (prefix IN ('@', '#')),
  body        TEXT         NOT NULL,
  released_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (prefix, body)
);

CREATE INDEX IF NOT EXISTS idx_released_handles_released_at
  ON public.released_handles(released_at);

-- ---------- 3. Reserved handles table ----------
CREATE TABLE IF NOT EXISTS public.reserved_handles (
  word   TEXT PRIMARY KEY,
  match  TEXT NOT NULL CHECK (match IN ('exact', 'prefix')),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_reserved_handles_match
  ON public.reserved_handles(match);

-- ---------- 4. Seed reserved list ----------
-- Brand stems (prefix-matched): catches czarismaapp, charismahq, openaihelp, etc.
INSERT INTO public.reserved_handles (word, match, reason) VALUES
  ('czarisma',         'prefix', 'brand'),
  ('czarismas',        'prefix', 'brand'),
  ('czarai',           'prefix', 'brand'),
  ('czar_ai',          'prefix', 'brand'),
  ('czarismaai',       'prefix', 'brand'),
  ('charisma',         'prefix', 'brand'),
  ('charismaa',        'prefix', 'brand'),
  ('charismaai',       'prefix', 'brand'),
  ('charismachat',     'prefix', 'brand'),
  ('openanaios',       'prefix', 'brand'),
  ('openaios',         'prefix', 'brand'),
  ('openai',           'prefix', 'brand'),
  -- Brand x role combos
  ('czarismaadmin',    'prefix', 'brand_role'),
  ('czarismasupport',  'prefix', 'brand_role'),
  ('czarismahelp',     'prefix', 'brand_role'),
  ('czarismamod',      'prefix', 'brand_role'),
  ('czarismateam',     'prefix', 'brand_role'),
  ('czarismastaff',    'prefix', 'brand_role'),
  ('czarismaofficial', 'prefix', 'brand_role'),
  ('charismaadmin',    'prefix', 'brand_role'),
  ('charismasupport',  'prefix', 'brand_role'),
  ('charismahelp',     'prefix', 'brand_role'),
  ('charismamod',      'prefix', 'brand_role'),
  ('charismateam',     'prefix', 'brand_role'),
  ('charismastaff',    'prefix', 'brand_role'),
  ('charismaofficial', 'prefix', 'brand_role'),
  ('czaraiadmin',      'prefix', 'brand_role'),
  ('czaraisupport',    'prefix', 'brand_role'),
  ('czaraihelp',       'prefix', 'brand_role'),
  ('openaiadmin',      'prefix', 'brand_role'),
  ('openaisupport',    'prefix', 'brand_role'),
  ('openaihelp',       'prefix', 'brand_role')
ON CONFLICT (word) DO NOTHING;

-- Generic system / role / surface words (exact match only).
INSERT INTO public.reserved_handles (word, match, reason) VALUES
  -- Roles / staff
  ('admin','exact','role'),('administrator','exact','role'),('root','exact','role'),
  ('superuser','exact','role'),('sysadmin','exact','role'),('mod','exact','role'),
  ('moderator','exact','role'),('staff','exact','role'),('team','exact','role'),
  ('crew','exact','role'),('support','exact','role'),('help','exact','role'),
  ('helpdesk','exact','role'),('contact','exact','role'),('service','exact','role'),
  ('owner','exact','role'),('founder','exact','role'),('ceo','exact','role'),
  ('official','exact','role'),('verified','exact','role'),
  -- System / app
  ('api','exact','system'),('app','exact','system'),('www','exact','system'),
  ('mail','exact','system'),('email','exact','system'),('smtp','exact','system'),
  ('imap','exact','system'),('pop3','exact','system'),('ftp','exact','system'),
  ('ssh','exact','system'),('null','exact','system'),('undefined','exact','system'),
  ('none','exact','system'),('default','exact','system'),('test','exact','system'),
  ('tests','exact','system'),('dashboard','exact','system'),('console','exact','system'),
  ('settings','exact','system'),('account','exact','system'),('login','exact','system'),
  ('logout','exact','system'),('signin','exact','system'),('signup','exact','system'),
  ('register','exact','system'),('auth','exact','system'),('oauth','exact','system'),
  ('sso','exact','system'),('security','exact','system'),('privacy','exact','system'),
  ('terms','exact','system'),('legal','exact','system'),('billing','exact','system'),
  ('payment','exact','system'),('payments','exact','system'),('invoice','exact','system'),
  ('invoices','exact','system'),('checkout','exact','system'),('subscription','exact','system'),
  -- Product surfaces
  ('messages','exact','surface'),('message','exact','surface'),('chat','exact','surface'),
  ('chats','exact','surface'),('inbox','exact','surface'),('new','exact','surface'),
  ('notifications','exact','surface'),('search','exact','surface'),('explore','exact','surface'),
  ('profile','exact','surface'),('profiles','exact','surface'),('user','exact','surface'),
  ('users','exact','surface'),('friends','exact','surface'),('follow','exact','surface'),
  ('followers','exact','surface'),('following','exact','surface'),('feed','exact','surface'),
  ('home','exact','surface'),('about','exact','surface'),('faq','exact','surface'),
  ('blog','exact','surface'),('press','exact','surface'),('jobs','exact','surface'),
  ('careers','exact','surface'),('partners','exact','surface'),('investors','exact','surface'),
  ('brand','exact','surface'),('media','exact','surface'),
  -- Abuse-prone
  ('anonymous','exact','safety'),('anon','exact','safety'),('guest','exact','safety'),
  ('nobody','exact','safety'),('everyone','exact','safety'),('me','exact','safety'),
  ('myself','exact','safety'),('you','exact','safety'),('self','exact','safety'),
  ('system','exact','safety'),('bot','exact','safety'),('bots','exact','safety'),
  ('spam','exact','safety'),('abuse','exact','safety'),('report','exact','safety'),
  ('fake','exact','safety'),('scam','exact','safety'),('phish','exact','safety'),
  ('fraud','exact','safety'),('hack','exact','safety'),
  -- Platform giants
  ('apple','exact','platform'),('google','exact','platform'),('microsoft','exact','platform'),
  ('meta','exact','platform'),('facebook','exact','platform'),('instagram','exact','platform'),
  ('whatsapp','exact','platform'),('tiktok','exact','platform'),('twitter','exact','platform'),
  ('x','exact','platform'),('youtube','exact','platform'),('discord','exact','platform'),
  ('telegram','exact','platform'),('signal','exact','platform'),('snapchat','exact','platform'),
  ('amazon','exact','platform'),('netflix','exact','platform'),('spotify','exact','platform'),
  ('stripe','exact','platform'),('paypal','exact','platform'),
  -- Country / legal
  ('usa','exact','country'),('uk','exact','country'),('eu','exact','country'),
  ('un','exact','country'),('gov','exact','country'),('government','exact','country'),
  ('police','exact','country'),('fbi','exact','country'),('cia','exact','country'),
  ('irs','exact','country')
ON CONFLICT (word) DO NOTHING;

-- ---------- 5. Helper: is body reserved? ----------
CREATE OR REPLACE FUNCTION public.is_handle_reserved(p_body TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reserved_handles
    WHERE (match = 'exact'  AND word = lower(p_body))
       OR (match = 'prefix' AND lower(p_body) LIKE word || '%')
  );
$$;

-- ---------- 6. Availability RPC ----------
-- Returns a structured status so the UI can show a precise reason.
--   ok            -> available
--   invalid_shape -> fails regex (3-30, starts with letter, [a-z0-9_])
--   reserved      -> hits reserved_handles
--   quarantined   -> body was released <90d ago
--   taken         -> another profile owns it
CREATE OR REPLACE FUNCTION public.check_handle_availability(
  p_prefix CHAR(1),
  p_body   TEXT
) RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_body TEXT := lower(p_body);
  v_official BOOLEAN := false;
BEGIN
  IF p_prefix NOT IN ('@', '#') THEN
    RETURN 'invalid_prefix';
  END IF;

  IF v_body IS NULL OR v_body !~ '^[a-z][a-z0-9_]{2,29}$' THEN
    RETURN 'invalid_shape';
  END IF;

  SELECT is_official INTO v_official
  FROM public.profiles WHERE id = auth.uid();

  IF NOT COALESCE(v_official, false) AND public.is_handle_reserved(v_body) THEN
    RETURN 'reserved';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.released_handles
    WHERE prefix = p_prefix
      AND body = v_body
      AND released_at > now() - INTERVAL '90 days'
  ) THEN
    RETURN 'quarantined';
  END IF;

  IF p_prefix = '@' THEN
    IF EXISTS (SELECT 1 FROM public.profiles
               WHERE lower(handle_at) = v_body AND id <> auth.uid()) THEN
      RETURN 'taken';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.profiles
               WHERE lower(handle_hash) = v_body AND id <> auth.uid()) THEN
      RETURN 'taken';
    END IF;
  END IF;

  RETURN 'ok';
END$$;

REVOKE ALL ON FUNCTION public.check_handle_availability(CHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_handle_availability(CHAR, TEXT) TO authenticated;

-- ---------- 7. Claim RPC ----------
-- Atomically validates + sets the handle. Returns status string.
-- Additional statuses beyond check_handle_availability:
--   no_auth         -> no auth.uid()
--   auth_not_linked -> @ requires email, # requires phone
--   cooldown        -> last change <30d ago
CREATE OR REPLACE FUNCTION public.claim_handle(
  p_prefix CHAR(1),
  p_body   TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_body  TEXT := lower(p_body);
  v_email TEXT;
  v_phone TEXT;
  v_official BOOLEAN := false;
  v_old_at   TEXT;
  v_old_hash TEXT;
  v_at_changed   TIMESTAMPTZ;
  v_hash_changed TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RETURN 'no_auth'; END IF;

  IF p_prefix NOT IN ('@', '#') THEN RETURN 'invalid_prefix'; END IF;

  IF v_body IS NULL OR v_body !~ '^[a-z][a-z0-9_]{2,29}$' THEN
    RETURN 'invalid_shape';
  END IF;

  SELECT p.handle_at, p.handle_hash,
         p.handle_at_changed_at, p.handle_hash_changed_at,
         p.phone, p.is_official, u.email
    INTO v_old_at, v_old_hash,
         v_at_changed, v_hash_changed,
         v_phone, v_official, v_email
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = v_uid;

  -- Auth-link requirement (bypassed for is_official)
  IF NOT COALESCE(v_official, false) THEN
    IF p_prefix = '@' AND (v_email IS NULL OR v_email = '') THEN
      RETURN 'auth_not_linked';
    END IF;
    IF p_prefix = '#' AND (v_phone IS NULL OR v_phone = '') THEN
      RETURN 'auth_not_linked';
    END IF;

    IF public.is_handle_reserved(v_body) THEN
      RETURN 'reserved';
    END IF;
  END IF;

  -- 30-day cooldown
  IF p_prefix = '@' AND v_at_changed IS NOT NULL
     AND v_at_changed > now() - INTERVAL '30 days' THEN
    RETURN 'cooldown';
  END IF;
  IF p_prefix = '#' AND v_hash_changed IS NOT NULL
     AND v_hash_changed > now() - INTERVAL '30 days' THEN
    RETURN 'cooldown';
  END IF;

  -- 90-day quarantine
  IF EXISTS (
    SELECT 1 FROM public.released_handles
    WHERE prefix = p_prefix
      AND body = v_body
      AND released_at > now() - INTERVAL '90 days'
  ) THEN
    RETURN 'quarantined';
  END IF;

  -- Uniqueness
  IF p_prefix = '@' THEN
    IF EXISTS (SELECT 1 FROM public.profiles
               WHERE lower(handle_at) = v_body AND id <> v_uid) THEN
      RETURN 'taken';
    END IF;

    -- Release old handle into quarantine if being replaced
    IF v_old_at IS NOT NULL AND lower(v_old_at) <> v_body THEN
      INSERT INTO public.released_handles(prefix, body, released_at)
      VALUES ('@', lower(v_old_at), now())
      ON CONFLICT (prefix, body) DO UPDATE SET released_at = EXCLUDED.released_at;
    END IF;

    UPDATE public.profiles
       SET handle_at = v_body,
           handle_at_changed_at = now(),
           updated_at = now()
     WHERE id = v_uid;
  ELSE
    IF EXISTS (SELECT 1 FROM public.profiles
               WHERE lower(handle_hash) = v_body AND id <> v_uid) THEN
      RETURN 'taken';
    END IF;

    IF v_old_hash IS NOT NULL AND lower(v_old_hash) <> v_body THEN
      INSERT INTO public.released_handles(prefix, body, released_at)
      VALUES ('#', lower(v_old_hash), now())
      ON CONFLICT (prefix, body) DO UPDATE SET released_at = EXCLUDED.released_at;
    END IF;

    UPDATE public.profiles
       SET handle_hash = v_body,
           handle_hash_changed_at = now(),
           updated_at = now()
     WHERE id = v_uid;
  END IF;

  RETURN 'ok';
END$$;

REVOKE ALL ON FUNCTION public.claim_handle(CHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_handle(CHAR, TEXT) TO authenticated;

-- ---------- 8. RLS for new tables ----------
ALTER TABLE public.reserved_handles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.released_handles ENABLE ROW LEVEL SECURITY;

-- Everyone can read the reserved list (client mirror); no one writes via RLS.
DROP POLICY IF EXISTS "reserved_handles read" ON public.reserved_handles;
CREATE POLICY "reserved_handles read"
  ON public.reserved_handles FOR SELECT
  USING (true);

-- No direct client access to released_handles; RPCs (SECURITY DEFINER) manage it.
DROP POLICY IF EXISTS "released_handles no direct" ON public.released_handles;
CREATE POLICY "released_handles no direct"
  ON public.released_handles FOR SELECT
  USING (false);

COMMIT;
