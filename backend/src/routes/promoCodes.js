const express = require('express');
const { body, validationResult } = require('express-validator');
const PromoCode = require('../models/PromoCode');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/auth');
const { xssProtection } = require('../middleware/sanitize');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const promoCodes = await PromoCode.find({
      isActive: true,
      validUntil: { $gt: new Date() },
      $or: [
        { usageLimit: null },
        { usageCount: { $lt: '$usageLimit' } }
      ]
    });
    res.json(promoCodes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get promo codes' });
  }
});

router.post('/validate', [
  body('code').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ valid: false, message: 'Invalid code' });
    }

    const { code, restaurantId, orderAmount } = req.body;
    const promo = await PromoCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!promo) {
      return res.json({ valid: false, message: 'Invalid promo code' });
    }

    if (new Date() > new Date(promo.validUntil)) {
      return res.json({ valid: false, message: 'Promo code expired' });
    }

    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return res.json({ valid: false, message: 'Promo code usage limit reached' });
    }

    if (orderAmount < promo.minOrderAmount) {
      return res.json({ 
        valid: false, 
        message: `Minimum order amount is ₹${promo.minOrderAmount}` 
      });
    }

    if (promo.applicableRestaurants.length > 0 && restaurantId) {
      const isApplicable = promo.applicableRestaurants.some(
        r => r.toString() === restaurantId
      );
      if (!isApplicable) {
        return res.json({ valid: false, message: 'Promo not applicable for this restaurant' });
      }
    }

    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = (orderAmount * promo.discountValue) / 100;
      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else {
      discount = Math.min(promo.discountValue, orderAmount);
    }

    res.json({
      valid: true,
      discount,
      promo: {
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to validate promo code' });
  }
});

router.use(authMiddleware);
router.use(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
});

router.get('/admin', async (req, res) => {
  try {
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 });
    res.json(promoCodes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get promo codes' });
  }
});

router.post('/', [
  body('code').notEmpty().trim(),
  body('discountType').isIn(['percentage', 'fixed']),
  body('discountValue').isFloat({ min: 0 }),
  body('validUntil').isISO8601(),
], xssProtection, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const promo = new PromoCode(req.body);
    await promo.save();
    res.status(201).json(promo);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Promo code already exists' });
    }
    res.status(500).json({ message: 'Failed to create promo code' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!promo) {
      return res.status(404).json({ message: 'Promo code not found' });
    }
    res.json(promo);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update promo code' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: 'Promo code not found' });
    }
    res.json({ message: 'Promo code deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete promo code' });
  }
});

router.post('/:id/use', async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      { $inc: { usageCount: 1 } },
      { new: true }
    );
    if (!promo) {
      return res.status(404).json({ message: 'Promo code not found' });
    }
    res.json(promo);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update promo code usage' });
  }
});

module.exports = router;