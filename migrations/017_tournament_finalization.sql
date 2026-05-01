-- ============================================
-- Migration 017: Tournament finalization (Phase 3.1)
-- ============================================
-- Closes the loop on the tournament module:
--   1. game_rooms.tournament_id  — link a game to its tournament
--   2. Auto-scoring trigger      — when a tournament game finishes,
--      tournament_participants is updated automatically (3 pts win,
--      1 pt draw, 0 pt loss; W/L/D and games_played incremented)
--   3. Auto status transitions   — pg_cron flips upcoming → ongoing
--      → finished based on starts_at / ends_at
--
-- After this migration, the only remaining manual step for an
-- 'arena' tournament is creating the tournament itself; the rest
-- runs on its own once games are tagged with tournament_id.
-- ============================================

BEGIN;

-- ============================================
-- 1. LINK GAME ROOMS TO TOURNAMENTS
-- ============================================

ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS tournament_id UUID
    REFERENCES public.tournaments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS game_rooms_tournament_idx
  ON public.game_rooms (tournament_id)
  WHERE tournament_id IS NOT NULL;

-- ============================================
-- 2. AUTO-SCORING TRIGGER
-- ============================================
-- Fires when a tournament-tagged room transitions to a terminal state
-- (finished or abandoned). Idempotent: re-running the same transition
-- is a no-op because we check OLD.status.
--
-- Scoring (lichess-style): 3 pts for a win, 1 pt for a draw, 0 for a
-- loss. Easy to tweak — change the literal in the UPDATEs below.
--
-- SECURITY DEFINER lets the trigger bypass RLS on tournament_participants
-- (admins-only via RLS), since the trigger is system-driven.

CREATE OR REPLACE FUNCTION public.update_tournament_scores_on_game_end()
RETURNS TRIGGER AS $$
DECLARE
  v_winner_id UUID;
  v_loser_id  UUID;
  v_p1_id     UUID;
  v_p2_id     UUID;
  v_is_draw   BOOLEAN;
BEGIN
  -- Defensive: only act on tournament-tagged rooms with both players present
  IF NEW.tournament_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.host_id IS NULL OR NEW.guest_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only fire on the transition INTO a terminal state
  IF NEW.status NOT IN ('finished', 'abandoned') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('finished', 'abandoned') THEN
    RETURN NEW;  -- already counted
  END IF;

  v_p1_id     := NEW.host_id;
  v_p2_id     := NEW.guest_id;
  v_winner_id := NEW.winner_id;
  v_is_draw   := (v_winner_id IS NULL);

  IF v_is_draw THEN
    UPDATE public.tournament_participants
       SET games_played = games_played + 1,
           draws        = draws + 1,
           score        = score + 1
     WHERE tournament_id = NEW.tournament_id
       AND user_id IN (v_p1_id, v_p2_id);
  ELSE
    v_loser_id := CASE WHEN v_winner_id = v_p1_id THEN v_p2_id ELSE v_p1_id END;

    UPDATE public.tournament_participants
       SET games_played = games_played + 1,
           wins         = wins + 1,
           score        = score + 3
     WHERE tournament_id = NEW.tournament_id
       AND user_id = v_winner_id;

    UPDATE public.tournament_participants
       SET games_played = games_played + 1,
           losses       = losses + 1
     WHERE tournament_id = NEW.tournament_id
       AND user_id = v_loser_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tournament_scores_on_game_end ON public.game_rooms;
CREATE TRIGGER tournament_scores_on_game_end
  AFTER UPDATE OF status ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tournament_scores_on_game_end();

-- ============================================
-- 3. AUTO STATUS TRANSITIONS
-- ============================================
-- Runs every minute via pg_cron. Pushes:
--   upcoming → ongoing  when starts_at has passed
--   ongoing  → finished when ends_at has passed
--
-- 'cancelled' is never auto-transitioned; an admin sets it manually.

CREATE OR REPLACE FUNCTION public.advance_tournament_statuses()
RETURNS integer AS $$
DECLARE
  to_ongoing  integer;
  to_finished integer;
BEGIN
  UPDATE public.tournaments
     SET status = 'ongoing'
   WHERE status = 'upcoming'
     AND starts_at <= NOW();
  GET DIAGNOSTICS to_ongoing = ROW_COUNT;

  UPDATE public.tournaments
     SET status = 'finished'
   WHERE status = 'ongoing'
     AND ends_at <= NOW();
  GET DIAGNOSTICS to_finished = ROW_COUNT;

  RETURN to_ongoing + to_finished;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pg_cron extension is already enabled by migration 013; this is just defensive
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance-tournament-statuses') THEN
    PERFORM cron.unschedule('advance-tournament-statuses');
  END IF;
END $$;

SELECT cron.schedule(
  'advance-tournament-statuses',
  '* * * * *',                       -- every minute
  $$ SELECT public.advance_tournament_statuses(); $$
);

-- One-time backfill: catch up tournaments that should already have moved
SELECT public.advance_tournament_statuses() AS transitions_applied;

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- a) Column added:
--    SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'game_rooms' AND column_name = 'tournament_id';
--
-- b) Trigger registered:
--    SELECT tgname FROM pg_trigger
--     WHERE tgrelid = 'public.game_rooms'::regclass
--       AND tgname = 'tournament_scores_on_game_end';
--
-- c) Cron job:
--    SELECT jobname, schedule, command, active FROM cron.job
--     WHERE jobname = 'advance-tournament-statuses';
--
-- d) Manual end-to-end test:
--    -- create tournament t, register users A and B, then:
--    INSERT INTO game_rooms (room_code, host_id, guest_id, tournament_id, status)
--    VALUES ('TEST01', 'A_uuid', 'B_uuid', 't_uuid', 'playing');
--    UPDATE game_rooms SET status='finished', winner_id='A_uuid'
--     WHERE room_code='TEST01';
--    -- A should now have score=3, wins=1, games_played=1
--    -- B should have losses=1, games_played=1
