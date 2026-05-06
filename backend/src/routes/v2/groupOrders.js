const express = require('express');
const authMiddleware = require('../../middleware/auth');
const GroupOrder = require('../../models/GroupOrder');
const Order = require('../../models/Order');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurant, restaurantName, deliveryAddress } = req.body;

    const groupOrder = new GroupOrder({
      restaurant,
      restaurantName,
      host: req.user.id,
      deliveryAddress,
      items: [],
      status: 'active'
    });

    await groupOrder.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`group-${groupOrder.shareCode}`).emit('group-order-created', { groupOrder });
    }

    res.status(201).json({
      success: true,
      data: {
        groupOrder,
        shareUrl: `${process.env.FRONTEND_URL}/group/${groupOrder.shareCode}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:shareCode', async (req, res) => {
  try {
    const groupOrder = await GroupOrder.findOne({
      shareCode: req.params.shareCode,
      status: 'active',
      deletedAt: null
    }).populate('items.user', 'name');

    if (!groupOrder) {
      return res.status(404).json({ success: false, message: 'Group order not found or expired' });
    }

    res.json({ success: true, data: groupOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:shareCode/items', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;

    const groupOrder = await GroupOrder.findOne({
      shareCode: req.params.shareCode,
      status: 'active',
      deletedAt: null
    });

    if (!groupOrder) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }

    const user = await require('../../models/User').findById(req.user.id);

    groupOrder.items.push({
      user: req.user.id,
      userName: user?.name || 'Guest',
      items
    });

    groupOrder.totalAmount = groupOrder.items.reduce((total, item) => {
      return total + item.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    }, 0);

    await groupOrder.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`group-${groupOrder.shareCode}`).emit('group-order-updated', { groupOrder });
    }

    res.json({
      success: true,
      data: groupOrder,
      message: 'Item added to group order'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:shareCode/close', authMiddleware, async (req, res) => {
  try {
    const groupOrder = await GroupOrder.findOne({
      shareCode: req.params.shareCode,
      host: req.user.id,
      status: 'active',
      deletedAt: null
    });

    if (!groupOrder) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }

    groupOrder.status = 'closed';
    await groupOrder.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`group-${groupOrder.shareCode}`).emit('group-order-closed', { groupOrder });
    }

    res.json({ success: true, data: groupOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:shareCode/checkout', authMiddleware, async (req, res) => {
  try {
    const { paymentMethod, deliveryAddress } = req.body;

    const groupOrder = await GroupOrder.findOne({
      shareCode: req.params.shareCode,
      host: req.user.id,
      status: 'closed',
      deletedAt: null
    }).populate('items.user', 'name email');

    if (!groupOrder) {
      return res.status(404).json({ success: false, message: 'Group order not found or not closed' });
    }

    const allItems = groupOrder.items.flatMap(item => item.items);

    const order = new Order({
      user: req.user.id,
      restaurant: groupOrder.restaurant,
      restaurantName: groupOrder.restaurantName,
      items: allItems,
      totalAmount: groupOrder.totalAmount,
      deliveryAddress: deliveryAddress || groupOrder.deliveryAddress,
      paymentMethod: paymentMethod || 'cash',
      deliveryFee: 40,
      status: 'pending',
    });

    await order.save();

    groupOrder.status = 'paid';
    groupOrder.items.forEach(item => {
      item.addedAt = new Date();
    });
    await groupOrder.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`group-${groupOrder.shareCode}`).emit('group-order-paid', { orderId: order._id });
    }

    res.status(201).json({
      success: true,
      data: { order, groupOrder },
      message: 'Group order placed successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;