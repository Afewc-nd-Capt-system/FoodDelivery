const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryPartnerSchema = new mongoose.Schema({
  name: {
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
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  phone: {
    type: String,
    required: true,
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'scooter', 'car'],
    default: 'bike',
  },
  vehicleNumber: {
    type: String,
    required: true,
  },
  licenseNumber: {
    type: String,
    required: true,
  },
  location: {
    lat: Number,
    lng: Number,
    address: String,
    updatedAt: Date,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  earnings: {
    type: Number,
    default: 0,
  },
  totalDeliveries: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryCompany',
    required: true
  },
  companyId: {
    type: String,
    required: true
  },
  companyRole: {
    type: String,
    enum: ['rider', 'dispatcher', 'manager'],
    default: 'rider'
  }
}, { timestamps: true });

deliveryPartnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

deliveryPartnerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);