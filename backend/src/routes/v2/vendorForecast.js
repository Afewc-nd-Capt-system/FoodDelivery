const express = require('express');
const authMiddleware = require('../../middleware/auth');
const vendorForecastService = require('../../services/vendorForecastService');
const Vendor = require('../../models/Vendor');

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {  try {
    const vendor = await await Vendor.findOwnedBy(req.user);
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

// Resolve the vendor for the signed-in owner. A vendorId param is only honored
// when it matches the owner's own vendor (admins may read any).
async function resolveVendor(req) {
  if (req.user.role === 'admin') {
    if (req.query.vendorId) {
      return Vendor.findById(req.query.vendorId);
    }
    return null;
  }
  const vendor = await await Vendor.findOwnedBy(req.user);
  if (vendor && req.query.vendorId) {
    return String(vendor._id) === String(req.query.vendorId) ? vendor : null;
  }
  return vendor;
}

router.get('/demand-forecast', authMiddleware, async (req, res) => {
  try {
    const vendor = await resolveVendor(req);
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const forecast = await vendorForecastService.getDemandForecast(vendor._id);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;