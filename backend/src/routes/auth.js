const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { bruteForceProtection, loginLimiter } = require('../middleware/bruteForce');
const { xssProtection } = require('../middleware/sanitize');
const { sendEmail } = require('../utils/email');
const { addToBlacklist } = require('../utils/tokenBlacklist');
const tokens = require('../security/tokenService');
const mfaService = require('../security/mfaService');
const { frontendUrl } = require('../config/frontend');

const router = express.Router();

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // access token: 15 minutes
  });
};

function publicUser(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    mfaEnabled: Boolean(user.mfaEnabled),
  };
}

async function sessionResponse(res, user) {
  const issued = await tokens.issueTokens(user);
  setTokenCookie(res, issued.accessToken);
  return {
    token: issued.accessToken,
    accessToken: issued.accessToken,
    refreshToken: issued.refreshToken,
    user: publicUser(user),
  };
}

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
], xssProtection, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Unable to create an account with those details' });
    }

    const user = new User({ name, email, password, phone });
    await user.save();

    res.status(201).json(await sessionResponse(res, user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Unable to create an account with those details' });
    }
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
});

router.post('/login', loginLimiter, bruteForceProtection, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], xssProtection, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.mfaEnabled) {
      // No access or refresh token is issued until the second factor is
      // verified. The short-lived token is single-purpose.
      return res.json({
        mfaRequired: true,
        mfaToken: tokens.createMfaToken(user),
      });
    }

    res.json(await sessionResponse(res, user));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Login failed' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      loyaltyPoints: user.loyaltyPoints || 0,
      referralCode: user.referralCode,
      isVibePassMember: user.isVibePassMember || false,
      dietaryPreferences: user.dietaryPreferences || [],
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.put('/profile', authMiddleware, [
  body('name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('address').optional(),
  body('dietaryPreferences').optional().isArray(),
], xssProtection, async (req, res) => {
  try {
    const { name, phone, address, dietaryPreferences } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address) {
      user.address = { ...user.address, ...address };
    }
    if (dietaryPreferences !== undefined) {
      user.dietaryPreferences = dietaryPreferences;
    }

    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      loyaltyPoints: user.loyaltyPoints || 0,
      referralCode: user.referralCode,
      isVibePassMember: user.isVibePassMember || false,
      dietaryPreferences: user.dietaryPreferences || [],
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Update failed' });
  }
});

const refreshHandler = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }
    const rotated = await tokens.rotateRefreshToken(refreshToken);
    setTokenCookie(res, rotated.accessToken);
    res.json({
      token: rotated.accessToken,
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      user: publicUser(rotated.user),
    });
  } catch (error) {
    res.status(error.status || 401).json({
      message: error.message || 'Unable to refresh session',
      code: error.code,
    });
  }
};

router.post('/refresh', refreshHandler);
// Older mobile clients call /auth/refresh-token.
router.post('/refresh-token', refreshHandler);

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      await addToBlacklist(token);
    }

    let familyId = req.user?.familyId;
    const refreshToken = req.body?.refreshToken;
    if (!familyId && refreshToken) {
      const decoded = tokens.verifyRefreshToken(refreshToken);
      familyId = decoded?.familyId;
    }
    if (familyId) await tokens.revokeFamily(familyId);

    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const RESET_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
], async (req, res) => {
  const started = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetUrl = frontendUrl(`/reset-password?token=${resetToken}`);
      // Fire-and-forget keeps the response timing close for existing and
      // non-existing addresses; failures are logged server-side only.
      sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Reset Password</a>
          <p>This link expires in 1 hour and can only be used once.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      }).catch((emailError) => console.error('Email send error:', emailError.message));
    }

    // Uniform response regardless of whether the address exists.
    const remaining = Math.max(0, 250 - (Date.now() - started));
    if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
    res.json({ success: true, message: RESET_MESSAGE });
  } catch (error) {
    const remaining = Math.max(0, 250 - (Date.now() - started));
    if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
    res.json({ success: true, message: RESET_MESSAGE });
  }
});

const resetPasswordHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const token = req.params.token || req.body.token;
    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }
    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Consume the token in the same write as the password change.
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred' });
  }
};

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
];

router.post('/reset-password', resetPasswordValidation, resetPasswordHandler);
router.post('/reset-password/:token', resetPasswordValidation, resetPasswordHandler);

router.post('/mfa/verify', [
  body('mfaToken').notEmpty().withMessage('MFA token is required'),
  body('code').notEmpty().withMessage('Authentication code is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const decoded = tokens.verifyMfaToken(req.body.mfaToken);
    if (!decoded) {
      return res.status(401).json({ message: 'MFA challenge expired. Please sign in again.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(401).json({ message: 'MFA is not enabled for this account' });
    }

    const code = String(req.body.code).replace(/\s+/g, '');
    let verified = mfaService.verifyToken(user.mfaSecret, code);
    if (!verified) {
      verified = mfaService.verifyBackupCode(user.mfaBackupCodes || [], code);
      if (verified) await user.save();
    }
    if (!verified) {
      return res.status(401).json({ message: 'Invalid authentication code' });
    }

    res.json(await sessionResponse(res, user));
  } catch (error) {
    res.status(500).json({ message: 'Unable to verify MFA' });
  }
});

router.get('/mfa/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('mfaEnabled mfaBackupCodes');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      enabled: Boolean(user.mfaEnabled),
      backupCodesRemaining: (user.mfaBackupCodes || []).filter((code) => !code.used).length,
    });
  } catch {
    res.status(500).json({ message: 'Unable to read MFA status' });
  }
});

router.post('/mfa/setup', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.mfaEnabled) {
      return res.status(400).json({ message: 'MFA is already enabled' });
    }

    if (!user.mfaSecret) {
      const { secret } = mfaService.generateSecret(user);
      user.mfaSecret = secret;
      await user.save();
    }

    const otpauth = `otpauth://totp/VibeChops:${encodeURIComponent(user.email)}?secret=${user.mfaSecret}&issuer=VibeChops`;
    const qrCode = await mfaService.generateQRCode(otpauth);
    res.json({ secret: user.mfaSecret, otpauth, qrCode });
  } catch (error) {
    res.status(500).json({ message: 'Unable to start MFA enrollment' });
  }
});

router.post('/mfa/enable', authMiddleware, [
  body('code').notEmpty().withMessage('Authentication code is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const user = await User.findById(req.user.id);
    if (!user?.mfaSecret) {
      return res.status(400).json({ message: 'Start MFA setup first' });
    }
    if (!mfaService.verifyToken(user.mfaSecret, String(req.body.code).replace(/\s+/g, ''))) {
      return res.status(400).json({ message: 'Invalid authentication code' });
    }

    const backupCodes = mfaService.generateBackupCodes();
    user.mfaBackupCodes = backupCodes.map((entry) => ({ hashed: entry.hashed, used: false }));
    user.mfaEnabled = true;
    await user.save();

    // The plaintext backup codes are returned exactly once.
    res.json({ enabled: true, backupCodes: backupCodes.map((entry) => entry.code) });
  } catch {
    res.status(500).json({ message: 'Unable to enable MFA' });
  }
});

router.post('/mfa/disable', authMiddleware, [
  body('password').notEmpty().withMessage('Password is required'),
  body('code').notEmpty().withMessage('Authentication code is required'),
], async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const code = String(req.body.code).replace(/\s+/g, '');
    const validTotp = user.mfaSecret && mfaService.verifyToken(user.mfaSecret, code);
    const validBackup = mfaService.verifyBackupCode(user.mfaBackupCodes || [], code);
    if (!validTotp && !validBackup) {
      return res.status(400).json({ message: 'Invalid authentication code' });
    }

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = [];
    await user.save();
    res.json({ enabled: false });
  } catch {
    res.status(500).json({ message: 'Unable to disable MFA' });
  }
});

router.post('/social-login', async (req, res) => {
  // We have no provider credentials yet, so the endpoint is deliberately
  // disabled. It never trusts an email/social id supplied in the body.
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({
      message: 'Social login is disabled until a server-verified Google client ID is configured',
    });
  }

  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    let OAuth2Client;
    try {
      ({ OAuth2Client } = require('google-auth-library'));
    } catch {
      return res.status(501).json({ message: 'Google token verification is not available' });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const validIssuer = payload?.iss === 'accounts.google.com'
      || payload?.iss === 'https://accounts.google.com';
    if (!payload?.sub || !payload?.email || !payload.email_verified || !validIssuer) {
      return res.status(401).json({ message: 'Google account could not be verified' });
    }

    const email = String(payload.email).toLowerCase();
    let user = await User.findOne({ socialProvider: 'google', socialId: payload.sub });
    if (!user) {
      const existing = await User.findOne({ email });
      if (existing) {
        // Never auto-link a provider identity to an existing password account.
        return res.status(409).json({
          message: 'An account with this email already exists. Sign in with your password.',
        });
      }
      user = new User({
        name: payload.name || email.split('@')[0],
        email,
        password: `Aa9!${crypto.randomBytes(24).toString('base64url')}`,
        socialId: payload.sub,
        socialProvider: 'google',
      });
      await user.save();
    }

    if (user.mfaEnabled) {
      return res.json({ mfaRequired: true, mfaToken: tokens.createMfaToken(user) });
    }
    res.json(await sessionResponse(res, user));
  } catch (error) {
    console.error('[AUTH] Social login verification failed:', error.message);
    res.status(401).json({ message: 'Social login failed' });
  }
});

router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favoriteRestaurants');
    res.json(user.favoriteRestaurants || []);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get favorites' });
  }
});

router.post('/favorites/:restaurantId', authMiddleware, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const user = await User.findById(req.user.id);
    
    if (!user.favoriteRestaurants.includes(restaurantId)) {
      user.favoriteRestaurants.push(restaurantId);
      await user.save();
    }
    
    res.json({ message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add favorite' });
  }
});

router.delete('/favorites/:restaurantId', authMiddleware, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const user = await User.findById(req.user.id);
    
    user.favoriteRestaurants = user.favoriteRestaurants.filter(
      id => id.toString() !== restaurantId
    );
    await user.save();
    
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
});

module.exports = router;
