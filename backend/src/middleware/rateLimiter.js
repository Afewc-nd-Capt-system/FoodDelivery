const rateLimit = require('express-rate-limit');
const { RedisRateLimitStore } = require('./rateLimitStore');

const production = process.env.NODE_ENV === 'production';
if (production && process.env.DISABLE_RATE_LIMIT === 'true') {
  console.warn('[SECURITY] DISABLE_RATE_LIMIT is ignored in production');
}
// Limiter bypass is a local-development convenience only.
const disabled = !production && process.env.DISABLE_RATE_LIMIT === 'true';

// Every limiter response states exactly when the caller may retry, so the UI
// can show "try again in N minutes" instead of a generic failure.
function limitHandler(message) {
  return (req, res) => {
    const retryAfter = Number(res.getHeader('Retry-After')) || 0;
    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
    res.status(429).json({
      success: false,
      message: `${message} Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      retryAfterSeconds: retryAfter,
    });
  };
}

const authLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      // Successful logins should not consume the shared budget; brute-force
      // lockout (middleware/bruteForce.js) is the per-account guard.
      skipSuccessfulRequests: true,
      handler: limitHandler('Too many attempts.'),
      store: new RedisRateLimitStore('rl:auth:'),
      standardHeaders: true,
      legacyHeaders: false,
    });

const apiLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      handler: limitHandler('Too many requests.'),
      store: new RedisRateLimitStore('rl:api:'),
      standardHeaders: true,
      legacyHeaders: false,
    });

const strictLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      handler: limitHandler('Rate limit exceeded.'),
      store: new RedisRateLimitStore('rl:strict:'),
      standardHeaders: true,
      legacyHeaders: false,
    });

module.exports = { authLimiter, apiLimiter, strictLimiter };