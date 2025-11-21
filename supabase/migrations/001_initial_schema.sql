-- Phase 1: Initial Schema - Profiles and Basic Tables
-- This migration creates the foundational tables for user profiles

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Table des profils utilisateurs (étend auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Stats (Phase 1: basic counters)
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,

  -- Will be used in Phase 4
  elo_rating INTEGER DEFAULT 1200,
  peak_elo INTEGER DEFAULT 1200,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~* '^[a-z0-9_]+$')
);

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at DESC);

-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_username TEXT;
BEGIN
  -- Generate a random username from email (user can change it later)
  random_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4);

  -- Insert profile with generated username
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    random_username,
    SPLIT_PART(NEW.email, '@', 1)
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If username already exists, append more of the UUID
    random_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 8);
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (NEW.id, random_username, SPLIT_PART(NEW.email, '@', 1));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- AUTO-UPDATE TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles (for lobby, leaderboard, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policy: Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (handled by trigger, but keep for safety)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to get profile by username
CREATE OR REPLACE FUNCTION public.get_profile_by_username(username_param TEXT)
RETURNS SETOF public.profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.profiles
  WHERE username = username_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update profile stats after game
CREATE OR REPLACE FUNCTION public.update_player_stats(
  player_id UUID,
  result TEXT -- 'win', 'loss', 'draw'
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    games_played = games_played + 1,
    games_won = games_won + CASE WHEN result = 'win' THEN 1 ELSE 0 END,
    games_lost = games_lost + CASE WHEN result = 'loss' THEN 1 ELSE 0 END,
    games_drawn = games_drawn + CASE WHEN result = 'draw' THEN 1 ELSE 0 END
  WHERE id = player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================
-- You can add seed data here if needed
-- For example, a bot user for testing

COMMENT ON TABLE public.profiles IS 'User profiles with stats and settings';
COMMENT ON COLUMN public.profiles.username IS 'Unique username for login and display';
COMMENT ON COLUMN public.profiles.elo_rating IS 'ELO rating for ranked matchmaking (Phase 4)';
