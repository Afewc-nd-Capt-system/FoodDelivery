const express = require('express');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const RestaurantPromotion = require('../../models/RestaurantPromotion');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { deletedAt: null };
    if (status) query.approvalStatus = status;

    const total = await RestaurantPromotion.countDocuments(query);
    const promotions = await RestaurantPromotion.find(query)
      .populate('restaurant', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: promotions,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await RestaurantPromotion.findOne({ _id: id, deletedAt: null });

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    if (promotion.approvalStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'Promotion already reviewed' });
    }

    promotion.approvalStatus = 'approved';
    promotion.approvedBy = req.user.id;
    promotion.approvedAt = new Date();
    await promotion.save();

    res.json({
      success: true,
      data: promotion,
      message: 'Promotion approved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const promotion = await RestaurantPromotion.findOne({ _id: id, deletedAt: null });

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    if (promotion.approvalStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'Promotion already reviewed' });
    }

    promotion.approvalStatus = 'rejected';
    promotion.approvedBy = req.user.id;
    promotion.approvedAt = new Date();
    promotion.rejectionReason = reason || 'Rejected by admin';
    await promotion.save();

    res.json({
      success: true,
      data: promotion,
      message: 'Promotion rejected'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;