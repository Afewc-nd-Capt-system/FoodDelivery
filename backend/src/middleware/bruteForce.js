const rateLimit = require('express-rate-limit');
const { getClient } = require('./redis');
const { RedisRateLimitStore } = require('./rateLimitStore');

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
  // Email-global counter: independent of the source IP so an attacker who
  // rotates X-Forwarded-For (or uses many hosts) still locks the email out.
  const emailKey = email ? `bruteforce:email:${email}` : null;
  const EMAIL_GLOBAL_MAX = 10;

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

    if (emailKey) {
      const globalAttempts = redisReady ? await redisClient.get(emailKey) : null;
      const globalCount = globalAttempts !== null && globalAttempts !== undefined
        ? parseInt(globalAttempts, 10) || 0
        : memoryGet(emailKey);
      if (globalCount >= EMAIL_GLOBAL_MAX) {
        const ttl = redisReady ? await redisClient.ttl(emailKey) : WINDOW_SECONDS;
        const timeLeft = Math.max(1, Math.ceil(ttl / 60));
        return res.status(429).json({
          message: `Too many failed login attempts. Please try again in ${timeLeft} minutes.`,
          code: 'BRUTE_FORCE_LOCKOUT'
        });
      }
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
          // Count the failure against the email across every IP/window bucket
          // so rotating IPs cannot reset progress.
          if (emailKey) {
            if (redisReady) {
              const gCurrent = parseInt(await redisClient.get(emailKey) || '0', 10);
              await redisClient.incr(emailKey);
              if (gCurrent === 0) await redisClient.expire(emailKey, WINDOW_SECONDS);
            } else {
              memoryBump(emailKey);
            }
          }
        } else if (res.statusCode === 200) {
          if (redisReady) {
            await redisClient.del(key);
            if (emailKey) await redisClient.del(emailKey);
          }
          memoryAttempts.delete(key);
          if (emailKey) memoryAttempts.delete(emailKey);
        }
      } catch (error) {
        console.error('[SECURITY] Brute force accounting failed:', error.message);
      }
    });

    next();
  } catch (err) {
    console.error('[SECURITY] Brute force protection error:', err);
    memoryBump(key);
    if (emailKey) memoryBump(emailKey);
    next();
  }
};

const loginLimiter = disabled
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      // IP-wide backstop above the per-account brute-force lockout. It is not
      // the first line (login emails lock at 5 failed attempts); the headroom
      // exists so tests and shared-NAT users are not locked out by one another.
      max: 20,
      message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      store: new RedisRateLimitStore('rl:login:'),
    });

module.exports = { bruteForceProtection, loginLimiter };
