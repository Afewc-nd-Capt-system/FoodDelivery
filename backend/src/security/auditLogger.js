const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['auth', 'session', 'password', 'mfa', 'admin', 'payment', 'refund', 'dispute', 'account', 'promo'],
    required: true,
    index: true
  },
  ip: { type: String, required: true },
  userAgent: String,
  location: {
    city: String,
    country: String,
    ip: String
  },
  metadata: mongoose.Schema.Types.Mixed,
  success: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: false,
  collection: 'audit_logs'
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

class AuditLogger {
  async log({ userId, action, category, ip, userAgent, metadata = {}, success = true }) {
    try {
      let location = null;
      try {
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}?fields=city,country`);
        if (geoResponse.data) {
          location = {
            city: geoResponse.data.city,
            country: geoResponse.data.country,
            ip: ip
          };
        }
      } catch {}

      await AuditLog.create({
        userId,
        action,
        category,
        ip,
        userAgent,
        location,
        metadata,
        success,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Audit log error:', err.message);
    }
  }

  async getUserLogs(userId, limit = 50) {
    return await AuditLog.find({ userId }).sort({ timestamp: -1 }).limit(limit);
  }

  async getActionLogs(action, startDate, endDate, limit = 100) {
    const query = { action, timestamp: { $gte: startDate, $lte: endDate } };
    return await AuditLog.find(query).sort({ timestamp: -1 }).limit(limit);
  }
}

module.exports = new AuditLogger();