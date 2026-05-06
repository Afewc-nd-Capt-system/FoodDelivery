const express = require('express');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const Dispute = require('../../models/Dispute');
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { deletedAt: null };
    if (status) query.status = status;
    const disputes = await Dispute.find(query).populate('order user', 'name email').sort({ createdAt: -1 }).limit(parseInt(limit)).skip((parseInt(page) - 1) * parseInt(limit));
    const total = await Dispute.countDocuments(query);
    res.json({ success: true, data: disputes, pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/resolve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { resolution, refundAmount, adminNotes } = req.body;
    const dispute = await Dispute.findById(req.params.id).populate('order');
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.refundAmount = refundAmount || 0;
    dispute.resolvedBy = req.user.id;
    dispute.resolvedAt = new Date();
    dispute.adminNotes = adminNotes;
    await dispute.save();

    if (refundAmount > 0 && resolution !== 'rejected') {
      let wallet = await Wallet.findOne({ user: dispute.user, deletedAt: null });
      if (!wallet) wallet = await Wallet.create({ user: dispute.user, balance: 0, currency: 'NGN', isActive: true });
      wallet.balance += refundAmount;
      await wallet.save();
      await WalletTransaction.create({ wallet: wallet._id, user: dispute.user, type: 'credit', amount: refundAmount, description: 'Refund for dispute', reference: 'REFUND-' + dispute._id });
    }

    res.json({ success: true, message: 'Dispute resolved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;