const mongoose = require('mongoose');

const adPlacementSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  targetType: {
    type: String,
    enum: ['restaurant', 'vendor'],
    required: true,
  },
  placement: {
    type: String,
    enum: ['homepage_banner', 'search_top', 'category_top'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
  },
  costPerClick: {
    type: Number,
    required: true,
  },
  totalClicks: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending_approval', 'active', 'paused', 'exhausted', 'expired'],
    default: 'pending_approval',
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  creative: {
    headline: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
  },
  paystackReference: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('AdPlacement', adPlacementSchema);
