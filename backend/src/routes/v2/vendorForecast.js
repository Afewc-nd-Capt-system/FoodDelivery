const express = require('express');
const authMiddleware = require('../../middleware/auth');
const vendorForecastService = require('../../services/vendorForecastService');
const Vendor = require('../../models/Vendor');

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.user.id });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const forecast = await vendorForecastService.getDemandForecast(vendor._id);
    res.json({
      success: true,
      data: {
        vendorId: vendor._id,
        businessName: vendor.businessName,
        rating: vendor.rating,
        reviewCount: vendor.reviewCount,
        isOpen: vendor.isOpen,
        isActive: vendor.isActive,
        menuCount: (vendor.menu || []).length,
        ...forecast
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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