const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { vendorGuard, adminGuard } = require('../middleware/routeGuards');
const { xssProtection } = require('../middleware/sanitize');
const { sessionResponse } = require('../utils/session');
const { sendWelcomeEmail } = require('../utils/email');
const { verifyInvitation, consumeInvitation } = require('../services/partnerInvitation');

const router = express.Router();

// Public self-registration for home cooks / vendors. Invitation-only: the
// admin approves a /contact application, which emails a single-use 7-day token.
router.post('/register', xssProtection, async (req, res) => {
  let invitation = null;
  let createdUser = null;
  try {
    const {
      businessName, ownerName, email, password, phone, address, cuisine, cookingDays,
      location, description, invitationToken,
    } = req.body;

    const inviteCheck = await verifyInvitation(invitationToken, 'vendor');
    if (inviteCheck.error) {
      return res.status(inviteCheck.status).json({ message: inviteCheck.error });
    }
    invitation = inviteCheck.invitation;
    if (invitation.email && email && String(email).trim().toLowerCase() !== invitation.email) {
      return res.status(403).json({ message: 'This invitation was issued for a different email address.' });
    }

    if (!businessName || !String(businessName).trim()) {
      return res.status(400).json({ message: 'Business name is required' });
    }
    if (!ownerName || !String(ownerName).trim()) {
      return res.status(400).json({ message: 'Owner name is required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ message: 'Valid email required' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    if (!location?.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({ message: 'A valid business location is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });
    }
    const existingVendor = await Vendor.findOne({ email: normalizedEmail });
    if (existingVendor) {
      return res.status(409).json({ message: 'A vendor with this email is already registered.' });
    }

    if (password && !(/[a-z]/.test(password) && /[A-Z]/.test(password)
      && /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password))) {
      return res.status(400).json({ message: 'Password must include upper, lower, number and special character' });
    }

    const user = new User({
      name: String(ownerName).trim(),
      email: normalizedEmail,
      password,
      phone: String(phone).trim(),
      role: 'vendor',
    });
    await user.save();
    createdUser = user;

    const vendor = new Vendor({
      businessName: String(businessName).trim(),
      ownerName: String(ownerName).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      description: description || 'Home-cooked meals made with love',
      image: req.body.image || undefined,
      cuisine: Array.isArray(cuisine) ? cuisine : (cuisine ? [cuisine] : ['Nigerian']),
      cookingDays: Array.isArray(cookingDays)
        ? cookingDays.map((d) => String(d).trim().toLowerCase()).filter((d) => ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(d))
        : [],
      address,
      location,
      owner: user._id,
      verificationStatus: 'pending_verification',
      isActive: true,
      isOpen: true,
    });
    await vendor.save();

    const consumed = await consumeInvitation(invitation._id, user._id);
    if (!consumed) {
      await Promise.all([
        Vendor.deleteOne({ _id: vendor._id }),
        User.deleteOne({ _id: user._id }),
      ]);
      return res.status(409).json({ message: 'This invitation has already been used.' });
    }

    sendWelcomeEmail(user.email, user.name).catch((emailError) => {
      console.error('Welcome email failed:', emailError.message);
    });

    const session = await sessionResponse(res, user);
    res.status(201).json({
      ...session,
      vendor: { id: vendor._id, businessName: vendor.businessName },
    });
  } catch (error) {
    // If anything failed after the invite was consumed, release it so the
    // applicant can retry with the same link.
    if (invitation && createdUser) {
      await require('../models/PartnerInvitation').findOneAndUpdate(
        { _id: invitation._id, usedBy: createdUser._id },
        { $set: { usedAt: null, usedBy: null } }
      ).catch(() => {});
      await User.deleteOne({ _id: createdUser._id }).catch(() => {});
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    res.status(400).json({ message: error.message || 'Vendor registration failed' });
  }
});

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
    }
    // No location? Return all active vendors
    
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
    // Malformed ids (e.g. a stale link to /vendor/forecast) are "not found",
    // never a 500 CastError.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
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

// Read POD configuration for vendor
router.get('/:id/pod-config', vendorGuard, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    const isOwner = vendor.owner
      ? String(vendor.owner) === String(req.user.id)
      : String(vendor.email).toLowerCase() === String(req.user.email || '').toLowerCase();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ config: vendor.payOnDeliveryConfig || {} });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update POD configuration for vendor
router.put('/:id/pod-config', vendorGuard, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Tenant scoping: only the owner (or an admin) may change POD config.
    const isOwner = vendor.owner
      ? String(vendor.owner) === String(req.user.id)
      : String(vendor.email).toLowerCase() === String(req.user.email || '').toLowerCase();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    vendor.payOnDeliveryConfig = {
      ...vendor.payOnDeliveryConfig,
      ...req.body
    };

    await vendor.save();
    res.json({ payOnDeliveryConfig: vendor.payOnDeliveryConfig });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add/Remove trusted customer for vendor
router.post('/:id/trusted-customers', vendorGuard, async (req, res) => {
  try {
    const { userId, action } = req.body;
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Tenant scoping: only the owner (or an admin) may change the whitelist.
    const isOwner = vendor.owner
      ? String(vendor.owner) === String(req.user.id)
      : String(vendor.email).toLowerCase() === String(req.user.email || '').toLowerCase();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (action === 'add') {
      if (!vendor.payOnDeliveryConfig.trustedCustomerWhitelist.includes(userId)) {
        vendor.payOnDeliveryConfig.trustedCustomerWhitelist.push(userId);
      }
    } else if (action === 'remove') {
      vendor.payOnDeliveryConfig.trustedCustomerWhitelist =
        vendor.payOnDeliveryConfig.trustedCustomerWhitelist.filter(id => id !== userId);
    }

    await vendor.save();
    res.json({ trustedCustomerWhitelist: vendor.payOnDeliveryConfig.trustedCustomerWhitelist });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Admin-only maintenance: repair known-dead vendor images and normalize the
// legacy placeholder schedule ('saturday' / '12pm - 2pm') for records that were
// seeded before the fix. Idempotent; safe to run any time.
router.post('/admin/normalize', authMiddleware, adminGuard, async (req, res) => {
  try {
    const deadImageIds = ['1563379928-8602815af19b'];
    const fallbackImages = [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
      'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&q=80',
    ];
    const broken = await Vendor.find({
      $or: deadImageIds.map((id) => ({ image: { $regex: id } })),
    });
    let imagesFixed = 0;
    for (let i = 0; i < broken.length; i++) {
      await Vendor.findByIdAndUpdate(broken[i]._id, {
        $set: { image: fallbackImages[i % fallbackImages.length] },
      });
      imagesFixed++;
    }

    const presets = [
      ['Saturday', 'Monday', 'Wednesday'], ['Tuesday', 'Thursday', 'Sunday'],
      ['Friday', 'Sunday'], ['Monday', 'Wednesday'], ['Thursday', 'Saturday'],
      ['Friday', 'Sunday'], ['Monday', 'Tuesday'],
    ];
    const times = ['12pm - 2pm', '4pm - 7pm', '10am - 1pm', '2pm - 5pm', '5pm - 8pm', '11am - 2pm', '3pm - 6pm'];
    const stale = await Vendor.find({ cookingDays: ['saturday'] });
    let schedulesFixed = 0;
    for (let i = 0; i < stale.length; i++) {
      const idx = Math.abs(String(stale[i]._id).split('').reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % presets.length;
      await Vendor.findByIdAndUpdate(stale[i]._id, {
        $set: { cookingDays: presets[idx], deliveryTime: times[idx] },
      });
      schedulesFixed++;
    }

    res.json({ success: true, data: { imagesFixed, schedulesFixed } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;