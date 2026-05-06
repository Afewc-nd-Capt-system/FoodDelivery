const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['wrong_item', 'missing_item', 'quality_issue', 'delivery_delay', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  evidence: [{
    type: String,
    url: String
  }],
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'rejected'],
    default: 'open'
  },
  resolution: {
    type: String,
    enum: ['full_refund', 'partial_refund', 'credit', 'rejected'],
  },
  refundAmount: Number,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  adminNotes: String,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

disputeSchema.index({ order: 1 });
disputeSchema.index({ user: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);