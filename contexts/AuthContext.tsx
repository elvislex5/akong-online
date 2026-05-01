import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getTokens,
  setTokens as setStoredTokens,
  shouldRefresh,
  subscribe as subscribeTokens,
  type StoredTokens,
} from '../services/auth/tokenStore';
import {
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  refreshTokens as apiRefreshTokens,
} from '../services/auth/client';
import { getUserProfile } from '../services/authService';
import type { Profile } from '../services/supabase';

/**
 * Shared auth state for the whole app.
 *
 * Replaces the per-component useAuth() (which had its own loading state per
 * mount and caused the FriendsPage redirect bug). Now the entire tree shares
 * one source of truth via React context.
 *
 * Responsibilities:
 *   - Hydrate from localStorage at mount, then load profile from DB
 *   - Hand the access token to supabase-js so RLS auth.uid() resolves
 *   - Schedule a proactive refresh ~60s before access token expires
 *   - Expose signIn / signUp / signOut to consumers
 */

interface AuthContextValue {
  user: { id: string; email: string; emailVerified?: boolean } | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Force a profile re-fetch (after the user updates their profile elsewhere) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
};

/* ----------------------------------------------------------------
   Provider
   ---------------------------------------------------------------- */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokensState] = useState<StoredTokens | null>(() => getTokens());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTimerRef = useRef<number | null>(null);

  // No setSession() here on purpose — supabase-js gets our access token
  // through the `accessToken` callback configured in services/supabase.ts,
  // so it doesn't manage a session of its own and never tries to refresh
  // our (non-GoTrue) refresh tokens against Supabase.

  // Bootstrap: load profile from DB if we have a session
  const loadProfile = async (userId: string) => {
    try {
      const p = await getUserProfile(userId);
      setProfile(p);
    } catch (err) {
      console.error('[AuthContext] loadProfile error:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    if (tokens?.user?.id) {
      loadProfile(tokens.user.id).finally(() => setLoading(false));
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [tokens?.user?.id]);

  // Cross-tab token sync: when localStorage updates from another tab, mirror
  // it into local state so the UI updates without a refresh.
  useEffect(() => {
    return subscribeTokens((next) => setTokensState(next));
  }, []);

  // Proactive refresh: schedule a refresh 60s before access token expires.
  useEffect(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (!tokens) return;

    const msUntilRefresh = Math.max(5_000, tokens.accessExpiresAt - Date.now() - 60_000);
    refreshTimerRef.current = window.setTimeout(async () => {
      if (!shouldRefresh()) return;
      const refreshed = await apiRefreshTokens();
      if (!refreshed) {
        // Refresh failed → state is already cleared by the client. Listener
        // will fire and update UI.
      }
    }, msUntilRefresh);

    return () => {
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [tokens?.accessExpiresAt]);

  /* ---- imperative actions ---- */

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await apiSignIn(email, password);
      const t = getTokens();
      setTokensState(t);
      if (t?.user?.id) await loadProfile(t.user.id);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await apiSignUp(email, password);
      const t = getTokens();
      setTokensState(t);
      if (t?.user?.id) await loadProfile(t.user.id);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    await apiSignOut();
    setStoredTokens(null);
    setTokensState(null);
    setProfile(null);
  };

  const refreshProfile = async (): Promise<void> => {
    if (tokens?.user?.id) await loadProfile(tokens.user.id);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: tokens?.user || null,
      profile,
      loading,
      isAuthenticated: !!tokens?.user,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokens?.user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
