const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const loginAttempts = new Map();

const cleanUpOldAttempts = () => {
  const now = Date.now();
  for (const [key, attempts] of loginAttempts.entries()) {
    if (now - attempts.firstAttempt > 15 * 60 * 1000) {
      loginAttempts.delete(key);
    }
  }
};

setInterval(cleanUpOldAttempts, 5 * 60 * 1000);

const bruteForceProtection = async (req, res, next) => {
  const email = req.body.email?.toLowerCase();
  const ip = req.ip || req.connection.remoteAddress;
  const key = `${ip}:${email}`;

  if (!email) {
    return next();
  }

  const attempts = loginAttempts.get(key);

  if (attempts && attempts.count >= 5) {
    const timeLeft = Math.ceil((15 * 60 * 1000 - (Date.now() - attempts.firstAttempt)) / 1000 / 60);
    return res.status(429).json({
      message: `Too many failed login attempts. Please try again in ${timeLeft} minutes.`,
      code: 'BRUTE_FORCE_LOCKOUT'
    });
  }

  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 400) {
      const current = loginAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
      current.count += 1;
      loginAttempts.set(key, current);
    } else if (res.statusCode === 200) {
      loginAttempts.delete(key);
    }
  });

  next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

module.exports = { bruteForceProtection, loginLimiter };
