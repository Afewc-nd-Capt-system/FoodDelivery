const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  customizations: [{
    name: String,
    option: String,
    price: Number,
  }],
  specialInstructions: String,
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: false,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: false,
  },
  restaurantName: {
    type: String,
    required: true,
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    min: 0,
  },
  serviceFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'NGN',
    uppercase: true,
    trim: true,
  },
  deliveryAddress: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'accepted',
      'preparing',
      'ready',
      'awaiting_pickup',
      'pending_delivery',
      'accepted_by_delivery',
      'assigned',
      'picked_up',
      'out_for_delivery',
      'out-for-delivery',
      'completed',
      'delivered',
      'cancelled',
    ],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'wallet_card'],
    default: 'cash',
  },
  deliveryFee: {
    type: Number,
    default: 40,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  paystackReference: {
    type: String,
    default: '',
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPartner',
  },
  otp: {
    type: String,
    default: () => Math.floor(1000 + Math.random() * 9000).toString(),
  },
  promoDiscount: {
    type: Number,
    default: 0,
  },
  promoCode: String,
  deliveredAt: Date,
  walletAmountUsed: {
    type: Number,
    default: 0,
    comment: 'Amount paid using wallet'
  },
  loyaltyDiscount: {
    type: Number,
    default: 0,
    comment: 'Discount from loyalty points redemption'
  },
  loyaltyPointsRedeemed: {
    type: Number,
    default: 0,
    comment: 'Points used for discount'
  },
  loyaltyPointsEarned: {
    type: Number,
    default: 0,
    comment: 'Points earned from this order'
  },
  referralDiscountApplied: {
    type: Number,
    default: 0,
    comment: 'Discount from referral (first order)'
  },
  deliveryConfirmation: {
    riderConfirmed: { type: Boolean, default: false },
    riderConfirmedAt: { type: Date },
    customerNotified: { type: Boolean, default: false },
    customerNotifiedAt: { type: Date },
    customerConfirmed: { type: Boolean, default: false },
    customerConfirmedAt: { type: Date },
    customerVerificationCode: { type: String },
    paymentCollected: { type: Boolean, default: false },
    paymentCollectedAt: { type: Date }
  },
  deliveryCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryCompany'
  },
  isVibePassFreeDelivery: {
    type: Boolean,
    default: false,
    comment: 'Whether free delivery from VibePass was applied'
  },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
