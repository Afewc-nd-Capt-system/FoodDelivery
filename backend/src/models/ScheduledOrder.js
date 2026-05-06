const mongoose = require('mongoose');

const scheduledOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  restaurantName: String,
  items: [{
    menuItem: String,
    name: String,
    price: Number,
    quantity: Number,
    customizations: [Object],
    specialInstructions: String
  }],
  totalAmount: Number,
  deliveryAddress: String,
  scheduledTime: {
    type: Date,
    required: true
  },
  paymentMethod: String,
  deliveryFee: Number,
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'scheduled'
  },
  isPaid: { type: Boolean, default: false },
  paystackReference: String,
  promoDiscount: Number,
  promoCode: String,
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

scheduledOrderSchema.index({ user: 1, scheduledTime: 1 });
scheduledOrderSchema.index({ restaurant: 1, scheduledTime: 1 });
scheduledOrderSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('ScheduledOrder', scheduledOrderSchema);