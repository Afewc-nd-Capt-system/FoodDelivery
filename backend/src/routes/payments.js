const express = require('express');
const authMiddleware = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_your_key_here';
const paystackBaseUrl = 'https://api.paystack.co';

router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const { orderId, email, amount } = req.body;

    if (!orderId || !email || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const response = await fetch(`${paystackBaseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        reference: `order_${orderId}_${Date.now()}`,
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/verify`,
        metadata: {
          orderId,
          userId: req.user.id.toString(),
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ message: data.message });
    }

    res.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/verify/:reference', authMiddleware, async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await fetch(`${paystackBaseUrl}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const orderId = data.data.metadata.orderId;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.paymentStatus = 'paid';
    order.isPaid = true;
    order.paystackReference = reference;
    order.status = 'confirmed';
    await order.save();

    res.json({ message: 'Payment verified successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const hash = req.headers['x-paystack-signature'];
    const crypto = require('crypto');
    const expectedHash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== expectedHash) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const orderId = event.data.metadata.orderId;

      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.isPaid = true;
        order.paystackReference = reference;
        order.status = 'confirmed';
        await order.save();
      }
    }

    res.json({ message: 'Webhook processed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/eligibility', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { restaurantId, totalAmount } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID required' });
    }

    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const isEligible =
      user.payOnDeliveryEnabled &&
      restaurant.payOnDeliveryEnabled &&
      totalAmount >= restaurant.minOrderForPayOnDelivery;

    res.json({
      eligible: isEligible,
      reason: !isEligible
        ? !user.payOnDeliveryEnabled
          ? 'Pay on delivery disabled due to cancellation history'
          : !restaurant.payOnDeliveryEnabled
          ? 'Restaurant does not offer pay on delivery'
          : 'Order amount below minimum for pay on delivery'
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
