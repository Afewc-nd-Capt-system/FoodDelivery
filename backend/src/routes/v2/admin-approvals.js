const express = require('express');
const Restaurant = require('../../models/Restaurant');
const Vendor = require('../../models/Vendor');
const User = require('../../models/User');
const DeliveryCompany = require('../../models/DeliveryCompany');
const RestaurantPromotion = require('../../models/RestaurantPromotion');
const Dispute = require('../../models/Dispute');
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Helper: Log admin action
async function logAdminAction(userId, action, details) {
  // TODO: Implement audit log collection
  console.log(`Admin ${userId} performed action: ${action}`, details);
}

// PATCH /api/v2/admin/restaurants/:id/approve
router.patch('/restaurants/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedAt: new Date() },
      { new: true }
    );
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    await logAdminAction(req.user.id, 'approve_restaurant', { restaurantId: req.params.id });
    res.json({ restaurant });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/restaurants/:id/suspend
router.patch('/restaurants/:id/suspend', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isSuspended: true, suspendedAt: new Date(), suspensionReason: reason },
      { new: true }
    );
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    await logAdminAction(req.user.id, 'suspend_restaurant', { restaurantId: req.params.id, reason });
    res.json({ restaurant });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/vendors/:id/approve
router.patch('/vendors/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedAt: new Date() },
      { new: true }
    );
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    await logAdminAction(req.user.id, 'approve_vendor', { vendorId: req.params.id });
    res.json({ vendor });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/vendors/:id/reject
router.patch('/vendors/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isApproved: false, rejectedAt: new Date(), rejectionReason: reason },
      { new: true }
    );
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    await logAdminAction(req.user.id, 'reject_vendor', { vendorId: req.params.id, reason });
    res.json({ vendor });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/users/:id/suspend
router.patch('/users/:id/suspend', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isSuspended: true, suspendedAt: new Date(), suspensionReason: reason },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await logAdminAction(req.user.id, 'suspend_user', { userId: req.params.id, reason });
    res.json({ user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/users/:id/restore
router.patch('/users/:id/restore', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isSuspended: false, suspendedAt: null, suspensionReason: null },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await logAdminAction(req.user.id, 'restore_user', { userId: req.params.id });
    res.json({ user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/promotions/:id/approve
router.patch('/promotions/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const promotion = await RestaurantPromotion.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date() },
      { new: true }
    );
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    await logAdminAction(req.user.id, 'approve_promotion', { promotionId: req.params.id });
    res.json({ promotion });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/promotions/:id/reject
router.patch('/promotions/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const promotion = await RestaurantPromotion.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectedAt: new Date(), rejectionReason: reason },
      { new: true }
    );
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    await logAdminAction(req.user.id, 'reject_promotion', { promotionId: req.params.id, reason });
    res.json({ promotion });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/disputes/:id/resolve
router.patch('/disputes/:id/resolve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { resolution, amount } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = req.user.id;
    await dispute.save();

    // If refund, credit customer wallet
    if (resolution === 'refund' && amount) {
      const wallet = await Wallet.findOne({ user: dispute.userId });
      if (wallet) {
        wallet.balance += amount;
        await wallet.save();

        const transaction = new WalletTransaction({
          wallet: wallet._id,
          type: 'refund',
          amount,
          description: `Refund for dispute ${dispute._id}`,
        });
        await transaction.save();
      }
    }

    await logAdminAction(req.user.id, 'resolve_dispute', { disputeId: req.params.id, resolution, amount });
    res.json({ dispute });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/admin/delivery-companies
router.get('/delivery-companies', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const companies = await DeliveryCompany.find().sort({ createdAt: -1 });
    res.json({ companies });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/delivery-companies/:id/approve
router.patch('/delivery-companies/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const company = await DeliveryCompany.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedAt: new Date() },
      { new: true }
    );
    if (!company) {
      return res.status(404).json({ message: 'Delivery company not found' });
    }
    await logAdminAction(req.user.id, 'approve_delivery_company', { companyId: req.params.id });
    res.json({ company });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/v2/admin/delivery-companies/:id/suspend
router.patch('/delivery-companies/:id/suspend', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const company = await DeliveryCompany.findByIdAndUpdate(
      req.params.id,
      { isSuspended: true, suspendedAt: new Date(), suspensionReason: reason },
      { new: true }
    );
    if (!company) {
      return res.status(404).json({ message: 'Delivery company not found' });
    }
    await logAdminAction(req.user.id, 'suspend_delivery_company', { companyId: req.params.id, reason });
    res.json({ company });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
