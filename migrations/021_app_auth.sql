-- ============================================
-- Migration 021: App-managed authentication (replaces Supabase Auth UI)
-- ============================================
-- We keep `auth.users` as the identity registry (so all FK + RLS via
-- auth.uid() keep working) but we move credentials/sessions/OAuth into
-- our own tables. The server signs its own JWTs with the same secret as
-- Supabase, so the existing RLS policies see them as legitimate.
--
-- New tables:
--   app_credentials       — email + argon2 hash (the login source of truth)
--   oauth_identities      — links to external providers (Google, Apple…)
--   auth_sessions         — refresh tokens (hashed) with rotation families
--   account_claim_tokens  — backfill for existing Supabase users to set
--                           their password via email link
-- ============================================

BEGIN;

-- ============================================
-- 1. app_credentials
-- ============================================
-- Stores the email + password hash. user_id FK to auth.users so identity
-- stays unified. password_hash is NULL for OAuth-only accounts (a user
-- who signed up with Google may set a password later).

CREATE TABLE IF NOT EXISTS public.app_credentials (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_lower        TEXT NOT NULL UNIQUE,
  password_hash      TEXT,                          -- NULL = OAuth-only
  email_verified_at  TIMESTAMPTZ,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ,                   -- temporary lockout after brute force
  password_changed_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT app_credentials_email_format
    CHECK (email_lower ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
  CONSTRAINT app_credentials_failed_count_nonneg
    CHECK (failed_login_count >= 0)
);

CREATE INDEX IF NOT EXISTS app_credentials_email_idx
  ON public.app_credentials (email_lower);

-- RLS: server-only writes (via service_role). Reads also blocked from clients.
ALTER TABLE public.app_credentials ENABLE ROW LEVEL SECURITY;
-- (no policies = no client can SELECT/INSERT/UPDATE/DELETE; service_role bypasses RLS)

-- ============================================
-- 2. oauth_identities
-- ============================================
-- One row per (provider, provider_user_id). Multiple identities can link
-- to the same user_id (a user can have Google + Apple linked).

CREATE TABLE IF NOT EXISTS public.oauth_identities (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'github', 'facebook')),
  provider_user_id TEXT NOT NULL,
  email_lower      TEXT,                            -- snapshot at link time
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS oauth_identities_user_idx
  ON public.oauth_identities (user_id);

ALTER TABLE public.oauth_identities ENABLE ROW LEVEL SECURITY;
-- server-only

-- ============================================
-- 3. auth_sessions
-- ============================================
-- One row per active refresh token. We store SHA-256 hash of the token
-- (never the plaintext). family_id groups all rotations of the same
-- session — if a refresh token is reused, we revoke the entire family
-- (classic refresh-token-rotation attack mitigation).

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id           UUID NOT NULL,                -- groups rotations of one login
  refresh_token_hash  TEXT NOT NULL UNIQUE,         -- sha256 of plaintext
  user_agent          TEXT,
  ip                  INET,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ                   -- NULL = active
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_active_idx
  ON public.auth_sessions (user_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS auth_sessions_family_idx
  ON public.auth_sessions (family_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
-- server-only

-- ============================================
-- 4. account_claim_tokens
-- ============================================
-- For migrating existing Supabase Auth users: a token is generated and
-- emailed to each user, allowing them to set a password and "claim" their
-- account on the new system. Single-use, expires in 7 days.

CREATE TABLE IF NOT EXISTS public.account_claim_tokens (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  email_lower TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  claimed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS account_claim_tokens_user_idx
  ON public.account_claim_tokens (user_id)
  WHERE claimed_at IS NULL;

ALTER TABLE public.account_claim_tokens ENABLE ROW LEVEL SECURITY;
-- server-only

-- ============================================
-- 5. updated_at triggers
-- ============================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_credentials_touch_updated_at ON public.app_credentials;
CREATE TRIGGER app_credentials_touch_updated_at
  BEFORE UPDATE ON public.app_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- a) Tables created:
--    SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public'
--       AND table_name IN ('app_credentials','oauth_identities',
--                          'auth_sessions','account_claim_tokens');
--
-- b) RLS enabled and no policies (so clients cannot read):
--    SELECT relname, relrowsecurity FROM pg_class
--     WHERE relname IN ('app_credentials','oauth_identities',
--                       'auth_sessions','account_claim_tokens');
