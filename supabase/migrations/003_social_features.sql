-- Phase 3a: Social Features - Presence & Invitations
-- This migration creates tables for user presence tracking and game invitations

-- ============================================
-- USER PRESENCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,

  -- Status
  status TEXT CHECK (status IN ('online', 'in_game', 'offline')) DEFAULT 'offline',

  -- Current activity
  current_room_id UUID REFERENCES public.game_rooms(id) ON DELETE SET NULL,

  -- Timestamps
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_presence_status_idx ON public.user_presence(status);
CREATE INDEX IF NOT EXISTS user_presence_last_seen_idx ON public.user_presence(last_seen DESC);

-- ============================================
-- GAME INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Players
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Associated room (created when invitation is sent)
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,

  -- Status
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')) DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  responded_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT different_users CHECK (from_user_id != to_user_id),
  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS invitations_to_user_idx ON public.game_invitations(to_user_id, status);
CREATE INDEX IF NOT EXISTS invitations_from_user_idx ON public.game_invitations(from_user_id, status);
CREATE INDEX IF NOT EXISTS invitations_status_idx ON public.game_invitations(status);
CREATE INDEX IF NOT EXISTS invitations_expires_at_idx ON public.game_invitations(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;

-- User Presence Policies
-- Everyone can view online users (for lobby)
CREATE POLICY "User presence is viewable by everyone"
  ON public.user_presence
  FOR SELECT
  USING (true);

-- Users can insert their own presence
CREATE POLICY "Users can set their own presence"
  ON public.user_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own presence
CREATE POLICY "Users can update their own presence"
  ON public.user_presence
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Game Invitations Policies
-- Users can view invitations they sent or received
CREATE POLICY "Users can view their invitations"
  ON public.game_invitations
  FOR SELECT
  USING (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id
  );

-- Users can create invitations
CREATE POLICY "Users can send invitations"
  ON public.game_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Users can update invitations they're involved in
CREATE POLICY "Users can update their invitations"
  ON public.game_invitations
  FOR UPDATE
  USING (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id
  )
  WITH CHECK (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id
  );

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to set user online
CREATE OR REPLACE FUNCTION public.set_user_online(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, status, last_seen, updated_at)
  VALUES (p_user_id, 'online', NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = 'online',
    last_seen = NOW(),
    updated_at = NOW(),
    current_room_id = NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user offline
CREATE OR REPLACE FUNCTION public.set_user_offline(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, status, last_seen, updated_at)
  VALUES (p_user_id, 'offline', NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = 'offline',
    last_seen = NOW(),
    updated_at = NOW(),
    current_room_id = NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user in game
CREATE OR REPLACE FUNCTION public.set_user_in_game(
  p_user_id UUID,
  p_room_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, status, current_room_id, last_seen, updated_at)
  VALUES (p_user_id, 'in_game', p_room_id, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = 'in_game',
    current_room_id = p_room_id,
    last_seen = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get online users (excluding self)
CREATE OR REPLACE FUNCTION public.get_online_users(p_exclude_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT,
  current_room_id UUID,
  last_seen TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    COALESCE(up.status, 'offline') as status,
    up.current_room_id,
    COALESCE(up.last_seen, p.created_at) as last_seen
  FROM public.profiles p
  LEFT JOIN public.user_presence up ON p.id = up.user_id
  WHERE
    COALESCE(up.status, 'offline') != 'offline'
    AND (p_exclude_user_id IS NULL OR p.id != p_exclude_user_id)
  ORDER BY up.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending invitations for a user
CREATE OR REPLACE FUNCTION public.get_pending_invitations(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  from_user_id UUID,
  from_username TEXT,
  from_display_name TEXT,
  from_avatar_url TEXT,
  room_id UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.from_user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    i.room_id,
    i.created_at,
    i.expires_at
  FROM public.game_invitations i
  JOIN public.profiles p ON p.id = i.from_user_id
  WHERE
    i.to_user_id = p_user_id
    AND i.status = 'pending'
    AND i.expires_at > NOW()
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id UUID)
RETURNS TABLE (
  room_id UUID,
  room_code TEXT
) AS $$
DECLARE
  v_room_id UUID;
  v_room_code TEXT;
BEGIN
  -- Update invitation status
  UPDATE public.game_invitations
  SET
    status = 'accepted',
    responded_at = NOW()
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > NOW()
  RETURNING game_invitations.room_id INTO v_room_id;

  -- Get room code
  SELECT game_rooms.room_code INTO v_room_code
  FROM public.game_rooms
  WHERE game_rooms.id = v_room_id;

  RETURN QUERY SELECT v_room_id, v_room_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline invitation
CREATE OR REPLACE FUNCTION public.decline_invitation(p_invitation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.game_invitations
  SET
    status = 'declined',
    responded_at = NOW()
  WHERE id = p_invitation_id
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel invitation (sender cancels)
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.game_invitations
  SET
    status = 'cancelled',
    responded_at = NOW()
  WHERE id = p_invitation_id
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.game_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at <= NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup stale presence (users offline > 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.user_presence
  SET status = 'offline'
  WHERE status != 'offline'
    AND last_seen < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on presence changes
CREATE OR REPLACE FUNCTION public.update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_presence_timestamp
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_presence_timestamp();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.user_presence IS 'Real-time user presence tracking (online, in_game, offline)';
COMMENT ON TABLE public.game_invitations IS 'Game invitations between users with expiration';
COMMENT ON COLUMN public.user_presence.status IS 'User status: online (in lobby), in_game, offline';
COMMENT ON COLUMN public.game_invitations.status IS 'Invitation status: pending, accepted, declined, expired, cancelled';
COMMENT ON COLUMN public.game_invitations.expires_at IS 'Invitations expire after 5 minutes by default';
