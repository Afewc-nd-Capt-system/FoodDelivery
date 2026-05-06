const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  favoriteCuisines: [{
    type: String
  }],
  favoriteCategories: [{
    type: String
  }],
  priceRangePreference: {
    type: String,
    enum: ['$', '$$', '$$$', '$$$$', null],
    default: null
  },
  dietaryPreferences: [{
    type: String,
    enum: ['vegan', 'vegetarian', 'halal', 'kosher', 'gluten-free', 'nut-free', 'dairy-free']
  }],
  avgOrderValue: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  lastOrderDate: Date,
  locationArea: String,
  locationCity: String,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

userPreferenceSchema.index({ user: 1 });
userPreferenceSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('UserPreference', userPreferenceSchema);