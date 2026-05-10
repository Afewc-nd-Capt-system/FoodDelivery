const express = require('express');
const AdPlacement = require('../../models/AdPlacement');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

// Helper: Calculate daily rate based on placement
function getDailyRate(placement) {
  const rates = {
    homepage_banner: 5000,
    search_top: 3000,
    category_top: 2000,
  };
  return rates[placement] || 3000;
}

// POST /api/v2/ads
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { placement, startDate, endDate, creative } = req.body;
    
    // Find restaurant or vendor
    let business = await Restaurant.findOne({ owner: req.user.id });
    let businessType = 'restaurant';
    
    if (!business) {
      business = await Vendor.findOne({ owner: req.user.id });
      businessType = 'vendor';
    }
    
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    
    // Calculate days and budget
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const dailyRate = getDailyRate(placement);
    const budget = days * dailyRate;
    
    // TODO: Verify Paystack payment for budget
    // This would involve calling Paystack API to verify the transaction
    
    const ad = new AdPlacement({
      [`${businessType}Id`]: business._id,
      targetType: businessType,
      placement,
      startDate: start,
      endDate: end,
      budget,
      costPerClick: 100, // ₦100 per click
      creative,
      status: 'pending_approval',
    });
    
    await ad.save();
    
    res.json({ ad });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/ads/active?placement=homepage_banner
router.get('/active', async (req, res) => {
  try {
    const { placement } = req.query;
    const now = new Date();
    
    const query = {
      status: 'active',
      isApproved: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };
    
    if (placement) {
      query.placement = placement;
    }
    
    const ads = await AdPlacement.find(query)
      .populate('restaurantId')
      .populate('vendorId')
      .sort({ createdAt: -1 });
    
    res.json({ ads });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/ads/:id/click
router.post('/:id/click', async (req, res) => {
  try {
    const ad = await AdPlacement.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    
    if (ad.status !== 'active') {
      return res.status(400).json({ message: 'Ad is not active' });
    }
    
    ad.totalClicks += 1;
    ad.totalSpent += ad.costPerClick;
    
    // Check if budget exhausted
    if (ad.totalSpent >= ad.budget) {
      ad.status = 'exhausted';
    }
    
    await ad.save();
    
    res.json({ ad });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/ads/:id/pause
router.patch('/:id/pause', authMiddleware, async (req, res) => {
  try {
    const ad = await AdPlacement.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    
    // Verify ownership
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    const vendor = await Vendor.findOne({ owner: req.user.id });
    
    if ((!restaurant || ad.restaurantId?.toString() !== restaurant._id.toString()) &&
        (!vendor || ad.vendorId?.toString() !== vendor._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    ad.status = 'paused';
    await ad.save();
    
    res.json({ ad });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/ads/:id/resume
router.patch('/:id/resume', authMiddleware, async (req, res) => {
  try {
    const ad = await AdPlacement.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    
    // Verify ownership
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    const vendor = await Vendor.findOne({ owner: req.user.id });
    
    if ((!restaurant || ad.restaurantId?.toString() !== restaurant._id.toString()) &&
        (!vendor || ad.vendorId?.toString() !== vendor._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (ad.totalSpent >= ad.budget) {
      return res.status(400).json({ message: 'Budget exhausted' });
    }
    
    ad.status = 'active';
    await ad.save();
    
    res.json({ ad });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/ads/my-campaigns
router.get('/my-campaigns', authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    const vendor = await Vendor.findOne({ owner: req.user.id });
    
    let query = {};
    
    if (restaurant) {
      query.restaurantId = restaurant._id;
    } else if (vendor) {
      query.vendorId = vendor._id;
    } else {
      return res.status(404).json({ message: 'Business not found' });
    }
    
    const ads = await AdPlacement.find(query).sort({ createdAt: -1 });
    
    res.json({ ads });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
