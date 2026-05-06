const express = require('express');
const authMiddleware = require('../../middleware/auth');
const vendorForecastService = require('../../services/vendorForecastService');

const router = express.Router();

router.get('/demand-forecast', authMiddleware, async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Vendor ID required' });
    }

    const forecast = await vendorForecastService.getDemandForecast(vendorId);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;