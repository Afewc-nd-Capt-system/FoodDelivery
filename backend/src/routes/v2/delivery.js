const express = require('express');
const authMiddleware = require('../../middleware/auth');
const deliveryService = require('../../services/deliveryService');
const DeliveryConfig = require('../../models/DeliveryConfig');

const router = express.Router();

router.get('/calculate', async (req, res) => {
  try {
    const { restaurantId, lat, lng, orderValue } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant ID required' });
    }

    const result = await deliveryService.calculateDeliveryFee(
      restaurantId,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null,
      orderValue ? parseFloat(orderValue) : 0
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/vendor-calculate', async (req, res) => {
  try {
    const { vendorId, lat, lng } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Vendor ID required' });
    }

    const result = await deliveryService.calculateVendorDeliveryFee(
      vendorId,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/config', async (req, res) => {
  try {
    let config = await DeliveryConfig.findOne({ isActive: true });

    if (!config) {
      config = await DeliveryConfig.create({
        baseDeliveryFee: 40,
        perKmFee: 10,
        freeDeliveryThreshold: 2000,
        maxDeliveryRadius: 15,
        surgePricing: {
          enabled: true,
          peakHours: [
            { start: '12:00', end: '14:00', multiplier: 1.5 },
            { start: '18:00', end: '21:00', multiplier: 1.5 }
          ],
          weekendMultiplier: 1.2
        },
        isActive: true
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;