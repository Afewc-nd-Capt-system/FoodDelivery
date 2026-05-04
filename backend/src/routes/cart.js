const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const carts = new Map();

router.get('/', authMiddleware, (req, res) => {
  const cart = carts.get(req.user.id) || { items: [], restaurantId: null, restaurantName: null };
  res.json(cart);
});

router.post('/add', authMiddleware, (req, res) => {
  const { itemId, name, price, quantity, restaurantId, restaurantName } = req.body;

  if (!itemId || !name || !price || !quantity || !restaurantId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let cart = carts.get(req.user.id) || { items: [], restaurantId: null, restaurantName: null };

  if (cart.restaurantId && cart.restaurantId !== restaurantId) {
    cart = { items: [], restaurantId: null, restaurantName: null };
  }

  const existingItem = cart.items.find((item) => item.itemId === itemId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ itemId, name, price, quantity });
    cart.restaurantId = restaurantId;
    cart.restaurantName = restaurantName;
  }

  carts.set(req.user.id, cart);
  res.json(cart);
});

router.post('/update', authMiddleware, (req, res) => {
  const { itemId, quantity } = req.body;

  if (!itemId) {
    return res.status(400).json({ message: 'itemId is required' });
  }

  let cart = carts.get(req.user.id) || { items: [], restaurantId: null, restaurantName: null };

  const itemIndex = cart.items.findIndex((item) => item.itemId === itemId);

  if (itemIndex > -1) {
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
  }

  if (cart.items.length === 0) {
    cart = { items: [], restaurantId: null, restaurantName: null };
  }

  carts.set(req.user.id, cart);
  res.json(cart);
});

router.delete('/clear', authMiddleware, (req, res) => {
  carts.set(req.user.id, { items: [], restaurantId: null, restaurantName: null });
  res.json({ message: 'Cart cleared' });
});

module.exports = router;
