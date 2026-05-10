const express = require('express');
const Commission = require('../../models/Commission');
const Order = require('../../models/Order');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const DeliveryCompany = require('../../models/DeliveryCompany');
const DeliveryPartner = require('../../models/DeliveryPartner');
const authMiddleware = require('../../middleware/auth');
const commissionService = require('../../services/commissionService');
const router = express.Router();

// POST /api/v2/vendors/payout-request
router.post('/vendors/payout-request', authMiddleware, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.user.id });
    if (!vendor) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get unpaid commissions for this vendor
    const unpaidCommissions = await Commission.find({
      type: 'vendor',
      status: 'pending',
    }).populate('orderId');

    if (unpaidCommissions.length === 0) {
      return res.status(400).json({ message: 'No unpaid earnings available' });
    }

    // Calculate total unpaid amount
    const totalAmount = unpaidCommissions.reduce((sum, c) => sum + c.netAmount, 0);

    // Mark all as paid
    const commissionIds = unpaidCommissions.map(c => c._id);
    await Commission.updateMany(
      { _id: { $in: commissionIds } },
      { status: 'paid', paidAt: new Date() }
    );

    res.json({
      message: 'Payout request processed',
      totalAmount,
      commissionsPaid: unpaidCommissions.length,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/restaurants/payout-request
router.post('/restaurants/payout-request', authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get unpaid commissions for this restaurant
    const unpaidCommissions = await Commission.find({
      type: 'restaurant',
      status: 'pending',
    }).populate('orderId');

    if (unpaidCommissions.length === 0) {
      return res.status(400).json({ message: 'No unpaid earnings available' });
    }

    // Calculate total unpaid amount
    const totalAmount = unpaidCommissions.reduce((sum, c) => sum + c.netAmount, 0);

    // Mark all as paid
    const commissionIds = unpaidCommissions.map(c => c._id);
    await Commission.updateMany(
      { _id: { $in: commissionIds } },
      { status: 'paid', paidAt: new Date() }
    );

    res.json({
      message: 'Payout request processed',
      totalAmount,
      commissionsPaid: unpaidCommissions.length,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/vendors/earnings
router.get('/vendors/earnings', authMiddleware, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.user.id });
    if (!vendor) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const commissions = await Commission.find({ type: 'vendor' })
      .populate('orderId')
      .sort({ createdAt: -1 });

    const earnings = commissions.map(c => ({
      orderId: c.orderId._id,
      orderTotal: c.gross,
      commissionRate: c.commissionRate,
      commissionAmount: c.commissionAmount,
      netAmount: c.netAmount,
      status: c.status,
      paidAt: c.paidAt,
      createdAt: c.createdAt,
    }));

    const totalEarned = await commissionService.getTotalEarningsByType('vendor');
    const pendingEarnings = await commissionService.getPendingEarningsByType('vendor');

    res.json({
      earnings,
      totalEarned,
      pendingEarnings,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/restaurants/earnings
router.get('/restaurants/earnings', authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const commissions = await Commission.find({ type: 'restaurant' })
      .populate('orderId')
      .sort({ createdAt: -1 });

    const earnings = commissions.map(c => ({
      orderId: c.orderId._id,
      orderTotal: c.gross,
      commissionRate: c.commissionRate,
      commissionAmount: c.commissionAmount,
      netAmount: c.netAmount,
      status: c.status,
      paidAt: c.paidAt,
      createdAt: c.createdAt,
    }));

    const totalEarned = await commissionService.getTotalEarningsByType('restaurant');
    const pendingEarnings = await commissionService.getPendingEarningsByType('restaurant');

    res.json({
      earnings,
      totalEarned,
      pendingEarnings,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/delivery/earnings
router.get('/delivery/earnings', authMiddleware, async (req, res) => {
  try {
    const company = await DeliveryCompany.findOne({ owner: req.user.id });
    if (!company) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const commissions = await Commission.find({ type: 'delivery' })
      .populate('orderId')
      .sort({ createdAt: -1 });

    const earnings = commissions.map(c => ({
      orderId: c.orderId._id,
      deliveryFee: c.gross,
      netAmount: c.netAmount,
      status: c.status,
      paidAt: c.paidAt,
      createdAt: c.createdAt,
    }));

    const totalEarned = await commissionService.getTotalEarningsByType('delivery');
    const pendingEarnings = await commissionService.getPendingEarningsByType('delivery');

    res.json({
      earnings,
      totalEarned,
      pendingEarnings,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/riders/earnings
router.get('/riders/earnings', authMiddleware, async (req, res) => {
  try {
    const rider = await DeliveryPartner.findById(req.user.id);
    if (!rider) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get orders delivered by this rider
    const orders = await Order.find({ deliveryPartner: req.user.id, status: 'completed' })
      .sort({ deliveredAt: -1 });

    // Calculate earnings (assuming 80% of delivery fee goes to rider)
    const earnings = orders.map(o => ({
      orderId: o._id,
      deliveryFee: o.deliveryFee,
      riderShare: o.deliveryFee * 0.8,
      deliveredAt: o.deliveredAt,
    }));

    const totalEarned = earnings.reduce((sum, e) => sum + e.riderShare, 0);

    res.json({
      earnings,
      totalEarned,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
