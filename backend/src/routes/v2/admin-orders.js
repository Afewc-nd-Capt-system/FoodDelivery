'use strict';

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');
const Order = require('../../models/Order');
const Commission = require('../../models/Commission');

const router = express.Router();
router.use(authMiddleware, adminGuard);

// Admin-only hard delete used by the production e2e cleanup so test orders are
// never left behind. Only reachable by an authenticated admin.
router.delete('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    // A cash test order should not have commissions, but remove any ledger rows
    // that reference it so no orphaned records remain.
    await Commission.deleteMany({ orderId: order._id }).catch(() => {});
    res.json({ success: true, deleted: String(order._id) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
