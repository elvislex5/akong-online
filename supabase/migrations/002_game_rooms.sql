-- Phase 2: Game Rooms and Spectators
-- This migration creates tables for persistent game rooms and spectator functionality

-- ============================================
-- GAME ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,

  -- Players
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Game state
  status TEXT CHECK (status IN ('waiting', 'playing', 'finished', 'abandoned')) DEFAULT 'waiting',
  game_state JSONB, -- Complete game state (board, scores, currentPlayer, etc.)

  -- Results
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT room_code_format CHECK (room_code ~* '^[A-Z0-9]{6}$'),
  CONSTRAINT valid_status_transitions CHECK (
    (status = 'waiting' AND started_at IS NULL) OR
    (status IN ('playing', 'finished', 'abandoned'))
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS game_rooms_status_idx ON public.game_rooms(status);
CREATE INDEX IF NOT EXISTS game_rooms_host_idx ON public.game_rooms(host_id);
CREATE INDEX IF NOT EXISTS game_rooms_guest_idx ON public.game_rooms(guest_id);
CREATE INDEX IF NOT EXISTS game_rooms_created_at_idx ON public.game_rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS game_rooms_room_code_idx ON public.game_rooms(room_code);

-- ============================================
-- GAME SPECTATORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_spectators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints: A user can only spectate a room once
  UNIQUE(room_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS game_spectators_room_idx ON public.game_spectators(room_id);
CREATE INDEX IF NOT EXISTS game_spectators_user_idx ON public.game_spectators(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_spectators ENABLE ROW LEVEL SECURITY;

-- Game Rooms Policies
-- Everyone can view active rooms (for lobby)
CREATE POLICY "Game rooms are viewable by everyone"
  ON public.game_rooms
  FOR SELECT
  USING (true);

-- Users can create rooms (will be host)
CREATE POLICY "Users can create game rooms"
  ON public.game_rooms
  FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Host and guest can update their own rooms
CREATE POLICY "Players can update their game rooms"
  ON public.game_rooms
  FOR UPDATE
  USING (
    auth.uid() = host_id OR
    auth.uid() = guest_id
  )
  WITH CHECK (
    auth.uid() = host_id OR
    auth.uid() = guest_id
  );

-- Game Spectators Policies
-- Everyone can view spectators
CREATE POLICY "Spectators are viewable by everyone"
  ON public.game_spectators
  FOR SELECT
  USING (true);

-- Users can add themselves as spectators
CREATE POLICY "Users can spectate games"
  ON public.game_spectators
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove themselves as spectators
CREATE POLICY "Users can leave spectating"
  ON public.game_spectators
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to get active rooms (waiting or playing)
CREATE OR REPLACE FUNCTION public.get_active_rooms()
RETURNS SETOF public.game_rooms AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.game_rooms
  WHERE status IN ('waiting', 'playing')
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get room by code
CREATE OR REPLACE FUNCTION public.get_room_by_code(code TEXT)
RETURNS SETOF public.game_rooms AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.game_rooms
  WHERE room_code = UPPER(code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old finished games (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_games()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.game_rooms
  WHERE status IN ('finished', 'abandoned')
    AND finished_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update game state (called by server)
CREATE OR REPLACE FUNCTION public.update_game_state(
  p_room_id UUID,
  p_game_state JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.game_rooms
  SET
    game_state = p_game_state,
    status = CASE
      WHEN (p_game_state->>'status') = 'Won' OR (p_game_state->>'status') = 'Draw' THEN 'finished'
      WHEN started_at IS NULL THEN 'playing'
      ELSE status
    END,
    started_at = CASE
      WHEN started_at IS NULL THEN NOW()
      ELSE started_at
    END
  WHERE id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to finish a game
CREATE OR REPLACE FUNCTION public.finish_game(
  p_room_id UUID,
  p_winner_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.game_rooms
  SET
    status = 'finished',
    winner_id = p_winner_id,
    finished_at = NOW()
  WHERE id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to abandon a game
CREATE OR REPLACE FUNCTION public.abandon_game(
  p_room_id UUID,
  p_abandoner_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_host_id UUID;
  v_guest_id UUID;
  v_winner_id UUID;
BEGIN
  -- Get host and guest
  SELECT host_id, guest_id INTO v_host_id, v_guest_id
  FROM public.game_rooms
  WHERE id = p_room_id;

  -- Determine winner (opponent of abandoner)
  IF p_abandoner_id = v_host_id THEN
    v_winner_id := v_guest_id;
  ELSE
    v_winner_id := v_host_id;
  END IF;

  -- Update room
  UPDATE public.game_rooms
  SET
    status = 'abandoned',
    winner_id = v_winner_id,
    finished_at = NOW()
  WHERE id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.game_rooms IS 'Persistent storage for online game rooms';
COMMENT ON TABLE public.game_spectators IS 'Users watching a game in progress';
COMMENT ON COLUMN public.game_rooms.game_state IS 'JSONB snapshot of GameState (board, scores, currentPlayer, status, etc.)';
COMMENT ON COLUMN public.game_rooms.status IS 'Room status: waiting (for guest), playing, finished, abandoned';
