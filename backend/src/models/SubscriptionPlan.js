const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  planType: {
    type: String,
    enum: ['vibepass-basic', 'vibepass-premium'],
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  freeDeliveryLimit: {
    type: Number,
    default: 5,
    min: 0
  },
  priorityProcessing: {
    type: Boolean,
    default: false
  },
  exclusivePromos: {
    type: Boolean,
    default: false
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    comment: 'Additional discount on orders'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  features: [{
    type: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

subscriptionPlanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);