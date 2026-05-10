const express = require('express');
const DeliveryPartner = require('../../models/DeliveryPartner');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

// PATCH /api/v2/riders/availability
router.patch('/availability', authMiddleware, async (req, res) => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ message: 'isOnline must be a boolean' });
    }

    const rider = await DeliveryPartner.findById(req.user.id);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    rider.isOnline = isOnline;
    await rider.save();

    // Emit availability_change to delivery company room
    const io = req.app.get('io');
    if (io) {
      io.of('/tracking').to(`delivery_company_${rider.deliveryCompany}`).emit('rider_availability', {
        riderId: rider._id,
        isOnline,
      });
    }

    res.json({ rider });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
