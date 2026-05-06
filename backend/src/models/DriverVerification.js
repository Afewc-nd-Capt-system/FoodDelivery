const mongoose = require('mongoose');

const driverVerificationSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPartner',
    required: true,
    unique: true
  },
  idVerified: {
    type: Boolean,
    default: false
  },
  idDocument: {
    type: String,
    url: String
  },
  idDocumentType: {
    type: String,
    enum: ['national_id', 'passport', 'drivers_license']
  },
  vehicleVerified: {
    type: Boolean,
    default: false
  },
  vehiclePhoto: String,
  vehiclePlate: String,
  vehicleType: {
    type: String,
    enum: ['motorcycle', 'car', 'bicycle']
  },
  backgroundCheckPassed: {
    type: Boolean,
    default: false
  },
  onboardingComplete: {
    type: Boolean,
    default: false
  },
  onboardingSteps: [{
    step: String,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  verificationStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

driverVerificationSchema.index({ verificationStatus: 1 });
driverVerificationSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('DriverVerification', driverVerificationSchema);