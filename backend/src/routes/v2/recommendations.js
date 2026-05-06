const express = require('express');
const authMiddleware = require('../../middleware/auth');
const recommendationService = require('../../services/recommendationService');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.id;

    const user = await require('../../models/User').findById(userId);
    const location = user?.address ? {
      area: user.address.state,
      city: user.address.city
    } : null;

    const recommendations = await recommendationService.getRecommendations(userId, location, parseInt(limit));

    res.json({
      success: true,
      data: recommendations,
      message: 'Recommendations fetched successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/dishes', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const dishes = await recommendationService.getDishRecommendations(req.user.id, parseInt(limit));

    res.json({
      success: true,
      data: dishes,
      message: 'Dish recommendations fetched successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const trending = await recommendationService.getTrendingItems(parseInt(limit));

    res.json({
      success: true,
      data: trending,
      message: 'Trending items fetched successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/track-order', authMiddleware, async (req, res) => {
  try {
    const { orderId, restaurantId, totalAmount } = req.body;

    if (!orderId || !restaurantId || !totalAmount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await recommendationService.updateUserPreference(req.user.id, {
      restaurant: restaurantId,
      totalAmount
    });

    res.json({
      success: true,
      message: 'User preference updated'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;