'use strict';

const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetType: { type: String },
  targetId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

adminAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
