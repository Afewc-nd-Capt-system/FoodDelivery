const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const paystackBaseUrl = 'https://api.paystack.co';

function getRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  return Buffer.from(JSON.stringify(req.body || {}));
}

function isValidSignature(req) {
  const signature = req.headers['x-paystack-signature'];
  if (!PAYSTACK_SECRET_KEY || !signature || typeof signature !== 'string') return false;

  const expected = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(getRawBody(req))
    .digest('hex');

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function parseWebhookEvent(req) {
  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString('utf8'));
  }
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length) {
    return JSON.parse(req.rawBody.toString('utf8'));
  }
  return req.body || {};
}

function emitNewOrder(req, order) {
  const io = req.app.get('io');
  if (!io) return;

  const roomId = order.restaurant
    ? `restaurant_${order.restaurant}`
    : `vendor_${order.vendor}`;
  io.of('/orders').to(roomId).emit('new_order', order);
}

function assertPaymentMatchesOrder(order, payment) {
  const expectedAmount = Math.round(Number(order.totalAmount || 0) * 100);
  const expectedCurrency = String(order.currency || 'NGN').toUpperCase();
  const actualAmount = Number(payment?.amount);
  const actualCurrency = String(payment?.currency || '').toUpperCase();

  if (!Number.isInteger(actualAmount) || actualAmount !== expectedAmount
    || actualCurrency !== expectedCurrency) {
    const error = new Error(
      `Payment amount/currency does not match order (expected ${expectedAmount} ${expectedCurrency})`
    );
    error.status = 400;
    throw error;
  }
}

async function markOrderPaid(req, order, reference, payment) {
  if (order.isPaid) {
    return { order, alreadyProcessed: true };
  }

  if (String(order.status) === 'cancelled') {
    const error = new Error('Order is cancelled');
    error.status = 409;
    throw error;
  }

  assertPaymentMatchesOrder(order, payment);

  order.paymentStatus = 'paid';
  order.isPaid = true;
  order.paystackReference = reference;
  order.status = 'confirmed';
  await order.save();

  emitNewOrder(req, order);
  return { order, alreadyProcessed: false };
}

async function verifyReference(req, reference) {
  if (!reference) {
    const error = new Error('Payment reference is required');
    error.status = 400;
    throw error;
  }

  // A webhook may already have processed this payment. Return success without
  // calling Paystack again so the verify page is idempotent.
  const alreadyPaid = await Order.findOne({
    paystackReference: reference,
    user: req.user.id,
  });
  if (alreadyPaid?.isPaid) {
    return { order: alreadyPaid, alreadyProcessed: true };
  }

  const response = await fetch(`${paystackBaseUrl}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const data = await response.json();

  if (!data.status || data.data?.status !== 'success') {
    const error = new Error('Payment verification failed');
    error.status = 400;
    throw error;
  }

  const orderId = data.data.metadata?.orderId;
  if (!orderId) {
    const error = new Error('Payment reference has no order metadata');
    error.status = 400;
    throw error;
  }

  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  return markOrderPaid(req, order, reference, data.data);
}

router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (String(order.user) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to pay for this order' });
    }
    if (order.isPaid || order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order is already paid' });
    }
    if (String(order.status) !== 'pending') {
      return res.status(400).json({ message: 'Order is not awaiting payment' });
    }

    // The amount is always the server-computed order total, never req.body.amount.
    const amount = Math.round(Number(order.totalAmount || 0) * 100);
    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ message: 'Order has no payable amount' });
    }

    const user = await User.findById(req.user.id).select('email');
    if (!user?.email) {
      return res.status(400).json({ message: 'Account email is required for payment' });
    }

    const response = await fetch(`${paystackBaseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount,
        reference: `order_${order._id}_${Date.now()}`,
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/verify`,
        metadata: {
          orderId: String(order._id),
          userId: String(req.user.id),
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
      amount,
      currency: String(order.currency || 'NGN').toUpperCase(),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get('/verify/:reference', authMiddleware, async (req, res) => {
  try {
    const { order, alreadyProcessed } = await verifyReference(req, req.params.reference);
    res.json({
      message: alreadyProcessed ? 'Payment already verified' : 'Payment verified successfully',
      alreadyProcessed,
      order,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// POST /api/v2/payments/verify
// The checkout callback page uses this form; keep GET /verify/:reference for
// backwards compatibility with older clients.
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { order, alreadyProcessed } = await verifyReference(req, req.body?.reference);
    res.json({
      message: alreadyProcessed ? 'Payment already verified' : 'Payment verified successfully',
      alreadyProcessed,
      order,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    if (!isValidSignature(req)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = parseWebhookEvent(req);

    if (event.event !== 'charge.success') {
      return res.json({ message: 'Webhook ignored' });
    }

    if (event.data?.status && event.data.status !== 'success') {
      return res.json({ message: 'Webhook ignored: charge is not successful' });
    }

    const reference = event.data?.reference;
    const orderId = event.data?.metadata?.orderId;
    const metadataUserId = event.data?.metadata?.userId;

    if (!reference || !orderId) {
      return res.status(400).json({ message: 'Webhook missing reference or order metadata' });
    }

    // Webhook retries are expected. A reference already recorded on an order
    // means this exact charge has been processed.
    const existingOrder = await Order.findOne({ paystackReference: reference });
    if (existingOrder) {
      return res.json({ message: 'Webhook already processed' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (metadataUserId && String(metadataUserId) !== String(order.user)) {
      return res.status(400).json({ message: 'Webhook metadata does not match order' });
    }

    if (order.isPaid) {
      return res.json({ message: 'Webhook already processed' });
    }

    const result = await markOrderPaid(req, order, reference, event.data);
    res.json({
      message: result.alreadyProcessed ? 'Webhook already processed' : 'Webhook processed',
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
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
