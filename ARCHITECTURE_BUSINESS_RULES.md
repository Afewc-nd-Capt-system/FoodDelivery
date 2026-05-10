# VibeChops Business Rules & Workflow Architecture

## Executive Summary

VibeChops is a marketplace platform that connects customers, food providers (restaurants/vendors), and external delivery partners. The platform does NOT own any of these entities - it only facilitates connections and transactions.

## Current State Analysis

### What Already Exists

#### 1. Pay on Delivery (POD) Support
- **Order Model**: `paymentMethod` field with 'cash' option
- **User Model**: 
  - `payOnDeliveryEnabled` (boolean)
  - `consecutiveCancellations` (number)
  - `totalCancellations` (number)
  - `ordersSincePenalty` (number)
  - `penaltyApplied` (boolean)
- **Restaurant Model**:
  - `payOnDeliveryEnabled` (boolean)
  - `minOrderForPayOnDelivery` (number)
- **Orders Route**: Implements POD checks for user eligibility and restaurant rules
- **Penalty Logic**: Disables POD after 2 consecutive or 5 total cancellations
- **Re-enable Logic**: Enables POD after 5 successful orders

#### 2. Customer Trust/Penalty System
- Basic cancellation tracking exists
- POD enable/disable logic implemented
- Missing: successful delivery count, failed delivery count, refund/dispute history

#### 3. Delivery Confirmation Flow
- **Order Model**: `otp` field for verification
- **Delivery Route**: OTP verification endpoint at `/orders/:orderId/delivered`
- **Missing**: Two-way confirmation (rider + customer), email/SMS notification to customer, customer verification endpoint

#### 4. Delivery Company Model
- **DeliveryPartner Model**: Exists as independent riders
- **Missing**: DeliveryCompany model, company reference in DeliveryPartner, company-level management

#### 5. Role Isolation
- **User Model**: `role` field with 'user' and 'admin' only
- **Missing**: restaurant, vendor, delivery_company, rider roles, permission system, route guards

---

## Architecture Design

### 1. Pay on Delivery Rule System

#### Current Limitations
- POD is only enabled/disabled at restaurant level
- No per-product POD control
- No trusted customer whitelist
- No maximum order amount threshold
- No time-based restrictions

#### Required Extensions

##### A. Restaurant/Vendor Model Extensions
```javascript
// Restaurant.js & Vendor.js additions
{
  payOnDeliveryConfig: {
    enabled: { type: Boolean, default: true },
    minOrderAmount: { type: Number, default: 0 },
    maxOrderAmount: { type: Number, default: null }, // null = no max
    allowedTimeRanges: [{
      day: String, // 'monday', 'tuesday', etc.
      startTime: String, // '09:00'
      endTime: String, // '21:00'
    }],
    productLevelControl: { type: Boolean, default: false },
    trustedCustomerWhitelist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}
```

##### B. MenuItem Model Extensions
```javascript
// menuItemSchema additions
{
  allowPayOnDelivery: { type: Boolean, default: true },
  podMinQuantity: { type: Number, default: 1 }
}
```

##### C. Service Layer: PayOnDeliveryService.js
```javascript
class PayOnDeliveryService {
  // Check if POD is allowed for this order
  static async checkPODEligibility(order, user, restaurant) {
    const checks = {
      userEligible: await this.checkUserEligibility(user),
      restaurantEligible: await this.checkRestaurantEligibility(restaurant),
      orderAmountEligible: await this.checkOrderAmount(order, restaurant),
      timeEligible: await this.checkTimeEligibility(restaurant),
      productEligible: await this.checkProductEligibility(order, restaurant),
      trustedCustomer: await this.checkTrustedCustomer(user, restaurant)
    };

    return {
      allowed: Object.values(checks).every(v => v === true),
      checks,
      reason: this.getFailureReason(checks)
    };
  }

  static async checkUserEligibility(user) {
    return user.payOnDeliveryEnabled && !user.penaltyApplied;
  }

  static async checkRestaurantEligibility(restaurant) {
    return restaurant.payOnDeliveryConfig?.enabled !== false;
  }

  static async checkOrderAmount(order, restaurant) {
    const config = restaurant.payOnDeliveryConfig || {};
    if (config.minOrderAmount && order.totalAmount < config.minOrderAmount) {
      return false;
    }
    if (config.maxOrderAmount && order.totalAmount > config.maxOrderAmount) {
      return false;
    }
    return true;
  }

  static async checkTimeEligibility(restaurant) {
    const config = restaurant.payOnDeliveryConfig || {};
    if (!config.allowedTimeRanges || config.allowedTimeRanges.length === 0) {
      return true;
    }
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const time = now.toTimeString().slice(0, 5); // 'HH:MM'
    
    const todayRange = config.allowedTimeRanges.find(r => r.day === day);
    if (!todayRange) return false;
    
    return time >= todayRange.startTime && time <= todayRange.endTime;
  }

  static async checkProductEligibility(order, restaurant) {
    if (!restaurant.payOnDeliveryConfig?.productLevelControl) return true;
    
    const menuItemIds = order.items.map(item => item.menuItem);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    
    return menuItems.every(item => item.allowPayOnDelivery !== false);
  }

  static async checkTrustedCustomer(user, restaurant) {
    const config = restaurant.payOnDeliveryConfig || {};
    if (!config.trustedCustomerWhitelist || config.trustedCustomerWhitelist.length === 0) {
      return null; // Not applicable
    }
    return config.trustedCustomerWhitelist.includes(user._id);
  }

  static getFailureReason(checks) {
    if (!checks.userEligible) return 'USER_NOT_ELIGIBLE';
    if (!checks.restaurantEligible) return 'RESTAURANT_NOT_ELIGIBLE';
    if (!checks.orderAmountEligible) return 'ORDER_AMOUNT_INVALID';
    if (!checks.timeEligible) return 'TIME_RESTRICTED';
    if (!checks.productEligible) return 'PRODUCT_RESTRICTED';
    return null;
  }
}
```

---

### 2. Customer Trust/Penalty System

#### Current Limitations
- Only tracks cancellations
- No successful delivery count
- No failed delivery count
- No refund/dispute history tracking
- No comprehensive reliability score

#### Required Extensions

##### A. User Model Extensions
```javascript
// User.js additions
{
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
  }]
}
```

##### B. Service Layer: CustomerTrustService.js
```javascript
class CustomerTrustService {
  static async updateTrustMetrics(userId, eventType, orderData) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const metrics = user.trustMetrics || {
      successfulDeliveries: 0,
      failedDeliveries: 0,
      prepaidOrdersCompleted: 0,
      refundCount: 0,
      disputeCount: 0,
      reliabilityScore: 100,
      lastUpdated: new Date()
    };

    switch (eventType) {
      case 'successful_delivery':
        metrics.successfulDeliveries += 1;
        if (orderData.paymentMethod !== 'cash') {
          metrics.prepaidOrdersCompleted += 1;
        }
        break;
      case 'failed_delivery':
        metrics.failedDeliveries += 1;
        break;
      case 'refund_issued':
        metrics.refundCount += 1;
        break;
      case 'dispute_opened':
        metrics.disputeCount += 1;
        break;
      case 'dispute_resolved':
        metrics.disputeCount = Math.max(0, metrics.disputeCount - 1);
        break;
    }

    // Calculate reliability score
    metrics.reliabilityScore = this.calculateReliabilityScore(metrics);
    metrics.lastUpdated = new Date();

    user.trustMetrics = metrics;
    await user.save();

    // Check if penalty needs to be applied or lifted
    await this.checkPenaltyStatus(user);

    return metrics;
  }

  static calculateReliabilityScore(metrics) {
    const totalOrders = metrics.successfulDeliveries + metrics.failedDeliveries;
    if (totalOrders === 0) return 100;

    const successRate = metrics.successfulDeliveries / totalOrders;
    const penaltyFactor = (metrics.refundCount * 5) + (metrics.disputeCount * 10);
    const baseScore = successRate * 100;
    
    return Math.max(0, Math.min(100, baseScore - penaltyFactor));
  }

  static async checkPenaltyStatus(user) {
    const metrics = user.trustMetrics;
    
    // Apply POD penalty
    if (user.consecutiveCancellations >= 2 || user.totalCancellations >= 5) {
      if (!user.payOnDeliveryEnabled) return; // Already disabled
      
      user.payOnDeliveryEnabled = false;
      user.penaltyApplied = true;
      user.ordersSincePenalty = 0;
      
      user.penaltyHistory.push({
        type: 'pod_disabled',
        reason: `${user.consecutiveCancellations} consecutive cancellations, ${user.totalCancellations} total`,
        appliedAt: new Date()
      });
    }

    // Re-enable POD after 5 prepaid orders
    if (user.penaltyApplied && metrics.prepaidOrdersCompleted >= 5) {
      user.payOnDeliveryEnabled = true;
      user.penaltyApplied = false;
      user.ordersSincePenalty = 0;
      user.consecutiveCancellations = 0;
      
      const lastPenalty = user.penaltyHistory.find(p => p.type === 'pod_disabled' && !p.liftedAt);
      if (lastPenalty) {
        lastPenalty.liftedAt = new Date();
      }
    }

    await user.save();
  }

  static async getTrustProfile(userId) {
    const user = await User.findById(userId).select('trustMetrics penaltyHistory payOnDeliveryEnabled consecutiveCancellations totalCancellations');
    if (!user) throw new Error('User not found');

    return {
      reliabilityScore: user.trustMetrics?.reliabilityScore || 100,
      payOnDeliveryEligible: user.payOnDeliveryEnabled,
      consecutiveCancellations: user.consecutiveCancellations,
      totalCancellations: user.totalCancellations,
      successfulDeliveries: user.trustMetrics?.successfulDeliveries || 0,
      failedDeliveries: user.trustMetrics?.failedDeliveries || 0,
      prepaidOrdersCompleted: user.trustMetrics?.prepaidOrdersCompleted || 0,
      refundCount: user.trustMetrics?.refundCount || 0,
      disputeCount: user.trustMetrics?.disputeCount || 0,
      penaltyHistory: user.penaltyHistory,
      canReenablePOD: user.penaltyApplied && (user.trustMetrics?.prepaidOrdersCompleted || 0) >= 5
    };
  }
}
```

---

### 3. Delivery Confirmation Flow

#### Current Limitations
- Only rider-side OTP verification
- No customer notification (email/SMS)
- No customer verification endpoint
- No two-way confirmation
- Payment collection at confirmation stage not implemented

#### Required Extensions

##### A. Order Model Extensions
```javascript
// Order.js additions
{
  deliveryConfirmation: {
    riderConfirmed: { type: Boolean, default: false },
    riderConfirmedAt: Date,
    customerNotified: { type: Boolean, default: false },
    customerNotifiedAt: Date,
    customerConfirmed: { type: Boolean, default: false },
    customerConfirmedAt: Date,
    customerVerificationCode: String, // Separate from rider OTP
    paymentCollected: { type: Boolean, default: false },
    paymentCollectedAt: Date,
    paymentMethod: { type: String, enum: ['cash', 'card', 'wallet', 'wallet_card'] }
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPartner'
  },
  deliveryCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryCompany' // NEW
  }
}
```

##### B. Service Layer: DeliveryConfirmationService.js
```javascript
class DeliveryConfirmationService {
  // Rider confirms arrival - triggers customer notification
  static async riderConfirmArrival(orderId, partnerId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    
    if (order.deliveryPartner?.toString() !== partnerId) {
      throw new Error('Not authorized for this order');
    }

    // Generate customer verification code
    const customerCode = this.generateVerificationCode();
    
    order.deliveryConfirmation.riderConfirmed = true;
    order.deliveryConfirmation.riderConfirmedAt = new Date();
    order.deliveryConfirmation.customerVerificationCode = customerCode;
    
    await order.save();

    // Send notification to customer (email + SMS)
    await this.notifyCustomer(order, customerCode);

    return { order, customerCode };
  }

  static async notifyCustomer(order, verificationCode) {
    const user = await User.findById(order.user);
    if (!user || !user.email) return;

    // Send email
    await EmailService.sendDeliveryNotification({
      to: user.email,
      orderNumber: order._id,
      verificationCode,
      restaurantName: order.restaurantName
    });

    // Send SMS if phone number exists
    if (user.phone) {
      await SMSService.sendDeliveryNotification({
        to: user.phone,
        verificationCode,
        orderNumber: order._id
      });
    }
  }

  // Customer provides verification to rider
  static async customerConfirmDelivery(orderId, verificationCode, partnerId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    if (order.deliveryPartner?.toString() !== partnerId) {
      throw new Error('Not authorized for this order');
    }

    if (!order.deliveryConfirmation.riderConfirmed) {
      throw new Error('Rider has not confirmed arrival yet');
    }

    if (order.deliveryConfirmation.customerVerificationCode !== verificationCode) {
      throw new Error('Invalid verification code');
    }

    order.deliveryConfirmation.customerConfirmed = true;
    order.deliveryConfirmation.customerConfirmedAt = new Date();
    
    // If Pay on Delivery, collect payment here
    if (order.paymentMethod === 'cash') {
      order.deliveryConfirmation.paymentCollected = true;
      order.deliveryConfirmation.paymentCollectedAt = new Date();
      order.paymentStatus = 'paid';
      order.isPaid = true;
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    
    await order.save();

    // Update partner stats
    await DeliveryPartner.findByIdAndUpdate(partnerId, {
      currentOrder: null,
      $inc: { earnings: 30, totalDeliveries: 1 }
    });

    // Update customer trust metrics
    await CustomerTrustService.updateTrustMetrics(order.user, 'successful_delivery', {
      paymentMethod: order.paymentMethod
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`order:${order._id}`).emit('deliveryConfirmed', { orderId: order._id });

    return order;
  }

  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

##### C. API Endpoints
```javascript
// delivery.js additions
router.post('/orders/:orderId/confirm-arrival', async (req, res) => {
  try {
    const result = await DeliveryConfirmationService.riderConfirmArrival(
      req.params.orderId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/orders/:orderId/confirm-customer', async (req, res) => {
  try {
    const { verificationCode } = req.body;
    const result = await DeliveryConfirmationService.customerConfirmDelivery(
      req.params.orderId,
      verificationCode,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
```

---

### 4. Delivery Company Model

#### Current Limitations
- DeliveryPartner exists as independent riders
- No DeliveryCompany model
- No company-level management
- No separation between company portal and rider portal

#### Required Extensions

##### A. New Model: DeliveryCompany.js
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
    commissionRate: { type: Number, default: 0.15 } // Platform commission
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

##### B. DeliveryPartner Model Extensions
```javascript
// DeliveryPartner.js additions
{
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
  },
  isActive: {
    type: Boolean,
    default: true
  }
}
```

##### C. Service Layer: DeliveryCompanyService.js
```javascript
class DeliveryCompanyService {
  static async registerCompany(companyData) {
    const company = new DeliveryCompany(companyData);
    await company.save();
    return company;
  }

  static async addRiderToCompany(companyId, riderData) {
    const company = await DeliveryCompany.findById(companyId);
    if (!company) throw new Error('Company not found');

    const rider = new DeliveryPartner({
      ...riderData,
      company: companyId,
      companyId: this.generateCompanyId(companyId)
    });

    await rider.save();
    
    company.fleet.totalRiders += 1;
    await company.save();

    return rider;
  }

  static async getCompanyRiders(companyId) {
    return DeliveryPartner.find({ company: companyId, isActive: true })
      .select('-password');
  }

  static async getCompanyStats(companyId) {
    const company = await DeliveryCompany.findById(companyId);
    const riders = await DeliveryPartner.find({ company: companyId });
    
    const activeRiders = riders.filter(r => r.isOnline).length;
    const totalDeliveries = riders.reduce((sum, r) => sum + r.totalDeliveries, 0);
    const totalEarnings = riders.reduce((sum, r) => sum + r.earnings, 0);

    return {
      totalRiders: riders.length,
      activeRiders,
      totalDeliveries,
      totalEarnings,
      rating: company.rating
    };
  }
}
```

---

### 5. Role Isolation & Permission Architecture

#### Current Limitations
- User model only has 'user' and 'admin' roles
- No restaurant, vendor, delivery_company, rider roles
- No permission system
- No route guards beyond basic auth

#### Required Extensions

##### A. User Model Extensions
```javascript
// User.js role field update
role: {
  type: String,
  enum: ['customer', 'restaurant', 'vendor', 'delivery_company', 'delivery_rider', 'admin'],
  default: 'customer'
}
```

##### B. New Model: Permission.js
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
    required: true // 'orders', 'restaurants', 'users', etc.
  },
  action: {
    type: String,
    required: true // 'create', 'read', 'update', 'delete', 'manage'
  },
  roles: [{
    type: String,
    enum: ['customer', 'restaurant', 'vendor', 'delivery_company', 'delivery_rider', 'admin']
  }]
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);
```

##### C. Service Layer: PermissionService.js
```javascript
class PermissionService {
  static async hasPermission(user, resource, action) {
    if (user.role === 'admin') return true;

    const permission = await Permission.findOne({
      resource,
      action,
      roles: user.role
    });

    return !!permission;
  }

  static async requirePermission(req, res, next) {
    const { resource, action } = req.meta;
    
    const hasPermission = await PermissionService.hasPermission(req.user, resource, action);
    
    if (!hasPermission) {
      return res.status(403).json({
        message: 'You do not have permission to perform this action',
        required: { resource, action }
      });
    }

    next();
  }
}
```

##### D. Middleware: RoleGuard.js
```javascript
const roleGuard = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

module.exports = roleGuard;
```

##### E. Route Group Middleware
```javascript
// middleware/routeGuards.js
const customerGuard = roleGuard(['customer']);
const restaurantGuard = roleGuard(['restaurant']);
const vendorGuard = roleGuard(['vendor']);
const deliveryCompanyGuard = roleGuard(['delivery_company']);
const deliveryRiderGuard = roleGuard(['delivery_rider']);
const adminGuard = roleGuard(['admin']);

module.exports = {
  customerGuard,
  restaurantGuard,
  vendorGuard,
  deliveryCompanyGuard,
  deliveryRiderGuard,
  adminGuard
};
```

---

### 6. Checkout Flow Updates

#### Current Limitations
- Checkout doesn't check POD eligibility properly
- No delivery company assignment
- No verification-ready delivery state
- Payment collection at wrong stage for POD

#### Required Extensions

##### A. Checkout Service Extensions
```javascript
// services/CheckoutService.js
class CheckoutService {
  static async processCheckout(checkoutData) {
    const { userId, restaurantId, items, deliveryAddress, paymentMethod } = checkoutData;

    // 1. Get user and restaurant
    const [user, restaurant] = await Promise.all([
      User.findById(userId),
      Restaurant.findById(restaurantId)
    ]);

    // 2. Check POD eligibility if paymentMethod is cash
    if (paymentMethod === 'cash') {
      const podCheck = await PayOnDeliveryService.checkPODEligibility(
        { totalAmount: checkoutData.totalAmount, items },
        user,
        restaurant
      );

      if (!podCheck.allowed) {
        throw new Error(`Pay on delivery not allowed: ${podCheck.reason}`);
      }
    }

    // 3. Calculate delivery fee
    const deliveryFee = await DeliveryService.calculateDeliveryFee(
      restaurant.location,
      deliveryAddress
    );

    // 4. Assign delivery company (if applicable)
    let deliveryCompany = null;
    let deliveryPartner = null;
    
    if (restaurant.deliveryConfig?.usePlatformDelivery) {
      deliveryCompany = await DeliveryService.assignDeliveryCompany(
        restaurant.location,
        deliveryAddress
      );
    }

    // 5. Create order
    const order = await Order.create({
      user: userId,
      restaurant: restaurantId,
      restaurantName: restaurant.name,
      items,
      totalAmount: checkoutData.totalAmount,
      deliveryAddress,
      deliveryFee,
      paymentMethod,
      deliveryCompany,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
      deliveryConfirmation: {
        paymentCollected: paymentMethod !== 'cash' // Prepaid orders are paid immediately
      }
    });

    // 6. Process payment for non-POD orders
    if (paymentMethod !== 'cash') {
      await PaymentService.processPayment(order, paymentMethod);
    }

    return order;
  }
}
```

---

## Database Schema Extensions Summary

### New Models
1. **DeliveryCompany** - External delivery company management
2. **Permission** - Role-based permission system

### Model Extensions
1. **User** - Add trust metrics, penalty history, extended roles
2. **Restaurant/Vendor** - Add POD config with granular controls
3. **MenuItem** - Add per-product POD control
4. **Order** - Add delivery confirmation flow fields
5. **DeliveryPartner** - Add company reference and company role

---

## API Endpoint Extensions Summary

### New Endpoints
1. **POST /api/delivery/company/register** - Register delivery company
2. **POST /api/delivery/company/:companyId/riders** - Add rider to company
3. **GET /api/delivery/company/:companyId/stats** - Company statistics
4. **POST /api/delivery/orders/:orderId/confirm-arrival** - Rider confirms arrival
5. **POST /api/delivery/orders/:orderId/confirm-customer** - Customer confirms delivery
6. **GET /api/users/:userId/trust-profile** - Get customer trust profile
7. **POST /api/restaurants/:id/pod-config** - Update POD configuration
8. **POST /api/vendors/:id/pod-config** - Update POD configuration

### Extended Endpoints
1. **POST /api/orders** - Add POD eligibility checks
2. **PUT /api/orders/:id/status** - Add trust metric updates
3. **POST /api/delivery/register** - Add company reference

---

## Frontend Integration Requirements

### 1. Checkout Flow Updates
- Add POD eligibility check before showing payment options
- Display POD restriction reason if not eligible
- Show trust profile to customer
- Add delivery company selection (if applicable)

### 2. Delivery Confirmation UI
- Rider portal: Add "Confirm Arrival" button
- Customer portal: Show delivery notification with verification code
- Add verification code input for customer

### 3. Restaurant/Vendor Portal
- Add POD configuration panel
- Add trusted customer whitelist management
- Add per-product POD control

### 4. Delivery Company Portal
- Separate portal from rider portal
- Company dashboard with rider management
- Fleet statistics and earnings

### 5. Customer Portal
- Trust profile display
- POD eligibility status
- Penalty history
- Prepaid order progress tracking

---

## Implementation Priority

### Phase 1: Critical (Immediate)
1. Extend User model with trust metrics
2. Implement CustomerTrustService
3. Update Orders route with trust metric updates
4. Add DeliveryCompany model
5. Update DeliveryPartner model with company reference

### Phase 2: High Priority
1. Implement PayOnDeliveryService
2. Extend Restaurant/Vendor models with POD config
3. Implement DeliveryConfirmationService
4. Add delivery confirmation API endpoints
5. Implement PermissionService

### Phase 3: Medium Priority
1. Add role guards to routes
2. Update checkout service with POD checks
3. Implement DeliveryCompanyService
4. Add delivery company portal routes

### Phase 4: Low Priority
1. Frontend integration
2. Email/SMS notification service
3. Admin portal updates for company management
4. Analytics and reporting

---

## Security Considerations

1. **OTP Security**: Use cryptographically secure random number generation
2. **Verification Code Expiry**: Set expiry time for customer verification codes
3. **Rate Limiting**: Apply rate limiting to verification attempts
4. **Audit Logging**: Log all POD changes, penalty applications, and delivery confirmations
5. **Role-Based Access**: Strict enforcement of role-based permissions
6. **Data Privacy**: Protect customer phone numbers and addresses
7. **Payment Security**: Ensure payment collection at correct stage

---

## Testing Requirements

1. **POD Eligibility Tests**: Test all POD rule combinations
2. **Trust Metric Tests**: Verify penalty application and removal
3. **Delivery Confirmation Tests**: Test two-way confirmation flow
4. **Role Isolation Tests**: Verify users cannot access other role portals
5. **Permission Tests**: Test permission enforcement
6. **Integration Tests**: Test complete checkout flow with POD
