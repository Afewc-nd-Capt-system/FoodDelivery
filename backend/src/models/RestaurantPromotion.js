const mongoose = require('mongoose');

const restaurantPromotionSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number,
    default: null
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsage: {
    type: Number,
    default: null
  },
  isBundle: {
    type: Boolean,
    default: false
  },
  bundleItems: [{
    menuItemId: String,
    name: String,
    originalPrice: Number,
    bundlePrice: Number
  }],
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

restaurantPromotionSchema.index({ restaurant: 1, isActive: 1 });
restaurantPromotionSchema.index({ approvalStatus: 1 });
restaurantPromotionSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('RestaurantPromotion', restaurantPromotionSchema);