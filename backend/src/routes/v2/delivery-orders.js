const express = require('express');
const Order = require('../../models/Order');
const DeliveryCompany = require('../../models/DeliveryCompany');
const DeliveryPartner = require('../../models/DeliveryPartner');
const authMiddleware = require('../../middleware/auth');
const { deliveryRiderGuard, customerGuard } = require('../../middleware/routeGuards');
const DeliveryConfirmationService = require('../../services/DeliveryConfirmationService');
const router = express.Router();

// Helper: Generate OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper: Store OTP in Redis
async function storeOTP(orderId, otp) {
  const redis = require('redis');
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  await client.connect();
  await client.setEx(`order_otp_${orderId}`, 600, otp); // 10 minutes TTL
  await client.disconnect();
}

// PATCH /api/v2/delivery/orders/:id/accept
router.patch('/orders/:id/accept', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: delivery company only
    const company = await DeliveryCompany.findOne({ owner: req.user.id });
    if (!company || order.deliveryCompany.toString() !== company._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this delivery' });
    }

    order.status = 'accepted_by_delivery';
    await order.save();

    // Emit order_accepted to customer room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_accepted', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/delivery/orders/:id/decline
router.patch('/orders/:id/decline', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: delivery company only
    const company = await DeliveryCompany.findOne({ owner: req.user.id });
    if (!company || order.deliveryCompany.toString() !== company._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to decline this delivery' });
    }

    order.status = 'pending_delivery';
    order.deliveryCompany = null;
    await order.save();

    // Emit order_declined to customer room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_declined', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/delivery/orders/:id/assign-rider
router.post('/orders/:id/assign-rider', authMiddleware, async (req, res) => {
  try {
    const { riderId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: delivery company only
    const company = await DeliveryCompany.findOne({ owner: req.user.id });
    if (!company || order.deliveryCompany.toString() !== company._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to assign rider' });
    }

    // Verify rider belongs to this delivery company
    const rider = await DeliveryPartner.findOne({ _id: riderId, deliveryCompany: company._id });
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found or not part of this company' });
    }

    order.deliveryPartner = rider._id;
    order.status = 'assigned';
    await order.save();

    // Emit order_assigned to rider room AND customer room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`rider_${riderId}`).emit('order_assigned', order);
      io.of('/orders').to(`customer_${order.user}`).emit('order_assigned', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/delivery/orders/:id/picked-up
router.patch('/orders/:id/picked-up', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: assigned rider only
    if (order.deliveryPartner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to confirm pickup' });
    }

    order.status = 'picked_up';
    await order.save();

    // Emit order_picked_up to customer room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_picked_up', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/delivery/orders/:id/delivered
router.patch('/orders/:id/delivered', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: assigned rider only
    if (order.deliveryPartner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to confirm delivery' });
    }

    order.status = 'delivered';
    order.otp = generateOTP();
    await order.save();

    // Store OTP in Redis with 10min TTL
    await storeOTP(order._id, order.otp);

    // Send OTP to customer via email (Nodemailer)
    // TODO: Implement email sending

    // Emit order_delivered to customer room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_delivered', order);
    }

    res.json({ order, otp: order.otp });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/delivery/orders/:id/confirm-arrival - Rider confirms arrival, generates customer verification code
router.post('/orders/:id/confirm-arrival', authMiddleware, deliveryRiderGuard, async (req, res) => {
  try {
    const result = await DeliveryConfirmationService.riderConfirmArrival(
      req.params.id,
      req.user.id
    );
    res.json({
      order: result.order,
      customerNotified: false,
      message: 'Arrival confirmed. Verification code sent to customer.'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/delivery/orders/:id/confirm-customer - Customer verifies to complete delivery
router.post('/orders/:id/confirm-customer', authMiddleware, customerGuard, async (req, res) => {
  try {
    const { verificationCode } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized for this order' });
    }

    const result = await DeliveryConfirmationService.customerConfirmDelivery(
      req.params.id,
      verificationCode,
      order.deliveryPartner
    );

    res.json({ order: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/delivery/orders/:id/resend-code - Resend verification code
router.post('/orders/:id/resend-code', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryConfirmation.customerConfirmed) {
      return res.status(400).json({ message: 'Delivery already confirmed' });
    }

    // Only allow customer or assigned rider to resend
    const isCustomer = order.user.toString() === req.user.id;
    const isRider = order.deliveryPartner?.toString() === req.user.id;
    if (!isCustomer && !isRider) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const newCode = DeliveryConfirmationService.generateVerificationCode();
    order.deliveryConfirmation.customerVerificationCode = newCode;
    await order.save();

    res.json({ message: 'Verification code resent', sentAt: new Date() });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
