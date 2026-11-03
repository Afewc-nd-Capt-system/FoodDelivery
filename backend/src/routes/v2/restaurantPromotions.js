const express = require('express');
const authMiddleware = require('../../middleware/auth');
const RestaurantPromotion = require('../../models/RestaurantPromotion');
const Restaurant = require('../../models/Restaurant');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// The restaurant identity always comes from the authenticated owner. A
// restaurantId in params/body/query is only honored when it matches the
// owner's own restaurant (admins may manage any).
async function resolveRestaurant(req, requestedId) {
  if (req.user.role === 'admin') {
    if (requestedId) return Restaurant.findById(requestedId);
    return null;
  }
  const restaurant = await Restaurant.findOne({ owner: req.user.id });
  if (restaurant && requestedId) {
    return String(restaurant._id) === String(requestedId) ? restaurant : null;
  }
  return restaurant;
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, status } = req.query;
    const restaurant = await resolveRestaurant(req, restaurantId);

    if (!restaurant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const query = { restaurant: restaurant._id, deletedAt: null };
    if (status) query.approvalStatus = status;

    const promotions = await RestaurantPromotion.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: promotions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authMiddleware, [
  body('name').notEmpty().trim(),
  body('discountType').isIn(['percentage', 'fixed']),
  body('discountValue').isNumeric(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const requestedId = req.body.restaurantId;
    const restaurant = await resolveRestaurant(req, requestedId);
    if (!restaurant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, description, discountType, discountValue, minOrderValue, maxDiscount, startDate, endDate, maxUsage, isBundle, bundleItems } = req.body;

    const promotion = new RestaurantPromotion({
      restaurant: restaurant._id,
      name,
      description,
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      maxDiscount,
      startDate,
      endDate,
      maxUsage,
      approvalStatus: 'pending',
      isBundle: isBundle || false,
      bundleItems: isBundle ? bundleItems : []
    });

    await promotion.save();

    res.status(201).json({
      success: true,
      data: promotion,
      message: 'Promotion created and pending admin approval'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const promotion = await RestaurantPromotion.findOne({ _id: id, deletedAt: null });

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    // Ownership check: the promotion must belong to the signed-in owner's
    // restaurant (admins bypass).
    const restaurant = await resolveRestaurant(req, String(promotion.restaurant));
    if (!restaurant || String(promotion.restaurant) !== String(restaurant._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (promotion.approvalStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot update approved/rejected promotions' });
    }

    const allowedUpdates = ['name', 'description', 'discountType', 'discountValue', 'minOrderValue', 'maxDiscount', 'startDate', 'endDate', 'maxUsage', 'isBundle', 'bundleItems'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        promotion[field] = updates[field];
      }
    });

    await promotion.save();

    res.json({
      success: true,
      data: promotion,
      message: 'Promotion updated'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await RestaurantPromotion.findOne({ _id: id, deletedAt: null });

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    const restaurant = await resolveRestaurant(req, String(promotion.restaurant));
    if (!restaurant || String(promotion.restaurant) !== String(restaurant._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    promotion.deletedAt = new Date();
    await promotion.save();

    res.json({
      success: true,
      message: 'Promotion deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
