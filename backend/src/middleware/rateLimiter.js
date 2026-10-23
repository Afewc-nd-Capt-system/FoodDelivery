const rateLimit = require('express-rate-limit');

const production = process.env.NODE_ENV === 'production';
if (production && process.env.DISABLE_RATE_LIMIT === 'true') {
  console.warn('[SECURITY] DISABLE_RATE_LIMIT is ignored in production');
}
// Limiter bypass is a local-development convenience only.
const disabled = !production && process.env.DISABLE_RATE_LIMIT === 'true';

const authLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { success: false, message: 'Too many attempts, please try again later' },
      standardHeaders: true,
      legacyHeaders: false,
    });

const apiLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { success: false, message: 'Too many requests' },
      standardHeaders: true,
      legacyHeaders: false,
    });

const strictLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      message: { success: false, message: 'Rate limit exceeded' },
      standardHeaders: true,
      legacyHeaders: false,
    });

module.exports = { authLimiter, apiLimiter, strictLimiter };