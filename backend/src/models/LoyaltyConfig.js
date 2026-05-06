const mongoose = require('mongoose');

const loyaltyConfigSchema = new mongoose.Schema({
  pointsEarnRate: {
    type: Number,
    default: 1,
    min: 0,
    comment: 'Points earned per currency unit spent'
  },
  pointsRedemptionValue: {
    type: Number,
    default: 100,
    min: 1,
    comment: 'How many points needed for 1 currency unit discount'
  },
  minPointsRedemption: {
    type: Number,
    default: 100,
    min: 0,
    comment: 'Minimum points required to redeem'
  },
  maxRedemptionPercent: {
    type: Number,
    default: 20,
    min: 0,
    max: 100,
    comment: 'Maximum percentage of order value that can be redeemed'
  },
  newUserBonus: {
    type: Number,
    default: 50,
    min: 0,
    comment: 'Bonus points for new user registration'
  },
  referralPointsReward: {
    type: Number,
    default: 100,
    min: 0,
    comment: 'Points earned by referrer when referee completes first order'
  },
  referralDiscountValue: {
    type: Number,
    default: 100,
    min: 0,
    comment: 'Discount value for referee first order'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

loyaltyConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('LoyaltyConfig', loyaltyConfigSchema);