const express = require('express');
const authMiddleware = require('../../middleware/auth');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');

const router = express.Router();

router.post('/:orderId', authMiddleware, async (req, res) => {
  try {
    const originalOrder = await Order.findOne({
      _id: req.params.orderId,
      user: req.user.id,
      status: { $in: ['delivered', 'completed'] }
    });

    if (!originalOrder) {
      return res.status(404).json({ success: false, message: 'Order not found or cannot be reordered' });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const itemsToAdd = originalOrder.items.map(item => ({
      itemId: item.menuItem,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      customizations: item.customizations || [],
      specialInstructions: item.specialInstructions,
      restaurantId: originalOrder.restaurant,
      restaurantName: originalOrder.restaurantName,
    }));

    if (cart.items.length > 0 && cart.restaurantId.toString() !== originalOrder.restaurant.toString()) {
      cart.items = [];
    }

    cart.restaurantId = originalOrder.restaurant;
    cart.restaurantName = originalOrder.restaurantName;

    itemsToAdd.forEach(newItem => {
      const existingIndex = cart.items.findIndex(
        item => item.itemId === newItem.itemId &&
        JSON.stringify(item.customizations) === JSON.stringify(newItem.customizations)
      );

      if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += newItem.quantity;
      } else {
        cart.items.push(newItem);
      }
    });

    await cart.save();

    originalOrder.reorderedFrom = originalOrder._id;
    await originalOrder.save();

    res.json({
      success: true,
      data: { cart, message: 'Items added to cart' },
      message: 'Previous order items added to cart'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;