import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { onAuthStateChange, getCurrentAuthUser } from '../services/authService';
import type { AuthUser } from '../services/supabase';

/**
 * Custom hook to manage authentication state
 * Returns the current user and profile, loading state, and error state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load initial session
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentAuthUser();
        setAuthUser(currentUser);
        setUser(currentUser ? { id: currentUser.id, email: currentUser.email } as User : null);
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Subscribe to auth state changes
    const subscription = onAuthStateChange(async (changedUser) => {
      setUser(changedUser);

      if (changedUser) {
        // Fetch full auth user with profile
        try {
          const fullUser = await getCurrentAuthUser();
          setAuthUser(fullUser);
        } catch (err) {
          console.error('Error fetching auth user:', err);
        }
      } else {
        setAuthUser(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    authUser,
    profile: authUser?.profile,
    loading,
    error,
    isAuthenticated: !!user,
  };
}
