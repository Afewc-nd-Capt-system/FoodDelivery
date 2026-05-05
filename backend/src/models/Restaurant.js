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
    type: String,
    required: true,
  },
  location: {
    city: String,
    area: String,
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
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
