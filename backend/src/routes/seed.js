const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const BusinessSubscriptionPlan = require('../models/BusinessSubscriptionPlan');

const restaurants = [
  { id: '1', name: 'Mama Cass Kitchen', rating: 4.8, reviewCount: 1243, city: 'Lagos', state: 'Lagos', coords: [3.3792, 6.5244] },
  { id: '2', name: 'Chop Chop African Kitchen', rating: 4.6, reviewCount: 892, city: 'Abuja', state: 'FCT', coords: [7.4898, 9.0579] },
  { id: '3', name: 'The Pepper Spot', rating: 4.7, reviewCount: 654, city: 'Kano', state: 'Kano', coords: [8.5167, 12.0000] },
  { id: '4', name: 'Jollof Republic', rating: 4.5, reviewCount: 445, city: 'Lagos', state: 'Lagos', coords: [3.3892, 6.5144] },
  { id: '5', name: 'Naija Bites Express', rating: 4.4, reviewCount: 567, city: 'Port Harcourt', state: 'Rivers', coords: [7.0134, 4.8156] },
  { id: '6', name: 'Lagos Grill House', rating: 4.6, reviewCount: 789, city: 'Lagos', state: 'Lagos', coords: [3.3692, 6.5344] },
  { id: '7', name: "Chef Chi's Fusion", rating: 4.3, reviewCount: 321, city: 'Ibadan', state: 'Oyo', coords: [3.8964, 7.3775] },
  { id: '8', name: 'Suya Shack', rating: 4.5, reviewCount: 234, city: 'Kaduna', state: 'Kaduna', coords: [7.4420, 10.5264] },
  { id: '9', name: 'Kanuri Kitchen', rating: 4.7, reviewCount: 456, city: 'Maiduguri', state: 'Borno', coords: [13.1573, 11.8333] },
  { id: '10', name: 'Abuja Grill House', rating: 4.8, reviewCount: 678, city: 'Abuja', state: 'FCT', coords: [7.4798, 9.0479] },
];

const vendors = [
  { id: 'v1', name: "Mama Ngozi's Kitchen", rating: 4.7, reviewCount: 234, address: 'Ikoyi, Lagos', city: 'Lagos', state: 'Lagos', coords: [3.4292, 6.4744] },
  { id: 'v2', name: "Chef Amaka's Delights", rating: 4.9, reviewCount: 189, address: 'Asokoro, Abuja', city: 'Abuja', state: 'FCT', coords: [7.5198, 9.0779] },
  { id: 'v3', name: "Chef Segun's Special", rating: 4.6, reviewCount: 156, address: 'Sabon Gari, Kano', city: 'Kano', state: 'Kano', coords: [8.5367, 12.0200] },
  { id: 'v4', name: 'Sisi Bisi Catering', rating: 4.8, reviewCount: 298, address: 'GRA, Port Harcourt', city: 'Port Harcourt', state: 'Rivers', coords: [7.0334, 4.8356] },
  { id: 'v5', name: "Mama Funke's Kitchen", rating: 4.5, reviewCount: 167, address: 'Bodija, Ibadan', city: 'Ibadan', state: 'Oyo', coords: [3.9164, 7.3975] },
  { id: 'v6', name: "Aunty Ada's Delicacies", rating: 4.7, reviewCount: 234, address: 'Independence Layout, Enugu', city: 'Enugu', state: 'Enugu', coords: [7.5098, 6.4603] },
];

const vendorEmails = [
  'mama.ngozi@vibechops.ng', 'chef.amaka@vibechops.ng', 'chef.segun@vibechops.ng',
  'sisi.bisi@vibechops.ng', 'mama.funke@vibechops.ng', 'aunty.ada@vibechops.ng',
];

const hashedAdminPassword = bcrypt.hashSync('VibeChops@Admin2026!', 12);
const hashedDemoPassword = bcrypt.hashSync('Demo@2026!', 12);

router.post('/restaurants', async (req, res) => {
  try {
    const results = [];
    for (let i = 0; i < restaurants.length; i++) {
      const r = restaurants[i];
      const inserted = await Restaurant.findOneAndUpdate(
        { name: r.name },
        { $setOnInsert: {
          name: r.name,
          description: 'Authentic Nigerian cuisine delivered fresh to your door',
          phone: `+2348000000${String(i + 1).padStart(3, '0')}`,
          rating: r.rating,
          reviewCount: r.reviewCount,
          priceRange: '$$',
          deliveryTime: '20-35 min',
          cuisine: ['Nigerian'],
          isOpen: true,
          isActive: true,
          verificationStatus: 'approved',
          location: {
            type: 'Point',
            coordinates: r.coords,
          },
          address: {
            street: `${i + 1} Sample Street`,
            area: 'Central Area',
            city: r.city,
            state: r.state,
            country: 'Nigeria',
          },
          priceForTwo: 500,
          payOnDeliveryEnabled: true,
          payOnDeliveryConfig: { enabled: true, minOrderAmount: 0 },
        }},
        { upsert: true, new: true }
      );
      results.push({ id: inserted._id, name: inserted.name, city: inserted.address?.city });
    }

    res.status(201).json({
      message: 'Restaurants seeded successfully',
      count: results.length,
      restaurants: results,
    });
  } catch (error) {
    console.error('Error seeding restaurants:', error);
    res.status(500).json({ error: 'Failed to seed restaurants', details: error.message });
  }
});

router.post('/vendors', async (req, res) => {
  try {
    const results = [];
    for (let i = 0; i < vendors.length; i++) {
      const v = vendors[i];
      const inserted = await Vendor.findOneAndUpdate(
        { email: vendorEmails[i] },
        { $setOnInsert: {
          businessName: v.name,
          ownerName: v.name,
          email: vendorEmails[i],
          phone: `+2348000000${String(i + 10).padStart(3, '0')}`,
          description: v.address || 'Homemade Nigerian dishes',
          rating: v.rating,
          reviewCount: v.reviewCount,
          cuisine: ['Nigerian'],
          isOpen: true,
          isActive: true,
          verificationStatus: 'approved',
          cookingDays: ['saturday'],
          deliveryTime: '12pm - 2pm',
          minOrderForDelivery: 0,
          location: {
            type: 'Point',
            coordinates: v.coords,
          },
          address: {
            street: `${i + 1} Vendor Street`,
            area: 'Commercial District',
            city: v.city,
            state: v.state,
            country: 'Nigeria',
          },
          payOnDeliveryConfig: { enabled: true, minOrderAmount: 0 },
        }},
        { upsert: true, new: true }
      );
      results.push({ id: inserted._id, name: inserted.businessName, email: inserted.email });
    }

    res.status(201).json({
      message: 'Vendors seeded successfully',
      count: results.length,
      vendors: results,
    });
  } catch (error) {
    console.error('Error seeding vendors:', error);
    res.status(500).json({ error: 'Failed to seed vendors', details: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const results = [];

    const admin = await User.findOneAndUpdate(
      { email: 'admin@vibechops.ng' },
      { $setOnInsert: {
        name: 'VibeChops Admin',
        email: 'admin@vibechops.ng',
        password: hashedAdminPassword,
        phone: '+2348000000001',
        role: 'admin',
        isVerified: true,
        isActive: true,
      }},
      { upsert: true, new: true }
    );
    results.push({ id: admin._id, name: admin.name, email: admin.email, role: admin.role });

    const demo = await User.findOneAndUpdate(
      { email: 'demo@vibechops.ng' },
      { $setOnInsert: {
        name: 'Demo Customer',
        email: 'demo@vibechops.ng',
        password: hashedDemoPassword,
        phone: '+2348000000099',
        role: 'customer',
        isVerified: true,
        isActive: true,
      }},
      { upsert: true, new: true }
    );
    results.push({ id: demo._id, name: demo.name, email: demo.email, role: demo.role });

    res.status(201).json({
      message: 'Users seeded successfully',
      count: results.length,
      users: results,
    });
  } catch (error) {
    console.error('Error seeding users:', error.message);
    console.error('Error details:', error);
    res.status(500).json({ error: 'Failed to seed users', details: error.message });
  }
});

router.post('/all', async (req, res) => {
  try {
    const results = {};

    try {
      const restaurantResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v2/seed/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.restaurants = await restaurantResponse.json();
    } catch (error) {
      results.restaurants = { error: error.message };
    }

    try {
      const vendorResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v2/seed/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.vendors = await vendorResponse.json();
    } catch (error) {
      results.vendors = { error: error.message };
    }

    try {
      const userResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v2/seed/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.users = await userResponse.json();
    } catch (error) {
      results.users = { error: error.message };
    }

    res.status(201).json({
      message: 'Database seeding completed',
      results,
    });
  } catch (error) {
    console.error('Error seeding all data:', error);
    res.status(500).json({ error: 'Failed to seed database', details: error.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const restaurantCount = await Restaurant.countDocuments();
    const vendorCount = await Vendor.countDocuments();
    const userCount = await User.countDocuments();

    res.json({
      restaurants: restaurantCount,
      vendors: vendorCount,
      users: userCount,
      total: restaurantCount + vendorCount + userCount,
    });
  } catch (error) {
    console.error('Error getting seed status:', error);
    res.status(500).json({ error: 'Failed to get seed status', details: error.message });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    const confirmationToken = req.headers['x-confirmation-token'];

    if (confirmationToken !== 'CLEAR_ALL_DATA_CONFIRMED') {
      return res.status(403).json({
        error: 'Confirmation token required',
        message: 'Add header: X-Confirmation-Token: CLEAR_ALL_DATA_CONFIRMED',
      });
    }

    const results = {};
    results.restaurants = await Restaurant.deleteMany({});
    results.vendors = await Vendor.deleteMany({});
    results.users = await User.deleteMany({ email: { $nin: ['admin@vibechops.ng'] } });

    res.json({
      message: 'All data cleared successfully',
      results,
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data', details: error.message });
  }
});

// GET /api/v2/seed/init - Run full seed with auth guard
router.get('/init', async (req, res) => {
  const seedKey = req.headers['x-seed-key'];
  if (seedKey !== 'VibeChops@Seed2026!') {
    return res.status(403).json({ error: 'Invalid seed key' });
  }

  try {
    const results = {};

    try {
      const restaurantResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v2/seed/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.restaurants = await restaurantResponse.json();
    } catch (error) {
      results.restaurants = { error: error.message };
    }

    try {
      const vendorResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v2/seed/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.vendors = await vendorResponse.json();
    } catch (error) {
      results.vendors = { error: error.message };
    }

    try {
      const userResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v2/seed/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.users = await userResponse.json();
    } catch (error) {
      results.users = { error: error.message };
    }

    // Seed subscription plans
    try {
      const restaurantPlans = [
        { name: 'Basic', targetType: 'restaurant', price: 0, commissionRate: 18, maxMenuItems: 20, promotionsAllowed: 0, priorityListing: false, analyticsAccess: false, badgeLabel: null, features: ['20 menu items', '18% commission per order', 'Basic dashboard', 'Standard listing'], isActive: true },
        { name: 'Standard', targetType: 'restaurant', price: 15000, commissionRate: 15, maxMenuItems: 50, promotionsAllowed: 2, priorityListing: false, analyticsAccess: true, badgeLabel: 'Verified', features: ['50 menu items', '15% commission per order', 'Full analytics dashboard', '2 promotions per month', 'Verified badge'], isActive: true },
        { name: 'Premium', targetType: 'restaurant', price: 35000, commissionRate: 12, maxMenuItems: 999, promotionsAllowed: 5, priorityListing: true, analyticsAccess: true, badgeLabel: 'Featured', features: ['Unlimited menu items', '12% commission per order', 'Priority listing in search', '5 promotions per month', 'Featured badge', 'Advanced analytics'], isActive: true },
      ];
      const vendorPlans = [
        { name: 'Basic', targetType: 'vendor', price: 0, commissionRate: 15, maxMenuItems: 10, promotionsAllowed: 0, priorityListing: false, analyticsAccess: false, badgeLabel: null, features: ['10 menu items', '15% commission per order', 'Basic dashboard', 'Standard listing'], isActive: true },
        { name: 'Standard', targetType: 'vendor', price: 5000, commissionRate: 12, maxMenuItems: 25, promotionsAllowed: 1, priorityListing: false, analyticsAccess: true, badgeLabel: 'Verified Home Cook', features: ['25 menu items', '12% commission per order', 'Analytics dashboard', '1 promotion per month', 'Verified Home Cook badge'], isActive: true },
        { name: 'Premium', targetType: 'vendor', price: 10000, commissionRate: 10, maxMenuItems: 999, promotionsAllowed: 3, priorityListing: true, analyticsAccess: true, badgeLabel: 'Top Vendor', features: ['Unlimited menu items', '10% commission per order', 'Priority listing', '3 promotions per month', 'Top Vendor badge', 'Advanced analytics'], isActive: true },
      ];
      let planCount = 0;
      for (const plan of [...restaurantPlans, ...vendorPlans]) {
        await BusinessSubscriptionPlan.findOneAndUpdate(
          { name: plan.name, targetType: plan.targetType },
          { $setOnInsert: plan },
          { upsert: true, new: true }
        );
        planCount++;
      }
      results.subscriptionPlans = { count: planCount, message: 'Subscription plans seeded' };
      console.log('Subscription plans seeded');
    } catch (error) {
      results.subscriptionPlans = { error: error.message };
    }

    res.json({
      message: 'Seed initialization completed',
      results,
    });
  } catch (error) {
    console.error('Error during seed init:', error);
    res.status(500).json({ error: 'Seed init failed', details: error.message });
  }
});

module.exports = router;
