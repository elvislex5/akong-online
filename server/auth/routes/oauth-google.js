import { Router } from 'express';
import crypto from 'crypto';
import {
  isGoogleConfigured,
  generatePkcePair,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  verifyIdToken,
} from '../services/oauth-google.js';
import {
  createOAuthState,
  consumeOAuthState,
  createExchangeCode,
  consumeExchangeCode,
  findIdentity,
  linkIdentity,
} from '../services/oauth-store.js';
import { findOrCreateOAuthUser, createSession } from '../services/db.js';
import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from '../services/jwt.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../services/tokens.js';

/**
 * Redirect-based Google OAuth flow.
 *
 *   GET  /auth/oauth/google/start      → 302 to Google
 *   GET  /auth/oauth/google/callback   → 302 to APP_URL/auth/oauth/callback?code=...
 *   POST /auth/oauth/google/exchange   → { user, accessToken, refreshToken, ... }
 *
 * The "exchange code" is a one-shot token (60s TTL) the frontend POSTs back
 * once it lands on the callback page. We don't put the JWTs in the URL —
 * that would leak them into browser history, the Referer header, server
 * logs, etc.
 */

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FRONTEND_CALLBACK = `${APP_URL}/auth/oauth/callback`;

export const oauthGoogleRouter = Router();

/* ---------- 1. /start ---------- */

oauthGoogleRouter.get('/start', async (req, res) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(503).json({ error: 'google_oauth_not_configured' });
    }

    const redirectTo = typeof req.query.redirect === 'string' ? req.query.redirect : null;
    const { verifier, challenge } = generatePkcePair();
    const state = await createOAuthState({
      provider: 'google',
      redirectTo,
      codeVerifier: verifier,
    });

    const url = buildAuthorizationUrl({ state, codeChallenge: challenge });
    return res.redirect(302, url);
  } catch (err) {
    console.error('[oauth/google/start] error:', err);
    return res.redirect(302, `${FRONTEND_CALLBACK}?error=oauth_start_failed`);
  }
});

/* ---------- 2. /callback ---------- */

oauthGoogleRouter.get('/callback', async (req, res) => {
  const sendErr = (errCode) =>
    res.redirect(302, `${FRONTEND_CALLBACK}?error=${encodeURIComponent(errCode)}`);

  try {
    if (!isGoogleConfigured()) return sendErr('google_oauth_not_configured');

    const { code, state, error } = req.query;
    if (error) return sendErr(String(error));
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return sendErr('missing_params');
    }

    // Validate state + retrieve PKCE verifier
    const stored = await consumeOAuthState({ state, provider: 'google' });
    if (!stored) return sendErr('invalid_state');

    // Exchange code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForTokens({
        code,
        codeVerifier: stored.code_verifier,
      });
    } catch (err) {
      console.error('[oauth/google/callback] exchange error:', err);
      return sendErr('token_exchange_failed');
    }

    // Verify ID token
    let payload;
    try {
      payload = await verifyIdToken(tokens.id_token);
    } catch (err) {
      console.error('[oauth/google/callback] id_token verify error:', err);
      return sendErr('id_token_invalid');
    }

    const providerUserId = payload.sub;
    const email = payload.email;
    const displayName = payload.name || payload.given_name || null;
    const avatarUrl = payload.picture || null;

    // Find or create user
    let userId;
    const linked = await findIdentity({ provider: 'google', providerUserId });
    if (linked) {
      userId = linked.user_id;
    } else {
      const { userId: u } = await findOrCreateOAuthUser({
        email,
        displayName,
        avatarUrl,
      });
      userId = u;
      await linkIdentity({
        userId,
        provider: 'google',
        providerUserId,
        emailLower: email.toLowerCase(),
      });
    }

    // Create one-shot exchange code, redirect to frontend
    const exchangeCode = await createExchangeCode({
      userId,
      emailLower: email.toLowerCase(),
    });

    const redirectTo = stored.redirect_to || '/game';
    const url = `${FRONTEND_CALLBACK}?code=${encodeURIComponent(exchangeCode)}&next=${encodeURIComponent(redirectTo)}`;
    return res.redirect(302, url);
  } catch (err) {
    console.error('[oauth/google/callback] unexpected:', err);
    return sendErr('server_error');
  }
});

/* ---------- 3. /exchange ---------- */

oauthGoogleRouter.post('/exchange', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (typeof code !== 'string' || code.length < 16) {
      return res.status(400).json({ error: 'invalid_code' });
    }

    const row = await consumeExchangeCode(code);
    if (!row) return res.status(400).json({ error: 'invalid_or_expired_code' });

    // Issue a session — same shape as /login response
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
      email: row.email_lower,
    });

    return res.status(200).json({
      user: { id: row.user_id, email: row.email_lower, emailVerified: true },
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error('[oauth/google/exchange] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});
