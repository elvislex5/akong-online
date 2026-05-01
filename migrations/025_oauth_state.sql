-- ============================================
-- Migration 025: OAuth ephemeral state + exchange codes
-- ============================================
-- Two short-lived tables that support the redirect-based OAuth flow:
--
--   oauth_states          — anti-CSRF: state value sent to the provider,
--                           checked when the provider redirects back.
--                           Lives ~10 min.
--
--   oauth_exchange_codes  — one-shot codes returned to the frontend after
--                           a successful provider login. The frontend POSTs
--                           the code back to /auth/oauth/exchange and gets
--                           the access+refresh tokens. Lives ~60s.
--
-- Both are server-only (RLS enabled, no policies). pg_cron purges expired
-- rows hourly to keep them lean.
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.oauth_states (
  state         TEXT PRIMARY KEY,                  -- random base64url, ~32 bytes
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'github', 'facebook')),
  redirect_to   TEXT,                              -- where to send the user after success ("/" or "/game"...)
  code_verifier TEXT,                              -- PKCE (Apple uses this; Google supports but optional)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS oauth_states_expires_idx
  ON public.oauth_states (expires_at);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.oauth_exchange_codes (
  code        TEXT PRIMARY KEY,                    -- random base64url, ~32 bytes
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_lower TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS oauth_exchange_codes_user_idx
  ON public.oauth_exchange_codes (user_id);

CREATE INDEX IF NOT EXISTS oauth_exchange_codes_expires_idx
  ON public.oauth_exchange_codes (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.oauth_exchange_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Cleanup: drop expired rows. Schedule hourly via pg_cron.
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_oauth_ephemeral()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.oauth_states
   WHERE expires_at < NOW() - INTERVAL '1 hour';

  DELETE FROM public.oauth_exchange_codes
   WHERE expires_at < NOW() - INTERVAL '1 hour'
      OR (consumed_at IS NOT NULL AND consumed_at < NOW() - INTERVAL '1 hour');
END;
$$;

-- Schedule it (idempotent: unschedule first if it exists)
DO $$
DECLARE
  job_id BIGINT;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'cleanup-oauth-ephemeral';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;

  PERFORM cron.schedule(
    'cleanup-oauth-ephemeral',
    '17 * * * *',  -- xx:17 every hour
    $cron$ SELECT public.cleanup_oauth_ephemeral(); $cron$
  );
EXCEPTION
  WHEN undefined_table THEN
    -- pg_cron not installed in this environment; cleanup will run on-demand.
    RAISE NOTICE 'pg_cron not available — oauth ephemeral cleanup skipped';
END;
$$;

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'public'
--    AND table_name IN ('oauth_states','oauth_exchange_codes');
--
-- SELECT jobname, schedule FROM cron.job WHERE jobname = 'cleanup-oauth-ephemeral';
