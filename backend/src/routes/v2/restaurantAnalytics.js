const express = require('express');
const authMiddleware = require('../../middleware/auth');
const analyticsService = require('../../services/analyticsService');

const router = express.Router();

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, period = 'week' } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant ID required' });
    }

    const data = await analyticsService.getDashboardData(restaurantId, period);

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
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant ID required' });
    }

    const data = await analyticsService.getMenuItemPerformance(restaurantId);

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
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant ID required' });
    }

    const analytics = await analyticsService.calculateRestaurantAnalytics(restaurantId);

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