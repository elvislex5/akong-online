-- ============================================
-- Migration 014: Spectator chat
-- ============================================
-- Real-time chat scoped to a single game room, used by spectators
-- watching that room on the /watch page. Append-only (no edits, no
-- deletes) for simplicity and moderation safety.
--
-- The in-game player chat uses a different system (Socket.io broadcast
-- via server.js) — this table is dedicated to the spectator side only.
-- ============================================

BEGIN;

-- 1. Table
CREATE TABLE IF NOT EXISTS public.spectator_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id    UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,                          -- denormalized for display
  message    TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS spectator_messages_room_created_idx
  ON public.spectator_messages (room_id, created_at DESC);

-- 2. RLS
ALTER TABLE public.spectator_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Spectator messages are viewable by everyone" ON public.spectator_messages;
CREATE POLICY "Spectator messages are viewable by everyone"
  ON public.spectator_messages
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can post spectator messages" ON public.spectator_messages;
CREATE POLICY "Authenticated users can post spectator messages"
  ON public.spectator_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies → table is append-only.

-- 3. Enable Realtime publication for INSERTs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'spectator_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.spectator_messages;
  END IF;
END $$;

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- a) Table & RLS:
--    SELECT * FROM pg_policies WHERE tablename = 'spectator_messages';
-- b) Realtime:
--    SELECT * FROM pg_publication_tables WHERE tablename = 'spectator_messages';
