const express = require('express');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const LoyaltyConfig = require('../../models/LoyaltyConfig');
const User = require('../../models/User');
const LoyaltyPoints = require('../../models/LoyaltyPoints');
const SubscriptionPlan = require('../../models/SubscriptionPlan');

const router = express.Router();

router.get('/loyalty-config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let config = await LoyaltyConfig.findOne({});
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

router.put('/loyalty-config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'pointsEarnRate',
      'pointsRedemptionValue',
      'minPointsRedemption',
      'maxRedemptionPercent',
      'newUserBonus',
      'referralPointsReward',
      'referralDiscountValue',
      'isActive'
    ];

    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    let config = await LoyaltyConfig.findOne({});
    if (!config) {
      config = new LoyaltyConfig(filteredUpdates);
    } else {
      Object.assign(config, filteredUpdates);
    }
    await config.save();

    res.json({
      success: true,
      data: config,
      message: 'Loyalty configuration updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/subscription-plans', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({}).sort({ monthlyPrice: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/subscription-plans', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { planType, name, description, monthlyPrice, freeDeliveryLimit, priorityProcessing, exclusivePromos, discountPercent, features, isActive } = req.body;

    if (!planType || !name || !description || !monthlyPrice) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const existing = await SubscriptionPlan.findOne({ planType });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Plan type already exists' });
    }

    const plan = new SubscriptionPlan({
      planType,
      name,
      description,
      monthlyPrice,
      freeDeliveryLimit: freeDeliveryLimit || 5,
      priorityProcessing: priorityProcessing || false,
      exclusivePromos: exclusivePromos || false,
      discountPercent: discountPercent || 0,
      features: features || [],
      isActive: isActive !== undefined ? isActive : true
    });
    await plan.save();

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Subscription plan created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/subscription-plans/:planType', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { planType } = req.params;
    const updates = req.body;

    const allowedUpdates = ['name', 'description', 'monthlyPrice', 'freeDeliveryLimit', 'priorityProcessing', 'exclusivePromos', 'discountPercent', 'features', 'isActive'];

    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    const plan = await SubscriptionPlan.findOneAndUpdate(
      { planType },
      filteredUpdates,
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({
      success: true,
      data: plan,
      message: 'Subscription plan updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users/loyalty-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await User.countDocuments({ role: 'user', deletedAt: null });
    const users = await User.find({ role: 'user', deletedAt: null })
      .select('name email loyaltyPoints createdAt')
      .sort({ loyaltyPoints: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const stats = await User.aggregate([
      { $match: { role: 'user', deletedAt: null } },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$loyaltyPoints' },
          avgPoints: { $avg: '$loyaltyPoints' },
          maxPoints: { $max: '$loyaltyPoints' }
        }
      }
    ]);

    res.json({
      success: true,
      data: users,
      aggregate: stats[0] || { totalPoints: 0, avgPoints: 0, maxPoints: 0 },
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

router.get('/points-history', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { deletedAt: null };
    if (userId) query.user = userId;
    if (type) query.type = type;

    const total = await LoyaltyPoints.countDocuments(query);
    const history = await LoyaltyPoints.find(query)
      .populate('user', 'name email')
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

module.exports = router;