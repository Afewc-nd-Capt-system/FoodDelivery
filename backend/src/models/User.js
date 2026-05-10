const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(v) {
        return /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[!@#$%^&*(),.?":{}|<>]/.test(v);
      },
      message: 'Password must contain at least one uppercase, one lowercase, one number, and one special character'
    },
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
  },
  role: {
    type: String,
    enum: ['customer', 'restaurant', 'vendor', 'delivery_company', 'delivery_rider', 'admin'],
    default: 'customer',
  },
  consecutiveCancellations: {
    type: Number,
    default: 0,
  },
  totalCancellations: {
    type: Number,
    default: 0,
  },
  payOnDeliveryEnabled: {
    type: Boolean,
    default: true,
  },
  ordersSincePenalty: {
    type: Number,
    default: 0,
  },
  penaltyApplied: {
    type: Boolean,
    default: false,
  },
  favoriteRestaurants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  socialId: String,
  socialProvider: {
    type: String,
    enum: ['google', 'facebook', null],
    default: null
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
   referralCode: {
     type: String
   },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isVibePassMember: {
    type: Boolean,
    default: false
  },
  dietaryPreferences: [{
    type: String,
    enum: ['vegan', 'vegetarian', 'halal', 'kosher', 'gluten-free', 'nut-free', 'dairy-free']
  }],
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: String,
  mfaBackupCodes: [{
    hashed: String,
    used: { type: Boolean, default: false }
  }],
  passwordHistory: [String],
  refreshTokenFamily: String,
  lastPasswordChange: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: Date,
  sessions: [{
    tokenId: String,
    device: String,
    ip: String,
    lastActive: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  trustMetrics: {
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    prepaidOrdersCompleted: { type: Number, default: 0 },
    refundCount: { type: Number, default: 0 },
    disputeCount: { type: Number, default: 0 },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
    lastUpdated: { type: Date, default: Date.now }
  },
  penaltyHistory: [{
    type: {
      type: String,
      enum: ['pod_disabled', 'account_suspended', 'rate_limited']
    },
    reason: String,
    appliedAt: { type: Date, default: Date.now },
    liftedAt: Date,
    liftedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const passwordService = require('../security/passwordService');
    this.password = await passwordService.hashPassword(this.password);
    if (!this.passwordHistory) this.passwordHistory = [];
    this.passwordHistory = await passwordService.addToHistory(this.password, this.passwordHistory.slice(0, 4));
    this.lastPasswordChange = new Date();
  }
  if (!this.referralCode) {
    this.referralCode = 'VIBE' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

userSchema.index({ deletedAt: 1 });
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
