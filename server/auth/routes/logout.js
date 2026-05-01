import { findSessionByHash, revokeSession } from '../services/db.js';
import { hashRefreshToken } from '../services/tokens.js';

/**
 * POST /auth/logout
 * Body: { refreshToken }
 *
 * Revokes a single refresh token. Always returns 204 (no leak about
 * whether the token was valid). The access token is intentionally NOT
 * revoked — it's short-lived and the client just discards it.
 *
 * For "logout from all devices" we'd revoke everything by user_id; that's
 * a separate endpoint (V2).
 */
export default async function logoutHandler(req, res) {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken && typeof refreshToken === 'string') {
      const session = await findSessionByHash(hashRefreshToken(refreshToken));
      if (session && !session.revoked_at) {
        await revokeSession(session.id);
      }
    }
    return res.status(204).end();
  } catch (err) {
    console.error('[auth/logout] unexpected error:', err);
    return res.status(204).end();
  }
}
