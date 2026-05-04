const express = require('express');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurant, restaurantName, items, totalAmount, deliveryAddress, paymentMethod, deliveryFee } = req.body;

    if (!restaurant || !restaurantName || !items || !totalAmount || !deliveryAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
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
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('restaurant', 'name');
    res.json(orders);
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

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
