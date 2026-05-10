const mongoose = require('mongoose');

const cateringRequestSchema = new mongoose.Schema({
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
  eventType: {
    type: String,
    required: true,
    enum: ['birthday', 'wedding', 'corporate', 'family_gathering', 'other']
  },
  eventDate: {
    type: Date,
    required: true
  },
  numberOfPeople: {
    type: Number,
    required: true,
    min: 20
  },
  menuPreference: String,
  budgetRange: {
    min: Number,
    max: Number
  },
  specialRequirements: String,
  contactName: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  contactEmail: String,
  status: {
    type: String,
    enum: ['pending', 'quoted', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  quotedPrice: Number,
  quoteValidUntil: Date,
  rejectionReason: String,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

cateringRequestSchema.index({ restaurant: 1, status: 1 });
cateringRequestSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('CateringRequest', cateringRequestSchema);