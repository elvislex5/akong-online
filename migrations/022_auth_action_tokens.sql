-- Migration 022: Unified auth action tokens
-- Single table for any "token-via-email" action:
--   - email_verify     : user confirms ownership of an email address
--   - password_reset   : user sets a new password without knowing the old
--   - account_claim    : existing Supabase user adopts the new auth system
-- One-shot, hashed at rest, expiry per row. Replaces the narrow
-- account_claim_tokens table from migration 021 (never used).

BEGIN;

DROP TABLE IF EXISTS public.account_claim_tokens;

CREATE TABLE IF NOT EXISTS public.auth_action_tokens (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('email_verify', 'password_reset', 'account_claim')),
  token_hash   TEXT NOT NULL UNIQUE,
  email_lower  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_action_tokens_lookup_idx
  ON public.auth_action_tokens (user_id, kind, used_at);

CREATE INDEX IF NOT EXISTS auth_action_tokens_expiry_idx
  ON public.auth_action_tokens (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.auth_action_tokens ENABLE ROW LEVEL SECURITY;

COMMIT;
