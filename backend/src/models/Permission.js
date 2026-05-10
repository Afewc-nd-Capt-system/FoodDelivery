const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  resource: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  roles: [{
    type: String,
    enum: ['customer', 'restaurant', 'vendor', 'delivery_company', 'delivery_rider', 'admin']
  }]
}, { timestamps: true });

permissionSchema.index({ resource: 1, action: 1 });

module.exports = mongoose.model('Permission', permissionSchema);
