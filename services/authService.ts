import { supabase, type Profile, type AuthUser } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Authentication Service
 * Handles all auth-related operations using Supabase
 */

// ============================================
// SIGN UP
// ============================================
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

// ============================================
// SIGN IN
// ============================================
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

// ============================================
// SIGN IN WITH GOOGLE (OAuth)
// ============================================
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/game`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;

  return data;
}

// ============================================
// SIGN OUT
// ============================================
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ============================================
// GET CURRENT SESSION
// ============================================
export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ============================================
// GET CURRENT USER
// ============================================
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  // Auth session missing is not an error - it just means user is not logged in
  if (error && error.message !== 'Auth session missing!') {
    console.error('Error getting user:', error);
  }

  return data.user;
}

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

// ============================================
// GET PROFILE WITH AUTH USER
// ============================================
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getUserProfile(user.id);

  return {
    id: user.id,
    email: user.email || '',
    profile: profile || undefined,
  };
}

// ============================================
// AUTH STATE CHANGE LISTENER
// ============================================
export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return subscription;
}

// ============================================
// GET ACCESS TOKEN (for Socket.io authentication)
// ============================================
export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token || null;
}
