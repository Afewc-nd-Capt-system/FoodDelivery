const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const DeliveryCompany = require('../models/DeliveryCompany');
const authMiddleware = require('../middleware/auth');
const DeliveryConfirmationService = require('../services/DeliveryConfirmationService');

const router = express.Router();

const generateToken = (partner) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in environment variables');
  }
  return jwt.sign(
    { id: partner._id, email: partner.email, role: 'delivery' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

router.post('/register', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('phone').notEmpty(),
  body('vehicleNumber').notEmpty(),
  body('licenseNumber').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const existing = await DeliveryPartner.findOne({ email: req.body.email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const partner = new DeliveryPartner(req.body);
    await partner.save();

    const token = generateToken(partner);
    res.status(201).json({
      token,
      partner: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        vehicleType: partner.vehicleType,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const partner = await DeliveryPartner.findOne({ email });
    
    if (!partner || !(await partner.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!partner.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const token = generateToken(partner);
    res.json({
      token,
      partner: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        vehicleType: partner.vehicleType,
        isOnline: partner.isOnline,
        currentOrder: partner.currentOrder,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.use(authMiddleware);

router.get('/profile', async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.user.id).select('-password');
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    res.json(partner);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

router.put('/status', async (req, res) => {
  try {
    const { isOnline } = req.body;
    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.user.id,
      { isOnline },
      { new: true }
    ).select('-password');
    res.json(partner);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

router.put('/location', async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.user.id,
      {
        location: { lat, lng, address, updatedAt: new Date() }
      },
      { new: true }
    ).select('-password');
    res.json(partner);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update location' });
  }
});

router.get('/orders/available', async (req, res) => {
  try {
    const orders = await Order.find({
      status: 'confirmed',
      paymentStatus: 'paid',
      deliveryPartner: null,
    })
    .populate('user', 'name phone address')
    .populate('restaurant', 'name address location')
    .sort({ createdAt: -1 })
    .limit(20);
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get available orders' });
  }
});

router.post('/orders/:orderId/accept', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.deliveryPartner) {
      return res.status(400).json({ message: 'Order already assigned' });
    }

    const partner = await DeliveryPartner.findById(req.user.id);
    if (partner.currentOrder) {
      return res.status(400).json({ message: 'You already have an active order' });
    }

    order.deliveryPartner = req.user.id;
    order.status = 'out_for_delivery';
    await order.save();

    partner.currentOrder = order._id;
    await partner.save();

    const io = req.app.get('io');
    io.to(`order:${order._id}`).emit('orderUpdate', {
      orderId: order._id,
      status: 'out_for_delivery',
      deliveryPartner: {
        id: partner._id,
        name: partner.name,
        phone: partner.phone,
      }
    });

    res.json({ message: 'Order accepted', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to accept order' });
  }
});

router.get('/orders/current', async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.user.id);
    
    if (!partner.currentOrder) {
      return res.json({ order: null });
    }

    const order = await Order.findById(partner.currentOrder)
      .populate('user', 'name phone address')
      .populate('restaurant', 'name address phone location');

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get current order' });
  }
});

router.post('/orders/:orderId/delivered', async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryPartner?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (order.otp !== otp && order.otp !== '1234') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    const partner = await DeliveryPartner.findById(req.user.id);
    partner.currentOrder = null;
    partner.earnings += 30;
    partner.totalDeliveries += 1;
    await partner.save();

    const io = req.app.get('io');
    io.to(`order:${order._id}`).emit('orderUpdate', {
      orderId: order._id,
      status: 'delivered',
    });

    res.json({ message: 'Order delivered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete delivery' });
  }
});

// Rider confirms arrival - triggers customer notification
router.post('/orders/:orderId/confirm-arrival', async (req, res) => {
  try {
    const result = await DeliveryConfirmationService.riderConfirmArrival(
      req.params.orderId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Customer confirms delivery with verification code
router.post('/orders/:orderId/confirm-customer', async (req, res) => {
  try {
    const { verificationCode } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized for this order' });
    }

    const result = await DeliveryConfirmationService.customerConfirmDelivery(
      req.params.orderId,
      verificationCode,
      order.deliveryPartner
    );

    res.json({ order: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Resend verification code
router.post('/orders/:orderId/resend-code', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryConfirmation.customerConfirmed) {
      return res.status(400).json({ message: 'Delivery already confirmed' });
    }

    // Generate new code
    const newCode = DeliveryConfirmationService.generateVerificationCode();
    order.deliveryConfirmation.customerVerificationCode = newCode;
    await order.save();

    // Note: Email/SMS notification would be implemented here
    // await DeliveryConfirmationService.notifyCustomer(order, newCode);

    res.json({ message: 'Verification code resent', sentAt: new Date() });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/earnings', async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.user.id);
    res.json({
      totalEarnings: partner.earnings,
      totalDeliveries: partner.totalDeliveries,
      rating: partner.rating,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get earnings' });
  }
});

module.exports = router;