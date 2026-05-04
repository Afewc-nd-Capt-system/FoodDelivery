const express = require('express');
const authMiddleware = require('../middleware/auth');
const Cart = require('../models/Cart');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.json({ items: [], restaurantId: null, restaurantName: null });
    }
    res.json({
      items: cart.items,
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { itemId, name, price, quantity, restaurantId, restaurantName } = req.body;

    if (!itemId || !name || !price || !quantity || !restaurantId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [], restaurantId: null, restaurantName: null });
    }

    if (cart.restaurantId && cart.restaurantId !== restaurantId) {
      cart.items = [];
    }

    const existingItem = cart.items.find((item) => item.itemId === itemId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ itemId, name, price, quantity });
      cart.restaurantId = restaurantId;
      cart.restaurantName = restaurantName;
    }

    await cart.save();
    res.json({
      items: cart.items,
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: 'itemId is required' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.json({ items: [], restaurantId: null, restaurantName: null });
    }

    const itemIndex = cart.items.findIndex((item) => item.itemId === itemId);

    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
    }

    if (cart.items.length === 0) {
      cart.items = [];
      cart.restaurantId = null;
      cart.restaurantName = null;
    }

    await cart.save();
    res.json({
      items: cart.items,
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (cart) {
      cart.items = [];
      cart.restaurantId = null;
      cart.restaurantName = null;
      await cart.save();
    }
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
