import { Router } from 'express';
import { supabaseAdmin, getCredentialsByEmail } from '../services/db.js';
import { issueActionToken, findValidToken, markTokenUsed } from '../services/action-tokens.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { hashPassword, checkPasswordStrength } from '../services/passwords.js';

/**
 * Password reset flow.
 *
 *   POST /auth/password-reset/request  { email }                  → 204 (always)
 *   POST /auth/password-reset/confirm  { token, newPassword }     → 200 on success
 *
 * /request is silent regardless of email existence. /confirm uses a 1-hour
 * one-shot token; on success we also revoke ALL existing refresh sessions
 * for the user (forces re-login everywhere — the assumption is that a
 * password change implies "I think someone may have known my password").
 */

export const passwordResetRouter = Router();

passwordResetRouter.post('/request', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string') return res.status(204).end();

    const cred = await getCredentialsByEmail(email);
    if (cred) {
      const token = await issueActionToken({
        userId: cred.user_id,
        kind: 'password_reset',
        emailLower: cred.email_lower,
      });
      sendPasswordResetEmail({ to: cred.email_lower, token }).catch((err) => {
        console.error('[auth/password-reset] send error:', err.message);
      });
    }
    return res.status(204).end();
  } catch (err) {
    console.error('[auth/password-reset/request] error:', err);
    return res.status(204).end();
  }
});

passwordResetRouter.post('/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (typeof token !== 'string' || token.length < 16) {
      return res.status(400).json({ error: 'invalid_token' });
    }
    const strength = checkPasswordStrength(newPassword);
    if (!strength.ok) {
      return res.status(400).json({ error: 'weak_password', message: strength.reason });
    }

    const row = await findValidToken({ plainToken: token, kind: 'password_reset' });
    if (!row) return res.status(400).json({ error: 'invalid_or_expired_token' });

    const passwordHash = await hashPassword(newPassword);

    await markTokenUsed(row.id);
    await supabaseAdmin
      .from('app_credentials')
      .update({
        password_hash: passwordHash,
        password_changed_at: new Date().toISOString(),
        failed_login_count: 0,
        locked_until: null,
      })
      .eq('user_id', row.user_id);

    // Revoke all active sessions — force re-login everywhere after a reset
    await supabaseAdmin
      .from('auth_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', row.user_id)
      .is('revoked_at', null);

    return res.status(200).json({ reset: true });
  } catch (err) {
    console.error('[auth/password-reset/confirm] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});
