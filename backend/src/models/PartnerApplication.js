const mongoose = require('mongoose');

const partnerApplicationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['restaurant', 'vendor', 'delivery', 'rider'],
    required: true,
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  businessName: { type: String, required: true, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  message: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  rejectionReason: { type: String, trim: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('PartnerApplication', partnerApplicationSchema);
