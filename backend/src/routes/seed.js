const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const { restaurants, vendors } = require('../../../frontend/src/data/mockData');

// Seed restaurants with location data
router.post('/restaurants', async (req, res) => {
  try {
    // Clear existing restaurants
    await Restaurant.deleteMany({});
    
    // Transform mock data to match schema with location
    const restaurantData = restaurants.map((restaurant, index) => ({
      ...restaurant,
      location: {
        type: 'Point',
        coordinates: [
          3.3792 + (index * 0.01), // Longitude (varied across Nigeria)
          6.5244 + (index * 0.01),  // Latitude (varied across Nigeria)
        ]
      },
      address: {
        street: `${index + 1} Sample Street`,
        area: 'Central Area',
        city: restaurant.address.split(',')[1]?.trim() || 'Lagos',
        state: restaurant.address.split(',')[2]?.trim() || 'Lagos',
        country: 'Nigeria',
        formattedAddress: restaurant.address
      },
      owner: null, // Will be set later or left null
      businessName: restaurant.name,
      ownerName: 'System Admin',
      businessEmail: `restaurant${index + 1}@vibechops.com`,
      businessPhone: `0800000000${index + 1}`,
      operatingHours: {
        monday: { open: '09:00', close: '22:00' },
        tuesday: { open: '09:00', close: '22:00' },
        wednesday: { open: '09:00', close: '22:00' },
        thursday: { open: '09:00', close: '22:00' },
        friday: { open: '09:00', close: '22:00' },
        saturday: { open: '09:00', close: '23:00' },
        sunday: { open: '09:00', close: '21:00' }
      },
      isVerified: true,
      isApproved: true,
      rating: restaurant.rating,
      reviewCount: restaurant.reviewCount,
      totalOrders: Math.floor(Math.random() * 1000) + 100,
      revenue: Math.floor(Math.random() * 1000000) + 100000,
      subscriptionStatus: 'active',
      subscriptionType: 'premium',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }));
    
    const insertedRestaurants = await Restaurant.insertMany(restaurantData);
    
    res.status(201).json({
      message: 'Restaurants seeded successfully',
      count: insertedRestaurants.length,
      restaurants: insertedRestaurants.map(r => ({
        id: r._id,
        name: r.name,
        location: r.location,
        address: r.address
      }))
    });
  } catch (error) {
    console.error('Error seeding restaurants:', error);
    res.status(500).json({ 
      error: 'Failed to seed restaurants',
      details: error.message 
    });
  }
});

// Seed vendors with location data
router.post('/vendors', async (req, res) => {
  try {
    // Clear existing vendors
    await Vendor.deleteMany({});
    
    // Transform mock data to match schema with location
    const vendorData = vendors.map((vendor, index) => ({
      ...vendor,
      location: {
        type: 'Point',
        coordinates: [
          3.3792 + (index * 0.015), // Longitude (varied across Nigeria)
          6.5244 + (index * 0.015),  // Latitude (varied across Nigeria)
        ]
      },
      address: {
        street: `${index + 1} Vendor Street`,
        area: 'Commercial District',
        city: vendor.address.split(',')[1]?.trim() || 'Lagos',
        state: vendor.address.split(',')[2]?.trim() || 'Lagos',
        country: 'Nigeria',
        formattedAddress: vendor.address
      },
      owner: null, // Will be set later or left null
      businessName: vendor.name,
      ownerName: 'Vendor Owner',
      businessEmail: `vendor${index + 1}@vibechops.com`,
      businessPhone: `0900000000${index + 1}`,
      operatingHours: {
        monday: { open: '10:00', close: '20:00' },
        tuesday: { open: '10:00', close: '20:00' },
        wednesday: { open: '10:00', close: '20:00' },
        thursday: { open: '10:00', close: '20:00' },
        friday: { open: '10:00', close: '20:00' },
        saturday: { open: '10:00', close: '21:00' },
        sunday: { open: '12:00', close: '18:00' }
      },
      isVerified: true,
      isApproved: true,
      rating: vendor.rating,
      reviewCount: vendor.reviewCount,
      totalOrders: Math.floor(Math.random() * 500) + 50,
      revenue: Math.floor(Math.random() * 500000) + 50000,
      subscriptionStatus: 'active',
      subscriptionType: 'basic',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }));
    
    const insertedVendors = await Vendor.insertMany(vendorData);
    
    res.status(201).json({
      message: 'Vendors seeded successfully',
      count: insertedVendors.length,
      vendors: insertedVendors.map(v => ({
        id: v._id,
        name: v.name,
        location: v.location,
        address: v.address
      }))
    });
  } catch (error) {
    console.error('Error seeding vendors:', error);
    res.status(500).json({ 
      error: 'Failed to seed vendors',
      details: error.message 
    });
  }
});

// Seed admin users
router.post('/users', async (req, res) => {
  try {
    // Clear existing users (optional - be careful with this in production)
    // await User.deleteMany({ role: { $in: ['admin', 'superadmin'] } });
    
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUsers = [
      {
        name: 'Super Admin',
        email: 'admin@vibechops.com',
        password: hashedPassword,
        role: 'superadmin',
        isVerified: true,
        isActive: true,
        profile: {
          firstName: 'Super',
          lastName: 'Admin',
          phone: '08000000000'
        },
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          privacy: {
            profileVisibility: 'public',
            showOnlineStatus: true
          }
        }
      },
      {
        name: 'Restaurant Admin',
        email: 'restaurant@vibechops.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        isActive: true,
        profile: {
          firstName: 'Restaurant',
          lastName: 'Admin',
          phone: '08000000001'
        },
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          privacy: {
            profileVisibility: 'public',
            showOnlineStatus: true
          }
        }
      },
      {
        name: 'Test Customer',
        email: 'customer@vibechops.com',
        password: hashedPassword,
        role: 'customer',
        isVerified: true,
        isActive: true,
        profile: {
          firstName: 'Test',
          lastName: 'Customer',
          phone: '08000000002'
        },
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: true
          },
          privacy: {
            profileVisibility: 'public',
            showOnlineStatus: true
          }
        }
      }
    ];
    
    const insertedUsers = await User.insertMany(adminUsers);
    
    res.status(201).json({
      message: 'Users seeded successfully',
      count: insertedUsers.length,
      users: insertedUsers.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Error seeding users:', error);
    res.status(500).json({ 
      error: 'Failed to seed users',
      details: error.message 
    });
  }
});

// Seed all data
router.post('/all', async (req, res) => {
  try {
    const results = {};
    
    // Seed restaurants
    try {
      const restaurantResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seed/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      results.restaurants = await restaurantResponse.json();
    } catch (error) {
      results.restaurants = { error: error.message };
    }
    
    // Seed vendors
    try {
      const vendorResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seed/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      results.vendors = await vendorResponse.json();
    } catch (error) {
      results.vendors = { error: error.message };
    }
    
    // Seed users
    try {
      const userResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seed/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      results.users = await userResponse.json();
    } catch (error) {
      results.users = { error: error.message };
    }
    
    res.status(201).json({
      message: 'Database seeding completed',
      results
    });
  } catch (error) {
    console.error('Error seeding all data:', error);
    res.status(500).json({ 
      error: 'Failed to seed database',
      details: error.message 
    });
  }
});

// Get seeding status
router.get('/status', async (req, res) => {
  try {
    const restaurantCount = await Restaurant.countDocuments();
    const vendorCount = await Vendor.countDocuments();
    const userCount = await User.countDocuments();
    
    res.json({
      restaurants: restaurantCount,
      vendors: vendorCount,
      users: userCount,
      total: restaurantCount + vendorCount + userCount
    });
  } catch (error) {
    console.error('Error getting seed status:', error);
    res.status(500).json({ 
      error: 'Failed to get seed status',
      details: error.message 
    });
  }
});

// Clear all data (use with caution)
router.delete('/clear', async (req, res) => {
  try {
    const confirmationToken = req.headers['x-confirmation-token'];
    
    if (confirmationToken !== 'CLEAR_ALL_DATA_CONFIRMED') {
      return res.status(403).json({ 
        error: 'Confirmation token required',
        message: 'Add header: X-Confirmation-Token: CLEAR_ALL_DATA_CONFIRMED'
      });
    }
    
    const results = {};
    
    results.restaurants = await Restaurant.deleteMany({});
    results.vendors = await Vendor.deleteMany({});
    results.users = await User.deleteMany({ role: { $ne: 'superadmin' } }); // Keep superadmin
    
    res.json({
      message: 'All data cleared successfully',
      results
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ 
      error: 'Failed to clear data',
      details: error.message 
    });
  }
});

module.exports = router;
