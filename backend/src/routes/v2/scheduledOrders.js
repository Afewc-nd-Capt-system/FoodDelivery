const express = require('express');
const authMiddleware = require('../../middleware/auth');
const ScheduledOrder = require('../../models/ScheduledOrder');
const { body, validationResult } = require('express-validator');

const router = express.Router();

router.post('/', authMiddleware, [
  body('restaurant').notEmpty(),
  body('items').isArray({ min: 1 }),
  body('scheduledTime').isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { restaurant, restaurantName, items, totalAmount, deliveryAddress, paymentMethod, deliveryFee, scheduledTime } = req.body;

    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    if (scheduledDate <= now || scheduledDate > maxFuture) {
      return res.status(400).json({ success: false, message: 'Scheduled time must be within 48 hours' });
    }

    const scheduledOrder = new ScheduledOrder({
      user: req.user.id,
      restaurant,
      restaurantName,
      items,
      totalAmount,
      deliveryAddress,
      paymentMethod: paymentMethod || 'cash',
      deliveryFee: deliveryFee || 40,
      scheduledTime: scheduledDate,
    });

    await scheduledOrder.save();

    res.status(201).json({
      success: true,
      data: scheduledOrder,
      message: 'Order scheduled successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await ScheduledOrder.countDocuments({ user: req.user.id, deletedAt: null });
    const orders = await ScheduledOrder.find({ user: req.user.id, deletedAt: null })
      .sort({ scheduledTime: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('restaurant', 'name image');

    res.json({
      success: true,
      data: orders,
      pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await ScheduledOrder.findOne({ _id: req.params.id, user: req.user.id, deletedAt: null })
      .populate('restaurant', 'name image');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Scheduled order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const order = await ScheduledOrder.findOne({ _id: req.params.id, user: req.user.id, deletedAt: null });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Scheduled order not found' });
    }

    const scheduledDate = new Date(order.scheduledTime);
    const now = new Date();
    const hoursUntil = (scheduledDate - now) / (1000 * 60 * 60);

    if (hoursUntil < 2) {
      return res.status(400).json({ success: false, message: 'Cannot cancel within 2 hours of scheduled time' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, message: 'Scheduled order cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;