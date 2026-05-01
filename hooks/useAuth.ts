import { useAuthContext } from '../contexts/AuthContext';

/**
 * Backward-compat shim: existing call sites use `useAuth()` returning
 * `{ user, profile, loading, isAuthenticated, ... }`. We now back this with
 * the shared AuthContext (single instance for the whole app), which fixes
 * the per-component re-bootstrapping bug that caused FriendsPage to redirect
 * to "/" on first mount.
 *
 * `authUser` and `error` are preserved (as null) for any code that destructures
 * them; they were never load-bearing.
 */
export function useAuth() {
  const ctx = useAuthContext();
  return {
    user: ctx.user,
    authUser: ctx.user ? { id: ctx.user.id, email: ctx.user.email, profile: ctx.profile } : null,
    profile: ctx.profile,
    loading: ctx.loading,
    error: null as string | null,
    isAuthenticated: ctx.isAuthenticated,
    signIn: ctx.signIn,
    signUp: ctx.signUp,
    signOut: ctx.signOut,
    refreshProfile: ctx.refreshProfile,
  };
}
