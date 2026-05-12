const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const User = require('../models/User');

const restaurants = [
  { id: '1', name: 'Mama Cass Kitchen', rating: 4.8, reviewCount: 1243, desc: 'Homemade Nigerian classics from the heart of Lagos' },
  { id: '2', name: 'Chop Chop African Kitchen', rating: 4.6, reviewCount: 892, desc: 'Fresh African flavors delivered daily' },
  { id: '3', name: 'Pepper Spot Grill', rating: 4.7, reviewCount: 654, desc: 'Spicy Nigerian dishes made to order' },
  { id: '4', name: 'Port Harcourt Seafood Grill', rating: 4.5, reviewCount: 445, desc: 'Premium seafood straight from the Niger Delta' },
  { id: '5', name: 'Ibadan Amala Hub', rating: 4.4, reviewCount: 567, desc: 'Traditional Yoruba cuisine at its best' },
  { id: '6', name: 'Enugu Coal City Kitchen', rating: 4.6, reviewCount: 789, desc: 'Igbo delicacies prepared with authentic recipes' },
  { id: '7', name: 'Benin Edo Kitchen', rating: 4.3, reviewCount: 321, desc: 'Rich Edo kingdom flavors in every meal' },
  { id: '8', name: 'Borno Delights', rating: 4.5, reviewCount: 234, desc: 'Northern Nigerian cuisine with a modern twist' },
  { id: '9', name: 'Jos Plateau Grill', rating: 4.7, reviewCount: 456, desc: 'Fresh grilled specialties from the Plateau' },
  { id: '10', name: 'Calabar Efik Kitchen', rating: 4.8, reviewCount: 678, desc: 'Authentic Efik dishes made with love' },
];

const restaurantEmails = [
  'mamacass@vibechops.ng', 'chopchop@vibechops.ng', 'pepperspot@vibechops.ng',
  'seafood@vibechops.ng', 'amala@vibechops.ng', 'coalcity@vibechops.ng',
  'edokitchen@vibechops.ng', 'borno@vibechops.ng', 'josgrill@vibechops.ng',
  'efik@vibechops.ng',
];

const vendors = [
  { id: 'v1', name: "Mama Ngozi's Kitchen", rating: 4.7, reviewCount: 234, address: 'Ikoyi, Lagos' },
  { id: 'v2', name: "Chef Amaka's Delights", rating: 4.9, reviewCount: 189, address: 'Asokoro, Abuja' },
  { id: 'v3', name: "Chef Segun's Special", rating: 4.6, reviewCount: 156, address: 'Sabon Gari, Kano' },
  { id: 'v4', name: 'Sisi Bisi Catering', rating: 4.8, reviewCount: 298, address: 'GRA, Port Harcourt' },
  { id: 'v5', name: "Mama Funke's Kitchen", rating: 4.5, reviewCount: 167, address: 'Bodija, Ibadan' },
  { id: 'v6', name: "Aunty Ada's Delicacies", rating: 4.7, reviewCount: 234, address: 'Independence Layout, Enugu' },
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
        { email: restaurantEmails[i] },
        { $setOnInsert: {
          name: r.name,
          description: r.desc,
          email: restaurantEmails[i],
          phone: `+2348000000${String(i + 1).padStart(3, '0')}`,
          rating: r.rating,
          reviewCount: r.reviewCount,
          priceRange: '$$',
          deliveryTime: '20-35 min',
          cuisine: ['Nigerian'],
          isOpen: true,
          verificationStatus: 'approved',
          location: {
            type: 'Point',
            coordinates: [3.3792 + (i * 0.01), 6.5244 + (i * 0.01)],
          },
          address: {
            street: `${i + 1} Sample Street`,
            area: 'Central Area',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
          },
          priceForTwo: 500,
          payOnDeliveryEnabled: true,
          payOnDeliveryConfig: { enabled: true, minOrderAmount: 0 },
        }},
        { upsert: true, new: true }
      );
      results.push({ id: inserted._id, name: inserted.name, email: inserted.email });
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
            coordinates: [3.3792 + (i * 0.015), 6.5244 + (i * 0.015)],
          },
          address: {
            street: `${i + 1} Vendor Street`,
            area: 'Commercial District',
            city: 'Lagos',
            state: 'Lagos',
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
      const restaurantResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seed/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.restaurants = await restaurantResponse.json();
    } catch (error) {
      results.restaurants = { error: error.message };
    }

    try {
      const vendorResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seed/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.vendors = await vendorResponse.json();
    } catch (error) {
      results.vendors = { error: error.message };
    }

    try {
      const userResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seed/users`, {
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

module.exports = router;
