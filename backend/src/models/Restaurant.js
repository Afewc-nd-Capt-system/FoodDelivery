const mongoose = require('mongoose');

const customizationOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['single', 'multiple', 'quantity'],
    default: 'single',
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: [{
    name: String,
    price: {
      type: Number,
      default: 0,
    },
  }],
  min: {
    type: Number,
    default: 1,
  },
  max: {
    type: Number,
    default: 1,
  },
});

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
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 4,
  },
  customizationOptions: [customizationOptionSchema],
  allowSpecialInstructions: {
    type: Boolean,
    default: true,
  },
  allowPayOnDelivery: { type: Boolean, default: true },
  podMinQuantity: { type: Number, default: 1 },
  popular: { type: Boolean, default: false },
  calories: { type: String, default: '' },
});

const reviewSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
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
    default: 4,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  deliveryTime: {
    type: String,
    default: '30-40 mins',
  },
  priceForTwo: {
    type: Number,
    default: 500,
  },
  priceRange: {
    type: String,
    enum: ['$', '$$', '$$$', '$$$$'],
    default: '$$',
  },
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    country: { type: String, default: 'Nigeria' },
    formattedAddress: String,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [0, 0]
    }
  },
  menu: [menuItemSchema],
  reviews: [reviewSchema],
  isOpen: {
    type: Boolean,
    default: true,
  },
  offers: [{
    type: String,
  }],
  payOnDeliveryEnabled: {
    type: Boolean,
    default: true,
  },
  minOrderForPayOnDelivery: {
    type: Number,
    default: 0,
  },
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
  photoGallery: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false,
    },
  }],
  locationCoords: {
    lat: Number,
    lng: Number,
  },
  dietaryOptions: [{
    type: String,
    enum: ['vegan', 'vegetarian', 'halal', 'kosher', 'gluten-free', 'nut-free', 'dairy-free']
  }],
  cuisineTags: [String],
  deletedAt: { type: Date, default: null },
  // CAC Verification fields
  cacCertificate: {
    url: String,
    uploadedAt: Date,
  },
  governmentApproval: {
    url: String,
    uploadedAt: Date,
  },
  tinNumber: {
    type: String,
  },
  rcNumber: {
    type: String,
  },
  verificationStatus: {
    type: String,
    enum: ['pending_verification', 'under_review', 'approved', 'rejected'],
    default: 'pending_verification',
  },
  verificationNotes: {
    type: String,
  },
  verifiedAt: {
    type: Date,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

restaurantSchema.index({ deletedAt: 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ 'address.city': 1 });
restaurantSchema.index({ 'address.state': 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
