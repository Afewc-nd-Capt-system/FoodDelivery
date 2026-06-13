const express = require('express');
const Commission = require('../../models/Commission');
const Subscription = require('../../models/Subscription');
const AdPlacement = require('../../models/AdPlacement');
const BusinessSubscriptionPlan = require('../../models/BusinessSubscriptionPlan');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Helper: Get date range based on period
function getDateRange(period) {
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case '7':
      start.setDate(start.getDate() - 7);
      break;
    case '30':
      start.setDate(start.getDate() - 30);
      break;
    case '90':
      start.setDate(start.getDate() - 90);
      break;
    case '365':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  
  return { start, end };
}

// GET /api/v2/admin/revenue/overview?period=30
router.get('/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const { start, end } = getDateRange(period.toString());
    
    // Commission revenue
    const commissions = await Commission.find({
      status: 'paid',
      createdAt: { $gte: start, $lte: end },
    });
    const commissionRevenue = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    
    // Subscription revenue
    const subscriptions = await Subscription.find({
      status: 'active',
      createdAt: { $gte: start, $lte: end },
    });
    const subscriptionRevenue = subscriptions.reduce((sum, s) => sum + (s.plan?.price || 0), 0);
    
    // Ad revenue
    const ads = await AdPlacement.find({
      status: 'active',
      createdAt: { $gte: start, $lte: end },
    });
    const adRevenue = ads.reduce((sum, a) => sum + a.totalSpent, 0);
    
    const totalRevenue = commissionRevenue + subscriptionRevenue + adRevenue;
    
    res.json({
      totalRevenue,
      commissionRevenue,
      subscriptionRevenue,
      adRevenue,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/admin/revenue/chart?period=30
router.get('/chart', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const { start, end } = getDateRange(period.toString());
    
    // Generate daily breakdown
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const chartData = [];
    
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const commissions = await Commission.find({
        status: 'paid',
        createdAt: { $gte: dayStart, $lt: dayEnd },
      });
      const commissionRevenue = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
      
      const subscriptions = await Subscription.find({
        status: 'active',
        createdAt: { $gte: dayStart, $lt: dayEnd },
      });
      const subscriptionRevenue = subscriptions.reduce((sum, s) => sum + (s.plan?.price || 0), 0);
      
      const ads = await AdPlacement.find({
        status: 'active',
        createdAt: { $gte: dayStart, $lt: dayEnd },
      });
      const adRevenue = ads.reduce((sum, a) => sum + a.totalSpent, 0);
      
      chartData.push({
        date: dayStart.toISOString().split('T')[0],
        commissionRevenue,
        subscriptionRevenue,
        adRevenue,
      });
    }
    
    res.json({ chartData });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/admin/revenue/commissions?period=30
router.get('/commissions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const { start, end } = getDateRange(period.toString());
    
    const commissions = await Commission.find({
      createdAt: { $gte: start, $lte: end },
    })
      .populate('orderId')
      .sort({ commissionAmount: -1 });
    
    // Group by restaurant/vendor
    const breakdown = [];
    for (const commission of commissions) {
      const order = commission.orderId;
      if (!order) continue;
      
      let business = null;
      if (commission.type === 'restaurant') {
        business = await Restaurant.findById(order.restaurant);
      } else if (commission.type === 'vendor') {
        business = await Vendor.findById(order.vendor);
      }
      
      if (business) {
        breakdown.push({
          name: business.name,
          type: commission.type,
          orders: 1,
          grossGMV: commission.gross,
          commissionRate: commission.commissionRate,
          commissionEarned: commission.commissionAmount,
        });
      }
    }
    
    res.json({ breakdown });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/admin/revenue/subscriptions
router.get('/subscriptions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const plans = await BusinessSubscriptionPlan.find({ isActive: true });
    
    const subscriptionData = await Promise.all(
      plans.map(async (plan) => {
        const activeSubscriptions = await Subscription.countDocuments({
          plan: plan._id,
          status: 'active',
        });
        
        const mrr = activeSubscriptions * plan.price;
        
        return {
          planName: plan.name,
          targetType: plan.targetType,
          activeSubscribers: activeSubscriptions,
          mrr,
        };
      })
    );
    
    const totalMRR = subscriptionData.reduce((sum, s) => sum + s.mrr, 0);
    
    res.json({ subscriptionData, totalMRR });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
