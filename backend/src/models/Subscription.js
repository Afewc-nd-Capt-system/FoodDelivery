const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['vibepass-basic', 'vibepass-premium'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending'],
    default: 'pending'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  freeDeliveryLimit: {
    type: Number,
    default: 10,
    comment: 'Number of free deliveries per month'
  },
  freeDeliveryUsed: {
    type: Number,
    default: 0
  },
  monthlyPrice: {
    type: Number,
    required: true
  },
  paystackSubscriptionCode: {
    type: String,
    unique: true,
    sparse: true
  },
  paystackCustomerId: String,
  paystackSubscriptionId: String,
  autoRenew: {
    type: Boolean,
    default: true
  },
  cancelledAt: Date,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);