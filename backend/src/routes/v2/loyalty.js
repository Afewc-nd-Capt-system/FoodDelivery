const express = require('express');
const authMiddleware = require('../../middleware/auth');
const User = require('../../models/User');
const LoyaltyConfig = require('../../models/LoyaltyConfig');
const LoyaltyPoints = require('../../models/LoyaltyPoints');
const Order = require('../../models/Order');

const router = express.Router();

router.get('/config', async (req, res) => {
  try {
    let config = await LoyaltyConfig.findOne({ isActive: true });
    if (!config) {
      config = await LoyaltyConfig.create({
        pointsEarnRate: 1,
        pointsRedemptionValue: 100,
        minPointsRedemption: 100,
        maxRedemptionPercent: 20,
        newUserBonus: 50,
        referralPointsReward: 100,
        referralDiscountValue: 100,
        isActive: true
      });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      data: {
        points: user.loyaltyPoints || 0,
        userId: user._id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await LoyaltyPoints.countDocuments({ user: req.user.id, deletedAt: null });
    const history = await LoyaltyPoints.find({ user: req.user.id, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: history,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/redeem', authMiddleware, async (req, res) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid points amount' });
    }

    const user = await User.findById(req.user.id);
    const config = await LoyaltyConfig.findOne({ isActive: true });

    if (!config) {
      return res.status(400).json({ success: false, message: 'Loyalty system not configured' });
    }

    if (user.loyaltyPoints < points) {
      return res.status(400).json({ success: false, message: 'Insufficient points' });
    }

    if (points < config.minPointsRedemption) {
      return res.status(400).json({
        success: false,
        message: `Minimum ${config.minPointsRedemption} points required for redemption`
      });
    }

    const redemptionValue = points / config.pointsRedemptionValue;

    user.loyaltyPoints -= points;
    await user.save();

    const pointsRecord = new LoyaltyPoints({
      user: req.user.id,
      points: -points,
      type: 'redeemed',
      description: `Redeemed ${points} points for ₦${redemptionValue.toFixed(2)} discount`,
      reference: 'REDEEM-' + Date.now()
    });
    await pointsRecord.save();

    res.json({
      success: true,
      data: {
        pointsRedeemed: points,
        discountValue: redemptionValue,
        remainingPoints: user.loyaltyPoints
      },
      message: `You redeemed ${points} points for ₦${redemptionValue.toFixed(2)} discount`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/calculate-redeemable', authMiddleware, async (req, res) => {
  try {
    const { orderAmount } = req.body;

    if (!orderAmount || orderAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }

    const user = await User.findById(req.user.id);
    const config = await LoyaltyConfig.findOne({ isActive: true });

    if (!config) {
      return res.status(400).json({ success: false, message: 'Loyalty system not configured' });
    }

    const maxRedeemable = (orderAmount * config.maxRedemptionPercent) / 100;
    const maxPointsValue = maxRedeemable * config.pointsRedemptionValue;
    const pointsCanRedeem = Math.min(user.loyaltyPoints, maxPointsValue);
    const pointsToRedeem = Math.floor(pointsCanRedeem / config.pointsRedemptionValue) * config.pointsRedemptionValue;
    const discountValue = pointsToRedeem / config.pointsRedemptionValue;

    res.json({
      success: true,
      data: {
        maxPointsCanRedeem: Math.floor(maxPointsValue),
        userPoints: user.loyaltyPoints,
        recommendedPoints: pointsToRedeem,
        discountValue: discountValue,
        minPointsRequired: config.minPointsRedemption
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/award-points', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Order not delivered yet' });
    }

    const existingPoints = await LoyaltyPoints.findOne({
      user: req.user.id,
      order: orderId,
      type: 'earned'
    });

    if (existingPoints) {
      return res.status(400).json({ success: false, message: 'Points already awarded for this order' });
    }

    const config = await LoyaltyConfig.findOne({ isActive: true });
    const earnedPoints = Math.floor(order.totalAmount * (config?.pointsEarnRate || 1));

    const user = await User.findById(req.user.id);
    user.loyaltyPoints += earnedPoints;
    await user.save();

    const pointsRecord = new LoyaltyPoints({
      user: req.user.id,
      points: earnedPoints,
      type: 'earned',
      description: `Earned ${earnedPoints} points from order ${orderId}`,
      order: orderId,
      reference: 'ORDER-' + orderId
    });
    await pointsRecord.save();

    res.json({
      success: true,
      data: {
        pointsEarned: earnedPoints,
        totalPoints: user.loyaltyPoints
      },
      message: `You earned ${earnedPoints} loyalty points!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;