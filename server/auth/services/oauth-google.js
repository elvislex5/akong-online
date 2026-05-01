import crypto from 'crypto';

/**
 * Google OAuth — pure HTTP, no SDK. Implements just what we need:
 *   1. Build the authorization URL (state + PKCE)
 *   2. Exchange the authorization code for tokens
 *   3. Verify the ID token (offline JWT signature check via JWKS)
 *
 * Required env:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI   (e.g. https://api.akong-online.com/auth/oauth/google/callback)
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('google_oauth_not_configured');
  }
  return { clientId, clientSecret, redirectUri };
}

export function isGoogleConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}

/* ---------- PKCE ---------- */

export function generatePkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/* ---------- Step 1: build the redirect URL ---------- */

export function buildAuthorizationUrl({ state, codeChallenge }) {
  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'online',                  // we don't need a Google refresh token
    prompt: 'select_account',               // friendlier UX on repeat sign-ins
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/* ---------- Step 2: exchange code for tokens ---------- */

export async function exchangeCodeForTokens({ code, codeVerifier }) {
  const { clientId, clientSecret, redirectUri } = getConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[oauth/google] token exchange failed:', res.status, text);
    throw new Error('google_token_exchange_failed');
  }

  return await res.json();   // { access_token, id_token, expires_in, ... }
}

/* ---------- Step 3: verify ID token ---------- */

let cachedKeys = null;
let keysFetchedAt = 0;
const KEY_CACHE_TTL_MS = 60 * 60 * 1000;     // 1 hour

async function getGoogleKeys() {
  if (cachedKeys && Date.now() - keysFetchedAt < KEY_CACHE_TTL_MS) {
    return cachedKeys;
  }
  const res = await fetch(JWKS_URI);
  if (!res.ok) throw new Error('google_jwks_fetch_failed');
  const json = await res.json();
  cachedKeys = json.keys || [];
  keysFetchedAt = Date.now();
  return cachedKeys;
}

function base64urlDecode(str) {
  // Pad with '=' to a multiple of 4 chars, then convert to standard base64
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

function jwkToPem(jwk) {
  // Use Node's built-in KeyObject which understands JWK directly
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

/**
 * Verifies the ID token's signature and standard claims. Returns the
 * decoded payload or throws on any check failure.
 */
export async function verifyIdToken(idToken) {
  const { clientId } = getConfig();

  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('id_token_malformed');

  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(base64urlDecode(headerB64).toString('utf8'));
  const payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'));
  const signature = base64urlDecode(sigB64);

  const keys = await getGoogleKeys();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('id_token_kid_not_found');

  const publicKey = jwkToPem(jwk);

  const data = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
  const algo = header.alg === 'RS256' ? 'RSA-SHA256' : null;
  if (!algo) throw new Error('id_token_unsupported_alg');

  const verifier = crypto.createVerify(algo);
  verifier.update(data);
  verifier.end();
  const ok = verifier.verify(publicKey, signature);
  if (!ok) throw new Error('id_token_bad_signature');

  // Standard-claim checks
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    throw new Error('id_token_bad_iss');
  }
  if (payload.aud !== clientId) throw new Error('id_token_bad_aud');
  if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('id_token_expired');
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new Error('id_token_bad_iat');
  if (!payload.sub) throw new Error('id_token_no_sub');
  if (!payload.email) throw new Error('id_token_no_email');
  if (payload.email_verified === false) throw new Error('id_token_email_not_verified');

  return payload;
}
