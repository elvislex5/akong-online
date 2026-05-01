import { Router } from 'express';
import signupHandler from './routes/signup.js';
import loginHandler from './routes/login.js';
import refreshHandler from './routes/refresh.js';
import logoutHandler from './routes/logout.js';
import { emailVerifyRouter } from './routes/email-verify.js';
import { passwordResetRouter } from './routes/password-reset.js';
import { claimRouter } from './routes/claim.js';
import { oauthGoogleRouter } from './routes/oauth-google.js';
import { rateLimit } from './middleware/rate-limit.js';

/**
 * Single entry point — server.js calls registerAuthRoutes(app) once and
 * forgets about us. All auth surface is mounted under /auth.
 *
 * Rate limits (IP-based, per server process):
 *   - signup:                 20/min
 *   - login:                  30/min
 *   - refresh:                60/min
 *   - verify-email/request:   10/min  (anti email-bomb)
 *   - password-reset/request: 10/min  (anti email-bomb)
 *   - *-confirm endpoints:    20/min  (legitimate retries possible)
 */
export function registerAuthRoutes(app) {
  const router = Router();

  router.post('/signup',  rateLimit({ windowMs: 60_000, max: 20 }), signupHandler);
  router.post('/login',   rateLimit({ windowMs: 60_000, max: 30 }), loginHandler);
  router.post('/refresh', rateLimit({ windowMs: 60_000, max: 60 }), refreshHandler);
  router.post('/logout',  logoutHandler);

  // Email-driven flows. Per-route rate limits on /request to deter abuse
  // (Brevo also rate-limits server-side, but local guard cuts cost early).
  router.use('/verify-email',
    rateLimit({ windowMs: 60_000, max: 30 }),
    emailVerifyRouter);
  router.use('/password-reset',
    rateLimit({ windowMs: 60_000, max: 30 }),
    passwordResetRouter);

  // Account claim (legacy Supabase users setting a password for the first time)
  router.use('/claim',
    rateLimit({ windowMs: 60_000, max: 30 }),
    claimRouter);

  // OAuth providers. /start and /callback are GET redirects (no JSON body),
  // so the JSON parser doesn't run. /exchange is POST JSON.
  router.use('/oauth/google',
    rateLimit({ windowMs: 60_000, max: 60 }),
    oauthGoogleRouter);

  app.use('/auth', router);

  console.log('[auth] Routes mounted at /auth');
}
