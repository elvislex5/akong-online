-- Fix Room Join Policy
-- This migration fixes the RLS policy to allow guests to join waiting rooms

-- Drop the existing policy
DROP POLICY IF EXISTS "Players can update their game rooms" ON public.game_rooms;

-- Create new policy that allows:
-- 1. Host and guest can always update their room
-- 2. Any authenticated user can join a waiting room (to become guest)
CREATE POLICY "Players can update their game rooms"
  ON public.game_rooms
  FOR UPDATE
  USING (
    -- Can read/update if you're already a player
    auth.uid() = host_id OR
    auth.uid() = guest_id OR
    -- OR if the room is waiting for a guest (allows joining)
    (status = 'waiting' AND guest_id IS NULL)
  )
  WITH CHECK (
    -- After update, you must be either host or guest
    auth.uid() = host_id OR
    auth.uid() = guest_id
  );

COMMENT ON POLICY "Players can update their game rooms" ON public.game_rooms
IS 'Allows hosts and guests to update their rooms, and allows joining waiting rooms';
