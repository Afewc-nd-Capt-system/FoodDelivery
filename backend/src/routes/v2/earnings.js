const express = require('express');
const Commission = require('../../models/Commission');
const Order = require('../../models/Order');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const DeliveryCompany = require('../../models/DeliveryCompany');
const DeliveryPartner = require('../../models/DeliveryPartner');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

// Every endpoint here resolves the business from the authenticated user and
// filters the commission ledger on that business id only. No client-supplied
// id is ever trusted, and ledger rows without a tenant belong to no business.

function mapCommissions(commissions, fields) {
  return commissions
    .filter((c) => c.orderId) // skip rows whose order was deleted
    .map((c) => ({
      orderId: c.orderId._id,
      ...fields(c),
      status: c.status,
      paidAt: c.paidAt,
      createdAt: c.createdAt,
    }));
}

async function tenantTotals(type, tenantId) {
  const commissions = await Commission.find({ type, tenant: tenantId });
  let totalEarned = 0;
  let pendingEarnings = 0;
  for (const c of commissions) {
    if (c.status === 'paid') totalEarned += c.netAmount;
    else if (c.status === 'pending') pendingEarnings += c.netAmount;
  }
  return { totalEarned, pendingEarnings };
}

// POST /api/v2/vendors/payout-request
router.post('/vendors/payout-request', authMiddleware, async (req, res) => {
  try {
    const vendor = await await Vendor.findOwnedBy(req.user);
    if (!vendor) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only THIS vendor's unpaid commissions.
    const unpaidCommissions = await Commission.find({
      type: 'vendor',
      tenant: vendor._id,
      status: 'pending',
    }).populate('orderId');

    if (unpaidCommissions.length === 0) {
      return res.status(400).json({ message: 'No unpaid earnings available' });
    }

    const totalAmount = unpaidCommissions.reduce((sum, c) => sum + c.netAmount, 0);
    const commissionIds = unpaidCommissions.map((c) => c._id);
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

    // Only THIS restaurant's unpaid commissions.
    const unpaidCommissions = await Commission.find({
      type: 'restaurant',
      tenant: restaurant._id,
      status: 'pending',
    }).populate('orderId');

    if (unpaidCommissions.length === 0) {
      return res.status(400).json({ message: 'No unpaid earnings available' });
    }

    const totalAmount = unpaidCommissions.reduce((sum, c) => sum + c.netAmount, 0);
    const commissionIds = unpaidCommissions.map((c) => c._id);
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
    const vendor = await await Vendor.findOwnedBy(req.user);
    if (!vendor) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const commissions = await Commission.find({ type: 'vendor', tenant: vendor._id })
      .populate('orderId')
      .sort({ createdAt: -1 });

    const earnings = mapCommissions(commissions, (c) => ({
      orderTotal: c.gross,
      commissionRate: c.commissionRate,
      commissionAmount: c.commissionAmount,
      netAmount: c.netAmount,
    }));

    const { totalEarned, pendingEarnings } = await tenantTotals('vendor', vendor._id);

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

    const commissions = await Commission.find({ type: 'restaurant', tenant: restaurant._id })
      .populate('orderId')
      .sort({ createdAt: -1 });

    const earnings = mapCommissions(commissions, (c) => ({
      orderTotal: c.gross,
      commissionRate: c.commissionRate,
      commissionAmount: c.commissionAmount,
      netAmount: c.netAmount,
    }));

    const { totalEarned, pendingEarnings } = await tenantTotals('restaurant', restaurant._id);

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

    const commissions = await Commission.find({ type: 'delivery', tenant: company._id })
      .populate('orderId')
      .sort({ createdAt: -1 });

    const earnings = mapCommissions(commissions, (c) => ({
      deliveryFee: c.gross,
      netAmount: c.netAmount,
    }));

    const { totalEarned, pendingEarnings } = await tenantTotals('delivery', company._id);

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
    const earnings = orders.map((o) => ({
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
