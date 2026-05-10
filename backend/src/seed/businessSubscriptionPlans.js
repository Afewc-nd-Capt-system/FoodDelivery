const mongoose = require('mongoose');
const BusinessSubscriptionPlan = require('../models/BusinessSubscriptionPlan');

const restaurantPlans = [
  {
    name: 'Basic',
    targetType: 'restaurant',
    price: 0,
    commissionRate: 0.18,
    maxMenuItems: 20,
    maxPhotos: 10,
    analyticsAccess: false,
    priorityListing: false,
    promotionsAllowed: 0,
    badgeLabel: null,
    features: [
      'Up to 20 menu items',
      'Standard commission (18%)',
      'Basic analytics',
    ],
  },
  {
    name: 'Standard',
    targetType: 'restaurant',
    price: 15000,
    commissionRate: 0.15,
    maxMenuItems: 50,
    maxPhotos: 20,
    analyticsAccess: true,
    priorityListing: false,
    promotionsAllowed: 2,
    badgeLabel: 'Verified',
    features: [
      'Up to 50 menu items',
      'Reduced commission (15%)',
      'Full analytics dashboard',
      'Up to 2 promotions per month',
      'Verified badge',
    ],
  },
  {
    name: 'Premium',
    targetType: 'restaurant',
    price: 35000,
    commissionRate: 0.12,
    maxMenuItems: Infinity,
    maxPhotos: 50,
    analyticsAccess: true,
    priorityListing: true,
    promotionsAllowed: 5,
    badgeLabel: 'Featured',
    features: [
      'Unlimited menu items',
      'Lowest commission (12%)',
      'Priority listing in search',
      'Full analytics dashboard',
      'Up to 5 promotions per month',
      'Featured badge',
    ],
  },
];

const vendorPlans = [
  {
    name: 'Basic',
    targetType: 'vendor',
    price: 0,
    commissionRate: 0.15,
    maxMenuItems: 10,
    maxPhotos: 5,
    analyticsAccess: false,
    priorityListing: false,
    promotionsAllowed: 0,
    badgeLabel: null,
    features: [
      'Up to 10 menu items',
      'Standard commission (15%)',
    ],
  },
  {
    name: 'Standard',
    targetType: 'vendor',
    price: 5000,
    commissionRate: 0.12,
    maxMenuItems: 25,
    maxPhotos: 15,
    analyticsAccess: true,
    priorityListing: false,
    promotionsAllowed: 1,
    badgeLabel: 'Verified Home Cook',
    features: [
      'Up to 25 menu items',
      'Reduced commission (12%)',
      'Basic analytics',
      '1 promotion per month',
      'Verified Home Cook badge',
    ],
  },
  {
    name: 'Premium',
    targetType: 'vendor',
    price: 10000,
    commissionRate: 0.10,
    maxMenuItems: Infinity,
    maxPhotos: 30,
    analyticsAccess: true,
    priorityListing: true,
    promotionsAllowed: 3,
    badgeLabel: 'Top Vendor',
    features: [
      'Unlimited menu items',
      'Lowest commission (10%)',
      'Priority listing',
      'Full analytics',
      '3 promotions per month',
      'Top Vendor badge',
    ],
  },
];

async function seedBusinessSubscriptionPlans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');
    
    // Clear existing plans
    await BusinessSubscriptionPlan.deleteMany({});
    
    // Insert restaurant plans
    await BusinessSubscriptionPlan.insertMany(restaurantPlans);
    console.log('Restaurant subscription plans seeded successfully');
    
    // Insert vendor plans
    await BusinessSubscriptionPlan.insertMany(vendorPlans);
    console.log('Vendor subscription plans seeded successfully');
    
    console.log('All business subscription plans seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding business subscription plans:', error);
    process.exit(1);
  }
}

seedBusinessSubscriptionPlans();
