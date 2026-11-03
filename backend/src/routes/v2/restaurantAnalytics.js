const express = require('express');
const authMiddleware = require('../../middleware/auth');
const analyticsService = require('../../services/analyticsService');
const Restaurant = require('../../models/Restaurant');

const router = express.Router();

// Resolve the restaurant for the signed-in owner. A restaurantId query param is
// only honored when it matches the owner's own restaurant (admins may read any).
async function resolveRestaurant(req) {
  if (req.user.role === 'admin') {
    if (req.query.restaurantId) {
      return Restaurant.findById(req.query.restaurantId);
    }
    return null;
  }
  const restaurant = await Restaurant.findOne({ owner: req.user.id });
  if (restaurant && req.query.restaurantId) {
    return String(restaurant._id) === String(req.query.restaurantId) ? restaurant : null;
  }
  return restaurant;
}

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const data = await analyticsService.getDashboardData(restaurant._id, period);
    res.json({ success: true, data: { restaurantId: restaurant._id, ...data } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const restaurant = await resolveRestaurant(req);
    if (!restaurant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const data = await analyticsService.getDashboardData(restaurant._id, period);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/menu-performance', authMiddleware, async (req, res) => {
  try {
    const restaurant = await resolveRestaurant(req);
    if (!restaurant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const data = await analyticsService.getMenuItemPerformance(restaurant._id);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const restaurant = await resolveRestaurant(req);
    if (!restaurant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const analytics = await analyticsService.calculateRestaurantAnalytics(restaurant._id);

    res.json({
      success: true,
      data: {
        totalRevenue: analytics.totalRevenue,
        monthlyRevenue: analytics.monthlyRevenue,
        weeklyRevenue: analytics.weeklyRevenue,
        totalOrders: analytics.totalOrders,
        avgOrderValue: analytics.avgOrderValue,
        customerReturnRate: analytics.customerReturnRate,
        cancelledOrderRate: analytics.cancelledOrderRate,
        topSellingItems: analytics.menuItemAnalytics.slice(0, 5),
        peakHours: analytics.hourlyStats.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;