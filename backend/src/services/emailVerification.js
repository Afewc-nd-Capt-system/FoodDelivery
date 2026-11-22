'use strict';

const crypto = require('crypto');
const { frontendUrl } = require('../config/frontend');
const { sendVerificationEmail } = require('../utils/email');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const HOURLY_LIMIT = 3;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function cooldownRemainingMs(user) {
  if (!user?.emailVerificationLastSentAt) return 0;
  const elapsed = Date.now() - new Date(user.emailVerificationLastSentAt).getTime();
  return Math.max(0, RESEND_COOLDOWN_MS - elapsed);
}

/**
 * Generate a single-use token (only its SHA-256 hash is stored), save it on the
 * user, and send the verification link. `enforceLimits` applies the resend
 * cooldown/hourly cap; registration and support actions bypass the limits.
 */
async function issueVerification(user, { enforceLimits = true } = {}) {
  const now = Date.now();

  if (enforceLimits) {
    if (cooldownRemainingMs(user) > 0) {
      return { sent: false, reason: 'cooldown' };
    }
    const windowStart = user.emailVerificationHourlyWindowStart
      ? new Date(user.emailVerificationHourlyWindowStart).getTime()
      : 0;
    if (!windowStart || now - windowStart >= HOURLY_WINDOW_MS) {
      user.emailVerificationHourlyWindowStart = new Date(now);
      user.emailVerificationHourlyCount = 0;
    }
    if ((user.emailVerificationHourlyCount || 0) >= HOURLY_LIMIT) {
      return { sent: false, reason: 'hourly_cap' };
    }
  } else if (!user.emailVerificationHourlyWindowStart) {
    user.emailVerificationHourlyWindowStart = new Date(now);
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = hashToken(token);
  user.emailVerificationExpires = new Date(now + TOKEN_TTL_MS);
  user.emailVerificationLastSentAt = new Date(now);
  user.emailVerificationHourlyCount = (user.emailVerificationHourlyCount || 0) + 1;
  user.emailVerified = false;
  await user.save();

  const verifyUrl = frontendUrl(`/verify-email/${token}`);
  // Fire-and-forget: a mail-provider failure must never break registration,
  // profile updates or the resend endpoint.
  void sendVerificationEmail(user.email, verifyUrl, user.name);
  return { sent: true };
}

async function markEmailVerified(user) {
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  return user;
}

module.exports = {
  issueVerification,
  markEmailVerified,
  hashToken,
  cooldownRemainingMs,
  TOKEN_TTL_MS,
  RESEND_COOLDOWN_MS,
  HOURLY_LIMIT,
};
