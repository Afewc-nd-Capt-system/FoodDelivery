const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    index: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  plan: {
    type: mongoose.Schema.Types.Mixed,
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
  paystackReference: {
    type: String,
    unique: true,
    sparse: true,
  },
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