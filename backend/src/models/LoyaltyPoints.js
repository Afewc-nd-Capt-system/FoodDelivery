const mongoose = require('mongoose');

const loyaltyPointsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'bonus', 'referral'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  reference: String,
  expiresAt: Date,
  isExpired: {
    type: Boolean,
    default: false
  },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

loyaltyPointsSchema.index({ user: 1, createdAt: -1 });
loyaltyPointsSchema.index({ order: 1 });
loyaltyPointsSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('LoyaltyPoints', loyaltyPointsSchema);