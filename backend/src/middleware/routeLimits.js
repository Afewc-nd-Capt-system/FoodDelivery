const rateLimit = require('express-rate-limit');

const production = process.env.NODE_ENV === 'production';
if (production && process.env.DISABLE_RATE_LIMIT === 'true') {
  console.warn('[SECURITY] DISABLE_RATE_LIMIT is ignored in production');
}
const disabled = !production && process.env.DISABLE_RATE_LIMIT === 'true';

const authLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: { success: false, message: 'Too many attempts, try again later' },
      standardHeaders: true,
      legacyHeaders: false
    });

const loginLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 3,
      message: { success: false, message: 'Too many login attempts' }
    });

const searchLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      message: { success: false, message: 'Too many search requests' }
    });

const orderLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      message: { success: false, message: 'Too many orders' }
    });

const apiLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      message: { success: false, message: 'Too many requests' }
    });

module.exports = { authLimiter, loginLimiter, searchLimiter, orderLimiter, apiLimiter };