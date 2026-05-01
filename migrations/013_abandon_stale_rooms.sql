-- ============================================
-- Migration 013: Auto-abandon stale game rooms
-- ============================================
-- After 5 minutes of inactivity (no UPDATE on the row), a game room is
-- automatically marked as `abandoned`. This solves the "phantom games"
-- problem: rooms left in `playing` status because a player closed their
-- browser, lost connection, or the server restarted mid-game.
--
-- How activity is detected:
--   - `updated_at` is bumped on every UPDATE of the row (trigger below)
--   - In practice, the host calls `updateGameState()` on every move,
--     which UPDATEs the row → bumps updated_at
--   - For `waiting` rooms (no guest yet), updated_at = creation time,
--     so a host who creates a room and walks away gets cleaned up too
--
-- The 5-minute threshold can be tuned in `abandon_stale_rooms()` below.
-- Note: with very long thinking pauses on parties without a chess clock,
-- 5 min may be aggressive. Increase to 10–15 if players complain.
-- ============================================

BEGIN;

-- 1. Defensive: ensure `updated_at` exists on game_rooms
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Trigger to auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_game_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS game_rooms_updated_at ON game_rooms;
CREATE TRIGGER game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_game_rooms_updated_at();

-- 3. Function: mark idle rooms as abandoned. Returns the number of rows touched.
--    SECURITY DEFINER so the cron job (running as postgres) can bypass RLS.
CREATE OR REPLACE FUNCTION abandon_stale_rooms()
RETURNS integer AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE game_rooms
     SET status       = 'abandoned',
         finished_at  = NOW(),
         -- Also abandon the surrounding match if the room belongs to a
         -- match format other than 'infinite'.
         match_status = CASE
                          WHEN match_format IS NOT NULL
                            AND match_format <> 'infinite'
                            AND match_status = 'in_progress'
                          THEN 'abandoned'
                          ELSE match_status
                        END
   WHERE status IN ('waiting', 'playing')
     AND updated_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable pg_cron (Supabase ships with it; idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 5. (Re)schedule the cleanup every minute
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'abandon-stale-rooms') THEN
    PERFORM cron.unschedule('abandon-stale-rooms');
  END IF;
END $$;

SELECT cron.schedule(
  'abandon-stale-rooms',
  '* * * * *',                    -- every minute
  $$ SELECT abandon_stale_rooms(); $$
);

-- 6. One-time backfill: clean up the existing zombie rooms now
SELECT abandon_stale_rooms() AS cleaned_now;

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- a) Status distribution after cleanup:
--    SELECT status, COUNT(*) FROM game_rooms GROUP BY status ORDER BY status;
--
-- b) Confirm the cron job is registered:
--    SELECT jobname, schedule, command, active FROM cron.job
--     WHERE jobname = 'abandon-stale-rooms';
--
-- c) See recent runs:
--    SELECT runid, jobid, status, return_message, start_time, end_time
--      FROM cron.job_run_details
--     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'abandon-stale-rooms')
--     ORDER BY start_time DESC LIMIT 10;
