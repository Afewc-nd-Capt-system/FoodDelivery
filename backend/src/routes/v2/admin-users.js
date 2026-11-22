'use strict';

const express = require('express');
const User = require('../../models/User');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');
const { issueVerification, markEmailVerified } = require('../../services/emailVerification');
const AdminAuditLog = require('../../models/AdminAuditLog');

const router = express.Router();
router.use(authMiddleware, adminGuard);

async function audit(req, action, user, details = {}) {
  try {
    await AdminAuditLog.create({
      admin: req.user.id,
      action,
      targetType: 'user',
      targetId: String(user._id),
      details,
    });
  } catch (error) {
    console.error('[admin] audit log failed:', error.message);
  }
}

// POST /api/v2/admin/users/:id/resend-verification
router.post('/:id/resend-verification', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'customer') {
      return res.status(400).json({
        success: false,
        message: 'Partner, rider, delivery and admin accounts are verified automatically.',
      });
    }
    if (user.emailVerified) {
      return res.json({ success: true, sent: false, message: 'Email is already verified.' });
    }
    const result = await issueVerification(user, { enforceLimits: false });
    await audit(req, 'resend_verification', user, { sent: result.sent });
    res.json({
      success: true,
      sent: result.sent,
      message: result.sent ? 'Verification email sent.' : 'Could not send the verification email.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v2/admin/users/:id/verify-email (support action, audit-logged)
router.post('/:id/verify-email', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.emailVerified) await markEmailVerified(user);
    await audit(req, 'mark_email_verified', user, {});
    res.json({
      success: true,
      user: { id: user._id, email: user.email, emailVerified: true },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
