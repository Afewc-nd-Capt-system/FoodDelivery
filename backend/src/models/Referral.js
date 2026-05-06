const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  refereeReferralCode: {
    type: String,
    comment: 'The code the referee used'
  },
  rewardType: {
    type: String,
    enum: ['points', 'wallet_credit', 'discount'],
    default: 'points'
  },
  rewardValue: {
    type: Number,
    default: 0
  },
  rewardClaimed: {
    type: Boolean,
    default: false
  },
  rewardClaimedAt: Date,
  refereeFirstOrderCompleted: {
    type: Boolean,
    default: false
  },
  refereeFirstOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  refereeDiscountApplied: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired', 'cancelled'],
    default: 'pending'
  },
  expiresAt: Date,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

referralSchema.index({ referrer: 1 });
referralSchema.index({ referee: 1 });
referralSchema.index({ deletedAt: 1 });

referralSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = 'VIBE' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Referral', referralSchema);