const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const requireVerifiedEmail = require('../middleware/requireVerifiedEmail');
const Order = require('../models/Order');
const User = require('../models/User');
const { frontendUrl } = require('../config/frontend');
const { estimatedProcessingFee } = require('../services/paystackFees');
const mailService = require('../services/mailService');

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
// Test-only override; production keeps the real Paystack host.
const paystackBaseUrl = process.env.PAYSTACK_API_BASE_URL || 'https://api.paystack.co';

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
  const expectedAmount = Number(order.paymentRequestedAmount)
    || Math.round(Number(order.totalAmount || 0) * 100);
  const expectedCurrency = String(order.currency || 'NGN').toUpperCase();
  // Paystack returns the amount we requested separately from the charged
  // amount (which includes their customer fee). Compare the requested amount.
  const actualRequested = Number(payment?.requested_amount ?? expectedAmount);
  const actualCurrency = String(payment?.currency || '').toUpperCase();

  if (!Number.isInteger(actualRequested) || actualRequested !== expectedAmount
    || actualCurrency !== expectedCurrency) {
    const error = new Error(
      `Payment requested amount/currency does not match the order (expected ₦${(expectedAmount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${expectedCurrency})`
    );
    error.status = 400;
    throw error;
  }
}

function paymentAuditEntry(source, event, payment) {
  const data = payment || {};
  return {
    source,
    event: String(event || ''),
    status: String(data.status || ''),
    reference: String(data.reference || ''),
    amount: Number(data.amount || 0),
    requested_amount: Number(data.requested_amount ?? 0),
    currency: String(data.currency || ''),
    fees: Number(data.fees || 0),
    channel: String(data.channel || ''),
    gateway_response: String(data.gateway_response || ''),
    paid_at: data.paid_at ? String(data.paid_at) : '',
    receivedAt: new Date(),
  };
}

function appendPaymentAudit(order, source, event, payment) {
  const entry = paymentAuditEntry(source, event, payment);
  order.paymentAudit = [...(order.paymentAudit || []), entry].slice(-50);
  return entry;
}

async function notifyPaymentReview(order, reason) {
  const owner = String(process.env.EMAIL_OWNER || '').trim();
  if (!owner) return;
  try {
    await mailService.queueEmail({
      type: 'payment-review',
      to: owner,
      subject: `Payment needs review — order ${String(order._id).slice(-8).toUpperCase()}`,
      text: `A Paystack payment succeeded but could not be auto-confirmed.\n\nOrder: ${order._id}\nCustomer: ${order.user}\nReference: ${order.paystackReference || 'n/a'}\nRequested: ₦${(Number(order.paymentRequestedAmount || 0) / 100).toFixed(2)}\nCharged: ₦${(Number(order.paymentChargedAmount || 0) / 100).toFixed(2)}\nReason: ${reason}\n\nReview it in the admin payments list.`,
    });
  } catch (error) {
    console.error('[payments] owner review email failed:', error.message);
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

  if (String(order.status) === 'payment_review' && String(order.paystackReference) === String(reference)) {
    return { order, review: true, alreadyProcessed: true };
  }

  order.paymentChargedAmount = Number(payment?.amount || 0);
  order.paymentFees = Number(payment?.fees || 0);
  const requestedAmount = Number(order.paymentRequestedAmount || 0);
  const expectedTotal = Math.round(Number(order.totalAmount || 0) * 100);
  const expectedCharged = requestedAmount + Math.round(Number(order.paymentProcessingFee || 0) * 100);
  if (expectedCharged > 0 && Math.abs(Number(payment?.amount || 0) - expectedCharged) > 2000) {
    order.paymentFeeMismatch = true;
  }

  const confirmationOk = String(payment?.status || '') === 'success'
    && Boolean(order.paystackReference)
    && String(order.paystackReference) === String(reference)
    && Number.isInteger(requestedAmount)
    && requestedAmount === expectedTotal
    && String(payment?.currency || '').toUpperCase() === 'NGN'
    && Number(payment?.amount || 0) >= requestedAmount;

  if (!confirmationOk) {
    order.status = 'payment_review';
    order.paymentStatus = 'review';
    order.paystackReference = reference;
    await order.save();
    if (!order.paymentReviewNotified) {
      order.paymentReviewNotified = true;
      await order.save();
      await notifyPaymentReview(order, 'Paystack success failed the confirmation rules (reference/requested amount/currency/underpayment).');
    }
    return { order, review: true, alreadyProcessed: false };
  }

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

  appendPaymentAudit(order, 'verify', data.data?.status === 'success' ? 'charge.success' : 'charge.failed', data.data);
  await order.save();

  return markOrderPaid(req, order, reference, data.data);
}

router.post('/initialize', authMiddleware, requireVerifiedEmail, async (req, res) => {
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
    // Paystack's dashboard passes its fee to the customer on top of this.
    const amount = Math.round(Number(order.totalAmount || 0) * 100);
    const processingFee = estimatedProcessingFee(order.totalAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ message: 'Order has no payable amount' });
    }

    order.paymentRequestedAmount = amount;
    order.paymentProcessingFee = processingFee;
    const reference = `order_${order._id}_${Date.now()}`;
    order.paystackReference = reference;
    await order.save();

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
        reference,
        callback_url: frontendUrl('/orders/verify'),
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
      processingFee,
      currency: String(order.currency || 'NGN').toUpperCase(),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get('/verify/:reference', authMiddleware, async (req, res) => {
  try {
    const { order, alreadyProcessed, review } = await verifyReference(req, req.params.reference);
    res.json({
      message: review
        ? 'Payment received and under review'
        : (alreadyProcessed ? 'Payment already verified' : 'Payment verified successfully'),
      alreadyProcessed,
      review: Boolean(review),
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
    const { order, alreadyProcessed, review } = await verifyReference(req, req.body?.reference);
    res.json({
      message: review
        ? 'Payment received and under review'
        : (alreadyProcessed ? 'Payment already verified' : 'Payment verified successfully'),
      alreadyProcessed,
      review: Boolean(review),
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
    if (existingOrder?.isPaid) {
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

    appendPaymentAudit(order, 'webhook', event.event, event.data);
    await order.save();

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
