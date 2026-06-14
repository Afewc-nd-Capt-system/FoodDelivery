const express = require('express');
const User = require('../../models/User');
const Restaurant = require('../../models/Restaurant');
const Order = require('../../models/Order');
const PromoCode = require('../../models/PromoCode');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalRestaurants, totalVendors, totalOrders, pendingRestaurants, openDisputes] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Restaurant.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'vendor' }),
      Order.countDocuments({}),
      Restaurant.countDocuments({ verificationStatus: 'pending_verification' }),
      require('../../models/Dispute').countDocuments({ status: 'pending' }).catch(() => 0),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, todayRevenue] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).then(r => r[0]?.total || 0).catch(() => 0),
    ]);

    res.json({ totalUsers, totalRestaurants, totalVendors, totalOrders, pendingRestaurants, openDisputes, todayOrders, todayRevenue });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query
    const query = {}
    if (role) query.role = role
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }
    const users = await User.find(query)
      .select('-password -refreshToken -mfaSecret -backupCodes')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
    const total = await User.countDocuments(query)
    res.json({ users, total, page: parseInt(page) })
  } catch (err) {
    console.error('Admin users error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/users/:id/suspend', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false })
    res.json({ message: 'User suspended' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/users/:id/restore', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: true })
    res.json({ message: 'User restored' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/vendors', async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const query = { role: 'vendor' };
    if (status !== 'all') query.isActive = status === 'active';

    const vendors = await User.find(query)
      .select('-password -refreshToken')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);
    res.json({ vendors, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v2/admin/vendors/:id/approve
router.patch('/vendors/:id/approve', async (req, res) => {
  try {
    const vendor = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true, isVerified: true, verificationStatus: 'approved' },
      { new: true }
    );
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    // Try to also update Vendor model if it exists separately
    try {
      const Vendor = require('../../models/Vendor');
      await Vendor.findOneAndUpdate(
        { email: vendor.email },
        { isActive: true, isVerified: true, verificationStatus: 'approved' }
      );
    } catch {}
    // Send approval email
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: `"VibeChops" <${process.env.EMAIL_USER}>`,
        to: vendor.email,
        subject: 'Your VibeChops vendor application is approved!',
        html: `
          <h2>Congratulations ${vendor.name}! \u{1F389}</h2>
          <p>Your vendor application has been approved.</p>
          <p>Login to your dashboard:
            <a href="${process.env.FRONTEND_URL}/vendor-login"
               style="background:#E8621A;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">
              Click here
            </a>
          </p>
        `
      });
    } catch (emailErr) {
      console.warn('Approval email failed:', emailErr.message);
    }
    res.json({ success: true, message: 'Vendor approved successfully', vendor: { id: vendor._id, name: vendor.name, email: vendor.email } });
  } catch (err) {
    console.error('Vendor approve error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/v2/admin/vendors/:id/reject
router.patch('/vendors/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const vendor = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, verificationStatus: 'rejected', verificationNotes: reason },
      { new: true }
    );
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json({ success: true, message: 'Vendor rejected' });
  } catch (err) {
    console.error('Vendor reject error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/v2/admin/vendors/:id/suspend
router.patch('/vendors/:id/suspend', async (req, res) => {
  try {
    const vendor = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json({ message: 'Vendor suspended' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/promo-codes', async (req, res) => {
  try {
    const codes = await PromoCode.find({}).sort({ createdAt: -1 });
    res.json({ codes });
  } catch (err) {
    res.json({ codes: [] });
  }
});

router.post('/promo-codes', async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrder, expiresAt, maxUses } = req.body
    if (!code || !discountType || !discountValue || !expiresAt) {
      return res.status(400).json({ message: 'Code, type, value and expiry are required' })
    }
    const promo = await PromoCode.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrder) || 0,
      validUntil: new Date(expiresAt),
      usageLimit: Number(maxUses) || 100,
    })
    res.status(201).json({ code: promo, message: 'Promo code created' })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This promo code already exists' })
    }
    console.error('Promo code error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
});

router.delete('/promo-codes/:id', async (req, res) => {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('restaurant', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Order.countDocuments(query);
    res.json({ orders, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
