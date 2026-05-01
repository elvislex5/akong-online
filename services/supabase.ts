import { createClient } from '@supabase/supabase-js';
import { getAccessToken, shouldRefresh } from './auth/tokenStore';
import { refreshTokens } from './auth/client';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file'
  );
}

// Create Supabase client.
//
// Auth ownership lives on our own server (see server/auth/*). supabase-js
// is just the DB client here — RLS still works because the access tokens
// we mint are signed with the same JWT secret as Supabase, so auth.uid()
// resolves correctly.
//
// The `accessToken` callback is the key piece: when set, supabase-js
// disables its internal session machinery entirely (no refresh attempts,
// no localStorage session, no setSession bookkeeping). It just calls this
// function on every request to get the current bearer token. That stops
// supabase-js from POSTing our (non-GoTrue) refresh tokens to Supabase's
// /auth/v1/token endpoint and getting 400s in a loop.
//
// We piggyback on the callback to do a proactive refresh if the access
// token is within ~60s of expiry — same threshold as the AuthContext
// background timer, so a request that fires just before the timer fires
// still goes out with a fresh token.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  accessToken: async () => {
    if (shouldRefresh()) {
      try {
        await refreshTokens();
      } catch {
        // If refresh fails, fall through and return whatever we still
        // have — supabase-js will get a 401, AuthContext catches it and
        // routes the user back to login.
      }
    }
    return getAccessToken();
  },
});

// Database types (will be auto-generated in future, but manual for now)
export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  alias_songo: string | null;
  // Stats de parties individuelles
  games_played: number;
  games_won: number;
  games_lost: number;
  games_drawn: number;
  // Stats de matchs complets
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  matches_drawn: number;
  elo_rating: number;
  peak_elo: number;
  selected_board_skin: string | null;
  selected_seed_color: string;
  country: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
}

// Game room status
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';

// Match format types
export type MatchFormat = 'infinite' | 'traditional_6' | 'traditional_2' | 'first_to_x';

// Match status types
export type MatchStatus = 'in_progress' | 'completed' | 'abandoned';

// Game room interface (matches database schema)
export interface GameRoom {
  id: string;
  room_code: string;
  host_id: string | null;
  guest_id: string | null;
  status: RoomStatus;
  game_state: any | null; // JSONB - will be GameState from types.ts
  winner_id: string | null;
  // Match system fields
  match_format: MatchFormat;
  match_target: number | null; // For first_to_x format
  match_score_host: number;
  match_score_guest: number;
  match_status: MatchStatus;
  match_winner_id: string | null;
  game_count: number; // Existing field for alternating starter
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  host: Profile | null;
  guest: Profile | null;
}

// Match game history
export interface MatchGame {
  id: string;
  room_id: string;
  game_number: number;
  winner_id: string | null;
  final_score_host: number;
  final_score_guest: number;
  game_state: any | null;
  duration_seconds: number | null;
  played_at: string;
}

// Game spectator interface
export interface GameSpectator {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
}

// User presence status (Phase 3)
export type PresenceStatus = 'online' | 'in_game' | 'offline';

// User presence interface (Phase 3)
export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  current_room_id: string | null;
  last_seen: string;
  updated_at: string;
}

// Invitation status (Phase 3)
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

// Game invitation interface (Phase 3)
export interface GameInvitation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  room_id: string | null;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
}

// Online user with presence (for lobby display)
export interface OnlineUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: PresenceStatus;
  current_room_id: string | null;
  last_seen: string;
}

// Pending invitation with sender details
export interface PendingInvitation {
  id: string;
  from_user_id: string;
  from_username: string;
  from_display_name: string | null;
  from_avatar_url: string | null;
  room_id: string | null;
  created_at: string;
  expires_at: string;
}
