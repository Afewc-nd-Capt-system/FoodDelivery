'use strict';

const mongoose = require('mongoose');

// Metadata only: never store bodies, links or credentials here.
const emailLogSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  recipient: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['queued', 'sending', 'sent', 'failed'],
    default: 'queued',
    index: true,
  },
  provider: { type: String },
  providerMessageId: { type: String },
  errorClass: { type: String },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

// Keep diagnostics for 30 days.
emailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
