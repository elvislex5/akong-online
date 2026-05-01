/**
 * Tiny in-memory IP-based rate limiter — good enough for a single-process
 * deployment. If we ever scale to multiple instances of server.js, swap
 * for a Redis-backed limiter (e.g. rate-limit-redis).
 *
 * Buckets are wiped every windowMs interval. Each request increments the
 * caller's count; over `max` triggers 429.
 */

export function rateLimit({ windowMs, max, keyFn }) {
  const buckets = new Map();
  let lastCleanup = Date.now();

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    if (now - lastCleanup > windowMs) {
      buckets.clear();
      lastCleanup = now;
    }

    const key = keyFn ? keyFn(req) : req.ip;
    const count = (buckets.get(key) || 0) + 1;
    buckets.set(key, count);

    if (count > max) {
      const retryAfter = Math.ceil((lastCleanup + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'too_many_requests', retryAfter });
    }

    next();
  };
}
