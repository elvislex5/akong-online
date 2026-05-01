import crypto from 'crypto';

/**
 * Refresh token management with rotation + family revocation.
 *
 * - Tokens are 256-bit cryptographically random strings, base64url-encoded.
 * - We store ONLY the SHA-256 hash in auth_sessions.refresh_token_hash.
 *   Plaintext is returned to the client once and never persisted server-side.
 * - On refresh: the row is marked revoked AND a new token is issued in the
 *   SAME family_id. If a refresh token that has already been used is
 *   presented again (= someone has the cookie), we revoke the entire family.
 */

const REFRESH_TTL_SECONDS = parseInt(process.env.JWT_REFRESH_TTL || '2592000', 10); // 30 days

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');  // 64 chars
}

export function hashRefreshToken(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

export function refreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
}

export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TTL_SECONDS;
