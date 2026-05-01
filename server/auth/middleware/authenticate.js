import { verifyAccessToken } from '../services/jwt.js';

/**
 * Express middleware that reads `Authorization: Bearer <access-token>`,
 * verifies it, and populates `req.userId` + `req.userEmail`.
 *
 * On failure: returns 401 with a generic body. Use this on any future
 * protected endpoint we add (e.g., `/auth/me`, `/auth/change-password`).
 *
 * The Socket.io connection in server.js currently calls verifyToken()
 * which uses Supabase's client. After the migration, we swap that to use
 * verifyAccessToken() from services/jwt.js so the same JWT works for
 * both REST and Socket.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'missing_token' });
  }

  try {
    const claims = verifyAccessToken(match[1]);
    req.userId = claims.sub;
    req.userEmail = claims.email || null;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
