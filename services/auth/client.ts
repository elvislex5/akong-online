/**
 * Auth HTTP client — wraps every /auth/* endpoint and keeps the token
 * store in sync. All UI-level auth flows go through this module.
 */

import { setTokens, getTokens, patchUser, type StoredTokens } from './tokenStore';

const AUTH_BASE_URL =
  (import.meta.env.VITE_AUTH_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_SOCKET_SERVER_URL as string | undefined) ||
  'http://localhost:3002';

interface AuthResponse {
  user: { id: string; email: string; emailVerified?: boolean };
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;       // seconds
  refreshTokenExpiresIn: number;      // seconds
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 204) return undefined as unknown as T;

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error response — leave data empty */
  }

  if (!res.ok) {
    const err = new Error(data?.error || `http_${res.status}`);
    (err as any).status = res.status;
    (err as any).body = data;
    throw err;
  }
  return data as T;
}

function persistAuthResponse(r: AuthResponse): void {
  const stored: StoredTokens = {
    accessToken: r.accessToken,
    refreshToken: r.refreshToken,
    accessExpiresAt: Date.now() + r.accessTokenExpiresIn * 1000,
    user: r.user,
  };
  setTokens(stored);
}

/* ----------------------------------------------------------------
   Public API
   ---------------------------------------------------------------- */

export async function signUp(email: string, password: string): Promise<AuthResponse> {
  const r = await postJson<AuthResponse>('/auth/signup', { email, password });
  persistAuthResponse(r);
  return r;
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const r = await postJson<AuthResponse>('/auth/login', { email, password });
  persistAuthResponse(r);
  return r;
}

export async function signOut(): Promise<void> {
  const tokens = getTokens();
  if (tokens?.refreshToken) {
    try {
      await postJson<void>('/auth/logout', { refreshToken: tokens.refreshToken });
    } catch (err) {
      console.warn('[auth/client] logout endpoint failed (clearing locally anyway):', err);
    }
  }
  setTokens(null);
}

/**
 * Single-flight refresh. If multiple callers race to refresh simultaneously
 * (e.g. several queued requests find the token expired), they all await
 * the same in-flight Promise so we issue exactly one /auth/refresh round-trip.
 */
let refreshInFlight: Promise<AuthResponse | null> | null = null;

export function refreshTokens(): Promise<AuthResponse | null> {
  if (refreshInFlight) return refreshInFlight;

  const tokens = getTokens();
  if (!tokens?.refreshToken) return Promise.resolve(null);

  refreshInFlight = (async () => {
    try {
      const r = await postJson<AuthResponse>('/auth/refresh', {
        refreshToken: tokens.refreshToken,
      });
      // /auth/refresh doesn't echo the user — preserve what we had
      const stored: StoredTokens = {
        accessToken: r.accessToken,
        refreshToken: r.refreshToken,
        accessExpiresAt: Date.now() + r.accessTokenExpiresIn * 1000,
        user: tokens.user,
      };
      setTokens(stored);
      return { ...r, user: tokens.user };
    } catch (err) {
      // On any refresh failure (expired, reused, network), purge so the
      // app routes the user back to the login screen.
      console.warn('[auth/client] refresh failed, clearing session:', err);
      setTokens(null);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function requestEmailVerification(email: string): Promise<void> {
  await postJson('/auth/verify-email/request', { email });
}

export async function confirmEmailVerification(token: string): Promise<{ verified: true }> {
  const r = await postJson<{ verified: true }>('/auth/verify-email/confirm', { token });
  // Reflect the new state locally so the banner / gates update instantly
  // (the access token doesn't carry emailVerified — that's only in our
  // user snapshot, which we patch in place here).
  patchUser({ emailVerified: true });
  return r;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await postJson('/auth/password-reset/request', { email });
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<{ reset: true }> {
  return postJson('/auth/password-reset/confirm', { token, newPassword });
}

/**
 * Account claim — for users migrated from Supabase Auth. They set a
 * password for the first time using a token emailed to them.
 *
 * /request is silent (always 204, anti-enumeration).
 * /confirm returns full auth tokens — they're logged in immediately.
 */
export async function requestAccountClaim(email: string): Promise<void> {
  await postJson('/auth/claim/request', { email });
}

export async function confirmAccountClaim(
  token: string,
  newPassword: string,
): Promise<AuthResponse> {
  const r = await postJson<AuthResponse>('/auth/claim/confirm', { token, newPassword });
  persistAuthResponse(r);
  return r;
}

/**
 * OAuth — redirect-based flow.
 *
 * Step 1: send the user to /auth/oauth/google/start (server endpoint).
 * The browser follows redirects through Google and back to our callback,
 * which lands on /auth/oauth/callback?code=XXX in the frontend.
 *
 * Step 2: the OAuthCallbackPage POSTs the code here to swap it for tokens.
 */
export function googleSignInUrl(redirectAfter?: string): string {
  const u = new URL(`${AUTH_BASE_URL}/auth/oauth/google/start`);
  if (redirectAfter) u.searchParams.set('redirect', redirectAfter);
  return u.toString();
}

export async function exchangeOAuthCode(code: string): Promise<AuthResponse> {
  const r = await postJson<AuthResponse>('/auth/oauth/google/exchange', { code });
  persistAuthResponse(r);
  return r;
}
