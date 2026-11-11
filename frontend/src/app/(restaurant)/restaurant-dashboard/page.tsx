'use client';
import { API_BASE as API_URL, SOCKET_URL } from '@/lib/apiBase';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, Star, Clock, Plus, Edit, Trash2, Calendar, Percent, User } from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';

function RestaurantDashboardPageContent() {
  const { user: authUser, loading: authLoading, authorized } = useAuthGuard('restaurant')
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurantId');
  const [period, setPeriod] = useState('week');
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [restaurantOrders, setRestaurantOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [restaurantEarnings, setRestaurantEarnings] = useState<{ totalEarned: number; pendingEarnings: number } | null>(null);

  // Derived Overview values, all sourced from the real analytics payload
  // (GET /v2/analytics/me or /v2/analytics/dashboard). No hard-coded numbers.
  const summary = analytics?.summary || null;
  const trendData: { date: string; revenue: number; orderCount: number }[] = Array.isArray(analytics?.chartData)
    ? analytics.chartData
    : [];
  const topItemsList: { name: string; orderCount: number; revenue: number }[] = Array.isArray(analytics?.topItems)
    ? analytics.topItems
    : [];
  const peakHoursList: { hour: number; orderCount: number }[] = Array.isArray(analytics?.peakHours)
    ? analytics.peakHours
    : [];
  const topHour = peakHoursList.length > 0
    ? peakHoursList.reduce(
        (peak: any, h: any) => ((h.orderCount ?? 0) > (peak.orderCount ?? 0) ? h : peak),
        peakHoursList[0]
      )
    : null;

  const fetchPromotions = async (overrideId?: string) => {
    const id = overrideId || restaurantId;
    if (!id) return;
    try {
      const response = await fetch(`${API_URL}/v2/restaurant-promotions?restaurantId=${id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPromotions(data);
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      // `/me` resolves the signed-in owner's restaurant; the ?restaurantId=
      // query is the legacy path kept working for deep links.
      const query = restaurantId ? `restaurantId=${restaurantId}&period=${period}` : `period=${period}`;
      const response = await fetch(`${API_URL}/v2/analytics/${restaurantId ? 'dashboard' : 'me'}?${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data?.data || data);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/v2/earnings/restaurants/earnings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setRestaurantEarnings(data);
      }
    } catch (error) {
      console.error('Failed to fetch restaurant earnings:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/v2/orders/restaurants/orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setRestaurantOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch restaurant orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [restaurantId, period]);

  useEffect(() => {
    fetchOrders();
    fetchEarnings();
  }, []);

  // Once analytics resolves the restaurant of the signed-in owner, load its
  // promotions even when the page was opened without ?restaurantId=.
  useEffect(() => {
    const resolvedId = analytics?.restaurantId;
    if (resolvedId && !restaurantId) fetchPromotions(String(resolvedId));
  }, [analytics?.restaurantId, restaurantId]);

  // Socket.io connection for real-time orders
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !restaurantId) return;

    let socket: any = null;

    import('socket.io-client').then(({ io }) => {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('join_room', { role: 'restaurant', id: restaurantId });
      });

      socket.on('new_order', (order: any) => {
        setPendingOrders((prev: any[]) => [order, ...prev]);
        setNotificationCount((prev: number) => prev + 1);
      });

      socket.on('connect_error', () => {
        setSocketConnected(false);
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [restaurantId]);

  if (authLoading) return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#F0EAE0] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-[#1C1C1E]">Restaurant Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: socketConnected ? '#F0FDF4' : '#FEF2F2', color: socketConnected ? '#16A34A' : '#D32F2F' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: socketConnected ? '#16A34A' : '#D32F2F' }} />
              {socketConnected ? 'Live' : 'Offline'}
            </div>
          </div>
          <Link href="/">
            <Button className="bg-[#FFF1E8] text-[#E8621A] hover:bg-[#FFF1E8]/80">
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">
                Orders {notificationCount > 0 && (
                  <span style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '8px', background: '#E8621A', color: 'white', fontSize: '11px', fontWeight: '700' }}>{notificationCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="promotions">Promotions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {['day', 'week', 'month'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${period === p ? 'bg-[#E8621A] text-white' : 'bg-white border border-[#E8E8E8] text-[#636366]'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <TabsContent value="overview">
            {/* Stats Cards — real data from /analytics/me or /analytics/dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                {
                  label: period === 'week' ? 'Weekly Revenue' : 'Period Revenue',
                  value: summary ? `₦${Number(summary.revenue || 0).toLocaleString()}` : '—',
                  icon: DollarSign, color: '#16A34A',
                },
                {
                  label: 'Orders',
                  value: summary ? String(summary.totalOrders ?? '—') : '—',
                  icon: ShoppingCart, color: '#E8621A',
                },
                {
                  label: 'Avg Order Value',
                  value: summary ? `₦${Number(summary.avgOrderValue || 0).toLocaleString()}` : '—',
                  icon: Star, color: '#FF8C42',
                },
                {
                  label: 'Return Rate',
                  value: summary ? `${Math.round(Number(summary.returnRate || 0))}%` : '—',
                  icon: TrendingUp, color: '#2563EB',
                },
                {
                  label: 'Peak Hour',
                  value: topHour ? `${String(topHour.hour)}:00` : '—',
                  icon: Clock, color: '#BE3A2A',
                },
              ].map((stat) => (
                <Card key={stat.label} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}18` }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#1C1C1E]">{stat.value}</p>
                  <p className="text-xs text-[#A0A0A0] mt-1">{stat.label}</p>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="p-5">
                <h3 className="font-bold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#E8621A" strokeWidth={3} dot={{ r: 5, fill: '#E8621A' }} />
                  </LineChart>
                </ResponsiveContainer>
                {trendData.length === 0 && !analyticsLoading && (
                  <p className="text-xs text-[#A0A0A0] mt-2">No completed orders in this period yet.</p>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-bold mb-4">Orders</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orderCount" fill="#E8621A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Top Items */}
            <Card className="p-5 mb-8">
              <h3 className="font-bold mb-4">Top Items</h3>
              {(!topItemsList || topItemsList.length === 0) ? (
                <p className="text-sm text-[#A0A0A0]">No sold items yet.</p>
              ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F0EAE0]">
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Item</th>
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Orders</th>
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItemsList.map((item: any) => (
                    <tr key={item.name} className="border-b border-[#F0EAE0]">
                      <td className="py-3 text-sm font-medium">{item.name}</td>
                      <td className="py-3 text-sm">{item.orderCount}</td>
                      <td className="py-3 text-sm font-semibold">₦{Number(item.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </Card>

            {/* Peak Hours */}
            <Card className="p-5">
              <h3 className="font-bold mb-4">Peak Hours</h3>
              {(!peakHoursList || peakHoursList.length === 0) ? (
                <p className="text-sm text-[#A0A0A0]">No order activity yet.</p>
              ) : (
              <div className="space-y-2">
                {peakHoursList.map((hour: any) => {
                  const max = Math.max(...peakHoursList.map((h: any) => h.orderCount || h.orders || 0), 1);
                  const count = hour.orderCount ?? hour.orders ?? 0;
                  return (
                  <div key={hour.hour} className="flex items-center gap-2">
                    <span className="text-xs w-8">{hour.hour}:00</span>
                    <div className="flex-1 h-4 bg-[#F0EAE0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#E8621A]" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-[#636366] w-12 text-right">{count}</span>
                  </div>
                  );
                })}
              </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="p-5">
              <h3 className="font-bold mb-4">Recent Orders</h3>
              {ordersLoading ? (
                <p className="text-[#636366]">Loading orders...</p>
              ) : restaurantOrders.length === 0 ? (
                <p className="text-[#636366]">No orders yet.</p>
              ) : (
                <div className="space-y-4">
                  {restaurantOrders.map((order: any) => (
                    <div key={order._id} className="border border-[#F0EAE0] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-sm">#{String(order._id).slice(-8)}</p>
                          <p className="text-xs text-[#A0A0A0]">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                        <Badge className="bg-[#FFF1E8] text-[#E8621A]">
                          {order.status || 'pending'}
                        </Badge>
                      </div>
                      <div className="space-y-1 mb-2">
                        {(order.items || []).map((item: any, idx: number) => {
                          const optionLabel = (item.customizations || [])
                            .map((c: any) => `${c.name ? `${c.name}: ` : ''}${c.option}`)
                            .filter(Boolean)
                            .join(', ');
                          return (
                            <div key={idx} className="text-sm">
                              <span className="font-semibold">
                                {item.quantity || 1}x {item.name || 'Item'}
                              </span>
                              {optionLabel && (
                                <span className="block text-xs text-[#A0A0A0]">{optionLabel}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-right font-black text-[#E8621A]">
                        ₦{Number(order.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Menu Items</h3>
                <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>
              <p className="text-[#636366]">No menu items yet.</p>
            </Card>
          </TabsContent>

          <TabsContent value="promotions">
            <Card className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold">Promotions</h3>
                <Button onClick={() => setShowPromotionForm(!showPromotionForm)} className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                  <Plus className="w-4 h-4 mr-2" /> Create Promotion
                </Button>
              </div>

              {showPromotionForm && (
                <Card className="p-4 mb-6 bg-[#F5F5F7]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Promotion Name</Label>
                      <Input placeholder="e.g., Weekend Special" className="border-[#E8E8E8]" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Discount Type</Label>
                      <Select>
                        <SelectTrigger className="border-[#E8E8E8]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Discount Value</Label>
                      <Input type="number" placeholder="10" className="border-[#E8E8E8]" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Valid Until</Label>
                      <Input type="date" className="border-[#E8E8E8]" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button className="bg-[#E8621A] text-white">Create Promotion</Button>
                    <Button variant="outline" onClick={() => setShowPromotionForm(false)}>Cancel</Button>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                {promotions.length > 0 ? promotions.map((promo) => (
                  <Card key={promo.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFF1E8] flex items-center justify-center">
                        <Percent className="w-5 h-5 text-[#E8621A]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{promo.name}</h4>
                        <p className="text-xs text-[#636366]">{promo.discount}% off • Valid until {new Date(promo.validUntil).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={promo.status === 'active' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#636366]'}>
                        {promo.status}
                      </Badge>
                      <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost"><Trash2 className="w-4 h-4 text-[#D32F2F]" /></Button>
                    </div>
                  </Card>
                )) : (
                  <div className="text-center py-8 text-[#636366]">No promotions yet</div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5">
                <h3 className="font-bold mb-4">Revenue by Item</h3>
                {topItemsList.length === 0 ? (
                  <p className="text-sm text-[#A0A0A0]">No sold items yet.</p>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topItemsList.map((item: any) => ({ name: item.name, revenue: item.revenue }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#E8621A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-bold mb-4">Order Quality</h3>
                {!summary ? (
                  <p className="text-sm text-[#A0A0A0]">No analytics data yet.</p>
                ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Return Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#F0EAE0] rounded-full">
                        <div className="h-full bg-[#16A34A]" style={{ width: `${Math.min(Math.round(Number(summary.returnRate || 0)), 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold">{Math.round(Number(summary.returnRate || 0))}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cancelled Orders</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#F0EAE0] rounded-full">
                        <div className="h-full bg-[#D32F2F]" style={{ width: `${Math.min(Math.round(Number(summary.cancelledRate || 0)), 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold">{Math.round(Number(summary.cancelledRate || 0))}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#A0A0A0]">
                    Star ratings are not collected yet — satisfaction scores will appear here once reviews are recorded.
                  </p>
                </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="p-5">
              <h3 className="font-bold mb-4">Earnings</h3>
              {!restaurantEarnings ? (
                <p className="text-sm text-[#A0A0A0]">No earnings data yet.</p>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                  <p className="text-sm" style={{ color: '#636366' }}>Total Earned (after commission)</p>
                  <p className="text-2xl font-bold" style={{ color: '#16A34A' }}>₦{Number(restaurantEarnings.totalEarned || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                  <p className="text-sm" style={{ color: '#636366' }}>Pending Settlement</p>
                  <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>₦{Number(restaurantEarnings.pendingEarnings || 0).toLocaleString()}</p>
                </div>
              </div>
              )}
              <p className="text-xs text-[#A0A0A0] mb-4">
                Net amounts are calculated per order after the platform commission is applied.
              </p>
              <div className="text-center py-4 text-[#636366]">
                <p>No commission history yet</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="p-5">
              <h3 className="font-bold mb-4">Profile Settings</h3>
              <div className="text-center py-12 text-[#636366]">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Profile settings are managed by support</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function RestaurantDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <RestaurantDashboardPageContent />
    </Suspense>
  );
}
