# API Endpoint Extensions - Implementation Guide

## Overview

This document provides detailed implementation instructions for extending the existing API endpoints to support the new business rules and workflows.

---

## 1. Pay on Delivery (POD) Endpoints

### 1.1 Check POD Eligibility

**Endpoint:** `POST /api/orders/check-pod-eligibility`

**Description:** Check if Pay on Delivery is allowed for a given order based on user, restaurant, and order details.

**Authentication:** Required (customer role)

**Request Body:**
```json
{
  "restaurantId": "string",
  "totalAmount": number,
  "items": [
    {
      "menuItem": "string",
      "quantity": number
    }
  ]
}
```

**Response:**
```json
{
  "allowed": boolean,
  "checks": {
    "userEligible": boolean,
    "restaurantEligible": boolean,
    "orderAmountEligible": boolean,
    "timeEligible": boolean,
    "productEligible": boolean,
    "trustedCustomer": boolean | null
  },
  "reason": string | null
}
```

**Implementation:**
```javascript
// routes/orders.js
router.post('/check-pod-eligibility', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, totalAmount, items } = req.body;
    const user = await User.findById(req.user.id);
    const restaurant = await Restaurant.findById(restaurantId);

    const result = await PayOnDeliveryService.checkPODEligibility(
      { totalAmount, items },
      user,
      restaurant
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
```

---

### 1.2 Update Restaurant POD Configuration

**Endpoint:** `PUT /api/restaurants/:id/pod-config`

**Description:** Update Pay on Delivery configuration for a restaurant.

**Authentication:** Required (restaurant role)

**Request Body:**
```json
{
  "enabled": boolean,
  "minOrderAmount": number,
  "maxOrderAmount": number | null,
  "allowedTimeRanges": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "21:00"
    }
  ],
  "productLevelControl": boolean,
  "trustedCustomerWhitelist": ["string"] // user IDs
}
```

**Response:**
```json
{
  "payOnDeliveryConfig": {
    "enabled": boolean,
    "minOrderAmount": number,
    "maxOrderAmount": number | null,
    "allowedTimeRanges": array,
    "productLevelControl": boolean,
    "trustedCustomerWhitelist": array
  }
}
```

**Implementation:**
```javascript
// routes/restaurants.js
router.put('/:id/pod-config', 
  authMiddleware, 
  roleGuard(['restaurant']),
  async (req, res) => {
    try {
      const restaurant = await Restaurant.findById(req.params.id);
      
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Verify ownership
      if (restaurant.owner?.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      restaurant.payOnDeliveryConfig = {
        ...restaurant.payOnDeliveryConfig,
        ...req.body
      };

      await restaurant.save();
      res.json({ payOnDeliveryConfig: restaurant.payOnDeliveryConfig });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 1.3 Update Vendor POD Configuration

**Endpoint:** `PUT /api/vendors/:id/pod-config`

**Description:** Update Pay on Delivery configuration for a vendor.

**Authentication:** Required (vendor role)

**Request Body:** Same as restaurant POD config

**Response:** Same as restaurant POD config

**Implementation:** Similar to restaurant endpoint

---

### 1.4 Add/Remove Trusted Customer

**Endpoint:** `POST /api/restaurants/:id/trusted-customers`

**Description:** Add a customer to the trusted customer whitelist for POD.

**Authentication:** Required (restaurant role)

**Request Body:**
```json
{
  "userId": "string",
  "action": "add" | "remove"
}
```

**Response:**
```json
{
  "trustedCustomerWhitelist": ["string"]
}
```

**Implementation:**
```javascript
router.post('/:id/trusted-customers',
  authMiddleware,
  roleGuard(['restaurant']),
  async (req, res) => {
    try {
      const { userId, action } = req.body;
      const restaurant = await Restaurant.findById(req.params.id);

      if (action === 'add') {
        if (!restaurant.payOnDeliveryConfig.trustedCustomerWhitelist.includes(userId)) {
          restaurant.payOnDeliveryConfig.trustedCustomerWhitelist.push(userId);
        }
      } else if (action === 'remove') {
        restaurant.payOnDeliveryConfig.trustedCustomerWhitelist = 
          restaurant.payOnDeliveryConfig.trustedCustomerWhitelist.filter(id => id !== userId);
      }

      await restaurant.save();
      res.json({ trustedCustomerWhitelist: restaurant.payOnDeliveryConfig.trustedCustomerWhitelist });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 1.5 Update Product POD Settings

**Endpoint:** `PUT /api/restaurants/:id/menu/:menuItemId/pod-settings`

**Description:** Update Pay on Delivery settings for a specific menu item.

**Authentication:** Required (restaurant role)

**Request Body:**
```json
{
  "allowPayOnDelivery": boolean,
  "podMinQuantity": number
}
```

**Response:**
```json
{
  "menuItem": {
    "allowPayOnDelivery": boolean,
    "podMinQuantity": number
  }
}
```

**Implementation:**
```javascript
router.put('/:id/menu/:menuItemId/pod-settings',
  authMiddleware,
  roleGuard(['restaurant']),
  async (req, res) => {
    try {
      const restaurant = await Restaurant.findById(req.params.id);
      const menuItem = restaurant.menu.id(req.params.menuItemId);

      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }

      menuItem.allowPayOnDelivery = req.body.allowPayOnDelivery;
      menuItem.podMinQuantity = req.body.podMinQuantity;

      await restaurant.save();
      res.json({ menuItem });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

## 2. Customer Trust & Penalty Endpoints

### 2.1 Get Trust Profile

**Endpoint:** `GET /api/users/:id/trust-profile`

**Description:** Get comprehensive trust profile for a customer.

**Authentication:** Required (user can view own profile, admin can view any)

**Response:**
```json
{
  "reliabilityScore": number,
  "payOnDeliveryEligible": boolean,
  "consecutiveCancellations": number,
  "totalCancellations": number,
  "successfulDeliveries": number,
  "failedDeliveries": number,
  "prepaidOrdersCompleted": number,
  "refundCount": number,
  "disputeCount": number,
  "penaltyHistory": [
    {
      "type": string,
      "reason": string,
      "appliedAt": date,
      "liftedAt": date | null
    }
  ],
  "canReenablePOD": boolean,
  "prepaidOrdersNeeded": number
}
```

**Implementation:**
```javascript
// routes/users.js
router.get('/:id/trust-profile',
  authMiddleware,
  async (req, res) => {
    try {
      // Users can view their own profile, admins can view any
      if (req.user.id !== req.params.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const profile = await CustomerTrustService.getTrustProfile(req.params.id);
      
      // Calculate prepaid orders needed to re-enable POD
      const prepaidOrdersNeeded = Math.max(0, 5 - (profile.prepaidOrdersCompleted || 0));
      profile.prepaidOrdersNeeded = prepaidOrdersNeeded;

      res.json(profile);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 2.2 Update Trust Metrics

**Endpoint:** `POST /api/users/:id/trust-metrics`

**Description:** Update trust metrics (internal use by other services).

**Authentication:** Required (admin or service role)

**Request Body:**
```json
{
  "eventType": "successful_delivery" | "failed_delivery" | "refund_issued" | "dispute_opened" | "dispute_resolved",
  "orderData": {
    "paymentMethod": string,
    "orderId": string
  }
}
```

**Response:**
```json
{
  "trustMetrics": {
    "successfulDeliveries": number,
    "failedDeliveries": number,
    "prepaidOrdersCompleted": number,
    "refundCount": number,
    "disputeCount": number,
    "reliabilityScore": number,
    "lastUpdated": date
  }
}
```

**Implementation:**
```javascript
// routes/users.js
router.post('/:id/trust-metrics',
  authMiddleware,
  roleGuard(['admin']),
  async (req, res) => {
    try {
      const metrics = await CustomerTrustService.updateTrustMetrics(
        req.params.id,
        req.body.eventType,
        req.body.orderData
      );
      res.json({ trustMetrics: metrics });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 2.3 Manually Re-enable POD

**Endpoint:** `POST /api/users/:id/re-enable-pod`

**Description:** Admin can manually re-enable POD for a customer.

**Authentication:** Required (admin role)

**Request Body:**
```json
{
  "reason": string
}
```

**Response:**
```json
{
  "payOnDeliveryEnabled": true,
  "penaltyApplied": false,
  "ordersSincePenalty": 0,
  "consecutiveCancellations": 0
}
```

**Implementation:**
```javascript
router.post('/:id/re-enable-pod',
  authMiddleware,
  roleGuard(['admin']),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      user.payOnDeliveryEnabled = true;
      user.penaltyApplied = false;
      user.ordersSincePenalty = 0;
      user.consecutiveCancellations = 0;

      user.penaltyHistory.push({
        type: 'pod_disabled',
        reason: 'Manually re-enabled by admin: ' + req.body.reason,
        appliedAt: new Date(),
        liftedAt: new Date(),
        liftedBy: req.user.id
      });

      await user.save();
      res.json({
        payOnDeliveryEnabled: user.payOnDeliveryEnabled,
        penaltyApplied: user.penaltyApplied,
        ordersSincePenalty: user.ordersSincePenalty,
        consecutiveCancellations: user.consecutiveCancellations
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

## 3. Delivery Confirmation Endpoints

### 3.1 Rider Confirms Arrival

**Endpoint:** `POST /api/delivery/orders/:orderId/confirm-arrival`

**Description:** Rider confirms arrival at customer location, triggers customer notification.

**Authentication:** Required (delivery_rider role)

**Request Body:** None

**Response:**
```json
{
  "order": {
    "_id": string,
    "status": "out_for_delivery",
    "deliveryConfirmation": {
      "riderConfirmed": true,
      "riderConfirmedAt": date,
      "customerVerificationCode": "123456"
    }
  },
  "customerNotified": boolean
}
```

**Implementation:**
```javascript
// routes/delivery.js
router.post('/orders/:orderId/confirm-arrival',
  authMiddleware,
  roleGuard(['delivery_rider']),
  async (req, res) => {
    try {
      const result = await DeliveryConfirmationService.riderConfirmArrival(
        req.params.orderId,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 3.2 Customer Confirms Delivery

**Endpoint:** `POST /api/delivery/orders/:orderId/confirm-customer`

**Description:** Customer provides verification code to confirm delivery completion.

**Authentication:** Required (customer role)

**Request Body:**
```json
{
  "verificationCode": "123456"
}
```

**Response:**
```json
{
  "order": {
    "_id": string,
    "status": "delivered",
    "deliveredAt": date,
    "deliveryConfirmation": {
      "customerConfirmed": true,
      "customerConfirmedAt": date,
      "paymentCollected": boolean,
      "paymentCollectedAt": date
    },
    "paymentStatus": "paid",
    "isPaid": true
  }
}
```

**Implementation:**
```javascript
// routes/delivery.js
router.post('/orders/:orderId/confirm-customer',
  authMiddleware,
  roleGuard(['customer']),
  async (req, res) => {
    try {
      const { verificationCode } = req.body;
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (order.user.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized for this order' });
      }

      const result = await DeliveryConfirmationService.customerConfirmDelivery(
        req.params.orderId,
        verificationCode,
        order.deliveryPartner
      );

      res.json({ order: result });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 3.3 Resend Verification Code

**Endpoint:** `POST /api/delivery/orders/:orderId/resend-code`

**Description:** Resend verification code to customer (if not confirmed yet).

**Authentication:** Required (customer or delivery_rider role)

**Request Body:** None

**Response:**
```json
{
  "message": "Verification code resent",
  "sentAt": date
}
```

**Implementation:**
```javascript
router.post('/orders/:orderId/resend-code',
  authMiddleware,
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (order.deliveryConfirmation.customerConfirmed) {
        return res.status(400).json({ message: 'Delivery already confirmed' });
      }

      // Generate new code
      const newCode = DeliveryConfirmationService.generateVerificationCode();
      order.deliveryConfirmation.customerVerificationCode = newCode;
      await order.save();

      // Resend notification
      await DeliveryConfirmationService.notifyCustomer(order, newCode);

      res.json({ message: 'Verification code resent', sentAt: new Date() });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

## 4. Delivery Company Endpoints

### 4.1 Register Delivery Company

**Endpoint:** `POST /api/delivery/company/register`

**Description:** Register a new delivery company.

**Authentication:** Required (public registration, then verification)

**Request Body:**
```json
{
  "companyName": string,
  "businessRegistrationNumber": string,
  "email": string,
  "phone": string,
  "address": {
    "street": string,
    "city": string,
    "state": string,
    "zipCode": string
  },
  "operationalAreas": [
    {
      "city": "Lagos",
      "areas": ["Ikeja", "Victoria Island", "Lekki"]
    }
  ],
  "pricing": {
    "baseFee": 30,
    "perKmRate": 10,
    "commissionRate": 0.15
  }
}
```

**Response:**
```json
{
  "company": {
    "_id": string,
    "companyName": string,
    "verification": {
      "status": "pending"
    }
  },
  "message": "Company registered successfully. Pending verification."
}
```

**Implementation:**
```javascript
// routes/delivery-company.js (new file)
const express = require('express');
const DeliveryCompany = require('../models/DeliveryCompany');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/routeGuards');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const existing = await DeliveryCompany.findOne({
      $or: [
        { email: req.body.email },
        { businessRegistrationNumber: req.body.businessRegistrationNumber }
      ]
    });

    if (existing) {
      return res.status(400).json({ 
        message: 'Company with this email or registration number already exists' 
      });
    }

    const company = new DeliveryCompany(req.body);
    await company.save();

    res.status(201).json({
      company: {
        _id: company._id,
        companyName: company.companyName,
        verification: company.verification
      },
      message: 'Company registered successfully. Pending verification.'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
```

---

### 4.2 Add Rider to Company

**Endpoint:** `POST /api/delivery/company/:companyId/riders`

**Description:** Add a new rider to a delivery company.

**Authentication:** Required (delivery_company role)

**Request Body:**
```json
{
  "name": string,
  "email": string,
  "password": string,
  "phone": string,
  "vehicleType": "bike" | "scooter" | "car",
  "vehicleNumber": string,
  "licenseNumber": string
}
```

**Response:**
```json
{
  "rider": {
    "_id": string,
    "name": string,
    "email": string,
    "company": string,
    "companyId": string,
    "companyRole": "rider"
  },
  "message": "Rider added successfully"
}
```

**Implementation:**
```javascript
router.post('/:companyId/riders',
  authMiddleware,
  roleGuard(['delivery_company']),
  async (req, res) => {
    try {
      const company = await DeliveryCompany.findById(req.params.companyId);
      
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Verify company ownership
      if (company._id.toString() !== req.user.companyId?.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const rider = await DeliveryCompanyService.addRiderToCompany(
        req.params.companyId,
        req.body
      );

      res.status(201).json({
        rider: {
          _id: rider._id,
          name: rider.name,
          email: rider.email,
          company: rider.company,
          companyId: rider.companyId,
          companyRole: rider.companyRole
        },
        message: 'Rider added successfully'
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 4.3 Get Company Riders

**Endpoint:** `GET /api/delivery/company/:companyId/riders`

**Description:** Get all riders for a delivery company.

**Authentication:** Required (delivery_company role)

**Query Parameters:**
- `status`: `active` | `inactive` | `all` (default: `active`)

**Response:**
```json
{
  "riders": [
    {
      "_id": string,
      "name": string,
      "email": string,
      "phone": string,
      "vehicleType": string,
      "isOnline": boolean,
      "currentOrder": string | null,
      "totalDeliveries": number,
      "rating": number
    }
  ],
  "total": number
}
```

**Implementation:**
```javascript
router.get('/:companyId/riders',
  authMiddleware,
  roleGuard(['delivery_company']),
  async (req, res) => {
    try {
      const { status = 'active' } = req.query;
      const company = await DeliveryCompany.findById(req.params.companyId);

      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      let query = { company: req.params.companyId };
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }

      const riders = await DeliveryPartner.find(query)
        .select('-password')
        .sort({ createdAt: -1 });

      res.json({
        riders,
        total: riders.length
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 4.4 Get Company Statistics

**Endpoint:** `GET /api/delivery/company/:companyId/stats`

**Description:** Get comprehensive statistics for a delivery company.

**Authentication:** Required (delivery_company role)

**Query Parameters:**
- `period`: `day` | `week` | `month` | `all` (default: `month`)

**Response:**
```json
{
  "totalRiders": number,
  "activeRiders": number,
  "totalDeliveries": number,
  "totalEarnings": number,
  "rating": number,
  "periodStats": {
    "deliveries": number,
    "earnings": number,
    "averageRating": number
  },
  "fleet": {
    "totalRiders": number,
    "activeRiders": number,
    "vehicles": [
      {
        "type": "bike",
        "count": number
      }
    ]
  },
  "wallet": {
    "balance": number,
    "pendingWithdrawals": number
  }
}
```

**Implementation:**
```javascript
router.get('/:companyId/stats',
  authMiddleware,
  roleGuard(['delivery_company']),
  async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      const stats = await DeliveryCompanyService.getCompanyStats(
        req.params.companyId,
        period
      );
      res.json(stats);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
```

---

### 4.5 Update Company Profile

**Endpoint:** `PUT /api/delivery/company/:companyId/profile`

**Description:** Update delivery company profile.

**Authentication:** Required (delivery_company role)

**Request Body:**
```json
{
  "phone": string,
  "address": {
    "street": string,
    "city": string,
    "state": string,
    "zipCode": string
  },
  "operationalAreas": array,
  "pricing": {
    "baseFee": number,
    "perKmRate": number,
    "commissionRate": number
  }
}
```

**Response:**
```json
{
  "company": {
    "_id": string,
    "companyName": string,
    "phone": string,
    "address": object,
    "operationalAreas": array,
    "pricing": object
  }
}
```

---

### 4.6 Upload Verification Documents

**Endpoint:** `POST /api/delivery/company/:companyId/documents`

**Description:** Upload verification documents for company approval.

**Authentication:** Required (delivery_company role)

**Request Body:** (multipart/form-data)
- `documents`: array of files
- `documentType`: string for each file

**Response:**
```json
{
  "documents": [
    {
      "type": string,
      "url": string,
      "uploadedAt": date
    }
  ],
  "message": "Documents uploaded successfully"
}
```

---

## 5. Permission Endpoints

### 5.1 Get All Permissions

**Endpoint:** `GET /api/permissions`

**Description:** Get all system permissions.

**Authentication:** Required (admin role)

**Response:**
```json
{
  "permissions": [
    {
      "_id": string,
      "name": string,
      "description": string,
      "resource": string,
      "action": string,
      "roles": [string]
    }
  ]
}
```

**Implementation:**
```javascript
// routes/permissions.js (new file)
const express = require('express');
const Permission = require('../models/Permission');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/routeGuards');

const router = express.Router();

router.get('/',
  authMiddleware,
  roleGuard(['admin']),
  async (req, res) => {
    try {
      const permissions = await Permission.find().sort({ resource: 1, action: 1 });
      res.json({ permissions });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;
```

---

### 5.2 Update Permission

**Endpoint:** `PUT /api/permissions/:id`

**Description:** Update a permission (add/remove roles).

**Authentication:** Required (admin role)

**Request Body:**
```json
{
  "description": string,
  "roles": ["customer", "restaurant"]
}
```

**Response:**
```json
{
  "permission": {
    "_id": string,
    "name": string,
    "description": string,
    "resource": string,
    "action": string,
    "roles": [string]
  }
}
```

---

## 6. Extended Existing Endpoints

### 6.1 Create Order (Extended)

**Endpoint:** `POST /api/orders` (extended)

**Changes:**
- Add POD eligibility check before order creation
- Add delivery company assignment if applicable
- Set delivery confirmation fields

**Implementation:**
```javascript
// routes/orders.js - modify existing endpoint
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurant, restaurantName, items, totalAmount, deliveryAddress, paymentMethod, deliveryFee } = req.body;

    // Check POD eligibility
    if (paymentMethod === 'cash' || paymentMethod === 'pay_on_delivery') {
      const user = await User.findById(req.user.id);
      const restaurantDoc = await Restaurant.findById(restaurant);

      const podCheck = await PayOnDeliveryService.checkPODEligibility(
        { totalAmount, items },
        user,
        restaurantDoc
      );

      if (!podCheck.allowed) {
        return res.status(403).json({
          message: `Pay on delivery not allowed: ${podCheck.reason}`,
          code: podCheck.reason,
          checks: podCheck.checks
        });
      }
    }

    // Assign delivery company if applicable
    let deliveryCompany = null;
    if (restaurantDoc.deliveryConfig?.usePlatformDelivery) {
      deliveryCompany = await DeliveryService.assignDeliveryCompany(
        restaurantDoc.location,
        deliveryAddress
      );
    }

    const order = new Order({
      user: req.user.id,
      restaurant,
      restaurantName,
      items,
      totalAmount,
      deliveryAddress,
      paymentMethod: paymentMethod === 'cash' ? 'pay_on_delivery' : paymentMethod,
      deliveryFee: deliveryFee || 40,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
      deliveryCompany,
      deliveryConfirmation: {
        paymentCollected: paymentMethod !== 'cash'
      }
    });

    await order.save();
    res.status(201).json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
```

---

### 6.2 Update Order Status (Extended)

**Endpoint:** `PUT /api/orders/:id/status` (extended)

**Changes:**
- Add trust metric updates on cancellation and delivery
- Add POD penalty logic
- Add POD re-enable logic

**Implementation:**
```javascript
// routes/orders.js - modify existing endpoint
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isOrderOwner = order.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Handle cancellation - update trust metrics
    if (status === 'cancelled' && isOrderOwner && !isAdmin) {
      await CustomerTrustService.updateTrustMetrics(
        req.user.id,
        'cancellation',
        { orderId: order._id, paymentMethod: order.paymentMethod }
      );
    }

    // Handle delivery - update trust metrics
    if (status === 'delivered' && isOrderOwner) {
      await CustomerTrustService.updateTrustMetrics(
        req.user.id,
        'successful_delivery',
        { orderId: order._id, paymentMethod: order.paymentMethod }
      );
    }

    order.status = status;
    await order.save();

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to(`order-${order._id}`).emit('order-status-update', { orderId: order._id, status });
      io.to(`user-${order.user}`).emit('order-status-update', { orderId: order._id, status });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
```

---

### 6.3 Delivery Partner Login (Extended)

**Endpoint:** `POST /api/delivery/login` (extended)

**Changes:**
- Add company verification
- Add company role in response

**Implementation:**
```javascript
// routes/delivery.js - modify existing endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const partner = await DeliveryPartner.findOne({ email }).populate('company');
    
    if (!partner || !(await partner.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!partner.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    if (partner.company && partner.company.verification.status !== 'verified') {
      return res.status(403).json({ message: 'Company is not verified' });
    }

    const token = generateToken(partner);
    res.json({
      token,
      partner: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        vehicleType: partner.vehicleType,
        isOnline: partner.isOnline,
        currentOrder: partner.currentOrder,
        company: partner.company ? {
          id: partner.company._id,
          name: partner.company.companyName,
          verified: partner.company.verification.status === 'verified'
        } : null,
        companyRole: partner.companyRole
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});
```

---

## 7. Middleware Implementation

### 7.1 Role Guard Middleware

**File:** `backend/src/middleware/routeGuards.js`

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

module.exports = {
  customerGuard: roleGuard(['customer']),
  restaurantGuard: roleGuard(['restaurant']),
  vendorGuard: roleGuard(['vendor']),
  deliveryCompanyGuard: roleGuard(['delivery_company']),
  deliveryRiderGuard: roleGuard(['delivery_rider']),
  adminGuard: roleGuard(['admin'])
};
```

---

### 7.2 Permission Middleware

**File:** `backend/src/middleware/permissionMiddleware.js`

```javascript
const Permission = require('../models/Permission');

const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (req.user.role === 'admin') {
        return next(); // Admins have all permissions
      }

      const permission = await Permission.findOne({
        resource,
        action,
        roles: req.user.role
      });

      if (!permission) {
        return res.status(403).json({
          message: 'You do not have permission to perform this action',
          required: { resource, action }
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Permission check failed' });
    }
  };
};

module.exports = requirePermission;
```

---

## 8. Route Registration

### Update server.js

```javascript
// backend/src/server.js

// Add new route imports
const deliveryCompanyRoutes = require('./routes/delivery-company');
const permissionRoutes = require('./routes/permissions');

// Register new routes
app.use('/api/delivery/company', deliveryCompanyRoutes);
app.use('/api/permissions', permissionRoutes);

// Update existing routes with role guards
app.use('/api/orders', ordersRoutes); // Already has auth middleware
app.use('/api/delivery', deliveryRoutes); // Already has auth middleware
```

---

## 9. Error Handling

### Custom Error Classes

**File:** `backend/src/utils/errors.js`

```javascript
class BusinessRuleError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'BusinessRuleError';
    this.code = code;
    this.details = details;
  }
}

class PermissionError extends Error {
  constructor(message, requiredPermission) {
    super(message);
    this.name = 'PermissionError';
    this.requiredPermission = requiredPermission;
  }
}

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

module.exports = {
  BusinessRuleError,
  PermissionError,
  ValidationError
};
```

---

## 10. Rate Limiting

### Update Rate Limiter for Sensitive Endpoints

```javascript
// backend/src/middleware/rateLimiter.js

const rateLimiter = require('express-rate-limit');

// Strict rate limiting for verification attempts
const verificationRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many verification attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for POD checks
const podCheckRateLimit = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 checks per minute
  message: 'Too many POD eligibility checks. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  verificationRateLimit,
  podCheckRateLimit
};
```

---

## 11. Testing Endpoints

### Test Script

**File:** `backend/tests/api.test.js`

```javascript
const request = require('supertest');
const app = require('../src/server');

describe('POD Eligibility API', () => {
  it('should check POD eligibility for valid order', async () => {
    const response = await request(app)
      .post('/api/orders/check-pod-eligibility')
      .set('Authorization', 'Bearer valid-token')
      .send({
        restaurantId: 'valid-id',
        totalAmount: 5000,
        items: [{ menuItem: 'item-id', quantity: 2 }]
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('allowed');
  });
});

describe('Delivery Confirmation API', () => {
  it('should confirm rider arrival', async () => {
    const response = await request(app)
      .post('/api/delivery/orders/order-id/confirm-arrival')
      .set('Authorization', 'Bearer rider-token');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('customerVerificationCode');
  });
});
```

---

## Summary

### New Route Files
1. `backend/src/routes/delivery-company.js`
2. `backend/src/routes/permissions.js`

### Modified Route Files
1. `backend/src/routes/orders.js` - Extended with POD checks
2. `backend/src/routes/delivery.js` - Extended with confirmation endpoints
3. `backend/src/routes/users.js` - Added trust profile endpoints
4. `backend/src/routes/restaurants.js` - Added POD config endpoints

### New Middleware Files
1. `backend/src/middleware/routeGuards.js`
2. `backend/src/middleware/permissionMiddleware.js`

### Service Files to Create
1. `backend/src/services/PayOnDeliveryService.js`
2. `backend/src/services/CustomerTrustService.js`
3. `backend/src/services/DeliveryConfirmationService.js`
4. `backend/src/services/DeliveryCompanyService.js`

### Implementation Priority
1. Create service files
2. Create middleware files
3. Create new route files
4. Modify existing routes
5. Register routes in server.js
6. Add error handling
7. Add rate limiting
8. Write tests
