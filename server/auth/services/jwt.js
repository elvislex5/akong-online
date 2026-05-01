import jwt from 'jsonwebtoken';

/**
 * JWT signing/verification.
 *
 * We sign with the same HS256 secret as Supabase (SUPABASE_JWT_SECRET, exposed
 * via the JWT_SECRET env var in our deployment) so RLS policies that call
 * auth.uid() see our tokens as legitimate. Claims mirror what Supabase emits:
 *   sub  = user UUID
 *   role = 'authenticated'
 *   aud  = 'authenticated'
 *
 * Only the access token is a JWT. Refresh tokens are opaque random strings
 * stored hashed in auth_sessions (see services/tokens.js).
 */

const SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
const ACCESS_TTL = parseInt(process.env.JWT_ACCESS_TTL || '900', 10);     // 15 min
const ISSUER = 'songo-online';

if (!SECRET) {
  console.error('[auth/jwt] FATAL: JWT_SECRET (or SUPABASE_JWT_SECRET) is not set');
}

export function signAccessToken({ userId, email }) {
  if (!SECRET) throw new Error('JWT secret not configured');

  return jwt.sign(
    {
      sub: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: email || undefined,
    },
    SECRET,
    {
      algorithm: 'HS256',
      expiresIn: ACCESS_TTL,
      issuer: ISSUER,
    },
  );
}

export function verifyAccessToken(token) {
  if (!SECRET) throw new Error('JWT secret not configured');

  return jwt.verify(token, SECRET, {
    algorithms: ['HS256'],
    audience: 'authenticated',
  });
}

export const ACCESS_TOKEN_TTL_SECONDS = ACCESS_TTL;
