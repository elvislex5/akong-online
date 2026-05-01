-- ============================================
-- Migration 016: Tournaments — Phase 3 (Compete module, CDC §7)
-- ============================================
-- MVP scope: arena/swiss/knockout/round_robin formats stored, but only
-- 'arena' is fully wired in V1. Auto-matchmaking and auto-scoring come
-- in a follow-up; for now the admin orchestrates the games and reports
-- the scores via the existing endpoints.
--
-- Tables:
--   tournaments              — definition (admin-only writes)
--   tournament_participants  — registration + running score
-- ============================================

BEGIN;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.tournaments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 80),
  description     TEXT,
  format          TEXT NOT NULL DEFAULT 'arena'
                    CHECK (format IN ('arena', 'swiss', 'knockout', 'round_robin', 'custom')),
  game_system     TEXT NOT NULL DEFAULT 'mgpwem'
                    CHECK (game_system IN ('mgpwem', 'angbwe')),
  cadence         TEXT NOT NULL DEFAULT 'rapide'
                    CHECK (cadence IN ('bullet', 'blitz', 'rapide', 'classique', 'officiel')),
  status          TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'ongoing', 'finished', 'cancelled')),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  min_rating      INTEGER,
  max_rating      INTEGER,
  country         TEXT,                              -- optional ISO 3166-1 alpha-2 (national tournaments)
  max_participants INTEGER,
  prize_description TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tournaments_dates_valid CHECK (ends_at > starts_at),
  CONSTRAINT tournaments_country_iso2 CHECK (country IS NULL OR country ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS tournaments_status_idx ON public.tournaments (status);
CREATE INDEX IF NOT EXISTS tournaments_starts_at_idx ON public.tournaments (starts_at);
CREATE INDEX IF NOT EXISTS tournaments_country_idx ON public.tournaments (country)
  WHERE country IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tournament_participants (
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score         INTEGER NOT NULL DEFAULT 0,
  games_played  INTEGER NOT NULL DEFAULT 0,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  draws         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS tournament_participants_user_idx
  ON public.tournament_participants (user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_tournaments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tournaments_updated_at ON public.tournaments;
CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_tournaments_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Tournaments: anyone reads
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON public.tournaments;
CREATE POLICY "Tournaments are viewable by everyone"
  ON public.tournaments FOR SELECT USING (true);

-- Tournaments: only admins write
DROP POLICY IF EXISTS "Admins can create tournaments" ON public.tournaments;
CREATE POLICY "Admins can create tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
CREATE POLICY "Admins can update tournaments"
  ON public.tournaments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;
CREATE POLICY "Admins can delete tournaments"
  ON public.tournaments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Participants: anyone reads
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON public.tournament_participants;
CREATE POLICY "Participants are viewable by everyone"
  ON public.tournament_participants FOR SELECT USING (true);

-- Participants: users register themselves
DROP POLICY IF EXISTS "Users can self-register" ON public.tournament_participants;
CREATE POLICY "Users can self-register"
  ON public.tournament_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Participants: users unregister themselves; admins can also remove anyone
DROP POLICY IF EXISTS "Users can unregister; admins can remove anyone" ON public.tournament_participants;
CREATE POLICY "Users can unregister; admins can remove anyone"
  ON public.tournament_participants FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Participants: only admins update scores
DROP POLICY IF EXISTS "Admins can update participant scores" ON public.tournament_participants;
CREATE POLICY "Admins can update participant scores"
  ON public.tournament_participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- a) Schema exists:
--    SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public' AND table_name LIKE 'tournament%';
--
-- b) Policies registered:
--    SELECT tablename, policyname FROM pg_policies
--     WHERE tablename IN ('tournaments', 'tournament_participants')
--     ORDER BY tablename, policyname;
