const crypto = require('crypto');

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const WINDOW_DURATION = 15 * 60 * 1000;
const CAPTCHA_THRESHOLD = 3;

class BruteForceProtection {
  constructor() {
    this.attempts = new Map();
    this.lockouts = new Map();
    this.captchaRequired = new Map();
  }

  getKey(ip, identifier) {
    return crypto.createHash('sha256').update(`${ip}:${identifier}`).digest('hex');
  }

  recordAttempt(ip, identifier) {
    const key = this.getKey(ip, identifier);
    const now = Date.now();

    if (!this.attempts.has(key)) {
      this.attempts.set(key, { count: 0, windowStart: now });
    }

    const attempt = this.attempts.get(key);
    if (now - attempt.windowStart > WINDOW_DURATION) {
      attempt.count = 1;
      attempt.windowStart = now;
    } else {
      attempt.count += 1;
    }

    this.attempts.set(key, attempt);

    if (attempt.count >= CAPTCHA_THRESHOLD) {
      this.captchaRequired.set(key, true);
    }

    if (attempt.count >= MAX_ATTEMPTS) {
      this.lockouts.set(identifier, { until: now + LOCKOUT_DURATION, ip });
    }

    return {
      attempts: attempt.count,
      locked: this.isLocked(identifier),
      captchaRequired: this.isCaptchaRequired(ip, identifier)
    };
  }

  isLocked(identifier) {
    const lockout = this.lockouts.get(identifier);
    if (!lockout) return false;
    if (Date.now() > lockout.until) {
      this.lockouts.delete(identifier);
      return false;
    }
    return true;
  }

  isCaptchaRequired(ip, identifier) {
    const key = this.getKey(ip, identifier);
    return this.captchaRequired.get(key) || false;
  }

  resetAttempts(ip, identifier) {
    const key = this.getKey(ip, identifier);
    this.attempts.delete(key);
    this.captchaRequired.delete(key);
  }

  unlock(identifier) {
    this.lockouts.delete(identifier);
  }

  getLockoutInfo(identifier) {
    const lockout = this.lockouts.get(identifier);
    if (!lockout) return null;
    if (Date.now() > lockout.until) {
      this.lockouts.delete(identifier);
      return null;
    }
    return {
      remainingSeconds: Math.ceil((lockout.until - Date.now()) / 1000),
      until: lockout.until
    };
  }
}

module.exports = new BruteForceProtection();