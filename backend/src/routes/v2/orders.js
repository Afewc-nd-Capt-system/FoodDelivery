const express = require('express');
const Order = require('../../models/Order');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const User = require('../../models/User');
const DeliveryCompany = require('../../models/DeliveryCompany');
const DeliveryPartner = require('../../models/DeliveryPartner');
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const LoyaltyPoints = require('../../models/LoyaltyPoints');
const LoyaltyConfig = require('../../models/LoyaltyConfig');
const commissionService = require('../../services/commissionService');
const authMiddleware = require('../../middleware/auth');
const PayOnDeliveryService = require('../../services/PayOnDeliveryService');
const router = express.Router();

// POST /api/v2/orders/check-pod-eligibility
router.post('/check-pod-eligibility', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, vendorId, totalAmount, items } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let restaurantOrVendor = null;
    if (restaurantId) {
      restaurantOrVendor = await Restaurant.findById(restaurantId);
    } else if (vendorId) {
      restaurantOrVendor = await Vendor.findById(vendorId);
    }

    if (!restaurantOrVendor) {
      return res.status(404).json({ message: 'Restaurant or vendor not found' });
    }

    const result = await PayOnDeliveryService.checkPODEligibility(
      { totalAmount, items },
      user,
      restaurantOrVendor
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Helper: Generate OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper: Store OTP in Redis
async function storeOTP(orderId, otp) {
  const redis = require('redis');
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  await client.connect();
  await client.setEx(`order_otp_${orderId}`, 600, otp); // 10 minutes TTL
  await client.disconnect();
}

// Helper: Verify OTP from Redis
async function verifyOTP(orderId, otp) {
  const redis = require('redis');
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  await client.connect();
  const storedOTP = await client.get(`order_otp_${orderId}`);
  await client.disconnect();
  return storedOTP === otp;
}

// POST /api/v2/orders - Customer places order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, vendorId, items, totalAmount, deliveryAddress, paymentMethod, deliveryFee } = req.body;

    if (!restaurantId && !vendorId) {
      return res.status(400).json({ message: 'Restaurant ID or Vendor ID is required' });
    }

    if (!items || !totalAmount || !deliveryAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate items exist and restaurant/vendor is open
    let restaurantOrVendor;
    if (restaurantId) {
      restaurantOrVendor = await Restaurant.findById(restaurantId);
    } else {
      restaurantOrVendor = await Vendor.findById(vendorId);
    }

    if (!restaurantOrVendor) {
      return res.status(404).json({ message: 'Restaurant or vendor not found' });
    }

    if (!restaurantOrVendor.isOpen) {
      return res.status(400).json({ message: 'Restaurant or vendor is currently closed' });
    }

    // Check minimum order value
    const minOrder = restaurantOrVendor.minOrderValue || 0;
    if (totalAmount < minOrder) {
      return res.status(400).json({ message: `Minimum order value is ₦${minOrder}` });
    }

    // Create order
    const order = new Order({
      user: req.user.id,
      restaurant: restaurantId || null,
      vendor: vendorId || null,
      restaurantName: restaurantOrVendor.name,
      items,
      totalAmount,
      deliveryAddress,
      paymentMethod: paymentMethod || 'cash',
      deliveryFee: deliveryFee || 40,
      status: 'pending',
    });

    await order.save();

    // Emit new_order event to restaurant/vendor room
    const io = req.app.get('io');
    if (io) {
      const roomId = restaurantId ? `restaurant_${restaurantId}` : `vendor_${vendorId}`;
      io.of('/orders').to(roomId).emit('new_order', order);
    }

    res.status(201).json({ order });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/restaurants/orders/:id/accept
router.patch('/restaurants/orders/:id/accept', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: restaurant owner only
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant || order.restaurant.toString() !== restaurant._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this order' });
    }

    order.status = 'accepted';
    await order.save();

    // Emit order_accepted to customer room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_accepted', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/restaurants/orders/:id/decline
router.patch('/restaurants/orders/:id/decline', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: restaurant owner only
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant || order.restaurant.toString() !== restaurant._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to decline this order' });
    }

    order.status = 'cancelled';
    await order.save();

    // Refund to wallet if paid online
    if (order.paymentMethod === 'card' && order.isPaid) {
      const wallet = await Wallet.findOne({ user: order.user });
      if (wallet) {
        wallet.balance += order.totalAmount + order.deliveryFee;
        await wallet.save();

        const transaction = new WalletTransaction({
          wallet: wallet._id,
          type: 'refund',
          amount: order.totalAmount + order.deliveryFee,
          description: `Refund for order ${order._id}`,
        });
        await transaction.save();
      }
    }

    // Emit order_declined to customer room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_declined', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/restaurants/orders/:id/preparing
router.patch('/restaurants/orders/:id/preparing', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: restaurant owner only
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant || order.restaurant.toString() !== restaurant._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = 'preparing';
    await order.save();

    // Emit order_preparing to customer room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_preparing', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/restaurants/orders/:id/ready
router.patch('/restaurants/orders/:id/ready', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: restaurant owner only
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant || order.restaurant.toString() !== restaurant._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = 'ready';
    await order.save();

    // Emit order_ready to delivery company room
    const io = req.app.get('io');
    if (io && order.deliveryCompany) {
      io.of('/orders').to(`delivery_company_${order.deliveryCompany}`).emit('order_ready', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/restaurants/orders/:id/forward-delivery
router.post('/restaurants/orders/:id/forward-delivery', authMiddleware, async (req, res) => {
  try {
    const { deliveryCompanyId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Auth: restaurant owner only
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant || order.restaurant.toString() !== restaurant._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to forward this order' });
    }

    // Auto-assign delivery company if not provided
    let company = deliveryCompanyId ? await DeliveryCompany.findById(deliveryCompanyId) : null;
    if (!company) {
      company = await DeliveryCompany.findOne({ isApproved: true });
    }

    if (!company) {
      return res.status(404).json({ message: 'No delivery company available' });
    }

    // Create DeliveryJob (for now, we'll update the order directly)
    order.deliveryCompany = company._id;
    order.status = 'awaiting_pickup';
    await order.save();

    // Emit new_delivery_job to delivery company room
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`delivery_company_${company._id}`).emit('new_delivery_job', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Vendor endpoints (same pattern as restaurants)
router.patch('/vendors/orders/:id/accept', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const vendor = await Vendor.findOne({ owner: req.user.id });
    if (!vendor || order.vendor.toString() !== vendor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this order' });
    }

    order.status = 'accepted';
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_accepted', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/vendors/orders/:id/decline', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const vendor = await Vendor.findOne({ owner: req.user.id });
    if (!vendor || order.vendor.toString() !== vendor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to decline this order' });
    }

    order.status = 'cancelled';
    await order.save();

    if (order.paymentMethod === 'card' && order.isPaid) {
      const wallet = await Wallet.findOne({ user: order.user });
      if (wallet) {
        wallet.balance += order.totalAmount + order.deliveryFee;
        await wallet.save();

        const transaction = new WalletTransaction({
          wallet: wallet._id,
          type: 'refund',
          amount: order.totalAmount + order.deliveryFee,
          description: `Refund for order ${order._id}`,
        });
        await transaction.save();
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_declined', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/vendors/orders/:id/ready', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const vendor = await Vendor.findOne({ owner: req.user.id });
    if (!vendor || order.vendor.toString() !== vendor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = 'ready';
    await order.save();

    const io = req.app.get('io');
    if (io && order.deliveryCompany) {
      io.of('/orders').to(`delivery_company_${order.deliveryCompany}`).emit('order_ready', order);
    }

    // Auto-forward to delivery company
    try {
      const DeliveryCompany = mongoose.model('DeliveryCompany');
      const deliveryCompany = await DeliveryCompany.findOne({
        'coverageAreas': { $in: [vendor.address?.city || ''] },
        isActive: true
      });

      if (deliveryCompany) {
        const DeliveryJob = mongoose.model('DeliveryJob');
        await DeliveryJob.create({
          orderId: order._id,
          deliveryCompanyId: deliveryCompany._id,
          pickupAddress: vendor.address,
          dropoffAddress: order.deliveryAddress,
          status: 'pending',
        });

        if (io) {
          io.of('/orders')
            .to(`delivery_company_${deliveryCompany._id}`)
            .emit('new_delivery_job', { orderId: order._id });
        }

        await Order.findByIdAndUpdate(order._id, {
          status: 'awaiting_pickup',
          deliveryCompanyId: deliveryCompany._id
        });

        io?.of('/orders')
          .to(`customer_${order.customerId}`)
          .emit('order_status_change', {
            orderId: order._id,
            status: 'awaiting_pickup',
            message: 'Your order is ready and being dispatched!'
          });
      }
    } catch (err) {
      console.warn('Auto-delivery assignment failed:', err.message);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/vendors/orders/:id/forward-delivery', authMiddleware, async (req, res) => {
  try {
    const { deliveryCompanyId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const vendor = await Vendor.findOne({ owner: req.user.id });
    if (!vendor || order.vendor.toString() !== vendor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to forward this order' });
    }

    let company = deliveryCompanyId ? await DeliveryCompany.findById(deliveryCompanyId) : null;
    if (!company) {
      company = await DeliveryCompany.findOne({ isApproved: true });
    }

    if (!company) {
      return res.status(404).json({ message: 'No delivery company available' });
    }

    order.deliveryCompany = company._id;
    order.status = 'awaiting_pickup';
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`delivery_company_${company._id}`).emit('new_delivery_job', order);
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/orders/:id/confirm-delivery
router.post('/:id/confirm-delivery', authMiddleware, async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify OTP
    const isValidOTP = await verifyOTP(order._id, otp);
    if (!isValidOTP) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to confirm this order' });
    }

    order.status = 'completed';
    order.deliveredAt = new Date();
    await order.save();

    // Credit loyalty points
    const loyaltyConfig = await LoyaltyConfig.findOne({ isActive: true });
    if (loyaltyConfig) {
      const pointsEarned = Math.floor(order.totalAmount / loyaltyConfig.pointsPerNaira);
      if (pointsEarned > 0) {
        let loyalty = await LoyaltyPoints.findOne({ user: order.user });
        if (!loyalty) {
          loyalty = new LoyaltyPoints({ user: order.user, points: 0, tier: 'bronze' });
        }
        loyalty.points += pointsEarned;
        
        // Update tier
        if (loyalty.points >= 10000) loyalty.tier = 'platinum';
        else if (loyalty.points >= 5000) loyalty.tier = 'gold';
        else if (loyalty.points >= 1000) loyalty.tier = 'silver';
        
        await loyalty.save();
      }
    }

    // Calculate and record commissions
    if (order.restaurant) {
      const commission = commissionService.calculateRestaurantCommission(order.totalAmount);
      await commissionService.recordCommission(order._id, 'restaurant', commission);
    }
    if (order.vendor) {
      const commission = commissionService.calculateVendorCommission(order.totalAmount);
      await commissionService.recordCommission(order._id, 'vendor', commission);
    }
    if (order.deliveryFee) {
      const commission = commissionService.calculateDeliveryCommission(order.deliveryFee);
      await commissionService.recordCommission(order._id, 'delivery', commission);
    }

    // Emit order_completed to all parties
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${order.user}`).emit('order_completed', order);
      if (order.restaurant) {
        io.of('/orders').to(`restaurant_${order.restaurant}`).emit('order_completed', order);
      }
      if (order.vendor) {
        io.of('/orders').to(`vendor_${order.vendor}`).emit('order_completed', order);
      }
      if (order.deliveryCompany) {
        io.of('/orders').to(`delivery_company_${order.deliveryCompany}`).emit('order_completed', order);
      }
    }

    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
