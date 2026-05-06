const express = require('express');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');

const router = express.Router();

function fuzzyMatch(text, pattern) {
  if (!text || !pattern) return 0;
  text = text.toLowerCase();
  pattern = pattern.toLowerCase();

  if (text.includes(pattern)) return 100;

  const words = pattern.split(' ');
  let matchScore = 0;
  words.forEach(word => {
    if (text.includes(word)) matchScore += 50;
  });

  let patternIdx = 0;
  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      patternIdx++;
    }
  }
  if (patternIdx === pattern.length) {
    matchScore += 30;
  }

  return Math.min(100, matchScore);
}

router.get('/', async (req, res) => {
  try {
    const {
      q,
      cuisine,
      priceRange,
      rating,
      maxDeliveryTime,
      dietary,
      city,
      area,
      page = 1,
      limit = 20
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const restaurantQuery = { isOpen: true };
    const vendorQuery = { isAvailable: true };

    if (q) {
      const searchRegex = new RegExp(q, 'i');

      const restaurants = await Restaurant.find({
        ...restaurantQuery,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { cuisine: searchRegex },
          { 'menu.name': searchRegex },
          { 'menu.description': searchRegex }
        ]
      }).limit(50);

      const vendors = await Vendor.find({
        ...vendorQuery,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { cuisine: searchRegex }
        ]
      }).limit(50);

      const scoredRestaurants = restaurants.map(r => ({
        ...r.toObject(),
        type: 'restaurant',
        score: Math.max(
          fuzzyMatch(r.name, q),
          fuzzyMatch(r.cuisine?.join(' '), q),
          ...r.menu?.map(m => fuzzyMatch(m.name, q)) || []
        )
      })).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

      const scoredVendors = vendors.map(v => ({
        ...v.toObject(),
        type: 'vendor',
        score: Math.max(
          fuzzyMatch(v.name, q),
          fuzzyMatch(v.cuisine, q)
        )
      })).filter(v => v.score > 0).sort((a, b) => b.score - a.score);

      const allResults = [...scoredRestaurants, ...scoredVendors];

      let filtered = allResults;
      if (cuisine) {
        const cuisines = cuisine.split(',');
        filtered = filtered.filter(r =>
          r.cuisine?.some(c => cuisines.includes(c.toLowerCase()))
        );
      }
      if (priceRange) {
        filtered = filtered.filter(r => r.priceRange === priceRange);
      }
      if (rating) {
        filtered = filtered.filter(r => (r.rating || 0) >= parseFloat(rating));
      }
      if (maxDeliveryTime) {
        filtered = filtered.filter(r => {
          const time = parseInt(r.deliveryTime?.split('-')[0] || '30');
          return time <= parseInt(maxDeliveryTime);
        });
      }
      if (dietary) {
        const dietaryTags = dietary.split(',');
        filtered = filtered.filter(r =>
          r.menu?.some(m =>
            m.dietaryTags?.some(t => dietaryTags.includes(t.toLowerCase()))
          )
        );
      }

      const paginated = filtered.slice(skip, skip + parseInt(limit));

      res.json({
        success: true,
        data: paginated,
        pagination: {
          total: filtered.length,
          page: parseInt(page),
          totalPages: Math.ceil(filtered.length / parseInt(limit)),
          limit: parseInt(limit)
        }
      });
    } else {
      let total = await Restaurant.countDocuments(restaurantQuery);
      const restaurants = await Restaurant.find(restaurantQuery)
        .skip(skip)
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: restaurants.map(r => ({ ...r.toObject(), type: 'restaurant' })),
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const searchRegex = new RegExp(q, 'i');

    const [restaurants, vendors, menuItems] = await Promise.all([
      Restaurant.find({ name: searchRegex, isOpen: true }).select('name cuisine').limit(5),
      Vendor.find({ name: searchRegex, isAvailable: true }).select('name cuisine').limit(5),
      Restaurant.find({ 'menu.name': searchRegex, isOpen: true })
        .select('menu.$').limit(10)
    ]);

    const suggestions = [];

    restaurants.forEach(r => {
      suggestions.push({ type: 'restaurant', text: r.name, subtext: r.cuisine?.join(', ') });
    });

    vendors.forEach(v => {
      suggestions.push({ type: 'vendor', text: v.name, subtext: v.cuisine });
    });

    menuItems.forEach(r => {
      r.menu?.forEach(m => {
        if (m.name.toLowerCase().includes(q.toLowerCase())) {
          suggestions.push({ type: 'dish', text: m.name, subtext: r.name });
        }
      });
    });

    res.json({
      success: true,
      data: suggestions.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;