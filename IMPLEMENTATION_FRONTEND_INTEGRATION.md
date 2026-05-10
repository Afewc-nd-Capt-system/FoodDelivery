# Frontend Integration Requirements - Implementation Guide

## Overview

This document provides detailed implementation instructions for integrating the new business rules and workflows into the frontend application.

---

## 1. Checkout Flow Updates

### 1.1 POD Eligibility Check

**Location:** `(customer)/orders/checkout/page.tsx`

**Implementation:**

```typescript
// Add POD eligibility check before showing payment options
const [podEligibility, setPodEligibility] = useState<{
  allowed: boolean;
  reason: string | null;
  checks: any;
} | null>(null);

useEffect(() => {
  const checkPODEligibility = async () => {
    if (paymentMethod === 'pay_on_delivery') {
      try {
        const response = await fetch('/api/orders/check-pod-eligibility', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            restaurantId,
            totalAmount: cartTotal,
            items: cartItems
          })
        });
        const data = await response.json();
        setPodEligibility(data);
      } catch (error) {
        console.error('POD eligibility check failed:', error);
      }
    }
  };

  checkPODEligibility();
}, [paymentMethod, restaurantId, cartTotal, cartItems]);

// Update payment method selection logic
const handlePaymentMethodChange = (method: string) => {
  if (method === 'pay_on_delivery' && podEligibility && !podEligibility.allowed) {
    // Show error message
    setError(`Pay on delivery not available: ${podEligibility.reason}`);
    return;
  }
  setPaymentMethod(method);
};

// Render POD restriction message
{paymentMethod === 'pay_on_delivery' && podEligibility && !podEligibility.allowed && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      {podEligibility.reason}. Please choose a different payment method.
    </AlertDescription>
  </Alert>
)}
```

---

### 1.2 Trust Profile Display

**Location:** `(customer)/profile/page.tsx` or create new `(customer)/trust/page.tsx`

**Implementation:**

```typescript
// Add trust profile section to profile page
const [trustProfile, setTrustProfile] = useState<any>(null);

useEffect(() => {
  const fetchTrustProfile = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/trust-profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTrustProfile(data);
    } catch (error) {
      console.error('Failed to fetch trust profile:', error);
    }
  };

  fetchTrustProfile();
}, [userId]);

// Render trust profile section
{trustProfile && (
  <Card className="p-6">
    <h3 className="font-bold mb-4">Trust Profile</h3>
    
    {/* Reliability Score */}
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">Reliability Score</span>
        <span className="font-bold text-lg">{trustProfile.reliabilityScore}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${trustProfile.reliabilityScore}%` }}
        />
      </div>
    </div>

    {/* POD Eligibility */}
    <div className="flex items-center gap-2 mb-4">
      {trustProfile.payOnDeliveryEligible ? (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Pay on Delivery Enabled
        </Badge>
      ) : (
        <Badge className="bg-red-100 text-red-800">
          <X className="w-3 h-3 mr-1" />
          Pay on Delivery Disabled
        </Badge>
      )}
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p className="text-xs text-gray-500">Successful Deliveries</p>
        <p className="font-bold">{trustProfile.successfulDeliveries}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Failed Deliveries</p>
        <p className="font-bold">{trustProfile.failedDeliveries}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Prepaid Orders</p>
        <p className="font-bold">{trustProfile.prepaidOrdersCompleted}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Cancellations</p>
        <p className="font-bold">{trustProfile.totalCancellations}</p>
      </div>
    </div>

    {/* POD Re-enable Progress */}
    {!trustProfile.payOnDeliveryEligible && trustProfile.canReenablePOD && (
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800 mb-2">
          Complete {trustProfile.prepaidOrdersNeeded} more prepaid orders to re-enable Pay on Delivery
        </p>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ 
              width: `${((5 - trustProfile.prepaidOrdersNeeded) / 5) * 100}%` 
            }}
          />
        </div>
      </div>
    )}

    {/* Penalty History */}
    {trustProfile.penaltyHistory && trustProfile.penaltyHistory.length > 0 && (
      <div className="mt-4">
        <h4 className="font-semibold text-sm mb-2">Penalty History</h4>
        <div className="space-y-2">
          {trustProfile.penaltyHistory.map((penalty: any, index: number) => (
            <div key={index} className="text-xs bg-gray-50 p-2 rounded">
              <p className="font-medium">{penalty.type}</p>
              <p className="text-gray-500">{penalty.reason}</p>
              <p className="text-gray-400">
                {new Date(penalty.appliedAt).toLocaleDateString()}
                {penalty.liftedAt && ` - Lifted: ${new Date(penalty.liftedAt).toLocaleDateString()}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}
  </Card>
)}
```

---

## 2. Delivery Confirmation UI

### 2.1 Rider Portal - Confirm Arrival Button

**Location:** `(delivery)/orders/page.tsx` or create `(delivery)/current-order/page.tsx`

**Implementation:**

```typescript
// Add confirm arrival button to current order view
const handleConfirmArrival = async () => {
  try {
    const response = await fetch(`/api/delivery/orders/${currentOrder._id}/confirm-arrival`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (response.ok) {
      setCurrentOrder(data.order);
      setShowCustomerNotified(true);
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError('Failed to confirm arrival');
  }
};

// Render confirm arrival button
{currentOrder.status === 'out_for_delivery' && !currentOrder.deliveryConfirmation?.riderConfirmed && (
  <Button 
    onClick={handleConfirmArrival}
    className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white"
  >
    <MapPin className="w-4 h-4 mr-2" />
    Confirm Arrival
  </Button>
)}

// Show customer notification status
{showCustomerNotified && (
  <Alert className="bg-green-50 border-green-200">
    <CheckCircle className="h-4 w-4 text-green-600" />
    <AlertDescription className="text-green-800">
      Customer has been notified with verification code
    </AlertDescription>
  </Alert>
)}
```

---

### 2.2 Customer Portal - Delivery Notification

**Location:** `(customer)/orders/[id]/page.tsx` or create `(customer)/tracking/[id]/page.tsx`

**Implementation:**

```typescript
// Add delivery notification display
const [deliveryNotification, setDeliveryNotification] = useState<{
  verificationCode: string;
  notifiedAt: Date;
} | null>(null);

// Listen for socket events for delivery notification
useEffect(() => {
  if (socket) {
    socket.on('delivery-confirmation-request', (data) => {
      setDeliveryNotification({
        verificationCode: data.verificationCode,
        notifiedAt: new Date(data.notifiedAt)
      });
    });

    return () => {
      socket.off('delivery-confirmation-request');
    };
  }
}, [socket]);

// Render delivery notification
{deliveryNotification && (
  <Card className="p-6 bg-gradient-to-r from-[#FFF1E8] to-[#FFE0CC] border-[#E8621A]">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-[#E8621A] flex items-center justify-center">
        <MapPin className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg mb-2">Delivery Arrived!</h3>
        <p className="text-sm text-gray-600 mb-4">
          Your rider has arrived. Please provide this verification code to complete the delivery:
        </p>
        <div className="bg-white p-4 rounded-lg text-center mb-4">
          <p className="text-xs text-gray-500 mb-1">Verification Code</p>
          <p className="text-3xl font-black text-[#E8621A] tracking-widest">
            {deliveryNotification.verificationCode}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Notified at {new Date(deliveryNotification.notifiedAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  </Card>
)}

// Add verification code input for customer
{deliveryNotification && !order.deliveryConfirmation?.customerConfirmed && (
  <Card className="p-6">
    <h3 className="font-bold mb-4">Confirm Delivery</h3>
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">
          Enter verification code from rider
        </Label>
        <Input
          type="text"
          placeholder="Enter 6-digit code"
          maxLength={6}
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          className="text-center text-2xl tracking-widest font-bold"
        />
      </div>
      <Button
        onClick={handleConfirmDelivery}
        disabled={verificationCode.length !== 6}
        className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white"
      >
        Confirm Delivery
      </Button>
      <Button
        onClick={handleResendCode}
        variant="outline"
        className="w-full"
      >
        Resend Code
      </Button>
    </div>
  </Card>
)}

// Handle confirmation
const handleConfirmDelivery = async () => {
  try {
    const response = await fetch(`/api/delivery/orders/${order._id}/confirm-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ verificationCode })
    });
    const data = await response.json();
    
    if (response.ok) {
      setOrder(data.order);
      setDeliveryConfirmed(true);
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError('Failed to confirm delivery');
  }
};

const handleResendCode = async () => {
  try {
    const response = await fetch(`/api/delivery/orders/${order._id}/resend-code`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      toast.success('Verification code resent');
    }
  } catch (error) {
    toast.error('Failed to resend code');
  }
};
```

---

## 3. Restaurant/Vendor Portal - POD Configuration

### 3.1 POD Configuration Panel

**Location:** `(restaurant)/settings/pod/page.tsx` or add to `(restaurant)/dashboard/page.tsx`

**Implementation:**

```typescript
// Create POD configuration component
const [podConfig, setPodConfig] = useState({
  enabled: true,
  minOrderAmount: 0,
  maxOrderAmount: null as number | null,
  productLevelControl: false,
  trustedCustomerWhitelist: [] as string[]
});

useEffect(() => {
  const fetchPODConfig = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/pod-config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPodConfig(data.payOnDeliveryConfig);
    } catch (error) {
      console.error('Failed to fetch POD config:', error);
    }
  };

  fetchPODConfig();
}, [restaurantId]);

const handleSaveConfig = async () => {
  try {
    const response = await fetch(`/api/restaurants/${restaurantId}/pod-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(podConfig)
    });
    
    if (response.ok) {
      toast.success('POD configuration updated');
    }
  } catch (error) {
    toast.error('Failed to update configuration');
  }
};

// Render POD configuration panel
<Card className="p-6">
  <h3 className="font-bold mb-6">Pay on Delivery Configuration</h3>
  
  <div className="space-y-6">
    {/* Enable/Disable POD */}
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">Enable Pay on Delivery</p>
        <p className="text-sm text-gray-500">Allow customers to pay on delivery</p>
      </div>
      <Switch
        checked={podConfig.enabled}
        onCheckedChange={(checked) => setPodConfig({ ...podConfig, enabled: checked })}
      />
    </div>

    {/* Minimum Order Amount */}
    <div>
      <Label className="text-xs text-gray-500 mb-1 block">Minimum Order Amount (₦)</Label>
      <Input
        type="number"
        value={podConfig.minOrderAmount}
        onChange={(e) => setPodConfig({ ...podConfig, minOrderAmount: Number(e.target.value) })}
        placeholder="0"
      />
      <p className="text-xs text-gray-500 mt-1">
        Minimum order amount required for POD (0 = no minimum)
      </p>
    </div>

    {/* Maximum Order Amount */}
    <div>
      <Label className="text-xs text-gray-500 mb-1 block">Maximum Order Amount (₦)</Label>
      <Input
        type="number"
        value={podConfig.maxOrderAmount || ''}
        onChange={(e) => setPodConfig({ ...podConfig, maxOrderAmount: e.target.value ? Number(e.target.value) : null })}
        placeholder="No limit"
      />
      <p className="text-xs text-gray-500 mt-1">
        Maximum order amount for POD (empty = no maximum)
      </p>
    </div>

    {/* Product Level Control */}
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">Product Level Control</p>
        <p className="text-sm text-gray-500">Enable/disable POD per menu item</p>
      </div>
      <Switch
        checked={podConfig.productLevelControl}
        onCheckedChange={(checked) => setPodConfig({ ...podConfig, enabled: checked })}
      />
    </div>

    {/* Trusted Customer Whitelist */}
    <div>
      <Label className="text-xs text-gray-500 mb-1 block">Trusted Customers</Label>
      <div className="space-y-2">
        {trustedCustomers.map((customer) => (
          <div key={customer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span>{customer.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveTrustedCustomer(customer.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddCustomerDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Trusted Customer
        </Button>
      </div>
    </div>

    {/* Time-Based Restrictions */}
    <div>
      <Label className="text-xs text-gray-500 mb-2 block">Allowed Time Ranges</Label>
      <div className="space-y-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="flex items-center gap-2">
            <span className="w-20 text-sm">{day}</span>
            <Input
              type="time"
              placeholder="Start"
              className="w-32"
            />
            <span>-</span>
            <Input
              type="time"
              placeholder="End"
              className="w-32"
            />
          </div>
        ))}
      </div>
    </div>

    <Button onClick={handleSaveConfig} className="w-full">
      Save Configuration
    </Button>
  </div>
</Card>
```

---

### 3.2 Per-Product POD Settings

**Location:** `(restaurant)/menu/page.tsx`

**Implementation:**

```typescript
// Add POD settings to menu item edit dialog
const [podSettings, setPodSettings] = useState({
  allowPayOnDelivery: true,
  podMinQuantity: 1
});

// Render POD settings in menu item form
{podConfig.productLevelControl && (
  <div className="space-y-4 pt-4 border-t">
    <h4 className="font-semibold text-sm">Pay on Delivery Settings</h4>
    
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm">Allow Pay on Delivery</p>
        <p className="text-xs text-gray-500">Enable/disable POD for this item</p>
      </div>
      <Switch
        checked={podSettings.allowPayOnDelivery}
        onCheckedChange={(checked) => setPodSettings({ ...podSettings, allowPayOnDelivery: checked })}
      />
    </div>

    <div>
      <Label className="text-xs text-gray-500 mb-1 block">Minimum Quantity for POD</Label>
      <Input
        type="number"
        value={podSettings.podMinQuantity}
        onChange={(e) => setPodSettings({ ...podSettings, podMinQuantity: Number(e.target.value) })}
        min={1}
      />
    </div>
  </div>
)}
```

---

## 4. Delivery Company Portal

### 4.1 Company Dashboard

**Location:** Create `(delivery-company)/dashboard/page.tsx`

**Implementation:**

```typescript
// Create delivery company dashboard
const [companyStats, setCompanyStats] = useState<any>(null);
const [riders, setRiders] = useState<any[]>([]);

useEffect(() => {
  const fetchData = async () => {
    try {
      const [statsRes, ridersRes] = await Promise.all([
        fetch(`/api/delivery/company/${companyId}/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/delivery/company/${companyId}/riders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const statsData = await statsRes.json();
      const ridersData = await ridersRes.json();

      setCompanyStats(statsData);
      setRiders(ridersData.riders);
    } catch (error) {
      console.error('Failed to fetch company data:', error);
    }
  };

  fetchData();
}, [companyId]);

// Render company dashboard
<div className="max-w-7xl mx-auto px-4 py-8">
  <h1 className="text-2xl font-black mb-8">Company Dashboard</h1>

  {/* Stats Cards */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-[#E8621A]" />
      </div>
      <p className="text-2xl font-black">{companyStats?.totalRiders || 0}</p>
      <p className="text-xs text-gray-500">Total Riders</p>
    </Card>
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-green-500" />
      </div>
      <p className="text-2xl font-black">{companyStats?.activeRiders || 0}</p>
      <p className="text-xs text-gray-500">Active Riders</p>
    </Card>
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-5 h-5 text-blue-500" />
      </div>
      <p className="text-2xl font-black">{companyStats?.totalDeliveries || 0}</p>
      <p className="text-xs text-gray-500">Total Deliveries</p>
    </Card>
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-purple-500" />
      </div>
      <p className="text-2xl font-black">₦{companyStats?.totalEarnings?.toLocaleString() || 0}</p>
      <p className="text-xs text-gray-500">Total Earnings</p>
    </Card>
  </div>

  {/* Riders Table */}
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-bold">Riders</h3>
      <Button onClick={() => setShowAddRiderDialog(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Rider
      </Button>
    </div>
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2 text-xs text-gray-500">Name</th>
          <th className="text-left py-2 text-xs text-gray-500">Phone</th>
          <th className="text-left py-2 text-xs text-gray-500">Vehicle</th>
          <th className="text-left py-2 text-xs text-gray-500">Status</th>
          <th className="text-left py-2 text-xs text-gray-500">Deliveries</th>
          <th className="text-left py-2 text-xs text-gray-500">Rating</th>
          <th className="text-left py-2 text-xs text-gray-500">Actions</th>
        </tr>
      </thead>
      <tbody>
        {riders.map((rider) => (
          <tr key={rider._id} className="border-b">
            <td className="py-3">{rider.name}</td>
            <td className="py-3">{rider.phone}</td>
            <td className="py-3">{rider.vehicleType}</td>
            <td className="py-3">
              <Badge className={rider.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {rider.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </td>
            <td className="py-3">{rider.totalDeliveries}</td>
            <td className="py-3">★ {rider.rating}</td>
            <td className="py-3">
              <Button variant="ghost" size="sm">
                <Pencil className="w-4 h-4" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
</div>
```

---

### 4.2 Add Rider Dialog

**Implementation:**

```typescript
// Add rider dialog component
<Dialog open={showAddRiderDialog} onOpenChange={setShowAddRiderDialog}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Add New Rider</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Name</Label>
        <Input placeholder="Rider name" />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Email</Label>
        <Input type="email" placeholder="rider@email.com" />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Phone</Label>
        <Input placeholder="Phone number" />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Password</Label>
        <Input type="password" placeholder="Password" />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Vehicle Type</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select vehicle type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bike">Bike</SelectItem>
            <SelectItem value="scooter">Scooter</SelectItem>
            <SelectItem value="car">Car</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Vehicle Number</Label>
        <Input placeholder="Vehicle number" />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">License Number</Label>
        <Input placeholder="License number" />
      </div>
      <Button onClick={handleAddRider} className="w-full">
        Add Rider
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## 5. Role-Based Route Guards

### 5.1 Create Route Guard Middleware (Client-Side)

**Location:** `frontend/src/lib/routeGuards.ts`

```typescript
// Create route guard utility functions
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useRoleGuard(allowedRoles: string[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, loading, allowedRoles, router]);

  return { user, loading, authorized: user && allowedRoles.includes(user.role) };
}

export function useAuthGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  return { user, loading, authenticated: !!user };
}
```

---

### 5.2 Apply Route Guards to Pages

**Location:** Apply to role-specific pages

```typescript
// Example: Apply to restaurant dashboard page
'use client';

import { useRoleGuard } from '@/lib/routeGuards';

export default function RestaurantDashboard() {
  const { user, loading, authorized } = useRoleGuard(['restaurant']);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authorized) {
    return null; // Will be redirected by the hook
  }

  // Render dashboard
  return (
    <div>
      {/* Dashboard content */}
    </div>
  );
}
```

---

## 6. Socket.io Event Handling

### 6.1 Update Socket Provider

**Location:** `frontend/src/context/SocketProvider.tsx`

**Implementation:**

```typescript
// Add new event listeners for delivery confirmation
useEffect(() => {
  if (socket && user) {
    // Listen for delivery confirmation request
    socket.on('delivery-confirmation-request', (data) => {
      // Show notification to customer
      toast({
        title: 'Delivery Arrived',
        description: 'Your rider has arrived. Check your order for verification code.',
        variant: 'default',
      });

      // Update local state
      setDeliveryNotification(data);
    });

    // Listen for delivery confirmed
    socket.on('delivery-confirmed', (data) => {
      toast({
        title: 'Delivery Confirmed',
        description: 'Your order has been successfully delivered.',
        variant: 'default',
      });
    });

    // Listen for POD status changes
    socket.on('pod-status-changed', (data) => {
      if (data.userId === user.id) {
        toast({
          title: 'Pay on Delivery Status Changed',
          description: data.enabled 
            ? 'Pay on delivery has been enabled for your account.'
            : 'Pay on delivery has been disabled due to cancellation history.',
          variant: data.enabled ? 'default' : 'destructive',
        });
      }
    });

    return () => {
      socket.off('delivery-confirmation-request');
      socket.off('delivery-confirmed');
      socket.off('pod-status-changed');
    };
  }
}, [socket, user]);
```

---

## 7. Context Updates

### 7.1 Update Auth Context

**Location:** `frontend/src/context/AuthContext.tsx`

**Implementation:**

```typescript
// Add role field to user type
interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'restaurant' | 'vendor' | 'delivery_company' | 'delivery_rider' | 'admin';
  // ... other fields
}

// Update login response handling
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (response.ok) {
      setUser(data.user);
      setToken(data.token);
      
      // Redirect based on role
      switch (data.user.role) {
        case 'restaurant':
          router.push('/(restaurant)/dashboard');
          break;
        case 'vendor':
          router.push('/(vendor)/dashboard');
          break;
        case 'delivery_rider':
          router.push('/(delivery)/dashboard');
          break;
        case 'delivery_company':
          router.push('/(delivery-company)/dashboard');
          break;
        case 'admin':
          router.push('/(admin)');
          break;
        default:
          router.push('/');
      }
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

---

## 8. Component Updates

### 8.1 Update Payment Method Selection

**Location:** `(customer)/orders/checkout/page.tsx`

**Implementation:**

```typescript
// Update payment method options to include POD
const paymentMethods = [
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'pay_on_delivery', label: 'Pay on Delivery', icon: Package }
];

// Add POD indicator
{paymentMethod === 'pay_on_delivery' && (
  <div className="bg-orange-50 p-3 rounded-lg mb-4">
    <div className="flex items-center gap-2">
      <Info className="w-4 h-4 text-[#E8621A]" />
      <p className="text-sm text-[#E8621A]">
        You'll pay when the order is delivered
      </p>
    </div>
  </div>
)}
```

---

### 8.2 Update Order Status Display

**Location:** `(customer)/orders/[id]/page.tsx`

**Implementation:**

```typescript
// Add delivery confirmation status to order display
{order.deliveryConfirmation && (
  <div className="mb-4">
    <h4 className="font-semibold text-sm mb-2">Delivery Progress</h4>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          order.deliveryConfirmation.riderConfirmed ? 'bg-green-500' : 'bg-gray-300'
        }`} />
        <span className="text-sm">Rider Confirmed Arrival</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          order.deliveryConfirmation.customerConfirmed ? 'bg-green-500' : 'bg-gray-300'
        }`} />
        <span className="text-sm">Customer Confirmed Delivery</span>
      </div>
      {order.paymentMethod === 'pay_on_delivery' && (
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            order.deliveryConfirmation.paymentCollected ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          <span className="text-sm">Payment Collected</span>
        </div>
      )}
    </div>
  </div>
)}
```

---

## 9. New Pages to Create

### 9.1 Delivery Company Portal Pages

**Location:** `(delivery-company)/` route group

**Pages to Create:**
1. `(delivery-company)/dashboard/page.tsx` - Company dashboard
2. `(delivery-company)/riders/page.tsx` - Rider management
3. `(delivery-company)/earnings/page.tsx` - Earnings and wallet
4. `(delivery-company)/settings/page.tsx` - Company settings
5. `(delivery-company)/verification/page.tsx` - Document verification

---

### 9.2 Trust Profile Page

**Location:** `(customer)/trust/page.tsx`

**Purpose:** Dedicated page for customers to view their trust profile and POD eligibility status

---

### 9.3 Unauthorized Page

**Location:** `(customer)/unauthorized/page.tsx`

**Purpose:** Show when user tries to access a page they don't have permission for

```typescript
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 max-w-md">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-[#E8621A]" />
          <h1 className="text-2xl font-black mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <Link href="/">
            <Button className="w-full">Return to Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
```

---

## 10. Navigation Updates

### 10.1 Update Role-Based Navigation

**Location:** `frontend/src/components/Navbar.tsx`

**Implementation:**

```typescript
// Update navigation based on user role
const navLinks = useMemo(() => {
  if (!user) {
    return [
      { label: 'Home', to: '/' },
      { label: 'Restaurants', to: '/restaurants' },
      { label: 'Vendors', to: '/vendors' }
    ];
  }

  switch (user.role) {
    case 'customer':
      return [
        { label: 'Home', to: '/' },
        { label: 'Restaurants', to: '/restaurants' },
        { label: 'Vendors', to: '/vendors' },
        { label: 'Orders', to: '/orders' },
        { label: 'Profile', to: '/profile' }
      ];
    case 'restaurant':
      return [
        { label: 'Dashboard', to: '/(restaurant)/dashboard' },
        { label: 'Menu', to: '/(restaurant)/menu' },
        { label: 'Orders', to: '/(restaurant)/orders' },
        { label: 'Analytics', to: '/(restaurant)/analytics' },
        { label: 'Settings', to: '/(restaurant)/settings' }
      ];
    case 'vendor':
      return [
        { label: 'Dashboard', to: '/(vendor)/dashboard' },
        { label: 'Menu', to: '/(vendor)/menu' },
        { label: 'Orders', to: '/(vendor)/orders' },
        { label: 'Forecast', to: '/(vendor)/forecast' }
      ];
    case 'delivery_rider':
      return [
        { label: 'Dashboard', to: '/(delivery)/dashboard' },
        { label: 'Orders', to: '/(delivery)/orders' },
        { label: 'Earnings', to: '/(delivery)/earnings' },
        { label: 'Profile', to: '/(delivery)/profile' }
      ];
    case 'delivery_company':
      return [
        { label: 'Dashboard', to: '/(delivery-company)/dashboard' },
        { label: 'Riders', to: '/(delivery-company)/riders' },
        { label: 'Earnings', to: '/(delivery-company)/earnings' },
        { label: 'Settings', to: '/(delivery-company)/settings' }
      ];
    case 'admin':
      return [
        { label: 'Dashboard', to: '/(admin)' },
        { label: 'Restaurants', to: '/(admin)/restaurants' },
        { label: 'Orders', to: '/(admin)/orders' },
        { label: 'Users', to: '/(admin)/users' },
        { label: 'Delivery Companies', to: '/(admin)/delivery-companies' }
      ];
    default:
      return [
        { label: 'Home', to: '/' },
        { label: 'Restaurants', to: '/restaurants' }
      ];
  }
}, [user]);
```

---

## 11. Toast Notifications

### 11.1 Add Toast Notifications for Key Events

**Location:** Use existing toast/sonner component

**Events to Notify:**
1. POD status changed
2. Delivery confirmation request
3. Delivery confirmed
4. Trust metrics updated
5. Penalty applied/lifted

**Implementation:**

```typescript
// Example toast notification
toast({
  title: 'Pay on Delivery Disabled',
  description: 'Due to cancellation history, pay on delivery has been disabled for your account.',
  variant: 'destructive',
  action: (
    <Button variant="outline" size="sm" onClick={() => router.push('/trust')}>
      View Details
    </Button>
  )
});
```

---

## 12. Loading States

### 12.1 Add Loading States for Async Operations

**Implementation:**

```typescript
// Add loading states for all API calls
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await performApiCall();
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

// Render loading state
{loading && (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="w-6 h-6 animate-spin text-[#E8621A]" />
  </div>
)}
```

---

## 13. Error Handling

### 13.1 Add Error Boundaries

**Location:** Create `frontend/src/components/ErrorBoundary.tsx`

**Implementation:**

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 14. Testing Requirements

### 14.1 Component Testing

**Test Scenarios:**
1. POD eligibility check UI
2. Trust profile display
3. Delivery confirmation flow
4. POD configuration panel
5. Role-based navigation

### 14.2 Integration Testing

**Test Scenarios:**
1. Complete checkout flow with POD
2. Complete delivery confirmation flow
3. Trust metric updates
4. Role-based access control

---

## 15. Accessibility

### 15.1 Add ARIA Labels

**Implementation:**

```typescript
// Add ARIA labels to interactive elements
<button
  aria-label="Confirm delivery arrival"
  onClick={handleConfirmArrival}
>
  Confirm Arrival
</button>

// Add proper keyboard navigation
<div role="navigation" aria-label="Main navigation">
  {/* Navigation items */}
</div>
```

---

## Summary

### Files to Create
1. `frontend/src/lib/routeGuards.ts`
2. `frontend/src/components/ErrorBoundary.tsx`
3. `frontend/src/app/(customer)/trust/page.tsx`
4. `frontend/src/app/(customer)/unauthorized/page.tsx`
5. `frontend/src/app/(delivery-company)/dashboard/page.tsx`
6. `frontend/src/app/(delivery-company)/riders/page.tsx`
7. `frontend/src/app/(delivery-company)/earnings/page.tsx`
8. `frontend/src/app/(delivery-company)/settings/page.tsx`
9. `frontend/src/app/(delivery-company)/verification/page.tsx`

### Files to Modify
1. `frontend/src/context/AuthContext.tsx`
2. `frontend/src/context/SocketProvider.tsx`
3. `frontend/src/components/Navbar.tsx`
4. `frontend/src/app/(customer)/orders/checkout/page.tsx`
5. `frontend/src/app/(customer)/profile/page.tsx`
6. `frontend/src/app/(customer)/orders/[id]/page.tsx`
7. `frontend/src/app/(delivery)/orders/page.tsx`
8. `frontend/src/app/(restaurant)/dashboard/page.tsx`
9. `frontend/src/app/(restaurant)/settings/pod/page.tsx`

### Implementation Priority
1. Update Auth context with role handling
2. Create route guards utility
3. Update checkout flow with POD checks
4. Implement delivery confirmation UI
5. Create trust profile page
6. Implement POD configuration panel
7. Create delivery company portal
8. Update navigation based on roles
9. Add socket event handling
10. Add error handling and loading states
