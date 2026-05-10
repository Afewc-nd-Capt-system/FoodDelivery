const mongoose = require('mongoose');

const tableReservationSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  partySize: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: String,
  specialRequests: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  confirmationCode: String,
  cancelledAt: Date,
  cancelledBy: mongoose.Schema.Types.ObjectId,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

tableReservationSchema.pre('save', function(next) {
  if (!this.confirmationCode) {
    this.confirmationCode = 'RES-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

tableReservationSchema.index({ restaurant: 1, date: 1 });
tableReservationSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('TableReservation', tableReservationSchema);