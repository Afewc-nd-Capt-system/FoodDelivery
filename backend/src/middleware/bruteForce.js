const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { getClient } = require('./redis');

const disabled = process.env.DISABLE_RATE_LIMIT === 'true';

const bruteForceProtection = async (req, res, next) => {
  if (disabled) return next();

  const email = req.body.email?.toLowerCase();
  const ip = req.ip || req.connection.remoteAddress;
  const key = `bruteforce:${ip}:${email}`;

  if (!email) {
    return next();
  }

  try {
    const redisClient = getClient();
    const attempts = redisClient ? await redisClient.get(key) : null;

    if (attempts && parseInt(attempts) >= 5) {
      const ttl = redisClient ? await redisClient.ttl(key) : 0;
      const timeLeft = Math.ceil(ttl / 60);
      return res.status(429).json({
        message: `Too many failed login attempts. Please try again in ${timeLeft} minutes.`,
        code: 'BRUTE_FORCE_LOCKOUT'
      });
    }

    res.on('finish', async () => {
      if (res.statusCode === 401 || res.statusCode === 400) {
        if (redisClient) {
          const current = parseInt(await redisClient.get(key) || '0');
          await redisClient.incr(key);
          if (current === 0) {
            await redisClient.expire(key, 15 * 60); // 15 minutes
          }
        }
      } else if (res.statusCode === 200) {
        if (redisClient) {
          await redisClient.del(key);
        }
      }
    });

    next();
  } catch (err) {
    console.error('[SECURITY] Brute force protection error:', err);
    next();
  }
};

const loginLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
    });

module.exports = { bruteForceProtection, loginLimiter };
