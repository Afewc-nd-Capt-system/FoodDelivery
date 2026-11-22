'use strict';

const User = require('../models/User');

function enforcementEnabled() {
  return String(process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase() === 'true';
}

/**
 * When REQUIRE_EMAIL_VERIFICATION is on, customers must have a verified email
 * before paying or ordering. Browsing, cart and favorites are unaffected.
 * Partner/rider/delivery/admin accounts are verified automatically.
 */
async function requireVerifiedEmail(req, res, next) {
  if (!enforcementEnabled()) return next();

  try {
    const user = await User.findById(req.user.id).select('role emailVerified');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.role === 'customer' && !user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before continuing.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    return next();
  } catch {
    return res.status(500).json({ message: 'Unable to check email verification' });
  }
}

module.exports = requireVerifiedEmail;
module.exports.enforcementEnabled = enforcementEnabled;
