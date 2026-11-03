const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  type: {
    type: String,
    enum: ['restaurant', 'vendor', 'delivery'],
    required: true,
  },
  // The business this commission belongs to. Resolved server-side from the
  // order at completion time (restaurant / vendor / delivery company id).
  // Earnings and payout endpoints MUST filter on this field — a commission
  // without a tenant must never be visible to a business owner.
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  gross: {
    type: Number,
    required: true,
  },
  commissionRate: {
    type: String,
    required: true,
  },
  commissionAmount: {
    type: Number,
    required: true,
  },
  netAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
  paidAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Commission', commissionSchema);
