/**
 * Token store — single source of truth for access + refresh tokens.
 *
 * - localStorage for persistence across tabs/refreshes.
 * - In-memory mirror for hot path reads (avoids JSON.parse on every fetch).
 * - Pub/sub so AuthContext can react to token changes (e.g. after refresh
 *   completes in another tab).
 *
 * Tradeoffs: localStorage is XSS-readable. We accept this for V1 — the
 * mitigation is keeping access tokens short-lived (15 min) and refresh
 * tokens single-use with rotation. V2 can upgrade refresh to httpOnly cookie.
 */

const STORAGE_KEY = 'songo_auth_v1';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  // Unix ms when the access token expires (computed from accessTokenExpiresIn at write time)
  accessExpiresAt: number;
  // Snapshot of user identity for hydration before /me lookup
  user: { id: string; email: string; emailVerified?: boolean };
}

type Listener = (tokens: StoredTokens | null) => void;

let memoryCache: StoredTokens | null = null;
const listeners = new Set<Listener>();
let initialized = false;

function read(): StoredTokens | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

function ensureHydrated(): void {
  if (initialized) return;
  memoryCache = read();
  initialized = true;
}

export function getTokens(): StoredTokens | null {
  ensureHydrated();
  return memoryCache;
}

export function getAccessToken(): string | null {
  ensureHydrated();
  return memoryCache?.accessToken || null;
}

export function setTokens(tokens: StoredTokens | null): void {
  memoryCache = tokens;
  initialized = true;
  if (typeof localStorage === 'undefined') return;
  try {
    if (tokens) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('[tokenStore] persist error:', err);
  }
  for (const l of listeners) l(tokens);
}

/**
 * Patch the stored user object without touching tokens. Used after email
 * verification to flip emailVerified=true so the banner hides immediately
 * without a full session refresh. Cross-tab sync still kicks in via storage
 * event so other tabs see the update too.
 */
export function patchUser(partial: Partial<StoredTokens['user']>): void {
  ensureHydrated();
  if (!memoryCache) return;
  setTokens({ ...memoryCache, user: { ...memoryCache.user, ...partial } });
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Cross-tab sync: when localStorage changes in another tab, mirror the
 * change in this tab's memory cache and notify listeners.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    memoryCache = e.newValue ? JSON.parse(e.newValue) : null;
    for (const l of listeners) l(memoryCache);
  });
}

/**
 * Returns true if access token is missing OR expires within `bufferMs`.
 * Used by the proactive refresh logic to renew before the token actually
 * dies on us mid-request.
 */
export function shouldRefresh(bufferMs = 60_000): boolean {
  ensureHydrated();
  if (!memoryCache) return false;
  return memoryCache.accessExpiresAt - Date.now() < bufferMs;
}
