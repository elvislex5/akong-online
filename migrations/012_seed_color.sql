-- ============================================
-- Migration 012: Seed color customization
-- ============================================
-- Adds a `selected_seed_color` column on profiles so each user can pick
-- one of four cosmetic seed colours: Ézang (default), Ébène, Cauris, Acajou.
-- Free for all users for now (no premium gate).
-- ============================================

BEGIN;

-- 1. Add column with default and a CHECK to constrain valid values.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS selected_seed_color TEXT NOT NULL DEFAULT 'ezang';

-- 2. Drop any previous version of the constraint (safe re-run) then add it.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_seed_color_valid;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_seed_color_valid
  CHECK (selected_seed_color IN ('ezang', 'ebene', 'cauris', 'acajou'));

-- 3. Backfill any pre-existing rows (NOT NULL DEFAULT covers most, this is belt-and-braces).
UPDATE profiles
   SET selected_seed_color = 'ezang'
 WHERE selected_seed_color IS NULL;

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- SELECT selected_seed_color, COUNT(*) FROM profiles GROUP BY selected_seed_color;
