const express = require('express');
const Restaurant = require('../models/Restaurant');
const authMiddleware = require('../middleware/auth');
const { restaurantGuard, adminGuard } = require('../middleware/routeGuards');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { cuisine, search, sortBy, priceRange, page = 1, limit = 12 } = req.query;
    
    let query = {};
    
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

// Update POD configuration
router.put('/:id/pod-config', authMiddleware, restaurantGuard, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
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
