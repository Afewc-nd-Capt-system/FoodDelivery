const mongoose = require('mongoose');

const partnerInvitationSchema = new mongoose.Schema({
  // Only the SHA-256 hash of the token is stored. The raw token exists only in
  // the approval email and in the admin's immediate response.
  tokenHash: { type: String, required: true, unique: true, index: true },
  type: {
    type: String,
    enum: ['restaurant', 'vendor', 'delivery'],
    required: true,
  },
  email: { type: String, required: true, lowercase: true, trim: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerApplication' },
  expiresAt: { type: Date, required: true },
  usedAt: Date,
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PartnerInvitation', partnerInvitationSchema);
