const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { bruteForceProtection, loginLimiter } = require('../middleware/bruteForce');
const { xssProtection } = require('../middleware/sanitize');
const { sendEmail } = require('../utils/email');

const router = express.Router();

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in environment variables');
  }
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

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
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = new User({ name, email, password, phone });
    await user.save();

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
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
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
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

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const { addToBlacklist } = require('../utils/tokenBlacklist');
      addToBlacklist(token);
    }
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'If the email exists, a reset link will be sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.API_URL || 'http://localhost:5000'}/api/auth/reset-password/${resetToken}`;
    
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
    } catch (emailError) {
      console.error('Email send error:', emailError.message);
    }

    res.json({ message: 'If the email exists, a reset link will be sent' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred' });
  }
});

router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred' });
  }
});

router.post('/social-login', [
  body('email').isEmail().normalizeEmail(),
  body('provider').isIn(['google', 'facebook']),
  body('socialId').notEmpty(),
  body('name').notEmpty(),
], async (req, res) => {
  try {
    const { email, provider, socialId, name, avatar } = req.body;

    let user = await User.findOne({ 
      $or: [
        { email },
        { socialId, socialProvider: provider }
      ]
    });

    if (user) {
      if (!user.socialId) {
        user.socialId = socialId;
        user.socialProvider = provider;
        await user.save();
      }
    } else {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      user = new User({
        name,
        email,
        password: randomPassword,
        socialId,
        socialProvider: provider,
      });
      await user.save();
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Social login failed' });
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
