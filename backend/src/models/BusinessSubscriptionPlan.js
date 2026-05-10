const mongoose = require('mongoose');

const businessSubscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Basic', 'Standard', 'Premium'],
  },
  targetType: {
    type: String,
    required: true,
    enum: ['restaurant', 'vendor'],
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  features: [{
    type: String,
  }],
  commissionRate: {
    type: Number,
    required: true,
  },
  maxMenuItems: {
    type: Number,
    required: true,
  },
  maxPhotos: {
    type: Number,
    default: 10,
  },
  analyticsAccess: {
    type: Boolean,
    default: false,
  },
  priorityListing: {
    type: Boolean,
    default: false,
  },
  promotionsAllowed: {
    type: Number,
    default: 0,
  },
  badgeLabel: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('BusinessSubscriptionPlan', businessSubscriptionPlanSchema);
