const express = require('express');
const Order = require('../../models/Order');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const User = require('../../models/User');
const DeliveryCompany = require('../../models/DeliveryCompany');
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const LoyaltyConfig = require('../../models/LoyaltyConfig');
const LoyaltyPoints = require('../../models/LoyaltyPoints');
const authMiddleware = require('../../middleware/auth');
const PayOnDeliveryService = require('../../services/PayOnDeliveryService');
const OrderCompletionService = require('../../services/OrderCompletionService');
const { priceOrder } = require('../../services/orderPricingService');
const PromoCode = require('../../models/PromoCode');
const router = express.Router();

function paidOrderAmount(order) {
  // Orders created before server-side pricing stored a food-only total and a
  // separate delivery fee. New orders store the all-in card-payable total.
  const cardPortion = order.subtotal === undefined || order.subtotal === null
    ? Number(order.totalAmount || 0) + Number(order.deliveryFee || 0)
    : Number(order.totalAmount || 0);
  return cardPortion + Number(order.walletAmountUsed || 0);
}

// GET /api/v2/orders/restaurants/orders - restaurant owner order feed
router.get('/restaurants/orders', authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const orders = await Order.find({
      restaurant: restaurant._id,
      deletedAt: null,
    }).sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

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
    const {
      restaurantId,
      restaurant,
      vendorId,
      vendor,
      items,
      deliveryAddress,
      paymentMethod,
      promoCode,
      promo,
    } = req.body;

    if (typeof deliveryAddress !== 'string' || !deliveryAddress.trim()) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    // Never use client-supplied prices, totals, fees, discounts, or wallet
    // amounts. Only the menu, customization options, and promo code are inputs.
    const pricing = await priceOrder({
      restaurantId: restaurantId || restaurant,
      vendorId: vendorId || vendor,
      items,
      promoCode: promoCode || promo,
    });

    const allowedPaymentMethods = ['cash', 'card', 'wallet', 'wallet_card'];
    const resolvedPaymentMethod = allowedPaymentMethods.includes(paymentMethod)
      ? paymentMethod
      : 'cash';

    // Wallet and loyalty values are requests, not trusted amounts. Both are
    // validated against server-side balances/configuration before use.
    const loyaltyPointsRequested = Number(req.body.loyaltyPointsRedeemed || 0);
    const walletRequested = Number(req.body.walletAmountUsed || 0);
    if (!Number.isInteger(loyaltyPointsRequested) || loyaltyPointsRequested < 0) {
      return res.status(400).json({ message: 'Invalid loyalty points amount' });
    }
    if (!Number.isFinite(walletRequested) || walletRequested < 0) {
      return res.status(400).json({ message: 'Invalid wallet amount' });
    }

    let loyaltyDiscount = 0;
    let loyaltyConfig = null;
    if (loyaltyPointsRequested > 0) {
      loyaltyConfig = await LoyaltyConfig.findOne({ isActive: true });
      if (!loyaltyConfig) {
        return res.status(400).json({ message: 'Loyalty system is not configured' });
      }
      const user = await User.findById(req.user.id);
      if (!user || Number(user.loyaltyPoints || 0) < loyaltyPointsRequested) {
        return res.status(400).json({ message: 'Insufficient loyalty points' });
      }
      if (loyaltyPointsRequested < Number(loyaltyConfig.minPointsRedemption || 0)) {
        return res.status(400).json({ message: 'Loyalty points below minimum redemption' });
      }
      const requestedDiscount = loyaltyPointsRequested / Number(loyaltyConfig.pointsRedemptionValue || 100);
      const maxDiscount = (pricing.subtotal * Number(loyaltyConfig.maxRedemptionPercent || 0)) / 100;
      if (requestedDiscount > maxDiscount + 0.01) {
        return res.status(400).json({ message: 'Loyalty discount exceeds the allowed maximum' });
      }
      loyaltyDiscount = Math.round(requestedDiscount * 100) / 100;
    }

    let walletAmountUsed = 0;
    if (walletRequested > 0) {
      const wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });
      if (!wallet || Number(wallet.balance) < walletRequested) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
      walletAmountUsed = Math.min(
        walletRequested,
        Math.max(0, pricing.totalAmount - loyaltyDiscount)
      );
      walletAmountUsed = Math.round(walletAmountUsed * 100) / 100;
    }

    const payableAmount = Math.max(
      0,
      Math.round((pricing.totalAmount - loyaltyDiscount - walletAmountUsed) * 100) / 100
    );

    const order = new Order({
      user: req.user.id,
      restaurant: pricing.restaurant?._id || null,
      vendor: pricing.vendor?._id || null,
      restaurantName: pricing.restaurantName,
      items: pricing.items,
      subtotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      serviceFee: pricing.serviceFee,
      totalAmount: payableAmount,
      currency: pricing.currency,
      promoCode: pricing.promoCode || undefined,
      promoDiscount: pricing.promoDiscount,
      loyaltyDiscount,
      loyaltyPointsRedeemed: loyaltyPointsRequested,
      walletAmountUsed,
      deliveryAddress: deliveryAddress.trim(),
      paymentMethod: resolvedPaymentMethod,
      isPaid: payableAmount === 0,
      paymentStatus: payableAmount === 0 ? 'paid' : 'pending',
      status: payableAmount === 0 ? 'confirmed' : 'pending',
    });

    await order.save();

    if (pricing.promo) {
      // Best-effort usage accounting after the order is safely persisted.
      await PromoCode.updateOne(
        { _id: pricing.promo._id },
        { $inc: { usageCount: 1 } }
      );
    }

    if (loyaltyPointsRequested > 0) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: req.user.id, loyaltyPoints: { $gte: loyaltyPointsRequested } },
        { $inc: { loyaltyPoints: -loyaltyPointsRequested } }
      );
      if (!updatedUser) {
        await Order.deleteOne({ _id: order._id });
        return res.status(409).json({ message: 'Loyalty points changed; please retry' });
      }
    }

    if (walletAmountUsed > 0) {
      const wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });
      const updatedWallet = wallet
        ? await Wallet.findOneAndUpdate(
          { _id: wallet._id, balance: { $gte: walletAmountUsed } },
          { $inc: { balance: -walletAmountUsed } },
          { new: true }
        )
        : null;
      if (!updatedWallet) {
        if (loyaltyPointsRequested > 0) {
          await User.findByIdAndUpdate(req.user.id, { $inc: { loyaltyPoints: loyaltyPointsRequested } });
        }
        await Order.deleteOne({ _id: order._id });
        return res.status(409).json({ message: 'Wallet balance changed; please retry' });
      }
      await WalletTransaction.create({
        wallet: updatedWallet._id,
        user: req.user.id,
        type: 'debit',
        amount: walletAmountUsed,
        description: `Order payment ${order._id}`,
        order: order._id,
        reference: `DEBIT-${order._id}`,
        status: 'completed',
      });
    }

    if (loyaltyPointsRequested > 0) {
      await LoyaltyPoints.create({
        user: req.user.id,
        points: -loyaltyPointsRequested,
        type: 'redeemed',
        description: `Redeemed ${loyaltyPointsRequested} points for order ${order._id}`,
        order: order._id,
        reference: `REDEEM-${order._id}`,
      });
    }

    // Cash and fully wallet-paid orders are actionable immediately. Online
    // orders are announced only after Paystack marks them paid.
    const io = req.app.get('io');
    if (io && (resolvedPaymentMethod === 'cash' || order.isPaid)) {
      const roomId = order.restaurant ? `restaurant_${order.restaurant}` : `vendor_${order.vendor}`;
      io.of('/orders').to(roomId).emit('new_order', order);
    }

    res.status(201).json({ order });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(error.status || 400).json({ message: error.message });
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
        wallet.balance += paidOrderAmount(order);
        await wallet.save();

        const transaction = new WalletTransaction({
          wallet: wallet._id,
          type: 'refund',
          amount: paidOrderAmount(order),
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
      company = await DeliveryCompany.findOne({
        isActive: true,
        'verification.status': 'verified',
        deletedAt: null,
      });
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
        wallet.balance += paidOrderAmount(order);
        await wallet.save();

        const transaction = new WalletTransaction({
          wallet: wallet._id,
          type: 'refund',
          amount: paidOrderAmount(order),
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
      company = await DeliveryCompany.findOne({
        isActive: true,
        'verification.status': 'verified',
        deletedAt: null,
      });
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

    const completed = await OrderCompletionService.completeOrder(order);

    // Emit order_completed to all parties
    const io = req.app.get('io');
    if (io) {
      io.of('/orders').to(`customer_${completed.user}`).emit('order_completed', completed);
      if (completed.restaurant) {
        io.of('/orders').to(`restaurant_${completed.restaurant}`).emit('order_completed', completed);
      }
      if (completed.vendor) {
        io.of('/orders').to(`vendor_${completed.vendor}`).emit('order_completed', completed);
      }
      if (completed.deliveryCompany) {
        io.of('/orders').to(`delivery_company_${completed.deliveryCompany}`).emit('order_completed', completed);
      }
    }

    res.json({ order: completed });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
