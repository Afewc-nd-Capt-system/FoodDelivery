# Database Schema Extensions - Implementation Guide

## Overview

This document provides detailed implementation instructions for extending the existing database schema to support the new business rules and workflows.

---

## 1. User Model Extensions

### File: `backend/src/models/User.js`

### Additions Required

```javascript
// Extend existing userSchema with these fields:

trustMetrics: {
  successfulDeliveries: { type: Number, default: 0 },
  failedDeliveries: { type: Number, default: 0 },
  prepaidOrdersCompleted: { type: Number, default: 0 },
  refundCount: { type: Number, default: 0 },
  disputeCount: { type: Number, default: 0 },
  reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
  lastUpdated: { type: Date, default: Date.now }
},

penaltyHistory: [{
  type: {
    type: String,
    enum: ['pod_disabled', 'account_suspended', 'rate_limited']
  },
  reason: String,
  appliedAt: { type: Date, default: Date.now },
  liftedAt: Date,
  liftedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}],

// Update existing role field:
role: {
  type: String,
  enum: ['customer', 'restaurant', 'vendor', 'delivery_company', 'delivery_rider', 'admin'],
  default: 'customer'
}
```

### Migration Script

Create `backend/src/migrations/addTrustMetrics.js`:

```javascript
const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = async function() {
  try {
    // Add new fields to existing documents
    await User.updateMany(
      { trustMetrics: { $exists: false } },
      {
        $set: {
          trustMetrics: {
            successfulDeliveries: 0,
            failedDeliveries: 0,
            prepaidOrdersCompleted: 0,
            refundCount: 0,
            disputeCount: 0,
            reliabilityScore: 100,
            lastUpdated: new Date()
          },
          penaltyHistory: []
        }
      }
    );

    // Update existing roles
    await User.updateMany(
      { role: 'user' },
      { $set: { role: 'customer' } }
    );

    console.log('User model migration completed successfully');
  } catch (error) {
    console.error('User model migration failed:', error);
    throw error;
  }
};
```

---

## 2. Restaurant Model Extensions

### File: `backend/src/models/Restaurant.js`

### Additions Required

```javascript
// Add to existing restaurantSchema:

payOnDeliveryConfig: {
  enabled: { type: Boolean, default: true },
  minOrderAmount: { type: Number, default: 0 },
  maxOrderAmount: { type: Number, default: null },
  allowedTimeRanges: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: { type: String }, // '09:00'
    endTime: { type: String } // '21:00'
  }],
  productLevelControl: { type: Boolean, default: false },
  trustedCustomerWhitelist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
},

// Remove or deprecate existing fields:
// payOnDeliveryEnabled (will be replaced by payOnDeliveryConfig.enabled)
// minOrderForPayOnDelivery (will be replaced by payOnDeliveryConfig.minOrderAmount)
```

### MenuItem Schema Extensions

```javascript
// Add to existing menuItemSchema:

allowPayOnDelivery: { type: Boolean, default: true },
podMinQuantity: { type: Number, default: 1 }
```

### Migration Script

Create `backend/src/migrations/updateRestaurantPODConfig.js`:

```javascript
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');

module.exports = async function() {
  try {
    const restaurants = await Restaurant.find({ 
      payOnDeliveryConfig: { $exists: false } 
    });

    for (const restaurant of restaurants) {
      await Restaurant.findByIdAndUpdate(restaurant._id, {
        $set: {
          payOnDeliveryConfig: {
            enabled: restaurant.payOnDeliveryEnabled !== false,
            minOrderAmount: restaurant.minOrderForPayOnDelivery || 0,
            maxOrderAmount: null,
            allowedTimeRanges: [],
            productLevelControl: false,
            trustedCustomerWhitelist: []
          }
        }
      });
    }

    // Update menu items
    await Restaurant.updateMany(
      { 'menu.allowPayOnDelivery': { $exists: false } },
      { $set: { 'menu.$[].allowPayOnDelivery': true } }
    );

    await Restaurant.updateMany(
      { 'menu.podMinQuantity': { $exists: false } },
      { $set: { 'menu.$[].podMinQuantity': 1 } }
    );

    console.log('Restaurant model migration completed successfully');
  } catch (error) {
    console.error('Restaurant model migration failed:', error);
    throw error;
  }
};
```

---

## 3. Vendor Model Extensions

### File: `backend/src/models/Vendor.js`

### Additions Required

```javascript
// Add to existing vendorSchema (same structure as Restaurant):

payOnDeliveryConfig: {
  enabled: { type: Boolean, default: true },
  minOrderAmount: { type: Number, default: 0 },
  maxOrderAmount: { type: Number, default: null },
  allowedTimeRanges: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: { type: String },
    endTime: { type: String }
  }],
  productLevelControl: { type: Boolean, default: false },
  trustedCustomerWhitelist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}
```

### MenuItem Schema Extensions (Vendor)

```javascript
// Add to existing menuItemSchema:

allowPayOnDelivery: { type: Boolean, default: true },
podMinQuantity: { type: Number, default: 1 }
```

### Migration Script

Create `backend/src/migrations/updateVendorPODConfig.js`:

```javascript
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');

module.exports = async function() {
  try {
    await Vendor.updateMany(
      { payOnDeliveryConfig: { $exists: false } },
      {
        $set: {
          payOnDeliveryConfig: {
            enabled: true,
            minOrderAmount: 0,
            maxOrderAmount: null,
            allowedTimeRanges: [],
            productLevelControl: false,
            trustedCustomerWhitelist: []
          }
        }
      }
    );

    await Vendor.updateMany(
      { 'menu.allowPayOnDelivery': { $exists: false } },
      { $set: { 'menu.$[].allowPayOnDelivery': true } }
    );

    await Vendor.updateMany(
      { 'menu.podMinQuantity': { $exists: false } },
      { $set: { 'menu.$[].podMinQuantity': 1 } }
    );

    console.log('Vendor model migration completed successfully');
  } catch (error) {
    console.error('Vendor model migration failed:', error);
    throw error;
  }
};
```

---

## 4. Order Model Extensions

### File: `backend/src/models/Order.js`

### Additions Required

```javascript
// Add to existing orderSchema:

deliveryConfirmation: {
  riderConfirmed: { type: Boolean, default: false },
  riderConfirmedAt: { type: Date },
  customerNotified: { type: Boolean, default: false },
  customerNotifiedAt: { type: Date },
  customerConfirmed: { type: Boolean, default: false },
  customerConfirmedAt: { type: Date },
  customerVerificationCode: { type: String },
  paymentCollected: { type: Boolean, default: false },
  paymentCollectedAt: { type: Date }
},

deliveryCompany: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'DeliveryCompany'
},

// Update existing paymentMethod enum to include more options:
paymentMethod: {
  type: String,
  enum: ['cash', 'card', 'wallet', 'wallet_card', 'pay_on_delivery'],
  default: 'cash'
}
```

### Migration Script

Create `backend/src/migrations/addDeliveryConfirmation.js`:

```javascript
const mongoose = require('mongoose');
const Order = require('../models/Order');

module.exports = async function() {
  try {
    await Order.updateMany(
      { deliveryConfirmation: { $exists: false } },
      {
        $set: {
          deliveryConfirmation: {
            riderConfirmed: false,
            riderConfirmedAt: null,
            customerNotified: false,
            customerNotifiedAt: null,
            customerConfirmed: false,
            customerConfirmedAt: null,
            customerVerificationCode: null,
            paymentCollected: false,
            paymentCollectedAt: null
          }
        }
      }
    );

    // Update paymentMethod enum values
    await Order.updateMany(
      { paymentMethod: 'cash' },
      { $set: { paymentMethod: 'pay_on_delivery' } }
    );

    console.log('Order model migration completed successfully');
  } catch (error) {
    console.error('Order model migration failed:', error);
    throw error;
  }
};
```

---

## 5. DeliveryPartner Model Extensions

### File: `backend/src/models/DeliveryPartner.js`

### Additions Required

```javascript
// Add to existing deliveryPartnerSchema:

company: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'DeliveryCompany',
  required: true
},

companyId: {
  type: String, // Company-assigned ID
  required: true
},

companyRole: {
  type: String,
  enum: ['rider', 'dispatcher', 'manager'],
  default: 'rider'
}
```

### Migration Script

Create `backend/src/migrations/addCompanyToDeliveryPartner.js`:

```javascript
const mongoose = require('mongoose');
const DeliveryPartner = require('../models/DeliveryPartner');
const DeliveryCompany = require('../models/DeliveryCompany');

module.exports = async function() {
  try {
    // Create a default delivery company for existing partners
    const defaultCompany = await DeliveryCompany.findOneOrCreate({
      companyName: 'Default Delivery Company',
      businessRegistrationNumber: 'DEFAULT-001',
      email: 'default@delivery.com',
      phone: '0000000000',
      address: {
        street: 'Default Address',
        city: 'Lagos',
        state: 'Lagos',
        zipCode: '000001'
      },
      verification: {
        status: 'verified'
      }
    });

    // Update existing delivery partners
    await DeliveryPartner.updateMany(
      { company: { $exists: false } },
      {
        $set: {
          company: defaultCompany._id,
          companyId: 'DP-' + Date.now(),
          companyRole: 'rider'
        }
      }
    );

    console.log('DeliveryPartner model migration completed successfully');
  } catch (error) {
    console.error('DeliveryPartner model migration failed:', error);
    throw error;
  }
};
```

---

## 6. New Model: DeliveryCompany

### File: `backend/src/models/DeliveryCompany.js`

### Complete Schema

```javascript
const mongoose = require('mongoose');

const deliveryCompanySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  businessRegistrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  operationalAreas: [{
    city: String,
    areas: [String]
  }],
  pricing: {
    baseFee: { type: Number, default: 30 },
    perKmRate: { type: Number, default: 10 },
    commissionRate: { type: Number, default: 0.15 }
  },
  fleet: {
    totalRiders: { type: Number, default: 0 },
    activeRiders: { type: Number, default: 0 },
    vehicles: [{
      type: { type: String, enum: ['bike', 'scooter', 'car'] },
      count: Number
    }]
  },
  verification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    documents: [{
      type: String,
      url: String,
      uploadedAt: Date
    }],
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  wallet: {
    balance: { type: Number, default: 0 },
    pendingWithdrawals: { type: Number, default: 0 }
  },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

deliveryCompanySchema.index({ deletedAt: 1 });
deliveryCompanySchema.index({ 'operationalAreas.city': 1 });
deliveryCompanySchema.index({ verification: 1 });

module.exports = mongoose.model('DeliveryCompany', deliveryCompanySchema);
```

---

## 7. New Model: Permission

### File: `backend/src/models/Permission.js`

### Complete Schema

```javascript
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
```

### Seed Script for Permissions

Create `backend/src/seed/permissions.js`:

```javascript
const Permission = require('../models/Permission');

const permissions = [
  // Customer permissions
  {
    name: 'create_order',
    description: 'Create new orders',
    resource: 'orders',
    action: 'create',
    roles: ['customer']
  },
  {
    name: 'view_own_orders',
    description: 'View own orders',
    resource: 'orders',
    action: 'read',
    roles: ['customer']
  },
  {
    name: 'cancel_own_order',
    description: 'Cancel own order',
    resource: 'orders',
    action: 'update',
    roles: ['customer']
  },
  {
    name: 'update_profile',
    description: 'Update own profile',
    resource: 'users',
    action: 'update',
    roles: ['customer']
  },

  // Restaurant permissions
  {
    name: 'view_restaurant_orders',
    description: 'View restaurant orders',
    resource: 'orders',
    action: 'read',
    roles: ['restaurant']
  },
  {
    name: 'update_restaurant_orders',
    description: 'Update restaurant order status',
    resource: 'orders',
    action: 'update',
    roles: ['restaurant']
  },
  {
    name: 'manage_menu',
    description: 'Manage restaurant menu',
    resource: 'restaurants',
    action: 'manage',
    roles: ['restaurant']
  },
  {
    name: 'configure_pod',
    description: 'Configure pay on delivery',
    resource: 'restaurants',
    action: 'update',
    roles: ['restaurant', 'vendor']
  },

  // Vendor permissions
  {
    name: 'view_vendor_orders',
    description: 'View vendor orders',
    resource: 'orders',
    action: 'read',
    roles: ['vendor']
  },
  {
    name: 'manage_vendor_menu',
    description: 'Manage vendor menu',
    resource: 'vendors',
    action: 'manage',
    roles: ['vendor']
  },

  // Delivery rider permissions
  {
    name: 'view_available_orders',
    description: 'View available delivery orders',
    resource: 'orders',
    action: 'read',
    roles: ['delivery_rider']
  },
  {
    name: 'accept_delivery_order',
    description: 'Accept delivery order',
    resource: 'orders',
    action: 'update',
    roles: ['delivery_rider']
  },
  {
    name: 'confirm_delivery',
    description: 'Confirm delivery completion',
    resource: 'orders',
    action: 'update',
    roles: ['delivery_rider']
  },
  {
    name: 'update_location',
    description: 'Update rider location',
    resource: 'delivery',
    action: 'update',
    roles: ['delivery_rider']
  },

  // Delivery company permissions
  {
    name: 'manage_riders',
    description: 'Manage company riders',
    resource: 'delivery_company',
    action: 'manage',
    roles: ['delivery_company']
  },
  {
    name: 'view_company_stats',
    description: 'View company statistics',
    resource: 'delivery_company',
    action: 'read',
    roles: ['delivery_company']
  },
  {
    name: 'manage_company_wallet',
    description: 'Manage company wallet',
    resource: 'wallet',
    action: 'manage',
    roles: ['delivery_company']
  },

  // Admin permissions
  {
    name: 'manage_all_users',
    description: 'Manage all users',
    resource: 'users',
    action: 'manage',
    roles: ['admin']
  },
  {
    name: 'manage_all_orders',
    description: 'Manage all orders',
    resource: 'orders',
    action: 'manage',
    roles: ['admin']
  },
  {
    name: 'verify_companies',
    description: 'Verify delivery companies',
    resource: 'delivery_company',
    action: 'manage',
    roles: ['admin']
  },
  {
    name: 'configure_permissions',
    description: 'Configure system permissions',
    resource: 'permissions',
    action: 'manage',
    roles: ['admin']
  }
];

module.exports = async function() {
  try {
    for (const perm of permissions) {
      await Permission.findOneAndUpdate(
        { name: perm.name },
        perm,
        { upsert: true, new: true }
      );
    }
    console.log('Permissions seeded successfully');
  } catch (error) {
    console.error('Error seeding permissions:', error);
    throw error;
  }
};
```

---

## Migration Execution

### Create Master Migration Script

File: `backend/src/migrations/runMigrations.js`:

```javascript
const mongoose = require('mongoose');
const addTrustMetrics = require('./addTrustMetrics');
const updateRestaurantPODConfig = require('./updateRestaurantPODConfig');
const updateVendorPODConfig = require('./updateVendorPODConfig');
const addDeliveryConfirmation = require('./addDeliveryConfirmation');
const addCompanyToDeliveryPartner = require('./addCompanyToDeliveryPartner');

require('dotenv').config();

async function runMigrations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Running migrations...');

    await addTrustMetrics();
    await updateRestaurantPODConfig();
    await updateVendorPODConfig();
    await addDeliveryConfirmation();
    await addCompanyToDeliveryPartner();

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
```

### Add to package.json

```json
{
  "scripts": {
    "migrate": "node src/migrations/runMigrations.js",
    "seed:permissions": "node src/seed/permissions.js"
  }
}
```

### Run Migrations

```bash
cd backend
npm run migrate
npm run seed:permissions
```

---

## Rollback Strategy

### Rollback Script

Create `backend/src/migrations/rollback.js`:

```javascript
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const DeliveryPartner = require('../models/DeliveryPartner');

require('dotenv').config();

async function rollback() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Rollback User model
    await User.updateMany(
      {},
      {
        $unset: {
          trustMetrics: 1,
          penaltyHistory: 1
        },
        $set: {
          role: 'user'
        }
      }
    );

    // Rollback Restaurant model
    await Restaurant.updateMany(
      {},
      {
        $unset: {
          payOnDeliveryConfig: 1
        }
      }
    );

    // Rollback Vendor model
    await Vendor.updateMany(
      {},
      {
        $unset: {
          payOnDeliveryConfig: 1
        }
      }
    );

    // Rollback Order model
    await Order.updateMany(
      {},
      {
        $unset: {
          deliveryConfirmation: 1,
          deliveryCompany: 1
        }
      }
    );

    // Rollback DeliveryPartner model
    await DeliveryPartner.updateMany(
      {},
      {
        $unset: {
          company: 1,
          companyId: 1,
          companyRole: 1
        }
      }
    );

    console.log('Rollback completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

rollback();
```

---

## Testing Database Changes

### Test Script

Create `backend/src/migrations/test.js`:

```javascript
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

require('dotenv').config();

async function testMigrations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test User model
    const user = await User.findOne();
    console.log('User trustMetrics:', user.trustMetrics);
    console.log('User penaltyHistory:', user.penaltyHistory);

    // Test Restaurant model
    const restaurant = await Restaurant.findOne();
    console.log('Restaurant payOnDeliveryConfig:', restaurant.payOnDeliveryConfig);

    // Test Order model
    const order = await Order.findOne();
    console.log('Order deliveryConfirmation:', order.deliveryConfirmation);

    console.log('All tests passed');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testMigrations();
```

---

## Index Updates

### Add Indexes for Performance

```javascript
// User model indexes
userSchema.index({ 'trustMetrics.reliabilityScore': -1 });
userSchema.index({ 'penaltyHistory.type': 1 });
userSchema.index({ 'penaltyHistory.appliedAt': -1 });

// Restaurant model indexes
restaurantSchema.index({ 'payOnDeliveryConfig.enabled': 1 });
restaurantSchema.index({ 'payOnDeliveryConfig.trustedCustomerWhitelist': 1 });

// Order model indexes
orderSchema.index({ 'deliveryConfirmation.riderConfirmed': 1 });
orderSchema.index({ 'deliveryConfirmation.customerConfirmed': 1 });
orderSchema.index({ deliveryCompany: 1 });

// DeliveryPartner model indexes
deliveryPartnerSchema.index({ company: 1 });
deliveryPartnerSchema.index({ companyId: 1 });
```

---

## Data Validation

### Add Validation Rules

```javascript
// User model validation
userSchema.path('trustMetrics.reliabilityScore').validate(function(v) {
  return v >= 0 && v <= 100;
}, 'Reliability score must be between 0 and 100');

// Restaurant model validation
restaurantSchema.path('payOnDeliveryConfig.minOrderAmount').validate(function(v) {
  return v >= 0;
}, 'Minimum order amount must be non-negative');

// Order model validation
orderSchema.path('deliveryConfirmation.customerVerificationCode').validate(function(v) {
  return !v || /^\d{6}$/.test(v);
}, 'Verification code must be 6 digits');
```

---

## Summary

### Files to Create/Modify

**New Files:**
1. `backend/src/models/DeliveryCompany.js`
2. `backend/src/models/Permission.js`
3. `backend/src/migrations/addTrustMetrics.js`
4. `backend/src/migrations/updateRestaurantPODConfig.js`
5. `backend/src/migrations/updateVendorPODConfig.js`
6. `backend/src/migrations/addDeliveryConfirmation.js`
7. `backend/src/migrations/addCompanyToDeliveryPartner.js`
8. `backend/src/migrations/runMigrations.js`
9. `backend/src/migrations/rollback.js`
10. `backend/src/migrations/test.js`
11. `backend/src/seed/permissions.js`

**Files to Modify:**
1. `backend/src/models/User.js`
2. `backend/src/models/Restaurant.js`
3. `backend/src/models/Vendor.js`
4. `backend/src/models/Order.js`
5. `backend/src/models/DeliveryPartner.js`
6. `backend/package.json`

### Execution Order

1. Create new model files
2. Modify existing model files
3. Create migration scripts
4. Run migrations
5. Seed permissions
6. Test changes
7. Update indexes

### Rollback Plan

If issues arise, use the rollback script to revert database changes and investigate the problem before re-running migrations.
