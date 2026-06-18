const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const menuData = {
  'Mama Cass Kitchen': [
    { name: 'Jollof Rice & Chicken', description: 'Smoky party jollof rice with fried chicken and plantain', price: 3500, category: 'Rice', popular: true, calories: '650 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400', customizationOptions: [{ name: 'Protein', type: 'single', required: true, options: [{ name: 'Fried Chicken', price: 0 }, { name: 'Grilled Chicken', price: 200 }, { name: 'Beef', price: 300 }, { name: 'Turkey', price: 400 }] }] },
    { name: 'Egusi Soup + Swallow', description: 'Rich egusi soup with assorted meat and swallow of choice', price: 3000, category: 'Swallow', calories: '580 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400', customizationOptions: [{ name: 'Swallow Choice', type: 'single', required: true, options: [{ name: 'Eba', price: 0 }, { name: 'Fufu', price: 0 }, { name: 'Pounded Yam', price: 200 }] }] },
    { name: 'Catfish Pepper Soup', description: 'Spicy catfish pepper soup with special herbs', price: 4500, category: 'Soups', calories: '320 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
  ],
  'Abuja Grill House': [
    { name: 'Suya Platter', description: 'Premium suya with fresh vegetables and spices', price: 5000, category: 'Grills', popular: true, calories: '480 cal', image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400', customizationOptions: [{ name: 'Meat Type', type: 'single', required: true, options: [{ name: 'Beef', price: 0 }, { name: 'Chicken', price: 0 }, { name: 'Ram', price: 500 }] }] },
    { name: 'Grilled Chicken', description: 'Full grilled chicken with peppered sauce', price: 6500, category: 'Grills', calories: '720 cal', image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400' },
    { name: 'Jollof Rice', description: 'Nigerian party jollof rice', price: 2500, category: 'Rice', calories: '550 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
  ],
  'Kano Suya Express': [
    { name: 'Northern Suya', description: 'Authentic Kano-style suya with traditional spices', price: 3000, category: 'Grills', popular: true, calories: '380 cal', image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400' },
    { name: 'Tuwo Shinkafa', description: 'Northern rice pudding with miyan kuka soup', price: 2000, category: 'Swallow', calories: '450 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
    { name: 'Masa', description: 'Traditional Hausa rice cakes', price: 1500, category: 'Snacks', calories: '280 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
  ],
  'Kanuri Kitchen': [
    { name: 'Kanuri Meat Stew', description: 'Rich traditional Kanuri beef stew with spices', price: 3500, category: 'Soups', popular: true, calories: '420 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
    { name: 'Ngalakh', description: 'Traditional northern millet porridge', price: 1500, category: 'Breakfast', calories: '320 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
    { name: 'Grilled Fish', description: 'Fresh tilapia grilled with local spices', price: 4000, category: 'Grills', calories: '380 cal', image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400' },
  ],
  'Port Harcourt Seafood': [
    { name: 'Banga Soup + Starch', description: 'Delta-style palm nut soup with starch', price: 4500, category: 'Soups', popular: true, calories: '490 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
    { name: 'Pepper Soup Fish', description: 'Fresh river fish in spicy pepper soup', price: 5000, category: 'Soups', calories: '350 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
    { name: 'Seafood Fried Rice', description: 'Fried rice with mixed seafood and vegetables', price: 5500, category: 'Rice', calories: '620 cal', image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
  ],
};

const restaurantDocs = [
  {
    name: 'Mama Cass Kitchen',
    email: 'mamacass@vibechops.ng',
    phone: '+2348000000002',
    description: 'Best Nigerian cuisine in Lagos',
    cuisine: 'Traditional Nigerian',
    address: {
      street: '14 Allen Avenue',
      area: 'Ikeja',
      city: 'Lagos',
      state: 'Lagos',
      formattedAddress: '14 Allen Avenue, Ikeja, Lagos'
    },
    location: { type: 'Point', coordinates: [3.3792, 6.5244] },
    rating: 4.8,
    reviewCount: 1243,
    deliveryTime: '20-35 min',
    deliveryFee: 500,
    minOrder: 2000,
    priceRange: '\u20A6\u20A6',
    categories: ['Rice', 'Soups', 'Swallow'],
    isActive: true,
    isOpen: true,
    verificationStatus: 'approved',
    image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400',
  },
  {
    name: 'Abuja Grill House',
    email: 'abujagrill@vibechops.ng',
    phone: '+2348000000003',
    description: 'Premium grills in the heart of Abuja',
    cuisine: 'Nigerian Grills',
    address: {
      street: '5 Wuse Zone 4',
      area: 'Wuse',
      city: 'Abuja',
      state: 'FCT',
      formattedAddress: '5 Wuse Zone 4, Abuja'
    },
    location: { type: 'Point', coordinates: [7.4898, 9.0579] },
    rating: 4.6,
    reviewCount: 892,
    deliveryTime: '25-40 min',
    deliveryFee: 600,
    minOrder: 3000,
    priceRange: '\u20A6\u20A6\u20A6',
    categories: ['Grills', 'Premium'],
    isActive: true,
    isOpen: true,
    verificationStatus: 'approved',
    image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400',
  },
  {
    name: 'Kano Suya Express',
    email: 'kanosuya@vibechops.ng',
    phone: '+2348000000004',
    description: 'Authentic northern Nigerian suya',
    cuisine: 'Northern Nigerian',
    address: {
      street: '22 Bompai Road',
      area: 'Nassarawa',
      city: 'Kano',
      state: 'Kano',
      formattedAddress: '22 Bompai Road, Kano'
    },
    location: { type: 'Point', coordinates: [8.5167, 12.0000] },
    rating: 4.7,
    reviewCount: 654,
    deliveryTime: '20-30 min',
    deliveryFee: 400,
    minOrder: 1500,
    priceRange: '\u20A6\u20A6',
    categories: ['Suya', 'Grills'],
    isActive: true,
    isOpen: true,
    verificationStatus: 'approved',
    image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400',
  },
  {
    name: 'Kanuri Kitchen',
    email: 'kanurikitchen@vibechops.ng',
    phone: '+2348000000005',
    description: 'Authentic Kanuri and northern Nigerian dishes',
    cuisine: 'Kanuri Traditional',
    address: {
      street: '14 Shehu Laminu Way',
      area: 'Gwange',
      city: 'Maiduguri',
      state: 'Borno',
      formattedAddress: '14 Shehu Laminu Way, Maiduguri'
    },
    location: { type: 'Point', coordinates: [13.1573, 11.8333] },
    rating: 4.9,
    reviewCount: 321,
    deliveryTime: '20-35 min',
    deliveryFee: 300,
    minOrder: 1000,
    priceRange: '\u20A6\u20A6',
    categories: ['Traditional', 'Soups'],
    isActive: true,
    isOpen: true,
    verificationStatus: 'approved',
    image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400',
  },
  {
    name: 'Port Harcourt Seafood',
    email: 'phseafood@vibechops.ng',
    phone: '+2348000000006',
    description: 'Fresh seafood from the Niger Delta',
    cuisine: 'Seafood & Delta',
    address: {
      street: '8 Aba Road',
      area: 'Rumuola',
      city: 'Port Harcourt',
      state: 'Rivers',
      formattedAddress: '8 Aba Road, Port Harcourt'
    },
    location: { type: 'Point', coordinates: [7.0134, 4.8156] },
    rating: 4.5,
    reviewCount: 445,
    deliveryTime: '30-45 min',
    deliveryFee: 700,
    minOrder: 3000,
    priceRange: '\u20A6\u20A6\u20A6',
    categories: ['Seafood', 'Delta'],
    isActive: true,
    isOpen: true,
    verificationStatus: 'approved',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400',
  },
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
    for (const r of restaurantDocs) {
      const { image, deliveryFee, ...restData } = r;
      const inserted = await Restaurant.findOneAndUpdate(
        { name: r.name },
        {
          $setOnInsert: restData,
          $set: { image, deliveryFee }
        },
        { upsert: true, new: true }
      );
      // Attach menu items for this restaurant
      const items = menuData[inserted.name] || [];
      if (items.length > 0) {
        await Restaurant.findByIdAndUpdate(inserted._id, { $set: { menu: items } });
      }
      results.push({ id: inserted._id, name: inserted.name, city: inserted.address?.city, menuItems: items.length });
    }

    // Update any restaurant without an image with a fallback food image
    const fallbackImages = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80',
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
      'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80',
    ];
    const noImageRestaurants = await Restaurant.find({
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    });
    let fallbackCount = 0;
    for (let i = 0; i < noImageRestaurants.length; i++) {
      const img = fallbackImages[i % fallbackImages.length];
      await Restaurant.findByIdAndUpdate(noImageRestaurants[i]._id, { $set: { image: img } });
      fallbackCount++;
    }

    res.status(201).json({
      message: 'Restaurants seeded successfully',
      count: results.length,
      restaurants: results,
      fallbackImagesUpdated: fallbackCount,
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

    const testVendor = await User.findOneAndUpdate(
      { email: 'vendor@vibechops.ng' },
      { $setOnInsert: {
        name: 'Mama Ngozi',
        email: 'vendor@vibechops.ng',
        password: bcrypt.hashSync('Vendor@2026!', 12),
        phone: '+2348022222222',
        role: 'vendor',
        isVerified: true,
        isActive: true,
      }},
      { upsert: true, new: true }
    );
    results.push({ id: testVendor._id, name: testVendor.name, email: testVendor.email, role: testVendor.role });

    const testRestaurant = await User.findOneAndUpdate(
      { email: 'restaurant@vibechops.ng' },
      { $setOnInsert: {
        name: 'Mama Cass Kitchen',
        email: 'restaurant@vibechops.ng',
        password: bcrypt.hashSync('Restaurant@2026!', 12),
        phone: '+2348033333333',
        role: 'restaurant',
        isVerified: true,
        isActive: true,
      }},
      { upsert: true, new: true }
    );
    results.push({ id: testRestaurant._id, name: testRestaurant.name, email: testRestaurant.email, role: testRestaurant.role });

    const testRider = await User.findOneAndUpdate(
      { email: 'rider@vibechops.ng' },
      { $setOnInsert: {
        name: 'Emeka Rider',
        email: 'rider@vibechops.ng',
        password: bcrypt.hashSync('Rider@2026!', 12),
        phone: '+2348044444444',
        role: 'delivery_rider',
        isVerified: true,
        isActive: true,
      }},
      { upsert: true, new: true }
    );
    results.push({ id: testRider._id, name: testRider.name, email: testRider.email, role: testRider.role });

    const testDeliveryCompany = await User.findOneAndUpdate(
      { email: 'delivery@vibechops.ng' },
      { $setOnInsert: {
        name: 'Swift Delivery Co',
        email: 'delivery@vibechops.ng',
        password: bcrypt.hashSync('Delivery@2026!', 12),
        phone: '+2348055555555',
        role: 'delivery_company',
        isVerified: true,
        isActive: true,
      }},
      { upsert: true, new: true }
    );
    results.push({ id: testDeliveryCompany._id, name: testDeliveryCompany.name, email: testDeliveryCompany.email, role: testDeliveryCompany.role });

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

    // Seed VibePass subscription plans
    try {
      const plans = [
        { planType: 'vibepass-basic', name: 'VibePass Basic', description: 'Free delivery on every order, zero subscription fee', monthlyPrice: 0, freeDeliveryLimit: 999, priorityProcessing: false, exclusivePromos: false, discountPercent: 0, features: ['Free delivery on every order', 'No subscription fee', 'Standard processing'], isActive: true },
        { planType: 'vibepass-premium', name: 'VibePass Premium', description: 'Priority processing, exclusive promos, and 5% discount on every order', monthlyPrice: 2500, freeDeliveryLimit: 999, priorityProcessing: true, exclusivePromos: true, discountPercent: 5, features: ['Free delivery on every order', 'Priority processing', 'Exclusive promos and deals', '5% discount on every order', 'Early access to new restaurants'], isActive: true },
      ];
      let planCount = 0;
      for (const plan of plans) {
        await SubscriptionPlan.findOneAndUpdate(
          { planType: plan.planType },
          { $setOnInsert: plan },
          { upsert: true, new: true }
        );
        planCount++;
      }
      results.subscriptionPlans = { count: planCount, message: 'VibePass plans seeded' };
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
