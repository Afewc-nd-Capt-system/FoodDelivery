const mongoose = require('mongoose');
require('dotenv').config();
const DeliveryConfig = require('../models/DeliveryConfig');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');
    console.log('Connected to MongoDB');

    const existing = await DeliveryConfig.findOne({ isActive: true });
    if (!existing) {
      await DeliveryConfig.create({
        baseDeliveryFee: 40,
        perKmFee: 10,
        freeDeliveryThreshold: 2000,
        maxDeliveryRadius: 15,
        surgePricing: {
          enabled: true,
          peakHours: [
            { start: '12:00', end: '14:00', multiplier: 1.5 },
            { start: '18:00', end: '21:00', multiplier: 1.5 }
          ],
          weekendMultiplier: 1.2
        },
        isActive: true
      });
      console.log('Created delivery config');
    } else {
      console.log('Delivery config already exists');
    }

    console.log('Seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();