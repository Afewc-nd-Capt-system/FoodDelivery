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
    enum: ['user', 'admin'],
    default: 'user',
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
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
