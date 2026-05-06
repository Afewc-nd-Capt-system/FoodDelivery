const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

walletSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Wallet', walletSchema);