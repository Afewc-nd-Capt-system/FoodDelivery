const express = require('express');
const authMiddleware = require('../../middleware/auth');
const Dispute = require('../../models/Dispute');
const Order = require('../../models/Order');
const Wallet = require('../../models/Wallet');
const axios = require('axios');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { orderId, type, description, evidence } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Can only dispute delivered orders' });
    }

    const existingDispute = await Dispute.findOne({ order: orderId, status: { $ne: 'rejected' } });
    if (existingDispute) return res.status(400).json({ success: false, message: 'Dispute already exists for this order' });

    const dispute = new Dispute({ order: orderId, user: req.user.id, type, description, evidence: evidence || [] });
    await dispute.save();

    res.status(201).json({ success: true, data: dispute, message: 'Dispute submitted for review' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const disputes = await Dispute.find({ user: req.user.id, deletedAt: null }).sort({ createdAt: -1 }).populate('order', 'status totalAmount restaurantName');
    res.json({ success: true, data: disputes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;