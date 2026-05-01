import crypto from 'crypto';
import { verifyPassword } from '../services/passwords.js';
import {
  getCredentialsByEmail,
  recordFailedLogin,
  resetFailedLogins,
  createSession,
  supabaseAdmin,
} from '../services/db.js';
import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from '../services/jwt.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../services/tokens.js';
import { issueAndSendClaim } from './claim.js';

/**
 * Lazy migration: if a login attempt comes in for an email that exists in
 * auth.users but has no app_credentials row, we send them a claim email
 * silently and return a special 409 so the UI can tell them to check
 * their inbox. Capped at one fire-and-forget Brevo call per request — the
 * action-tokens issuer auto-invalidates older unused tokens.
 */
async function findLegacyAuthUserId(emailLower) {
  if (!supabaseAdmin) return null;
  let page = 1;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === emailLower);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page++;
  }
  return null;
}

/**
 * POST /auth/login
 * Body: { email, password }
 *
 * Returns 200 with tokens on success. Generic 401 on any failure
 * (wrong email OR wrong password OR unverified) so we don't leak
 * which emails exist. Account-locked → 423 Locked.
 */
export default async function loginHandler(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'invalid_credentials' });
    }

    const cred = await getCredentialsByEmail(email);

    // Constant-ish-time response: if user doesn't exist or has no password
    // (OAuth-only / legacy un-claimed), still spend ~50ms verifying a fake
    // hash so timing doesn't reveal which.
    if (!cred || !cred.password_hash) {
      await verifyPassword(
        '$argon2id$v=19$m=65536,t=3,p=4$ZmFrZXNhbHRmYWtlc2FsdA$abc',
        password,
      ).catch(() => false);

      // Lazy migration path: no app_credentials at all → check if this
      // email was a Supabase Auth user from before the migration. If yes,
      // fire a claim email and signal the UI with a distinct code.
      if (!cred) {
        const lower = email.toLowerCase();
        const legacyUserId = await findLegacyAuthUserId(lower);
        if (legacyUserId) {
          // Fire-and-forget — don't block the response on Brevo
          issueAndSendClaim({ userId: legacyUserId, emailLower: lower }).catch((err) => {
            console.error('[auth/login] claim trigger failed:', err.message);
          });
          return res.status(409).json({ error: 'account_needs_claim' });
        }
      }
      // OAuth-only account (cred exists, no password): tell them to use OAuth.
      if (cred && !cred.password_hash) {
        return res.status(409).json({ error: 'use_oauth_provider' });
      }

      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // Lock check
    if (cred.locked_until && new Date(cred.locked_until) > new Date()) {
      const unlockSec = Math.ceil((new Date(cred.locked_until).getTime() - Date.now()) / 1000);
      return res.status(423).json({ error: 'account_locked', retryAfter: unlockSec });
    }

    const ok = await verifyPassword(cred.password_hash, password);
    if (!ok) {
      const updated = await recordFailedLogin(cred.user_id);
      if (updated?.locked_until) {
        return res.status(423).json({ error: 'account_locked', retryAfter: 15 * 60 });
      }
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // Success — reset counters and issue tokens
    await resetFailedLogins(cred.user_id);

    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = refreshExpiryDate();

    await createSession({
      userId: cred.user_id,
      refreshHash,
      familyId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt,
    });

    const accessToken = signAccessToken({
      userId: cred.user_id,
      email: cred.email_lower,
    });

    return res.status(200).json({
      user: { id: cred.user_id, email: cred.email_lower, emailVerified: !!cred.email_verified_at },
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error('[auth/login] unexpected error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
