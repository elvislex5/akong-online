-- ============================================
-- Migration 020: Profile game stats increment (CDC §9.1 MUST)
-- ============================================
-- The profiles table has games_played / games_won / games_lost / games_drawn
-- columns since 001_initial_schema.sql, but nothing in the codebase ever
-- writes to them. Result: every user shows "Parties: 0" on their profile,
-- regardless of how many AI/local/online games they've finished.
--
-- This migration adds a SECURITY DEFINER function that authenticated users
-- can call once per finished game, bumping the four counters atomically.
-- Frontend wires it into the App.tsx game-end effect (see commit log).
--
-- Outcomes: 'win' | 'loss' | 'draw'. Anything else is rejected with NOTICE.
-- ============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.record_game_for_profile(
  p_user_id UUID,
  p_outcome TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_outcome NOT IN ('win', 'loss', 'draw') THEN
    RAISE NOTICE 'record_game_for_profile: invalid outcome "%" — ignored', p_outcome;
    RETURN;
  END IF;

  UPDATE public.profiles
     SET games_played = games_played + 1,
         games_won    = games_won    + CASE WHEN p_outcome = 'win'  THEN 1 ELSE 0 END,
         games_lost   = games_lost   + CASE WHEN p_outcome = 'loss' THEN 1 ELSE 0 END,
         games_drawn  = games_drawn  + CASE WHEN p_outcome = 'draw' THEN 1 ELSE 0 END,
         updated_at   = NOW()
   WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.record_game_for_profile IS
  'Atomically bump games_played + the matching outcome counter on a profile. '
  'Called from the client at end of every finished game (AI/local/online).';

-- Allow authenticated users to call it (RLS would block direct UPDATE,
-- SECURITY DEFINER lets the function bypass it for the narrow operation).
GRANT EXECUTE ON FUNCTION public.record_game_for_profile(UUID, TEXT) TO authenticated;

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- a) Function exists:
--    SELECT proname FROM pg_proc WHERE proname = 'record_game_for_profile';
--
-- b) Smoke test (replace with a real user_id):
--    SELECT public.record_game_for_profile('<uuid>', 'win');
--    SELECT games_played, games_won, games_lost, games_drawn
--      FROM profiles WHERE id = '<uuid>';
