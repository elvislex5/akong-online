-- ============================================
-- Migration 015: Country on profiles
-- ============================================
-- Adds a `country` column (ISO 3166-1 alpha-2 code) to profiles, required
-- by the CDC §9.1 (profile must include country) and §9.3 (country-based
-- leaderboard, MUST priority).
--
-- Nullable: existing users haven't picked a country yet, the UI will
-- prompt them on next visit. New users will choose one at signup time
-- (handled in the application layer).
-- ============================================

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country TEXT;

COMMENT ON COLUMN profiles.country IS
  'ISO 3166-1 alpha-2 country code (CM, GA, GQ, CG, FR, …). NULL = not set.';

-- Light validation: must be 2 uppercase letters when present.
-- Drop first for idempotent re-run.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_country_iso2;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_country_iso2
  CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');

-- Index for country-based leaderboard queries (Phase 2).
CREATE INDEX IF NOT EXISTS profiles_country_idx ON profiles (country)
  WHERE country IS NOT NULL;

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- SELECT country, COUNT(*) FROM profiles GROUP BY country ORDER BY 2 DESC;
