'use client';
import { API_V2, SOCKET_URL } from '@/lib/apiBase';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bike, MapPin, Clock, CheckCircle, Package, DollarSign,
  TrendingUp, Star, Bell, Navigation, User, History
} from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

// Rider overview starts empty — real accepted/assigned orders arrive via
// Socket.IO (`order_assigned`) and the Incoming Orders tab. Today's stats
// come from GET /v2/riders/earnings?period=today.

export default function DeliveryDashboardPage() {
  const { user: authUser, loading: authLoading, authorized } = useAuthGuard('delivery_rider')
  const [activeTab, setActiveTab] = useState('overview');
  const [isOnline, setIsOnline] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('Ikoyi, Lagos');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [confirmingArrival, setConfirmingArrival] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState<{ totalEarnings?: number; deliveriesCount?: number } | null>(null);

  // Real "today" stats from GET /v2/riders/earnings
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!token || !authUser) return;
    fetch(`${API_V2}/riders/earnings?period=today`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`status ${res.status}`);
        setTodayEarnings(body);
      })
      .catch((err) => console.error('Failed to fetch today earnings:', err));
  }, [authUser]);

  // Socket.io for real-time order assignments
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !authUser) return;

    let socket: any = null;

    import('socket.io-client').then(({ io }) => {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('join_room', { role: 'delivery_rider', id: authUser._id });
      });

      socket.on('order_assigned', (order: any) => {
        setOrders((prev: DeliveryOrder[]) => [{
          id: order._id || order.id || `DEL-${Date.now()}`,
          customer: order.customerName || order.user?.name || 'Customer',
          address: typeof order.deliveryAddress === 'object' ? `${order.deliveryAddress.street || ''} ${order.deliveryAddress.city || ''}` : order.deliveryAddress || 'Address',
          restaurant: order.restaurantName || order.restaurant?.name || 'Restaurant',
          items: order.items?.length || 0,
          amount: order.totalAmount || order.amount || 0,
          status: 'pickup',
          distance: order.distance || '3.2 km',
          estimatedTime: order.estimatedTime || '15 min',
        }, ...prev]);
      });

      socket.on('connect_error', () => setSocketConnected(false));
    });

    return () => { if (socket) socket.disconnect(); };
  }, [authUser]);

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
      const response = await fetch(`${API_V2}/delivery/orders/${orderId}/confirm-arrival`, {
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
              <p className="text-white/40 text-sm">Welcome back, {authUser?.name?.split(' ')[0] || 'Rider'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: socketConnected ? 'rgba(22,163,74,0.2)' : 'rgba(211,47,47,0.2)', color: socketConnected ? '#16A34A' : '#D32F2F' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: socketConnected ? '#16A34A' : '#D32F2F' }} />
                {socketConnected ? 'Live' : 'Offline'}
              </div>
              <button className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                <Bell size={20} className="text-white" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E8621A] text-white text-xs flex items-center justify-center font-bold">
                  {orders.length}
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

          {/* Location */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
              <MapPin size={14} className="text-white/60" />
              <span className="text-white text-sm">{currentLocation}</span>
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
          {([
            { icon: CheckCircle, label: 'Completed Today', value: todayEarnings?.deliveriesCount ?? 0, color: '#16A34A' },
            { icon: DollarSign, label: 'Earnings Today', value: `₦${Number(todayEarnings?.totalEarnings || 0).toLocaleString()}`, color: '#E8621A' },
          ]).map((stat, i) => (
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
              <Badge className="ml-2 bg-[#FFF1E8] text-[#E8621A]">{orders.length}</Badge>
            </h2>
            <Link href="/delivery/history">
              <Button className="bg-[#F5F5F5] text-[#636366] hover:bg-[#E8E8E8] text-xs">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {orders.length === 0 && (
              <Card className="p-10 text-center">
                <Package className="w-14 h-14 mx-auto mb-3" style={{ color: '#E8E8E8' }} />
                <p className="font-bold text-lg mb-1" style={{ color: '#1C1C1E' }}>No active order</p>
                <p style={{ color: '#636366' }}>Check the Orders tab to accept incoming delivery requests.</p>
              </Card>
            )}
            {orders.map((order) => (
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

        {activeTab === 'orders' && <RiderOrdersTab onOrdersChange={setOrders} />}
        {activeTab === 'earnings' && <RiderEarningsTab />}
        {activeTab === 'history' && <RiderHistoryTab />}
        {activeTab === 'profile' && <RiderProfileTab authUser={authUser} />}
      </div>
    </div>
  );
}

function RiderOrdersTab({ onOrdersChange }: { onOrdersChange: React.Dispatch<React.SetStateAction<DeliveryOrder[]>> }) {
  const [loading, setLoading] = useState(true)
  const [incomingOrders, setIncomingOrders] = useState<any[]>([])
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_V2}/delivery/orders/available`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setIncomingOrders(data.orders || data || [])
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const handleAccept = async (orderId: string) => {
    try {
      const res = await fetch(`${API_V2}/delivery/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setIncomingOrders(prev => prev.filter(o => (o._id || o.id) !== orderId))
        onOrdersChange(prev => [...prev, {
          id: orderId,
          customer: '',
          address: '',
          restaurant: '',
          items: 0,
          amount: 0,
          status: 'pickup',
          distance: '',
          estimatedTime: '',
        }])
      } else {
        const data = await res.json()
        alert(data.message || 'Failed to accept order')
      }
    } catch (err) {
      console.error('Failed to accept order:', err)
    }
  }

  if (loading) return <Card className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#E8621A] border-t-transparent rounded-full mx-auto mb-4" /><p style={{ color: '#636366' }}>Loading orders...</p></Card>

  return (
    <div>
      <h2 className="text-xl font-black mb-4" style={{ color: '#1C1C1E' }}>Incoming Orders</h2>
      {incomingOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
          <p className="font-bold text-lg mb-1" style={{ color: '#1C1C1E' }}>No incoming orders</p>
          <p style={{ color: '#636366' }}>Toggle online to start receiving order requests</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {incomingOrders.map((order: any) => (
            <Card key={order._id || order.id} className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold" style={{ color: '#1C1C1E' }}>{order.restaurantName || order.restaurant || 'Restaurant'}</h3>
                  <p className="text-sm" style={{ color: '#636366' }}>#{order._id?.slice(-8) || order.id}</p>
                </div>
                <span className="font-black text-lg" style={{ color: '#E8621A' }}>₦{(order.totalAmount || order.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: '#636366' }}>
                <MapPin size={14} />
                <span>{typeof order.pickupAddress === 'object' ? `${order.pickupAddress.street || ''}, ${order.pickupAddress.city || ''}` : order.pickupAddress || order.restaurantAddress || order.address || 'Address'}</span>
              </div>
              {Array.isArray(order.items) && order.items.length > 0 && (
                <div className="mb-3 rounded-xl p-3" style={{ background: '#FAFAFA' }}>
                  {order.items.map((item: any, idx: number) => {
                    const optionLabel = (item.customizations || [])
                      .map((c: any) => `${c.name ? `${c.name}: ` : ''}${c.option}`)
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <div key={idx} className="text-xs" style={{ color: '#1C1C1E' }}>
                        <span className="font-semibold">{item.quantity || 1}x {item.name || 'Item'}</span>
                        {optionLabel && (
                          <span className="block mt-0.5" style={{ color: '#A0A0A0' }}>{optionLabel}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs mb-4">
                <span className="bg-[#F5F5F5] px-3 py-1.5 rounded-lg">{order.distance || '3.2 km'}</span>
                <span className="bg-[#F5F5F5] px-3 py-1.5 rounded-lg">{order.estimatedTime || '15 min'}</span>
                <span className="bg-[#F5F5F5] px-3 py-1.5 rounded-lg">{order.items || order.totalItems || 0} items</span>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => handleAccept(order._id || order.id)}
                  className="flex-1 bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white text-sm">
                  Accept Order
                </Button>
                <Button className="bg-[#FEF2F2] text-[#D32F2F] hover:bg-[#FEE2E2] text-sm">
                  Decline
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function RiderEarningsTab() {
  const [period, setPeriod] = useState('today')
  const [earningsData, setEarningsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(() => {
    setLoading(true)
    const fetchEarnings = async () => {
      try {
        const res = await fetch(`${API_V2}/riders/earnings?period=${period}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setEarningsData(data)
        } else {
          // No demo fallback — show a real zero/empty state on errors.
          setEarningsData({ totalEarnings: 0, deliveriesCount: 0, chartData: [] })
        }
      } catch (err) {
        console.error('Failed to fetch earnings:', err)
        setEarningsData({ totalEarnings: 0, deliveriesCount: 0, chartData: [] })
      } finally {
        setLoading(false)
      }
    }
    fetchEarnings()
  }, [period])

  if (loading) return <Card className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#E8621A] border-t-transparent rounded-full mx-auto mb-4" /></Card>

  // Real per-day earnings from GET /v2/riders/earnings (chartData: day/amount).
  const weeklyData = Array.isArray(earningsData?.chartData) ? earningsData.chartData : []

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {['today', 'week', 'month'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{
              padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '13px', textTransform: 'capitalize',
              background: period === p ? 'linear-gradient(135deg, #E8621A, #C4501A)' : '#F5F5F7',
              color: period === p ? 'white' : '#636366',
            }}>{p}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-6 text-center">
          <DollarSign className="w-10 h-10 mx-auto mb-3" style={{ color: '#E8621A' }} />
          <p className="text-4xl font-black" style={{ color: '#1C1C1E' }}>₦{(earningsData?.totalEarnings || 0).toLocaleString()}</p>
          <p className="text-sm" style={{ color: '#636366' }}>Total Earnings ({period})</p>
        </Card>
        <Card className="p-6 text-center">
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#16A34A' }} />
          <p className="text-4xl font-black" style={{ color: '#1C1C1E' }}>{earningsData?.deliveriesCount || 0}</p>
          <p className="text-sm" style={{ color: '#636366' }}>Deliveries ({period})</p>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="font-bold mb-4" style={{ color: '#1C1C1E' }}>Earnings by Day</h3>
        {weeklyData.length === 0 && (
          <p className="text-sm text-center py-4" style={{ color: '#636366' }}>No earnings in this period yet.</p>
        )}
        <div style={{ width: '100%', height: weeklyData.length ? '200px' : '0px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="#E8621A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold mb-4" style={{ color: '#1C1C1E' }}>Per-Delivery Breakdown</h3>
        {(earningsData?.history || []).length === 0 ? (
          <div className="text-center py-8" style={{ color: '#636366' }}>
            <p>No delivery history for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(earningsData?.history || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F5F5F7' }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#1C1C1E' }}>{item.route || item.id}</p>
                  <p className="text-xs" style={{ color: '#636366' }}>{item.date ? new Date(item.date).toLocaleDateString() : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: '#E8621A' }}>₦{item.amount.toLocaleString()}</p>
                  {item.rating && <p className="text-xs" style={{ color: '#F59E0B' }}>{'★'.repeat(item.rating)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function RiderHistoryTab() {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_V2}/riders/deliveries/completed`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDeliveries(data.deliveries || data || [])
        } else {
          setDeliveries([])
        }
      } catch (err) {
        setDeliveries([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  if (loading) return <Card className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#E8621A] border-t-transparent rounded-full mx-auto mb-4" /></Card>

  return (
    <Card className="p-6">
      {deliveries.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#636366' }}>
          <History className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
          <p className="font-bold text-lg mb-1" style={{ color: '#1C1C1E' }}>No deliveries yet</p>
          <p>Go online to start earning</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((d: any, i: number) => (
            <div key={d.id || i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F5F5F7' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-sm" style={{ color: '#1C1C1E' }}>#{d.id?.slice(-8) || d._id?.slice(-8) || `ORD-${i + 1}`}</p>
                  <span className="text-xs" style={{ color: '#A0A0A0' }}>{d.date ? new Date(d.date).toLocaleDateString() : ''}</span>
                </div>
                <p className="text-xs" style={{ color: '#636366' }}>{d.from || 'Restaurant'} → {d.to || 'Customer'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: '#E8621A' }}>+₦{(d.amount || 0).toLocaleString()}</p>
                {d.rating && <p className="text-xs" style={{ color: '#F59E0B' }}>{'★'.repeat(d.rating)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function RiderProfileTab({ authUser }: { authUser: any }) {
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdNotice, setPwdNotice] = useState('')
  const [profile, setProfile] = useState({
    name: authUser?.name || '',
    phone: authUser?.phone || '',
    email: authUser?.email || '',
    vehicleType: '',
    plateNumber: '',
    totalDeliveries: 0,
    rating: null as number | null,
    memberSince: '',
    verificationStatus: 'pending' as 'verified' | 'pending' | 'unverified',
  })
  const [editing, setEditing] = useState({ ...profile })

  // Load the real signed-in profile and delivery count.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    fetch(`${API_V2}/auth/profile`, { headers, signal: AbortSignal.timeout(20000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const vehicle = localStorage.getItem('riderVehicleType') || ''
        const plate = localStorage.getItem('riderPlateNumber') || ''
        setProfile((prev) => ({
          ...prev,
          name: data.name || prev.name,
          phone: data.phone || '',
          email: data.email || prev.email,
          vehicleType: vehicle,
          plateNumber: plate,
          memberSince: data.createdAt ? new Date(data.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '',
        }))
        setEditing((prev) => ({
          ...prev,
          name: data.name || prev.name,
          phone: data.phone || '',
          email: data.email || prev.email,
          vehicleType: vehicle,
          plateNumber: plate,
        }))
      })
      .catch(() => {})
    fetch(`${API_V2}/riders/deliveries/completed?limit=1`, { headers, signal: AbortSignal.timeout(20000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const count = data?.pagination?.total ?? (Array.isArray(data?.data) ? data.data.length : null)
        if (count !== null && count !== undefined) {
          setProfile((prev) => ({ ...prev, totalDeliveries: count }))
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    setSaveNotice('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_V2}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editing.name, phone: editing.phone }),
        signal: AbortSignal.timeout(25000),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setSaveError(body?.message || 'Could not save your profile. Please try again.')
        return
      }
      // Vehicle details are not in the backend model; keep them on this device.
      localStorage.setItem('riderVehicleType', editing.vehicleType || '')
      localStorage.setItem('riderPlateNumber', editing.plateNumber || '')
      setProfile({ ...editing })
      setEditMode(false)
      setSaveNotice('Profile saved.')
    } catch (err: any) {
      setSaveError(err?.name === 'TimeoutError' || err?.name === 'AbortError'
        ? 'The request timed out. Please try again.'
        : 'Network error. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwdSaving(true)
    setPwdError('')
    setPwdNotice('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_V2}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
        signal: AbortSignal.timeout(25000),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setPwdError(body?.message || 'Could not update your password.')
        return
      }
      setPwdCurrent('')
      setPwdNew('')
      setPwdNotice('Password updated.')
    } catch {
      setPwdError('Network error. Check your connection and try again.')
    } finally {
      setPwdSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    window.location.href = '/rider-login'
  }

  return (
    <Card className="p-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8 p-6 rounded-2xl" style={{ background: '#FFF8F0' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: '900', fontSize: '24px',
        }}>{profile.name.charAt(0).toUpperCase()}</div>
        <div>
          <h3 className="text-xl font-black" style={{ color: '#1C1C1E' }}>{profile.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', background: profile.verificationStatus === 'verified' ? '#F0FDF4' : '#FFF1E8', color: profile.verificationStatus === 'verified' ? '#16A34A' : '#E8621A' }}>
              {profile.verificationStatus === 'verified' ? '✅ Verified' : profile.verificationStatus === 'pending' ? '⏳ Pending' : '⚠️ Unverified'}
            </span>
          </div>
        </div>
        <button onClick={() => setEditMode(!editMode)} style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: '10px', border: 'none', background: '#E8621A', color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
          {editMode ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Deliveries', value: profile.totalDeliveries, color: '#2563EB' },
          { label: 'Rating', value: profile.rating ?? '—', color: '#F59E0B', suffix: profile.rating ? '★' : '' },
          { label: 'Member Since', value: profile.memberSince || '—', color: '#636366' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: '#F5F5F7' }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}{s.suffix || ''}</p>
            <p className="text-xs" style={{ color: '#A0A0A0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Editable Fields */}
      <div className="space-y-4 mb-6">
        {[
          { label: 'Name', key: 'name', type: 'text' },
          { label: 'Phone', key: 'phone', type: 'tel' },
          { label: 'Email', key: 'email', type: 'email', readOnly: true },
          { label: 'Vehicle Type', key: 'vehicleType', type: 'text' },
          { label: 'Plate Number', key: 'plateNumber', type: 'text' },
        ].map(field => (
          <div key={field.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F5F5F7' }}>
            <span className="text-sm" style={{ color: '#636366' }}>{field.label}</span>
            {editMode && !field.readOnly ? (
              <input type={field.type} value={(editing as any)[field.key]} onChange={e => setEditing({ ...editing, [field.key]: e.target.value })}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', fontWeight: '600', textAlign: 'right', outline: 'none' }} />
            ) : (
              <span className="text-sm font-bold" style={{ color: '#1C1C1E' }}>{(editMode ? (editing as any)[field.key] : (profile as any)[field.key])}</span>
            )}
          </div>
        ))}
      </div>

      {saveNotice && (
        <div className="p-3 rounded-xl mb-3" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC', fontSize: '14px' }}>{saveNotice}</div>
      )}
      {saveError && (
        <div className="p-3 rounded-xl mb-3" style={{ background: '#FEF2F2', color: '#D32F2F', border: '1px solid #FCA5A5', fontSize: '14px' }}>{saveError}</div>
      )}

      {editMode && (
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #16A34A, #15803D)', color: 'white',
          fontWeight: '700', fontSize: '16px', cursor: 'pointer', marginBottom: '12px',
          opacity: saving ? 0.7 : 1,
        }}>{saving ? 'Saving…' : 'Save Changes'}</button>
      )}

      {profile.verificationStatus !== 'verified' && (
        <div className="p-4 rounded-xl mb-4" style={{ background: '#FFF1E8', border: '1px solid rgba(232,98,26,0.2)' }}>
          <p className="font-bold text-sm mb-1" style={{ color: '#E8621A' }}>Upload Documents</p>
          <p className="text-xs mb-3" style={{ color: '#636366' }}>Upload your ID, driver's license, and vehicle documents to get verified.</p>
          <Link href="/verification" style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '8px', background: '#E8621A', color: 'white', fontWeight: '600', fontSize: '13px' }}>Upload Documents</Link>
        </div>
      )}

      <div className="p-4 rounded-xl mb-4" style={{ background: '#F5F5F7' }}>
        <p className="font-bold text-sm mb-2" style={{ color: '#1C1C1E' }}>Change Password</p>
        {pwdNotice && <p className="text-xs mb-2" style={{ color: '#15803D' }}>{pwdNotice}</p>}
        {pwdError && <p className="text-xs mb-2" style={{ color: '#D32F2F' }}>{pwdError}</p>}
        <input type="password" placeholder="Current password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', marginBottom: '8px', outline: 'none' }} />
        <input type="password" placeholder="New password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E8E8', fontSize: '14px', marginBottom: '8px', outline: 'none' }} />
        <button onClick={handleChangePassword} disabled={pwdSaving || !pwdCurrent || !pwdNew} style={{
          padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1C1C1E', color: 'white',
          fontWeight: '600', fontSize: '13px', cursor: 'pointer', opacity: pwdSaving || !pwdCurrent || !pwdNew ? 0.6 : 1,
        }}>{pwdSaving ? 'Updating…' : 'Update Password'}</button>
      </div>

      <button onClick={handleLogout} style={{
        width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #FEE2E2',
        background: 'white', color: '#D32F2F', fontWeight: '700', fontSize: '16px', cursor: 'pointer'
      }}>Sign Out</button>
    </Card>
  )
}


