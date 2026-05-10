const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    required: true,
  },
  isVeg: {
    type: Boolean,
    default: false,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  maxOrders: {
    type: Number,
    default: 50,
  },
  ordersPlaced: {
    type: Number,
    default: 0,
  },
  allowPayOnDelivery: { type: Boolean, default: true },
  podMinQuantity: { type: Number, default: 1 },
});

const vendorSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  ownerName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    default: '',
  },
  cuisine: [{
    type: String,
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  address: {
    type: String,
    required: true,
  },
  location: {
    city: String,
    area: String,
  },
  menu: [menuItemSchema],
  isOpen: {
    type: Boolean,
    default: true,
  },
  offers: [{
    type: String,
  }],
  payOnDeliveryConfig: {
    enabled: { type: Boolean, default: true },
    minOrderAmount: { type: Number, default: 0 },
    maxOrderAmount: { type: Number, default: null },
    allowedTimeRanges: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: { type: String },
      endTime: { type: String }
    }],
    productLevelControl: { type: Boolean, default: false },
    trustedCustomerWhitelist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  cookingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    default: ['saturday'],
  }],
  orderDeadline: {
    type: Number,
    default: 24,
  },
  deliveryTime: {
    type: String,
    default: '12pm - 2pm',
  },
  minOrderForDelivery: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);