const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
  },
  image: {
    type: String,
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  allowPayOnDelivery: {
    type: Boolean,
    default: true,
  },
  customizations: [{
    name: String,
    options: [{
      name: String,
      price: Number,
    }],
  }],
  preparationTime: {
    type: Number,
    default: 15,
  },
  tags: [String],
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
