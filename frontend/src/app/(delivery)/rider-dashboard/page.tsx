'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bike, MapPin, Clock, CheckCircle, Package, DollarSign,
  TrendingUp, Star, Bell, Navigation, Battery, Signal, User, History
} from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';

interface DeliveryOrder {
  id: string;
  customer: string;
  address: string;
  restaurant: string;
  items: number;
  amount: number;
  status: 'assigned' | 'pickup' | 'delivering' | 'delivered';
  distance: string;
  estimatedTime: string;
  riderConfirmed?: boolean;
}

const mockOrders: DeliveryOrder[] = [
  {
    id: 'DEL-4521',
    customer: 'Funmi Adeyemi',
    address: '12 Glover Road, Ikoyi, Lagos',
    restaurant: 'Mama Cass Kitchen',
    items: 3,
    amount: 8500,
    status: 'delivering',
    distance: '3.2 km',
    estimatedTime: '12 min',
    riderConfirmed: false,
  },
  {
    id: 'DEL-4522',
    customer: 'Tunde Bello',
    address: '5B Victoria Island, Lagos',
    restaurant: 'Chop Chop Lagos',
    items: 2,
    amount: 5200,
    status: 'pickup',
    distance: '1.8 km',
    estimatedTime: '8 min',
  },
];

const todayStats = {
  completedOrders: 12,
  totalEarnings: 15400,
  hoursOnline: 6.5,
  averageRating: 4.8,
  totalDistance: 45,
  acceptanceRate: 92,
};

export default function DeliveryDashboardPage() {
  const { user: authUser, loading: authLoading, authorized } = useAuthGuard('delivery_rider')
  const [activeTab, setActiveTab] = useState('overview');
  const [isOnline, setIsOnline] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('Ikoyi, Lagos');
  const [orders, setOrders] = useState<DeliveryOrder[]>(mockOrders);
  const [confirmingArrival, setConfirmingArrival] = useState<string | null>(null);

  if (authLoading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FFF8F0'
    }}>
      <div>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '4px solid #F0EAE0', borderTop: '4px solid #E8621A',
          animation: 'spin 1s linear infinite', margin: '0 auto 16px'
        }} />
        <p style={{ color: '#636366', textAlign: 'center' }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (!authorized || !authUser) return null

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Bike },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleConfirmArrival = async (orderId: string) => {
    setConfirmingArrival(orderId);
    try {
      const response = await fetch(`https://vibechops.onrender.com/api/delivery/orders/${orderId}/confirm-arrival`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });

      if (response.ok) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, riderConfirmed: true } : order
        ));
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to confirm arrival');
      }
    } catch (error) {
      console.error('Failed to confirm arrival:', error);
      alert('Failed to confirm arrival. Please try again.');
    } finally {
      setConfirmingArrival(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-[#FFF1E8] text-[#E8621A]';
      case 'pickup': return 'bg-[#EFF6FF] text-[#2563EB]';
      case 'delivering': return 'bg-[#F0FDF4] text-[#16A34A]';
      case 'delivered': return 'bg-[#F5F5F5] text-[#636366]';
      default: return 'bg-[#F5F5F5] text-[#636366]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'New Order';
      case 'pickup': return 'Pickup';
      case 'delivering': return 'Delivering';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">Delivery Partner</h1>
              <p className="text-white/40 text-sm">Welcome back, Emmanuel</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                <Bell size={20} className="text-white" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E8621A] text-white text-xs flex items-center justify-center font-bold">
                  {mockOrders.length}
                </span>
              </button>
              <button
                onClick={() => setIsOnline(!isOnline)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isOnline
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </div>
              </button>
            </div>
          </div>

          {/* Location & Battery */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
              <MapPin size={14} className="text-white/60" />
              <span className="text-white text-sm">{currentLocation}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
              <Battery size={14} className="text-white/60" />
              <span className="text-white text-sm">85%</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
              <Signal size={14} className="text-white/60" />
              <span className="text-white text-sm">Strong</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b" style={{ borderColor: '#E8E8E8' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  style={
                    activeTab === tab.id
                      ? { background: 'linear-gradient(135deg, #E8621A, #C4501A)' }
                      : { color: '#636366' }
                  }
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            {/* Today's Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: CheckCircle, label: 'Completed', value: todayStats.completedOrders, color: '#16A34A' },
            { icon: DollarSign, label: 'Earnings', value: `₦${todayStats.totalEarnings.toLocaleString()}`, color: '#E8621A' },
            { icon: Clock, label: 'Hours Online', value: `${todayStats.hoursOnline}h`, color: '#2563EB' },
            { icon: Star, label: 'Rating', value: todayStats.averageRating, color: '#F59E0B' },
            { icon: Navigation, label: 'Distance', value: `${todayStats.totalDistance}km`, color: '#8B5CF6' },
            { icon: TrendingUp, label: 'Acceptance', value: `${todayStats.acceptanceRate}%`, color: '#10B981' },
          ].map((stat, i) => (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-xl font-black text-[#1C1C1E]">{stat.value}</p>
              <p className="text-xs text-[#A0A0A0]">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Active Orders */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#1C1C1E]">
              Active Orders
              <Badge className="ml-2 bg-[#FFF1E8] text-[#E8621A]">{mockOrders.length}</Badge>
            </h2>
            <Link href="/delivery/history">
              <Button className="bg-[#F5F5F5] text-[#636366] hover:bg-[#E8E8E8] text-xs">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {mockOrders.map((order) => (
              <Card key={order.id} className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF1E8] flex items-center justify-center">
                      <Package className="w-6 h-6 text-[#E8621A]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1C1C1E]">{order.id}</h3>
                      <p className="text-sm text-[#636366]">{order.restaurant}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-[#636366]">
                    <MapPin size={14} />
                    <span className="truncate">{order.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#636366]">
                    <Package size={14} />
                    <span>{order.items} items</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#E8621A] font-bold">
                    <DollarSign size={14} />
                    <span>₦{order.amount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 bg-[#F5F5F5] px-3 py-1.5 rounded-lg text-xs text-[#636366]">
                    <Navigation size={12} />
                    {order.distance}
                  </div>
                  <div className="flex items-center gap-2 bg-[#F5F5F5] px-3 py-1.5 rounded-lg text-xs text-[#636366]">
                    <Clock size={12} />
                    {order.estimatedTime}
                  </div>
                </div>

                <div className="flex gap-3">
                  {order.status === 'assigned' && (
                    <Button className="flex-1 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white text-sm">
                      <Navigation className="w-4 h-4 mr-2" />
                      Navigate to Restaurant
                    </Button>
                  )}
                  {order.status === 'pickup' && (
                    <Button className="flex-1 bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Pickup
                    </Button>
                  )}
                  {order.status === 'delivering' && !order.riderConfirmed && (
                    <Button 
                      onClick={() => handleConfirmArrival(order.id)}
                      disabled={confirmingArrival === order.id}
                      className="flex-1 bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white text-sm"
                    >
                      {confirmingArrival === order.id ? 'Confirming...' : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Arrival
                        </>
                      )}
                    </Button>
                  )}
                  {order.status === 'delivering' && order.riderConfirmed && (
                    <div className="flex-1 bg-[#F0FDF4] text-[#16A34A] text-sm font-bold px-4 py-2 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Arrival Confirmed
                    </div>
                  )}
                  {order.status === 'delivering' && (
                    <Button className="bg-[#F5F5F5] text-[#636366] hover:bg-[#E8E8E8] text-sm">
                      Call Customer
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/delivery/earnings">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF1E8] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6 text-[#E8621A]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1C1E]">Earnings</h3>
                  <p className="text-sm text-[#A0A0A0]">View your earnings</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/delivery/history">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1C1E]">Order History</h3>
                  <p className="text-sm text-[#A0A0A0]">Past deliveries</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/delivery/profile">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 text-[#16A34A]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1C1E]">My Profile</h3>
                  <p className="text-sm text-[#A0A0A0]">View & edit profile</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
          </>
        )}

        {activeTab === 'orders' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Orders</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Orders management coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'earnings' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Earnings</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <DollarSign className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Earnings dashboard coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Order History</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <History className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Order history coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'profile' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Profile Settings</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <User className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Profile management coming soon</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
