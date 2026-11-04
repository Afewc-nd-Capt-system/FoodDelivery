const express = require('express');
const BusinessSubscriptionPlan = require('../../models/BusinessSubscriptionPlan');
const Subscription = require('../../models/Subscription');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');
const router = express.Router();

// POST /api/v2/subscriptions/admin/audit-activations
// Admin-only: find paid plans that were activated without a real, verified
// Paystack reference (legacy 'test_ref' activations) and deactivate them.
// Deactivation is reversible (status -> 'cancelled'), never a delete.
router.post('/admin/audit-activations', authMiddleware, adminGuard, async (req, res) => {
  try {
    const plans = await BusinessSubscriptionPlan.find({ price: { $gt: 0 } }).select('_id name price');
    const paidPlanIds = new Set(plans.map((p) => String(p._id)));
    const planPrice = new Map(plans.map((p) => [String(p._id), Number(p.price) || 0]));

    const subs = await Subscription.find({ status: 'active' });
    const offenders = [];
    for (const sub of subs) {
      const price = planPrice.get(String(sub.plan));
      if (!price || price <= 0) continue; // free plan — fine
      const ref = String(sub.paystackReference || '').trim();
      const invalid = !ref || ref === 'test_ref' || ref.startsWith('test_');
      if (invalid) {
        sub.status = 'cancelled';
        sub.cancelledAt = new Date();
        sub.autoRenew = false;
        await sub.save();
        offenders.push({ id: String(sub._id), plan: String(sub.plan), paystackReference: ref || null });
      }
    }

    res.json({
      success: true,
      scanned: subs.length,
      deactivated: offenders.length,
      offenders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
      const vendor = await await Vendor.findOwnedBy(req.user);
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
// Start a Paystack checkout for a business plan upgrade. Returns the hosted
// authorization URL; the plan is only activated after /activate verifies the
// reference with Paystack.
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await BusinessSubscriptionPlan.findById(planId);
    if (!plan || plan.isActive === false) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const business = await Restaurant.findOne({ owner: req.user.id })
      || await Vendor.findOwnedBy(req.user);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    if (!Number(plan.price) || Number(plan.price) <= 0) {
      return res.json({ free: true, message: 'This plan is free; no payment required.' });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return res.status(503).json({ message: 'Payments are not configured yet. Please contact support.' });
    }

    const reference = `bizplan_${req.user.id}_${Date.now()}`;
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user.email,
        amount: Math.round(Number(plan.price) * 100),
        currency: 'NGN',
        reference,
        callback_url: `${require('../../config/frontend').frontendUrl('/subscription')}?plan=${plan._id}`,
        metadata: {
          planId: String(plan._id),
          userId: String(req.user.id),
          type: 'business-plan',
        },
      }),
      signal: AbortSignal.timeout(20000),
    });
    const paystackBody = await paystackResponse.json().catch(() => null);
    if (!paystackResponse.ok || !paystackBody?.status) {
      return res.status(502).json({ message: paystackBody?.message || 'Could not start payment. Please try again.' });
    }

    res.json({
      authorizationUrl: paystackBody.data.authorization_url,
      reference: paystackBody.data.reference,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/activate', authMiddleware, async (req, res) => {
  try {
    const { planId, paystackRef } = req.body;

    const plan = await BusinessSubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const price = Number(plan.price) || 0;
    if (price > 0) {
      if (!paystackRef || !String(paystackRef).trim()) {
        return res.status(402).json({ message: 'Payment is required to activate this plan.' });
      }
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) {
        return res.status(503).json({ message: 'Payments are not configured yet. Please contact support.' });
      }

      // The same reference must never activate a plan twice.
      const used = await Subscription.findOne({ paystackReference: paystackRef });
      if (used) {
        return res.status(409).json({ message: 'This payment reference has already been used.' });
      }

      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackRef)}`,
        {
          headers: { Authorization: `Bearer ${secret}` },
          signal: AbortSignal.timeout(20000),
        }
      );
      const verifyBody = await verifyRes.json().catch(() => null);
      const tx = verifyBody?.data;
      if (!verifyRes.ok || !verifyBody?.status || !tx || tx.status !== 'success') {
        return res.status(402).json({ message: 'Payment could not be verified. Please complete checkout and try again.' });
      }
      if (Number(tx.amount) < Math.round(price * 100)) {
        return res.status(402).json({ message: 'The payment amount does not cover this plan.' });
      }
      const txUser = tx.metadata?.userId;
      if (txUser && String(txUser) !== String(req.user.id)) {
        return res.status(403).json({ message: 'This payment belongs to a different account.' });
      }
    }

    // Find restaurant or vendor
    let business = await Restaurant.findOne({ owner: req.user.id });
    let businessType = 'restaurant';

    if (!business) {
      business = await Vendor.findOwnedBy(req.user);
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
      const vendor = await await Vendor.findOwnedBy(req.user);
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
