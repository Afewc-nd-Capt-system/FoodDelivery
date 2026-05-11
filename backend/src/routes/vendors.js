const express = require('express');
const { body, validationResult } = require('express-validator');
const Vendor = require('../models/Vendor');
const authMiddleware = require('../middleware/auth');
const { xssProtection } = require('../middleware/sanitize');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { 
      cuisine, 
      search, 
      lat, 
      lng, 
      radius = 10, 
      city, 
      state, 
      area, 
      page = 1, 
      limit = 12, 
      sortBy = 'rating' 
    } = req.query;
    
    let query = {
      isActive: true,
      verificationStatus: 'approved'
    };
    
    // Location filtering
    if (lat && lng) {
      // Use geospatial query with coordinates
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000 // convert km to meters
        }
      };
    } else if (city) {
      // Fallback to city-based filtering
      query['address.city'] = { $regex: city, $options: 'i' };
    } else if (state) {
      // Fallback to state-based filtering
      query['address.state'] = { $regex: state, $options: 'i' };
    } else {
      // No location provided - return empty array with message
      return res.json({
        vendors: [],
        total: 0,
        totalPages: 0,
        currentPage: parseInt(page),
        message: 'Please enable location or select a city to see vendors'
      });
    }
    
    // Apply other filters
    if (cuisine) {
      query.cuisine = cuisine;
    }
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { cuisine: { $regex: search, $options: 'i' } },
      ];
    }
    if (area) {
      query['address.area'] = { $regex: area, $options: 'i' };
    }

    let sort = { rating: -1 };
    if (sortBy === 'rating') sort = { rating: -1 };
    if (sortBy === 'name') sort = { businessName: 1 };
    if (sortBy === 'newest') sort = { createdAt: -1 };

    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      vendors,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cuisines', async (req, res) => {
  try {
    const cuisines = await Vendor.distinct('cuisine');
    res.json(cuisines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/next-cooking-day', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];
    
    const cookingDays = vendor.cookingDays.map(d => d.toLowerCase());
    
    let nextDayIndex = (today.getDay() + 1) % 7;
    let daysAhead = 1;
    
    while (!cookingDays.includes(dayNames[nextDayIndex]) && daysAhead <= 7) {
      nextDayIndex = (nextDayIndex + 1) % 7;
      daysAhead++;
    }

    const nextCookingDate = new Date(today);
    nextCookingDate.setDate(today.getDate() + daysAhead);

    const isOrderingOpen = !cookingDays.includes(todayName);
    
    res.json({
      cookingDays: vendor.cookingDays,
      nextCookingDate: nextCookingDate.toISOString(),
      nextCookingDay: dayNames[nextDayIndex],
      orderDeadline: vendor.orderDeadline,
      isOrderingOpen,
      deliveryTime: vendor.deliveryTime,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.use(authMiddleware);

router.post('/', [
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('ownerName').trim().notEmpty().withMessage('Owner name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
], xssProtection, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const vendor = new Vendor(req.body);
    await vendor.save();
    res.status(201).json(vendor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json({ message: 'Vendor deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;