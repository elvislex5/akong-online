import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types (will be auto-generated in future, but manual for now)
export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  games_played: number;
  games_won: number;
  games_lost: number;
  games_drawn: number;
  elo_rating: number;
  peak_elo: number;
  selected_board_skin: string | null;
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

// Game room interface (matches database schema)
export interface GameRoom {
  id: string;
  room_code: string;
  host_id: string | null;
  guest_id: string | null;
  status: RoomStatus;
  game_state: any | null; // JSONB - will be GameState from types.ts
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  host: Profile | null;
  guest: Profile | null;
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
