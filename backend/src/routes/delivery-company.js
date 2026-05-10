const express = require('express');
const DeliveryCompany = require('../models/DeliveryCompany');
const DeliveryPartner = require('../models/DeliveryPartner');
const DeliveryCompanyService = require('../services/DeliveryCompanyService');
const authMiddleware = require('../middleware/auth');
const { deliveryCompanyGuard, adminGuard } = require('../middleware/routeGuards');

const router = express.Router();

// Public registration endpoint
router.post('/register', async (req, res) => {
  try {
    const existing = await DeliveryCompany.findOne({
      $or: [
        { email: req.body.email },
        { businessRegistrationNumber: req.body.businessRegistrationNumber }
      ]
    });

    if (existing) {
      return res.status(400).json({ 
        message: 'Company with this email or registration number already exists' 
      });
    }

    const company = await DeliveryCompanyService.registerCompany(req.body);

    res.status(201).json({
      company: {
        _id: company._id,
        companyName: company.companyName,
        verification: company.verification
      },
      message: 'Company registered successfully. Pending verification.'
    });
  } catch (error) {
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
