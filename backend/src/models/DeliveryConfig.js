const mongoose = require('mongoose');

const deliveryConfigSchema = new mongoose.Schema({
  baseDeliveryFee: {
    type: Number,
    default: 40,
    min: 0
  },
  perKmFee: {
    type: Number,
    default: 10,
    min: 0
  },
  freeDeliveryThreshold: {
    type: Number,
    default: 2000,
    min: 0,
    comment: 'Order value above which delivery is free'
  },
  maxDeliveryRadius: {
    type: Number,
    default: 15,
    min: 0,
    comment: 'Maximum distance in km for delivery'
  },
  surgePricing: {
    enabled: {
      type: Boolean,
      default: true
    },
    peakHours: [
      {
        start: { type: String, default: '12:00' },
        end: { type: String, default: '14:00' },
        multiplier: { type: Number, default: 1.5 }
      },
      {
        start: { type: String, default: '18:00' },
        end: { type: String, default: '21:00' },
        multiplier: { type: Number, default: 1.5 }
      }
    ],
    weekendMultiplier: {
      type: Number,
      default: 1.2
    }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

deliveryConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('DeliveryConfig', deliveryConfigSchema);