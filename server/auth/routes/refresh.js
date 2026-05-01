import {
  findSessionByHash,
  revokeSession,
  revokeFamily,
  createSession,
  getCredentialsByEmail,
} from '../services/db.js';
import { supabaseAdmin } from '../services/db.js';
import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from '../services/jwt.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../services/tokens.js';

/**
 * POST /auth/refresh
 * Body: { refreshToken }
 *
 * Refresh-token-rotation with family revocation:
 *   - Look up session by hash.
 *   - If not found → 401 (token never issued OR already rotated).
 *   - If found AND already revoked → SUSPECTED REUSE: revoke entire family
 *     and reject. The legitimate user's other devices keep working until
 *     they next refresh (then they get kicked out and have to re-login).
 *   - If found AND active → mint new pair, revoke this token, register new
 *     one in the same family.
 */
export default async function refreshHandler(req, res) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'missing_refresh_token' });
    }

    const refreshHash = hashRefreshToken(refreshToken);
    const session = await findSessionByHash(refreshHash);

    if (!session) {
      return res.status(401).json({ error: 'invalid_refresh_token' });
    }

    // Suspected reuse — token was already revoked
    if (session.revoked_at) {
      console.warn('[auth/refresh] Reuse detected, revoking family:', session.family_id);
      await revokeFamily(session.family_id);
      return res.status(401).json({ error: 'token_reuse_detected' });
    }

    if (new Date(session.expires_at) <= new Date()) {
      await revokeSession(session.id);
      return res.status(401).json({ error: 'expired_refresh_token' });
    }

    // Fetch user email for the new access token (we need it in claims for
    // RLS introspection — and clients may rely on it).
    let email = null;
    if (supabaseAdmin) {
      const { data: cred } = await supabaseAdmin
        .from('app_credentials')
        .select('email_lower')
        .eq('user_id', session.user_id)
        .single();
      email = cred?.email_lower || null;
    }

    // Rotate: revoke this one, mint a new one in the same family
    await revokeSession(session.id);

    const newRefresh = generateRefreshToken();
    const newHash = hashRefreshToken(newRefresh);
    const expiresAt = refreshExpiryDate();

    await createSession({
      userId: session.user_id,
      refreshHash: newHash,
      familyId: session.family_id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt,
    });

    const accessToken = signAccessToken({ userId: session.user_id, email });

    return res.status(200).json({
      accessToken,
      refreshToken: newRefresh,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error('[auth/refresh] unexpected error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
