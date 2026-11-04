const express = require('express');
const DeliveryCompany = require('../models/DeliveryCompany');
const User = require('../models/User');
const { verifyAccessToken } = require('../security/tokenService');
const DeliveryPartner = require('../models/DeliveryPartner');
const DeliveryCompanyService = require('../services/DeliveryCompanyService');
const authMiddleware = require('../middleware/auth');
const { deliveryCompanyGuard, adminGuard } = require('../middleware/routeGuards');
const { sessionResponse } = require('../utils/session');
const { sendWelcomeEmail } = require('../utils/email');
const { verifyInvitation, consumeInvitation } = require('../services/partnerInvitation');

const router = express.Router();

// Registration is public, but an authenticated user may create the company.
// Read the token manually so a missing token does not block self-registration.
function getAuthenticatedUserId(req) {
  if (req.user?.id) return req.user.id;

  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyAccessToken(token);
  return decoded?.id || decoded?._id || null;
}

// Public registration endpoint — invitation-only (admin-approved application).
router.post('/register', async (req, res) => {
  let invitation = null;
  let owner = null;
  try {
    const inviteCheck = await verifyInvitation(req.body.invitationToken, 'delivery');
    if (inviteCheck.error) {
      return res.status(inviteCheck.status).json({ message: inviteCheck.error });
    }
    invitation = inviteCheck.invitation;

    const existing = await DeliveryCompany.findOne({
      $or: [
        { email: req.body.email },
        { businessRegistrationNumber: req.body.businessRegistrationNumber }
      ]
    });

    if (existing) {
      return res.status(409).json({
        message: 'A company with this email or registration number already exists. Try signing in instead.'
      });
    }

    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Company email is required' });
    }
    if (invitation.email && normalizedEmail !== invitation.email) {
      return res.status(403).json({ message: 'This invitation was issued for a different email address.' });
    }
    if (!req.body.password || String(req.body.password).length < 8
      || !/[a-z]/.test(req.body.password) || !/[A-Z]/.test(req.body.password)
      || !/[0-9]/.test(req.body.password) || !/[!@#$%^&*(),.?":{}|<>]/.test(req.body.password)) {
      return res.status(400).json({ message: 'Password must be 8+ characters with upper, lower, number and special character' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });
    }

    owner = new User({
      name: req.body.contactName || req.body.companyName || 'Delivery Company',
      email: normalizedEmail,
      password: req.body.password,
      phone: req.body.phone,
      role: 'delivery_company',
    });
    await owner.save();

    const company = await DeliveryCompanyService.registerCompany({
      ...req.body,
      email: normalizedEmail,
      owner: owner._id,
    });

    const consumed = await consumeInvitation(invitation._id, owner._id);
    if (!consumed) {
      await Promise.all([
        DeliveryCompany.deleteOne({ _id: company._id }),
        User.deleteOne({ _id: owner._id }),
      ]);
      return res.status(409).json({ message: 'This invitation has already been used.' });
    }

    sendWelcomeEmail(owner.email, owner.name).catch((emailError) => {
      console.error('Welcome email failed:', emailError.message);
    });

    const session = await sessionResponse(res, owner);
    res.status(201).json({
      ...session,
      company: {
        _id: company._id,
        companyName: company.companyName,
        verification: company.verification
      },
      message: 'Company registered successfully. Pending verification.'
    });
  } catch (error) {
    if (invitation && owner) {
      await require('../models/PartnerInvitation').findOneAndUpdate(
        { _id: invitation._id, usedBy: owner._id },
        { $set: { usedAt: null, usedBy: null } }
      ).catch(() => {});
      await User.deleteOne({ _id: owner._id }).catch(() => {});
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Protected routes - require authentication
router.use(authMiddleware);

// Get company profile
router.get('/:id/profile', deliveryCompanyGuard, async (req, res) => {
  try {
    const company = await DeliveryCompany.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Verify authorization
    if (company._id.toString() !== req.user.company?.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update company profile
router.put('/:id/profile', deliveryCompanyGuard, async (req, res) => {
  try {
    const company = await DeliveryCompany.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Verify authorization
    if (company._id.toString() !== req.user.company?.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const allowedUpdates = ['phone', 'address', 'operationalAreas', 'pricing'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    await company.save();
    res.json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add rider to company
router.post('/:companyId/riders', deliveryCompanyGuard, async (req, res) => {
  try {
    const company = await DeliveryCompany.findById(req.params.companyId);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Verify authorization
    if (company._id.toString() !== req.user.company?.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const rider = await DeliveryCompanyService.addRiderToCompany(
      req.params.companyId,
      req.body
    );

    res.status(201).json({
      rider: {
        _id: rider._id,
        name: rider.name,
        email: rider.email,
        company: rider.company,
        companyId: rider.companyId,
        companyRole: rider.companyRole
      },
      message: 'Rider added successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get company riders
router.get('/:companyId/riders', deliveryCompanyGuard, async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const company = await DeliveryCompany.findById(req.params.companyId);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Verify authorization
    if (company._id.toString() !== req.user.company?.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let query = { company: req.params.companyId };
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const riders = await DeliveryPartner.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      riders,
      total: riders.length
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get company statistics
router.get('/:companyId/stats', deliveryCompanyGuard, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const company = await DeliveryCompany.findById(req.params.companyId);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Verify authorization
    if (company._id.toString() !== req.user.company?.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const stats = await DeliveryCompanyService.getCompanyStats(req.params.companyId);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Admin routes - verify company
router.put('/:id/verify', adminGuard, async (req, res) => {
  try {
    const { status } = req.body;
    const company = await DeliveryCompany.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    company.verification.status = status;
    company.verification.verifiedAt = new Date();
    company.verification.verifiedBy = req.user.id;

    await company.save();
    res.json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
