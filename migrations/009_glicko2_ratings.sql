-- Glicko-2 multi-system ratings table
-- Stores one row per user × game_system × cadence combination

CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_system TEXT NOT NULL CHECK (game_system IN ('mgpwem', 'angbwe')),
  cadence TEXT NOT NULL CHECK (cadence IN ('bullet', 'blitz', 'rapide', 'classique')),
  rating INTEGER NOT NULL DEFAULT 1200,
  rd INTEGER NOT NULL DEFAULT 350,
  volatility NUMERIC(8,6) NOT NULL DEFAULT 0.060000,
  peak_rating INTEGER NOT NULL DEFAULT 1200,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, game_system, cadence)
);

-- Indexes for leaderboard queries and user lookups
CREATE INDEX IF NOT EXISTS idx_ratings_leaderboard
  ON ratings(game_system, cadence, rating DESC)
  WHERE games_played > 0;

CREATE INDEX IF NOT EXISTS idx_ratings_user
  ON ratings(user_id);

-- RLS policies
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all ratings"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow service role full access (for server-side rating updates)
CREATE POLICY "Service role full access"
  ON ratings FOR ALL
  USING (auth.role() = 'service_role');
