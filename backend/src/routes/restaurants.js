const express = require('express');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { restaurantGuard, adminGuard } = require('../middleware/routeGuards');
const { xssProtection } = require('../middleware/sanitize');
const { sessionResponse } = require('../utils/session');
const { sendWelcomeEmail } = require('../utils/email');
const { verifyInvitation, consumeInvitation } = require('../services/partnerInvitation');

const router = express.Router();

// Public self-registration for restaurants. Invitation-only (admin-approved
// application) and requires CAC certificate + RC + TIN before the account is
// created; it stays pending until an admin verifies the documents.
router.post('/register', xssProtection, async (req, res) => {
  let invitation = null;
  let createdUser = null;
  try {
    const {
      name, email, password, phone, address, cuisine, description, location,
      tinNumber, rcNumber, documents, invitationToken,
    } = req.body;

    const inviteCheck = await verifyInvitation(invitationToken, 'restaurant');
    if (inviteCheck.error) {
      return res.status(inviteCheck.status).json({ message: inviteCheck.error });
    }
    invitation = inviteCheck.invitation;
    if (invitation.email && email && String(email).trim().toLowerCase() !== invitation.email) {
      return res.status(403).json({ message: 'This invitation was issued for a different email address.' });
    }

    if (!documents?.cacCertificate) {
      return res.status(400).json({ message: 'CAC certificate document is required for restaurant registration' });
    }
    if (!rcNumber || !String(rcNumber).trim()) {
      return res.status(400).json({ message: 'RC number is required for restaurant registration' });
    }
    if (!tinNumber || !String(tinNumber).trim()) {
      return res.status(400).json({ message: 'TIN is required for restaurant registration' });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Restaurant name is required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ message: 'Valid email required' });
    }
    if (!password || String(password).length < 8
      || !/[a-z]/.test(password) || !/[A-Z]/.test(password)
      || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({ message: 'Password must be 8+ characters with upper, lower, number and special character' });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    if (!location?.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({ message: 'A valid restaurant location is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });
    }
    if (await Restaurant.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: 'A restaurant with this email is already registered.' });
    }

    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      phone: String(phone).trim(),
      role: 'restaurant',
    });
    await user.save();
    createdUser = user;

    const restaurant = new Restaurant({
      name: String(name).trim(),
      description: description || 'Great food, delivered fast',
      email: normalizedEmail,
      phone: String(phone).trim(),
      address,
      location,
      cuisine: Array.isArray(cuisine) ? cuisine : (cuisine ? [cuisine] : ['Nigerian']),
      owner: user._id,
      verificationStatus: 'pending_verification',
      isApproved: false,
      isActive: true,
      isOpen: true,
      tinNumber,
      rcNumber,
      documents,
    });
    await restaurant.save();

    const consumed = await consumeInvitation(invitation._id, user._id);
    if (!consumed) {
      await Promise.all([
        Restaurant.deleteOne({ _id: restaurant._id }),
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
      restaurant: { id: restaurant._id, name: restaurant.name, verificationStatus: restaurant.verificationStatus },
    });
  } catch (error) {
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
    res.status(400).json({ message: error.message || 'Restaurant registration failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { 
      cuisine, 
      search, 
      sortBy, 
      priceRange, 
      lat, 
      lng, 
      radius = 10, 
      city, 
      state, 
      page = 1, 
      limit = 12 
    } = req.query;
    
    let query = {
      isOpen: true,
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
    // No location? Return all active restaurants
    
    // Apply other filters
    if (cuisine) {
      query.cuisine = cuisine;
    }
    
    if (priceRange) {
      query.priceRange = priceRange;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { cuisine: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Restaurant.countDocuments(query);
    
    let restaurants = await Restaurant.find(query)
      .skip(skip)
      .limit(parseInt(limit));
    
    if (sortBy === 'rating') {
      restaurants.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'deliveryTime') {
      restaurants.sort((a, b) => {
        const aTime = parseInt(a.deliveryTime) || 30;
        const bTime = parseInt(b.deliveryTime) || 30;
        return aTime - bTime;
      });
    } else if (sortBy === 'priceLow') {
      restaurants.sort((a, b) => a.priceForTwo - b.priceForTwo);
    } else if (sortBy === 'priceHigh') {
      restaurants.sort((a, b) => b.priceForTwo - a.priceForTwo);
    }
    
    res.json({
      restaurants,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cuisines', async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    const cuisines = [...new Set(restaurants.flatMap((r) => r.cuisine))];
    res.json(cuisines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET restaurant menu items (embedded)
router.get('/:id/menu', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('menu');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json({ items: restaurant.menu || [], total: (restaurant.menu || []).length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json(restaurant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/reviews', async (req, res) => {
  try {
    const { user, rating, comment } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    restaurant.reviews.push({ user, rating, comment });
    restaurant.reviewCount = restaurant.reviews.length;

    const totalRating = restaurant.reviews.reduce((sum, r) => sum + r.rating, 0);
    restaurant.rating = parseFloat((totalRating / restaurant.reviews.length).toFixed(1));

    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Read POD configuration
router.get('/:id/pod-config', authMiddleware, restaurantGuard, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    if (req.user.role !== 'admin' && String(restaurant.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ config: restaurant.payOnDeliveryConfig || {} });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update POD configuration
router.put('/:id/pod-config', authMiddleware, restaurantGuard, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Tenant scoping: only the owner (or an admin) may change POD config.
    if (req.user.role !== 'admin' && String(restaurant.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    restaurant.payOnDeliveryConfig = {
      ...restaurant.payOnDeliveryConfig,
      ...req.body
    };

    await restaurant.save();
    res.json({ payOnDeliveryConfig: restaurant.payOnDeliveryConfig });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add/Remove trusted customer
router.post('/:id/trusted-customers', authMiddleware, restaurantGuard, async (req, res) => {
  try {
    const { userId, action } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Tenant scoping: only the owner (or an admin) may change the whitelist.
    if (req.user.role !== 'admin' && String(restaurant.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (action === 'add') {
      if (!restaurant.payOnDeliveryConfig.trustedCustomerWhitelist.includes(userId)) {
        restaurant.payOnDeliveryConfig.trustedCustomerWhitelist.push(userId);
      }
    } else if (action === 'remove') {
      restaurant.payOnDeliveryConfig.trustedCustomerWhitelist = 
        restaurant.payOnDeliveryConfig.trustedCustomerWhitelist.filter(id => id !== userId);
    }

    await restaurant.save();
    res.json({ trustedCustomerWhitelist: restaurant.payOnDeliveryConfig.trustedCustomerWhitelist });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update menu item POD settings
router.put('/:id/menu/:menuItemId/pod-settings', authMiddleware, restaurantGuard, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Tenant scoping: only the owner (or an admin) may change menu POD settings.
    if (req.user.role !== 'admin' && String(restaurant.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const menuItem = restaurant.menu.id(req.params.menuItemId);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    menuItem.allowPayOnDelivery = req.body.allowPayOnDelivery;
    menuItem.podMinQuantity = req.body.podMinQuantity;

    await restaurant.save();
    res.json({ menuItem });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
