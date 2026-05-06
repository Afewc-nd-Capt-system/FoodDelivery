const mongoose = require('mongoose');
require('dotenv').config();
const SubscriptionPlan = require('../models/SubscriptionPlan');
const LoyaltyConfig = require('../models/LoyaltyConfig');

const subscriptionPlans = [
  {
    planType: 'vibepass-basic',
    name: 'VibePass Basic',
    description: 'Get up to 5 free deliveries per month and priority processing on your orders.',
    monthlyPrice: 1499,
    freeDeliveryLimit: 5,
    priorityProcessing: true,
    exclusivePromos: false,
    discountPercent: 0,
    features: [
      '5 free deliveries per month',
      'Priority order processing',
      'Exclusive deals access',
    ],
    isActive: true,
  },
  {
    planType: 'vibepass-premium',
    name: 'VibePass Premium',
    description: 'Get up to 15 free deliveries per month, priority processing, and exclusive promos!',
    monthlyPrice: 2999,
    freeDeliveryLimit: 15,
    priorityProcessing: true,
    exclusivePromos: true,
    discountPercent: 5,
    features: [
      '15 free deliveries per month',
      'Priority order processing',
      'Exclusive promos & deals',
      '5% extra discount on all orders',
      'Early access to new features',
    ],
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');
    console.log('Connected to MongoDB');

    for (const plan of subscriptionPlans) {
      const existing = await SubscriptionPlan.findOne({ planType: plan.planType });
      if (!existing) {
        await SubscriptionPlan.create(plan);
        console.log(`Created plan: ${plan.name}`);
      } else {
        console.log(`Plan already exists: ${plan.name}`);
      }
    }

    const loyaltyConfig = await LoyaltyConfig.findOne({});
    if (!loyaltyConfig) {
      await LoyaltyConfig.create({
        pointsEarnRate: 1,
        pointsRedemptionValue: 100,
        minPointsRedemption: 100,
        maxRedemptionPercent: 20,
        newUserBonus: 50,
        referralPointsReward: 100,
        referralDiscountValue: 100,
        isActive: true,
      });
      console.log('Created loyalty config');
    } else {
      console.log('Loyalty config already exists');
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();