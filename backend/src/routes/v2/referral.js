const express = require('express');
const authMiddleware = require('../../middleware/auth');
const User = require('../../models/User');
const Referral = require('../../models/Referral');
const LoyaltyConfig = require('../../models/LoyaltyConfig');
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const LoyaltyPoints = require('../../models/LoyaltyPoints');
const Order = require('../../models/Order');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    let referral = await Referral.findOne({ referrer: req.user.id, deletedAt: null });

    if (!referral) {
      referral = await Referral.create({
        referrer: req.user.id,
        referralCode: 'VIBE' + Math.random().toString(36).substring(2, 10).toUpperCase()
      });
    }

    const stats = await Referral.aggregate([
      { $match: { referrer: user._id, deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const pendingCount = stats.find(s => s._id === 'pending')?.count || 0;
    const completedCount = stats.find(s => s._id === 'completed')?.count || 0;

    res.json({
      success: true,
      data: {
        referralCode: referral.referralCode,
        pendingReferrals: pendingCount,
        completedReferrals: completedCount,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referral.referralCode}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/my-code', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let referral = await Referral.findOne({ referrer: req.user.id, deletedAt: null });

    if (!referral) {
      referral = await Referral.create({
        referrer: req.user.id,
        referralCode: 'VIBE' + Math.random().toString(36).substring(2, 10).toUpperCase()
      });
    }

    const stats = await Referral.aggregate([
      { $match: { referrer: user._id, deletedAt: null } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const pendingCount = stats.find(s => s._id === 'pending')?.count || 0;
    const completedCount = stats.find(s => s._id === 'completed')?.count || 0;

    res.json({
      success: true,
      data: {
        referralCode: referral.referralCode,
        pendingReferrals: pendingCount,
        completedReferrals: completedCount,
        shareUrl: `${process.env.FRONTEND_URL}/register?ref=${referral.referralCode}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/validate-code', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Referral code is required' });
    }

    const referral = await Referral.findOne({
      referralCode: code.toUpperCase(),
      status: { $ne: 'expired' },
      deletedAt: null
    });

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Invalid or expired referral code' });
    }

    const referrer = await User.findById(referral.referrer);
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer not found' });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        referrerName: referrer.name,
        rewardType: 'discount',
        rewardValue: referral.rewardValue || 100
      },
      message: `You'll get a discount on your first order!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/apply-on-register', async (req, res) => {
  try {
    const { referralCode, email } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const config = await LoyaltyConfig.findOne({ isActive: true });

    if (referralCode) {
      const referral = await Referral.findOne({
        referralCode: referralCode.toUpperCase(),
        status: { $ne: 'completed' },
        deletedAt: null
      });

      if (referral) {
        return res.json({
          success: true,
          data: {
            canApply: true,
            refereeDiscount: config?.referralDiscountValue || 100,
            referralId: referral._id
          }
        });
      }
    }

    res.json({
      success: true,
      data: { canApply: false }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/track-signup', async (req, res) => {
  try {
    const { referralCode, userId } = req.body;

    if (!referralCode || !userId) {
      return res.status(400).json({ success: false, message: 'Referral code and user ID required' });
    }

    const referral = await Referral.findOne({
      referralCode: referralCode.toUpperCase(),
      status: { $ne: 'completed' },
      deletedAt: null
    });

    if (!referral) {
      return res.json({ success: true, message: 'Referral not found or already completed' });
    }

    referral.referee = userId;
    referral.status = 'pending';
    await referral.save();

    const user = await User.findById(userId);
    user.referredBy = referral.referrer;
    await user.save();

    res.json({
      success: true,
      data: { referralId: referral._id },
      message: 'Referral tracked successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/complete-first-order', authMiddleware, async (req, res) => {
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

    const user = await User.findById(req.user.id);

    if (!user.referredBy) {
      return res.json({ success: true, message: 'No referral to process' });
    }

    const existingReferral = await Referral.findOne({
      referrer: user.referredBy,
      referee: req.user.id,
      refereeFirstOrderCompleted: true,
      deletedAt: null
    });

    if (existingReferral) {
      return res.json({ success: true, message: 'Referral already processed' });
    }

    const referral = await Referral.findOne({
      referrer: user.referredBy,
      referee: req.user.id,
      deletedAt: null
    });

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral record not found' });
    }

    const config = await LoyaltyConfig.findOne({ isActive: true });

    referral.refereeFirstOrderCompleted = true;
    referral.refereeFirstOrderId = orderId;
    referral.refereeDiscountApplied = config?.referralDiscountValue || 100;
    referral.status = 'completed';
    referral.rewardClaimed = true;
    referral.rewardClaimedAt = new Date();
    await referral.save();

    const referrer = await User.findById(user.referredBy);

    if (referrer) {
      const rewardValue = config?.referralPointsReward || 100;
      const rewardType = referral.rewardType || 'points';

      if (rewardType === 'points') {
        referrer.loyaltyPoints += rewardValue;
        await referrer.save();

        const pointsRecord = new LoyaltyPoints({
          user: referrer._id,
          points: rewardValue,
          type: 'referral',
          description: `Referral reward: ${rewardValue} points for referring ${user.name}`,
          reference: 'REFERRAL-' + referral._id.toString()
        });
        await pointsRecord.save();
      } else if (rewardType === 'wallet_credit') {
        let wallet = await Wallet.findOne({ user: referrer._id, deletedAt: null });
        if (!wallet) {
          wallet = await Wallet.create({
            user: referrer._id,
            balance: 0,
            currency: 'NGN',
            isActive: true
          });
        }

        wallet.balance += rewardValue;
        await wallet.save();

        const transaction = new WalletTransaction({
          wallet: wallet._id,
          user: referrer._id,
          type: 'credit',
          amount: rewardValue,
          description: `Referral reward: ₦${rewardValue} for referring ${user.name}`,
          reference: 'REFERRAL-' + referral._id.toString(),
          status: 'completed'
        });
        await transaction.save();
      }
    }

    res.json({
      success: true,
      data: {
        refereeDiscountApplied: referral.refereeDiscountApplied,
        referrerRewardType: referral.rewardType,
        referrerRewardValue: config?.referralPointsReward || 100
      },
      message: `Referral completed! You got ₦${referral.refereeDiscountApplied} discount. Your referrer earned rewards!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/my-referrals', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Referral.countDocuments({ referrer: req.user.id, deletedAt: null });
    const referrals = await Referral.find({ referrer: req.user.id, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('referee', 'name email createdAt');

    res.json({
      success: true,
      data: referrals,
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

router.get('/my-rewards', authMiddleware, async (req, res) => {
  try {
    const stats = await Referral.aggregate([
      { $match: { referrer: req.user.id, status: 'completed', deletedAt: null } },
      {
        $group: {
          _id: null,
          totalRewards: { $sum: '$rewardValue' },
          completedCount: { $sum: 1 }
        }
      }
    ]);

    const pointsEarned = await LoyaltyPoints.aggregate([
      { $match: { user: req.user.id, type: 'referral', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalReferrals: stats[0]?.completedCount || 0,
        totalRewardsValue: stats[0]?.totalRewards || 0,
        totalPointsFromReferral: pointsEarned[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;