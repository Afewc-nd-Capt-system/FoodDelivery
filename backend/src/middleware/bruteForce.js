const rateLimit = require('express-rate-limit');
const { getClient } = require('./redis');

const production = process.env.NODE_ENV === 'production';
if (production && process.env.DISABLE_RATE_LIMIT === 'true') {
  console.warn('[SECURITY] DISABLE_RATE_LIMIT is ignored in production');
}
const disabled = !production && process.env.DISABLE_RATE_LIMIT === 'true';

// Per-instance fallback. It is deliberately not a fail-open path: if Redis is
// down, brute-force accounting continues in this process.
const memoryAttempts = new Map();
const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

function memoryGet(key) {
  const entry = memoryAttempts.get(key);
  if (!entry) return 0;
  if (entry.expiresAt <= Date.now()) {
    memoryAttempts.delete(key);
    return 0;
  }
  return entry.count;
}

function memoryBump(key) {
  const current = memoryGet(key);
  memoryAttempts.set(key, {
    count: current + 1,
    expiresAt: Date.now() + WINDOW_SECONDS * 1000,
  });
}

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
    const redisReady = redisClient && redisClient.status === 'ready';
    const attempts = redisReady ? await redisClient.get(key) : null;
    const count = attempts !== null && attempts !== undefined
      ? parseInt(attempts, 10) || 0
      : memoryGet(key);

    if (count >= MAX_ATTEMPTS) {
      const ttl = redisReady ? await redisClient.ttl(key) : WINDOW_SECONDS;
      const timeLeft = Math.max(1, Math.ceil(ttl / 60));
      return res.status(429).json({
        message: `Too many failed login attempts. Please try again in ${timeLeft} minutes.`,
        code: 'BRUTE_FORCE_LOCKOUT'
      });
    }

    res.on('finish', async () => {
      try {
        if (res.statusCode === 401 || res.statusCode === 400) {
          if (redisReady) {
            const current = parseInt(await redisClient.get(key) || '0', 10);
            await redisClient.incr(key);
            if (current === 0) await redisClient.expire(key, WINDOW_SECONDS);
          } else {
            memoryBump(key);
          }
        } else if (res.statusCode === 200) {
          if (redisReady) await redisClient.del(key);
          memoryAttempts.delete(key);
        }
      } catch (error) {
        console.error('[SECURITY] Brute force accounting failed:', error.message);
      }
    });

    next();
  } catch (err) {
    console.error('[SECURITY] Brute force protection error:', err);
    memoryBump(key);
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
