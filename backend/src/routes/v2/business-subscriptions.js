const express = require('express');
const BusinessSubscriptionPlan = require('../../models/BusinessSubscriptionPlan');
const Subscription = require('../../models/Subscription');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

// GET /api/v2/subscriptions/plans?type=restaurant|vendor
router.get('/plans', async (req, res) => {
  try {
    const { type } = req.query;
    const query = { isActive: true };
    if (type) {
      query.targetType = type;
    }
    const plans = await BusinessSubscriptionPlan.find(query).sort({ price: 1 });
    res.json({ plans });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/subscriptions/current
router.get('/current', authMiddleware, async (req, res) => {
  try {
    let subscription = null;
    
    // Check if user has restaurant subscription
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (restaurant) {
      subscription = await Subscription.findOne({
        restaurant: restaurant._id,
        status: 'active',
      }).populate('plan');
    }
    
    // Check if user has vendor subscription
    if (!subscription) {
      const vendor = await Vendor.findOne({ owner: req.user.id });
      if (vendor) {
        subscription = await Subscription.findOne({
          vendor: vendor._id,
          status: 'active',
        }).populate('plan');
      }
    }
    
    res.json({ subscription });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/subscriptions/activate
router.post('/activate', authMiddleware, async (req, res) => {
  try {
    const { planId, paystackRef } = req.body;
    
    // Verify plan exists
    const plan = await BusinessSubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // TODO: Verify Paystack payment
    // This would involve calling Paystack API to verify the transaction
    
    // Find restaurant or vendor
    let business = await Restaurant.findOne({ owner: req.user.id });
    let businessType = 'restaurant';
    
    if (!business) {
      business = await Vendor.findOne({ owner: req.user.id });
      businessType = 'vendor';
    }
    
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    
    // Create or update subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    let subscription = await Subscription.findOne({
      [businessType]: business._id,
    });
    
    if (subscription) {
      subscription.plan = plan._id;
      subscription.status = 'active';
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.paystackReference = paystackRef;
      await subscription.save();
    } else {
      subscription = new Subscription({
        [businessType]: business._id,
        plan: plan._id,
        status: 'active',
        startDate,
        endDate,
        paystackReference: paystackRef,
      });
      await subscription.save();
    }
    
    // Update business commission rate
    business.commissionRate = plan.commissionRate;
    await business.save();
    
    res.json({ subscription });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/subscriptions/cancel
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    let subscription = null;
    
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (restaurant) {
      subscription = await Subscription.findOne({ restaurant: restaurant._id });
    } else {
      const vendor = await Vendor.findOne({ owner: req.user.id });
      if (vendor) {
        subscription = await Subscription.findOne({ vendor: vendor._id });
      }
    }
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();
    
    res.json({ subscription });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
