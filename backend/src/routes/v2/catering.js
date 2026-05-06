const express = require('express');
const authMiddleware = require('../../middleware/auth');
const CateringRequest = require('../../models/CateringRequest');
const Restaurant = require('../../models/Restaurant');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, eventType, eventDate, numberOfPeople, menuPreference, budgetRange, specialRequirements, contactName, contactPhone, contactEmail } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.acceptsCatering) {
      return res.status(400).json({ success: false, message: 'Restaurant does not accept catering orders' });
    }

    if (numberOfPeople < 20) {
      return res.status(400).json({ success: false, message: 'Catering requires minimum 20 people' });
    }

    const request = new CateringRequest({
      restaurant: restaurantId,
      user: req.user.id,
      eventType,
      eventDate,
      numberOfPeople,
      menuPreference,
      budgetRange,
      specialRequirements,
      contactName,
      contactPhone,
      contactEmail: contactEmail || req.user.email,
      status: 'pending'
    });

    await request.save();

    res.status(201).json({ success: true, data: request, message: 'Catering request submitted. Restaurant will provide a quote.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const requests = await CateringRequest.find({ user: req.user.id, deletedAt: null })
      .sort({ createdAt: -1 })
      .populate('restaurant', 'name');

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;