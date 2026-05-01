import { Router } from 'express';
import crypto from 'crypto';
import { supabaseAdmin, getCredentialsByEmail, createSession } from '../services/db.js';
import { issueActionToken, findValidToken, markTokenUsed, hasRecentActiveToken } from '../services/action-tokens.js';
import { sendAccountClaimEmail } from '../services/email.js';
import { hashPassword, checkPasswordStrength } from '../services/passwords.js';
import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from '../services/jwt.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../services/tokens.js';

/**
 * Account claim flow — for users who existed in Supabase Auth before we
 * switched to our own auth. Their auth.users row exists (so all their
 * games / friends / rating history are intact) but they have no
 * app_credentials row, meaning no password they can use against our
 * /auth/login. The claim flow lets them set one.
 *
 *   POST /auth/claim/request  { email }                  → 204 (always)
 *   POST /auth/claim/confirm  { token, newPassword }     → 200 + tokens (auto-login)
 *
 * /request is silent (same anti-enumeration policy as password-reset).
 * /confirm verifies the token, creates app_credentials, marks email as
 * verified (since they proved control of the inbox), and issues a session
 * so they're logged in immediately — no separate /login round-trip.
 */

export const claimRouter = Router();

/**
 * Look up a user_id in auth.users by email (case-insensitive). Returns
 * { id, email_confirmed_at } or null. Used to detect "Supabase legacy"
 * accounts that have no app_credentials row yet.
 */
async function findLegacyAuthUserByEmail(email) {
  if (!supabaseAdmin) return null;
  const lower = email.toLowerCase();
  // The admin API doesn't expose a "find by email" endpoint, so we list
  // and filter. We page through 1000 at a time — fine for our scale (a few
  // hundred users). If we ever blow past 10k, switch to a SQL function.
  let page = 1;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === lower);
    if (hit) return { id: hit.id, email_confirmed_at: hit.email_confirmed_at };
    if (data.users.length < 200) return null;
    page++;
  }
  return null;
}

/**
 * Issue a claim token for a legacy user and email it to them. Used by
 * /request and also by login.js (lazy migration on first login attempt).
 *
 * Throttled: if a claim token was issued in the last 10 minutes and is
 * still unused + unexpired, we DON'T re-issue. Re-issuing would invalidate
 * the previous one — so a user who triggers two login attempts in a row
 * could end up with the email link in their inbox already invalidated by
 * the time they click it. Throttling fixes that.
 */
const CLAIM_THROTTLE_MS = 10 * 60 * 1000;

export async function issueAndSendClaim({ userId, emailLower }) {
  const recent = await hasRecentActiveToken({
    userId,
    kind: 'account_claim',
    windowMs: CLAIM_THROTTLE_MS,
  });
  if (recent) {
    console.log('[auth/claim] active token still valid, skipping resend');
    return;
  }

  const token = await issueActionToken({
    userId,
    kind: 'account_claim',
    emailLower,
  });
  // Fire-and-forget — caller doesn't wait. Logged on failure.
  sendAccountClaimEmail({ to: emailLower, token }).catch((err) => {
    console.error('[auth/claim] send error:', err.message);
  });
}

claimRouter.post('/request', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string') return res.status(204).end();

    // Two valid paths to a claim token:
    //   1. User has app_credentials but NO password (rare — OAuth-only) → forbid
    //      (they should use OAuth or the password-reset flow, not claim).
    //   2. User has NO app_credentials but exists in auth.users → legacy migration.
    const cred = await getCredentialsByEmail(email);
    if (cred) {
      // Already migrated — claim doesn't apply. Silent 204 (no leak).
      return res.status(204).end();
    }

    const legacy = await findLegacyAuthUserByEmail(email);
    if (legacy) {
      await issueAndSendClaim({
        userId: legacy.id,
        emailLower: email.toLowerCase(),
      });
    }
    return res.status(204).end();
  } catch (err) {
    console.error('[auth/claim/request] error:', err);
    return res.status(204).end();
  }
});

claimRouter.post('/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (typeof token !== 'string' || token.length < 16) {
      return res.status(400).json({ error: 'invalid_token' });
    }
    const strength = checkPasswordStrength(newPassword);
    if (!strength.ok) {
      return res.status(400).json({ error: 'weak_password', message: strength.reason });
    }

    const row = await findValidToken({ plainToken: token, kind: 'account_claim' });
    if (!row) return res.status(400).json({ error: 'invalid_or_expired_token' });

    // Defensive: if app_credentials already exists for this user (race or
    // double-submit), treat as already-claimed.
    const { data: existing } = await supabaseAdmin
      .from('app_credentials')
      .select('user_id')
      .eq('user_id', row.user_id)
      .maybeSingle();

    if (existing) {
      await markTokenUsed(row.id);
      return res.status(409).json({ error: 'already_claimed' });
    }

    const passwordHash = await hashPassword(newPassword);
    const emailLower = row.email_lower;
    const now = new Date().toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from('app_credentials')
      .insert({
        user_id: row.user_id,
        email_lower: emailLower,
        password_hash: passwordHash,
        email_verified_at: now,             // proved inbox control via the link
        password_changed_at: now,
      });

    if (insertErr) {
      console.error('[auth/claim/confirm] insert error:', insertErr);
      return res.status(500).json({ error: 'server_error' });
    }

    await markTokenUsed(row.id);

    // Issue a session — the user is logged in immediately.
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = refreshExpiryDate();

    await createSession({
      userId: row.user_id,
      refreshHash,
      familyId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt,
    });

    const accessToken = signAccessToken({
      userId: row.user_id,
      email: emailLower,
    });

    return res.status(200).json({
      user: { id: row.user_id, email: emailLower, emailVerified: true },
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error('[auth/claim/confirm] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});
