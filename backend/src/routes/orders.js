const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurant, restaurantName, items, totalAmount, deliveryAddress, paymentMethod, deliveryFee } = req.body;

    if (!restaurant || !restaurantName || !items || !totalAmount || !deliveryAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (paymentMethod === 'cash') {
      const user = await User.findById(req.user.id);
      const restaurantDoc = await Restaurant.findById(restaurant);

      if (!user.payOnDeliveryEnabled) {
        return res.status(403).json({
          message: 'Pay on delivery is disabled for your account due to cancellation history. Please use online payment.',
          code: 'PAY_ON_DELIVERY_DISABLED'
        });
      }

      if (!restaurantDoc.payOnDeliveryEnabled) {
        return res.status(403).json({
          message: 'This restaurant does not offer pay on delivery. Please use online payment.',
          code: 'RESTAURANT_NO_PAY_ON_DELIVERY'
        });
      }

      if (totalAmount < restaurantDoc.minOrderForPayOnDelivery) {
        return res.status(403).json({
          message: `Minimum order amount for pay on delivery is $${restaurantDoc.minOrderForPayOnDelivery}. Please use online payment or add more items.`,
          code: 'AMOUNT_BELOW_MINIMUM'
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
      const user = await User.findById(req.user.id);
      
      user.consecutiveCancellations += 1;
      user.totalCancellations += 1;

      if (user.consecutiveCancellations >= 2 || user.totalCancellations >= 5) {
        user.payOnDeliveryEnabled = false;
        user.penaltyApplied = true;
        user.ordersSincePenalty = 0;
      }

      await user.save();
    }

    if (status === 'delivered' && isOrderOwner) {
      const user = await User.findById(req.user.id);
      
      user.consecutiveCancellations = 0;

      if (user.penaltyApplied) {
        user.ordersSincePenalty += 1;
        if (user.ordersSincePenalty >= 5) {
          user.payOnDeliveryEnabled = true;
          user.penaltyApplied = false;
          user.ordersSincePenalty = 0;
        }
      }

      await user.save();
    }

    order.status = status;
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
