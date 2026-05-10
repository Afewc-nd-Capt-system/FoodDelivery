const mongoose = require('mongoose');

const deliveryCompanySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  businessRegistrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  operationalAreas: [{
    city: String,
    areas: [String]
  }],
  pricing: {
    baseFee: { type: Number, default: 30 },
    perKmRate: { type: Number, default: 10 },
    commissionRate: { type: Number, default: 0.15 }
  },
  fleet: {
    totalRiders: { type: Number, default: 0 },
    activeRiders: { type: Number, default: 0 },
    vehicles: [{
      type: { type: String, enum: ['bike', 'scooter', 'car'] },
      count: Number
    }]
  },
  verification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    documents: [{
      type: String,
      url: String,
      uploadedAt: Date
    }],
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  wallet: {
    balance: { type: Number, default: 0 },
    pendingWithdrawals: { type: Number, default: 0 }
  },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

deliveryCompanySchema.index({ deletedAt: 1 });
deliveryCompanySchema.index({ 'operationalAreas.city': 1 });
deliveryCompanySchema.index({ verification: 1 });

module.exports = mongoose.model('DeliveryCompany', deliveryCompanySchema);
