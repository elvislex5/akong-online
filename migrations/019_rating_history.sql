-- ============================================
-- Migration 019: Rating history (CDC §9.1 MUST — graphique d'évolution)
-- ============================================
-- Captures one row per Glicko-2 rating change so the profile page can
-- render an evolution chart per (system × cadence). Done via trigger on
-- the ratings table to avoid touching the existing service code.
--
-- Read pattern: SELECT for one user, one system, one cadence, ORDER BY
-- recorded_at. Index covers it.
--
-- Dependency: this migration installs a trigger on `public.ratings`,
-- which is created by migration 009. The trigger install + backfill are
-- guarded by a runtime existence check so this migration never aborts:
-- if `ratings` is missing, it logs a NOTICE and the trigger is skipped.
-- Re-run this migration AFTER applying 009 to install the trigger.
-- ============================================

BEGIN;

-- ============================================
-- 1. rating_history table (no dependency on `ratings`, safe to create now)
-- ============================================

CREATE TABLE IF NOT EXISTS public.rating_history (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_system  TEXT NOT NULL,
  cadence      TEXT NOT NULL,
  rating       INTEGER NOT NULL,
  rd           INTEGER NOT NULL,
  games_played INTEGER NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rating_history_user_lookup_idx
  ON public.rating_history (user_id, game_system, cadence, recorded_at);

ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rating history is public" ON public.rating_history;
CREATE POLICY "Rating history is public"
  ON public.rating_history FOR SELECT USING (true);

-- ============================================
-- 2. Snapshot function (independent — declares intent, no FK to ratings)
-- ============================================
-- Fires on INSERT and on UPDATE when the rating value actually changes.
-- We don't snapshot pure RD-only updates (rare) to keep the curve clean.

CREATE OR REPLACE FUNCTION public.snapshot_rating_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.rating = OLD.rating THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.rating_history (
    user_id, game_system, cadence, rating, rd, games_played
  ) VALUES (
    NEW.user_id, NEW.game_system, NEW.cadence,
    ROUND(NEW.rating)::INTEGER,
    ROUND(NEW.rd)::INTEGER,
    NEW.games_played
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Trigger + backfill — guarded by ratings table existence
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'ratings'
  ) THEN
    -- (Re)install the trigger
    EXECUTE 'DROP TRIGGER IF EXISTS rating_history_snapshot ON public.ratings';
    EXECUTE $TRIG$
      CREATE TRIGGER rating_history_snapshot
        AFTER INSERT OR UPDATE ON public.ratings
        FOR EACH ROW
        EXECUTE FUNCTION public.snapshot_rating_history()
    $TRIG$;

    -- One-time backfill: seed one snapshot per existing rating row so users
    -- who already played get at least a starting point on their chart.
    -- The WHERE NOT EXISTS makes the backfill idempotent across re-runs.
    INSERT INTO public.rating_history (user_id, game_system, cadence, rating, rd, games_played, recorded_at)
    SELECT r.user_id, r.game_system, r.cadence,
           ROUND(r.rating)::INTEGER, ROUND(r.rd)::INTEGER, r.games_played, r.updated_at
      FROM public.ratings r
     WHERE NOT EXISTS (
        SELECT 1 FROM public.rating_history h
         WHERE h.user_id = r.user_id
           AND h.game_system = r.game_system
           AND h.cadence = r.cadence
     );

    RAISE NOTICE 'rating_history trigger installed and backfill applied';
  ELSE
    RAISE NOTICE 'public.ratings not found — skipping trigger install. '
                 'Apply migration 009_glicko2_ratings.sql first, then re-run this migration.';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- a) Trigger registered (only if 009 applied):
--    SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.ratings'::regclass
--      AND tgname = 'rating_history_snapshot';
--
-- b) Sample read (replace user_id):
--    SELECT recorded_at, rating, games_played
--      FROM rating_history
--     WHERE user_id = '<uuid>' AND game_system='mgpwem' AND cadence='rapide'
--     ORDER BY recorded_at;
