const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../../middleware/auth');
const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const SubscriptionPlan = require('../../models/SubscriptionPlan');
const axios = require('axios');

const router = express.Router();

router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ monthlyPrice: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/my-subscription', authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active',
      deletedAt: null
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No active subscription'
      });
    }

    const plan = await SubscriptionPlan.findOne({ planType: subscription.plan });

    res.json({
      success: true,
      data: {
        ...subscription.toObject(),
        planDetails: plan
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { planType, email } = req.body;

    if (!planType) {
      return res.status(400).json({ success: false, message: 'Plan type is required' });
    }

    const plan = await SubscriptionPlan.findOne({ planType, isActive: true });
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
    }

    const user = await User.findById(req.user.id);
    const existingSubscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active',
      deletedAt: null
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription'
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const reference = 'VIBEPASS-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    const paystackUrl = 'https://api.paystack.co/transaction/initialize';

    const paymentData = {
      email: email || user.email,
      amount: plan.monthlyPrice * 100,
      reference: reference,
      callback_url: process.env.FRONTEND_URL + '/subscription/callback',
      metadata: {
        subscription: true,
        userId: req.user.id,
        planType: planType,
        type: 'vibepass_subscription'
      }
    };

    const response = await axios.post(paystackUrl, paymentData, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const subscription = new Subscription({
      user: req.user.id,
      plan: planType,
      status: 'pending',
      startDate: startDate,
      endDate: endDate,
      freeDeliveryLimit: plan.freeDeliveryLimit,
      freeDeliveryUsed: 0,
      monthlyPrice: plan.monthlyPrice,
      autoRenew: true
    });
    await subscription.save();

    res.json({
      success: true,
      data: {
        authorizationUrl: response.data.data.authorization_url,
        subscriptionId: subscription._id,
        reference: reference
      },
      message: 'Redirect to payment to complete subscription'
    });
  } catch (error) {
    console.error('Subscription error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || 'Failed to create subscription' });
  }
});

router.post('/verify-subscription', authMiddleware, async (req, res) => {
  try {
    const { reference, subscriptionId } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference required' });
    }

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    const transactionData = response.data.data;

    if (transactionData.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    subscription.status = 'active';
    subscription.paystackSubscriptionCode = reference;
    await subscription.save();

    const user = await User.findById(req.user.id);
    user.isVibePassMember = true;
    await user.save();

    const plan = await SubscriptionPlan.findOne({ planType: subscription.plan });

    res.json({
      success: true,
      data: {
        subscription: subscription,
        planDetails: plan
      },
      message: 'VibePass subscription activated successfully!'
    });
  } catch (error) {
    console.error('Verification error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || 'Verification failed' });
  }
});

router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active',
      deletedAt: null
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No active subscription found' });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.autoRenew = false;
    await subscription.save();

    const user = await User.findById(req.user.id);
    user.isVibePassMember = false;
    await user.save();

    res.json({
      success: true,
      data: subscription,
      message: 'Subscription cancelled. You will retain benefits until ' + subscription.endDate.toDateString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/check-free-delivery', authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active',
      endDate: { $gte: new Date() },
      deletedAt: null
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: 'No active subscription',
          remaining: 0,
          used: 0
        }
      });
    }

    const remaining = subscription.freeDeliveryLimit - subscription.freeDeliveryUsed;

    res.json({
      success: true,
      data: {
        eligible: remaining > 0,
        remaining: remaining,
        used: subscription.freeDeliveryUsed,
        limit: subscription.freeDeliveryLimit,
        expiresAt: subscription.endDate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/use-free-delivery', authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active',
      endDate: { $gte: new Date() },
      deletedAt: null
    });

    if (!subscription) {
      return res.status(400).json({ success: false, message: 'No active subscription or subscription expired' });
    }

    if (subscription.freeDeliveryUsed >= subscription.freeDeliveryLimit) {
      return res.status(400).json({ success: false, message: 'Free delivery limit reached for this month' });
    }

    subscription.freeDeliveryUsed += 1;
    await subscription.save();

    res.json({
      success: true,
      data: {
        freeDeliveryUsed: subscription.freeDeliveryUsed,
        remaining: subscription.freeDeliveryLimit - subscription.freeDeliveryUsed
      },
      message: 'Free delivery applied!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;