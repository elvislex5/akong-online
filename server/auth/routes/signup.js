import crypto from 'crypto';
import { hashPassword, checkPasswordStrength } from '../services/passwords.js';
import { createUser, createSession } from '../services/db.js';
import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from '../services/jwt.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../services/tokens.js';
import { issueActionToken } from '../services/action-tokens.js';
import { sendVerificationEmail } from '../services/email.js';

/**
 * POST /auth/signup
 * Body: { email, password }
 *
 * Returns 201 on success with { accessToken, refreshToken, user }.
 * Email verification is sent in A2 — for now the account is usable
 * immediately. We'll add a banner client-side for unverified emails.
 */
export default async function signupHandler(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !/^.+@.+\..+$/.test(email)) {
      return res.status(400).json({ error: 'invalid_email' });
    }

    const strength = checkPasswordStrength(password);
    if (!strength.ok) {
      return res.status(400).json({ error: 'weak_password', message: strength.reason });
    }

    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await createUser({ email, passwordHash });
    } catch (err) {
      if (err.code === 'email_taken') {
        return res.status(409).json({ error: 'email_taken' });
      }
      console.error('[auth/signup] createUser error:', err.message);
      return res.status(500).json({ error: 'server_error' });
    }

    // Issue tokens
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = refreshExpiryDate();

    await createSession({
      userId: user.userId,
      refreshHash,
      familyId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt,
    });

    const accessToken = signAccessToken({ userId: user.userId, email: user.email });

    // Fire off email verification — fire-and-forget, don't block signup if
    // Brevo is slow or down. Failure is logged inside email.js / action-tokens.js.
    issueActionToken({ userId: user.userId, kind: 'email_verify', emailLower: user.email })
      .then((token) => sendVerificationEmail({ to: user.email, token }))
      .catch((err) => console.error('[auth/signup] verification email failed:', err.message));

    return res.status(201).json({
      user: { id: user.userId, email: user.email, emailVerified: false },
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error('[auth/signup] unexpected error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
