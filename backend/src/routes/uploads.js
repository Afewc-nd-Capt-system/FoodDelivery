const express = require('express');
const authMiddleware = require('../middleware/auth');
const upload = require('../utils/upload');
const Restaurant = require('../models/Restaurant');

const router = express.Router();

router.post('/restaurant/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = `${process.env.API_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { image: imageUrl },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json({ imageUrl, restaurant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/menu-item/:restaurantId/:itemId', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = `${process.env.API_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;

    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const menuItem = restaurant.menu.id(req.params.itemId);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    menuItem.image = imageUrl;
    await restaurant.save();

    res.json({ imageUrl, menuItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
