const mongoose = require('mongoose');

const groupOrderItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  items: [{
    menuItem: String,
    name: String,
    price: Number,
    quantity: Number,
    specialInstructions: String
  }],
  addedAt: { type: Date, default: Date.now }
});

const groupOrderSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  restaurantName: String,
  shareCode: {
    type: String,
    required: true,
    unique: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [groupOrderItemSchema],
  status: {
    type: String,
    enum: ['active', 'closed', 'paid'],
    default: 'active'
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  deliveryAddress: String,
  paymentMethod: String,
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

groupOrderSchema.pre('save', function(next) {
  if (!this.shareCode) {
    this.shareCode = 'GROUP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  }
  next();
});

groupOrderSchema.index({ host: 1 });
groupOrderSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('GroupOrder', groupOrderSchema);