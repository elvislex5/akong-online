import { Router } from 'express';
import { supabaseAdmin, getCredentialsByEmail } from '../services/db.js';
import { issueActionToken, findValidToken, markTokenUsed } from '../services/action-tokens.js';
import { sendVerificationEmail } from '../services/email.js';

/**
 * Email verification flow.
 *
 *   POST /auth/verify-email/request  { email }            → 204 (always)
 *   POST /auth/verify-email/confirm  { token }            → 200 with verified flag
 *
 * /request is intentionally a 204 black hole regardless of whether the email
 * exists (no account enumeration). /confirm returns a clear 4xx if the
 * token is bad/expired so the user knows to request a new link.
 */

export const emailVerifyRouter = Router();

emailVerifyRouter.post('/request', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string') return res.status(204).end();

    const cred = await getCredentialsByEmail(email);
    if (cred && !cred.email_verified_at) {
      const token = await issueActionToken({
        userId: cred.user_id,
        kind: 'email_verify',
        emailLower: cred.email_lower,
      });
      // Fire-and-forget — never block the response on email delivery
      sendVerificationEmail({ to: cred.email_lower, token }).catch((err) => {
        console.error('[auth/verify-email] send error:', err.message);
      });
    }
    return res.status(204).end();
  } catch (err) {
    console.error('[auth/verify-email/request] error:', err);
    return res.status(204).end();  // still silent
  }
});

emailVerifyRouter.post('/confirm', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (typeof token !== 'string' || token.length < 16) {
      return res.status(400).json({ error: 'invalid_token' });
    }

    const row = await findValidToken({ plainToken: token, kind: 'email_verify' });
    if (!row) return res.status(400).json({ error: 'invalid_or_expired_token' });

    // Mark token used + flip email_verified_at
    await markTokenUsed(row.id);
    await supabaseAdmin
      .from('app_credentials')
      .update({ email_verified_at: new Date().toISOString() })
      .eq('user_id', row.user_id);

    return res.status(200).json({ verified: true });
  } catch (err) {
    console.error('[auth/verify-email/confirm] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});
