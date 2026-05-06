const express = require('express');
const authMiddleware = require('../../middleware/auth');
const TableReservation = require('../../models/TableReservation');
const Restaurant = require('../../models/Restaurant');
const { sendEmail } = require('../../utils/email');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, date, time, partySize, name, phone, email, specialRequests } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.supportsTableReservations) {
      return res.status(400).json({ success: false, message: 'Restaurant does not support reservations' });
    }

    const reservation = new TableReservation({
      restaurant: restaurantId,
      user: req.user.id,
      date,
      time,
      partySize,
      name,
      phone,
      email: email || req.user.email,
      specialRequests,
      status: 'pending'
    });

    await reservation.save();

    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Reservation request submitted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await TableReservation.countDocuments({ user: req.user.id, deletedAt: null });
    const reservations = await TableReservation.find({ user: req.user.id, deletedAt: null })
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('restaurant', 'name image address');

    res.json({ success: true, data: reservations, pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { date } = req.query;
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant || !restaurant.supportsTableReservations) {
      return res.status(400).json({ success: false, message: 'Reservations not available' });
    }
    res.json({ success: true, data: restaurant.reservationSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;