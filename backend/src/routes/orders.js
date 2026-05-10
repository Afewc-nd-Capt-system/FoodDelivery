const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const authMiddleware = require('../middleware/auth');
const { sendOrderConfirmation, sendOrderStatusUpdate } = require('../utils/email');
const recommendationService = require('../services/recommendationService');
const PayOnDeliveryService = require('../services/PayOnDeliveryService');
const CustomerTrustService = require('../services/CustomerTrustService');

const router = express.Router();

// Check POD eligibility endpoint
router.post('/check-pod-eligibility', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, vendorId, totalAmount, items } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let restaurantOrVendor = null;

    if (restaurantId) {
      restaurantOrVendor = await Restaurant.findById(restaurantId);
    } else if (vendorId) {
      restaurantOrVendor = await Vendor.findById(vendorId);
    }

    if (!restaurantOrVendor) {
      return res.status(404).json({ message: 'Restaurant or vendor not found' });
    }

    const result = await PayOnDeliveryService.checkPODEligibility(
      { totalAmount, items },
      user,
      restaurantOrVendor
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurant, restaurantName, items, totalAmount, deliveryAddress, paymentMethod, deliveryFee } = req.body;

    if (!restaurant || !restaurantName || !items || !totalAmount || !deliveryAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (paymentMethod === 'cash' || paymentMethod === 'pay_on_delivery') {
      const user = await User.findById(req.user.id);
      const restaurantDoc = await Restaurant.findById(restaurant);

      const podCheck = await PayOnDeliveryService.checkPODEligibility(
        { totalAmount, items },
        user,
        restaurantDoc
      );

      if (!podCheck.allowed) {
        return res.status(403).json({
          message: `Pay on delivery not allowed: ${podCheck.reason}`,
          code: podCheck.reason,
          checks: podCheck.checks
        });
      }
    }

    const order = new Order({
      user: req.user.id,
      restaurant,
      restaurantName,
      items,
      totalAmount,
      deliveryAddress,
      paymentMethod: paymentMethod || 'cash',
      deliveryFee: deliveryFee || 40,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
    });

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.id}`).emit('order-created', order);
    }

    const user = await User.findById(req.user.id);
    if (user && user.email) {
      await sendOrderConfirmation(user.email, order);
    }

    res.status(201).json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments({ user: req.user.id });

    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('restaurant', 'name');

    res.json({
      orders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isOrderOwner = order.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (status === 'cancelled' && isOrderOwner && !isAdmin) {
      await CustomerTrustService.updateTrustMetrics(
        req.user.id,
        'cancellation',
        { orderId: order._id, paymentMethod: order.paymentMethod }
      );
    }

    if (status === 'delivered' && isOrderOwner) {
      await CustomerTrustService.updateTrustMetrics(
        req.user.id,
        'successful_delivery',
        { orderId: order._id, paymentMethod: order.paymentMethod }
      );
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order-${order._id}`).emit('order-status-update', { orderId: order._id, status, order });
      io.to(`user-${order.user}`).emit('order-status-update', { orderId: order._id, status, order });
    }

    if (oldStatus !== status) {
      const user = await User.findById(order.user);
      if (user && user.email) {
        await sendOrderStatusUpdate(user.email, order);
      }
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
