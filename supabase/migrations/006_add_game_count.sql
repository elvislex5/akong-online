-- Add game_count field to track alternation of starting player
-- This ensures fair alternation regardless of who clicks "Rejouer"

ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS game_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.game_rooms.game_count IS 'Number of games played in this room. Used to determine starting player alternation (even = Player.One, odd = Player.Two)';

-- Function to increment game count when restarting
CREATE OR REPLACE FUNCTION public.increment_game_count(p_room_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE public.game_rooms
  SET game_count = game_count + 1
  WHERE id = p_room_id
  RETURNING game_count INTO v_new_count;

  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_game_count IS 'Increments game count for a room and returns the new count';
