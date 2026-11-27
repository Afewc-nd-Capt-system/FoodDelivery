'use strict';

const express = require('express');
const Order = require('../../models/Order');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');

const router = express.Router();
router.use(authMiddleware, adminGuard);

// GET /api/v2/admin/orders/:id/payment-audit
router.get('/:id/payment-audit', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('paymentAudit paymentRequestedAmount paymentChargedAmount paymentFees paymentFeeMismatch paymentStatus status paystackReference totalAmount currency user')
      .lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({
      success: true,
      order: {
        id: order._id,
        user: order.user,
        status: order.status,
        paymentStatus: order.paymentStatus,
        reference: order.paystackReference,
        requestedAmount: order.paymentRequestedAmount,
        chargedAmount: order.paymentChargedAmount,
        fees: order.paymentFees,
        feeMismatch: order.paymentFeeMismatch,
        totalAmount: order.totalAmount,
        currency: order.currency,
      },
      paymentAudit: order.paymentAudit || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
