import { supabase, type Profile } from './supabase';

/**
 * Profile + DB helpers.
 *
 * Auth itself (signup, login, logout, sessions) lives entirely in our own
 * stack now — see `services/auth/client.ts` and `contexts/AuthContext.tsx`.
 * The legacy supabase.auth.* wrappers that used to live here are gone:
 * supabase-js is configured with the `accessToken` callback, which makes
 * those methods throw if called.
 *
 * What remains in this file are pure DB helpers (profiles + game stats).
 */

// ============================================
// GET USER PROFILE
// ============================================
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

// ============================================
// UPDATE PROFILE
// ============================================
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Atomically bump the user's games_played + matching outcome counter on
 * the profile. Backed by SQL function `record_game_for_profile` (see
 * migration 020). Called from App.tsx's game-end effect for every
 * authenticated user who finishes a game (AI / local / online).
 *
 * Errors are swallowed (logged only) — we never want a stats hiccup to
 * break the game-end UX.
 */
export type GameOutcome = 'win' | 'loss' | 'draw';

export async function recordGameForProfile(userId: string, outcome: GameOutcome): Promise<void> {
  const { error } = await supabase.rpc('record_game_for_profile', {
    p_user_id: userId,
    p_outcome: outcome,
  });
  if (error) {
    console.error('[authService] recordGameForProfile error:', error);
  }
}

// ============================================
// CHECK USERNAME AVAILABILITY
// ============================================
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('Error checking username:', error);
    return false;
  }

  return data === null; // null means username is available
}

// ============================================
// UPDATE USERNAME
// ============================================
export async function updateUsername(userId: string, newUsername: string) {
  // First check if username is available
  const available = await isUsernameAvailable(newUsername);
  if (!available) {
    throw new Error('Ce nom d\'utilisateur est déjà pris');
  }

  // Username validation
  if (newUsername.length < 3 || newUsername.length > 20) {
    throw new Error('Le nom d\'utilisateur doit contenir entre 3 et 20 caractères');
  }

  if (!/^[a-z0-9_]+$/.test(newUsername)) {
    throw new Error('Le nom d\'utilisateur ne peut contenir que des lettres minuscules, chiffres et underscores');
  }

  return await updateProfile(userId, { username: newUsername });
}
