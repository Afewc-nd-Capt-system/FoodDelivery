const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const CustomerTrustService = require('../services/CustomerTrustService');
const { adminGuard } = require('../middleware/routeGuards');

const router = express.Router();

// Get trust profile (user can view own profile, admin can view any)
router.get('/:id/trust-profile', authMiddleware, async (req, res) => {
  try {
    // Users can view their own profile, admins can view any
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const profile = await CustomerTrustService.getTrustProfile(req.params.id);
    
    // Calculate prepaid orders needed to re-enable POD
    const prepaidOrdersNeeded = Math.max(0, 5 - (profile.prepaidOrdersCompleted || 0));
    profile.prepaidOrdersNeeded = prepaidOrdersNeeded;

    res.json(profile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update trust metrics (admin or service use)
router.post('/:id/trust-metrics', authMiddleware, adminGuard, async (req, res) => {
  try {
    const { eventType, orderData } = req.body;
    const metrics = await CustomerTrustService.updateTrustMetrics(
      req.params.id,
      eventType,
      orderData
    );
    res.json({ trustMetrics: metrics });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Manually re-enable POD (admin only)
router.post('/:id/re-enable-pod', authMiddleware, adminGuard, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.payOnDeliveryEnabled = true;
    user.penaltyApplied = false;
    user.ordersSincePenalty = 0;
    user.consecutiveCancellations = 0;

    user.penaltyHistory.push({
      type: 'pod_disabled',
      reason: 'Manually re-enabled by admin: ' + reason,
      appliedAt: new Date(),
      liftedAt: new Date(),
      liftedBy: req.user.id
    });

    await user.save();
    res.json({
      payOnDeliveryEnabled: user.payOnDeliveryEnabled,
      penaltyApplied: user.penaltyApplied,
      ordersSincePenalty: user.ordersSincePenalty,
      consecutiveCancellations: user.consecutiveCancellations
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
