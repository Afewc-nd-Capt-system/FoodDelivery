const express = require('express');
const DeliveryPartner = require('../../models/DeliveryPartner');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

// PATCH /api/v2/riders/availability
router.patch('/availability', authMiddleware, async (req, res) => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ message: 'isOnline must be a boolean' });
    }

    const rider = await DeliveryPartner.findById(req.user.id);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    rider.isOnline = isOnline;
    await rider.save();

    // Emit availability_change to delivery company room
    const io = req.app.get('io');
    if (io) {
      io.of('/tracking').to(`delivery_company_${rider.deliveryCompany}`).emit('rider_availability', {
        riderId: rider._id,
        isOnline,
      });
    }

    res.json({ rider });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/riders/earnings?period=today|week|month
router.get('/earnings', authMiddleware, async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const Order = require('../../models/Order');
    const now = new Date();
    let startDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(now.getDate() - 30);
    }

    const orders = await Order.find({
      deliveryPartner: req.user.id,
      status: 'completed',
      updatedAt: { $gte: startDate }
    }).select('deliveryFee totalAmount createdAt updatedAt');

    const totalEarnings = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    const byDay = {};
    orders.forEach(o => {
      const day = new Date(o.updatedAt).toLocaleDateString('en-US', { weekday: 'short' });
      byDay[day] = (byDay[day] || 0) + (o.deliveryFee || 0);
    });

    res.json({
      totalEarnings,
      deliveriesCount: orders.length,
      chartData: Object.entries(byDay).map(([day, amount]) => ({ day, amount })),
      period,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', earnings: 0 });
  }
});

// GET /api/v2/riders/deliveries/completed
router.get('/deliveries/completed', authMiddleware, async (req, res) => {
  try {
    const Order = require('../../models/Order');
    const orders = await Order.find({
      deliveryPartner: req.user.id,
      status: 'completed'
    })
      .populate('restaurant', 'name')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ deliveries: orders });
  } catch (err) {
    res.status(500).json({ deliveries: [] });
  }
});

// GET /api/v2/riders/active-delivery
router.get('/active-delivery', authMiddleware, async (req, res) => {
  try {
    const Order = require('../../models/Order');
    const active = await Order.findOne({
      deliveryPartner: req.user.id,
      status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
    }).populate('restaurant', 'name address phone');

    res.json({ delivery: active });
  } catch (err) {
    res.status(500).json({ delivery: null });
  }
});

module.exports = router;
