'use client';

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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, Users, Star, Clock, Plus, Edit, Trash2, Calendar, Percent } from 'lucide-react';

const chartData = [
  { date: 'Mon', revenue: 45000, orders: 45 },
  { date: 'Tue', revenue: 52000, orders: 52 },
  { date: 'Wed', revenue: 48000, orders: 48 },
  { date: 'Thu', revenue: 61000, orders: 61 },
  { date: 'Fri', revenue: 73000, orders: 73 },
  { date: 'Sat', revenue: 85000, orders: 85 },
  { date: 'Sun', revenue: 60000, orders: 60 },
];

const topItems = [
  { name: 'Butter Chicken', orders: 234, revenue: 840000, rating: 4.8 },
  { name: 'Paneer Tikka', orders: 198, revenue: 720000, rating: 4.6 },
  { name: 'Garlic Naan', orders: 167, revenue: 400000, rating: 4.5 },
];

const peakHours = [
  { hour: 12, orders: 45 },
  { hour: 13, orders: 52 },
  { hour: 18, orders: 85 },
  { hour: 19, orders: 73 },
  { hour: 20, orders: 61 },
];

function RestaurantDashboardPageContent() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurantId');
  const [period, setPeriod] = useState('week');
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (restaurantId) {
      fetchPromotions();
      fetchAnalytics();
    }
  }, [restaurantId]);

  const fetchPromotions = async () => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/v2/restaurant-promotions?restaurantId=${restaurantId}`, {
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
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/v2/analytics/dashboard?restaurantId=${restaurantId}&period=${period}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#F0EAE0] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-[#1C1C1E]">Restaurant Dashboard</h1>
          <Link href="/admin">
            <Button className="bg-[#FFF1E8] text-[#E8621A] hover:bg-[#FFF1E8]/80">
              Back to Admin
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="promotions">Promotions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Today Revenue', value: '₦52,000', icon: DollarSign, color: '#16A34A' },
                { label: 'Orders', value: '52', icon: ShoppingCart, color: '#E8621A' },
                { label: 'Avg Rating', value: '4.6', icon: Star, color: '#FF8C42' },
                { label: 'Return Rate', value: '68%', icon: TrendingUp, color: '#2563EB' },
                { label: 'Peak Hour', value: '6PM', icon: Clock, color: '#BE3A2A' },
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
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#E8621A" strokeWidth={3} dot={{ r: 5, fill: '#E8621A' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-5">
                <h3 className="font-bold mb-4">Orders</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#E8621A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Top Items */}
            <Card className="p-5 mb-8">
              <h3 className="font-bold mb-4">Top Items</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F0EAE0]">
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Item</th>
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Orders</th>
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Revenue</th>
                    <th className="text-left text-xs text-[#A0A0A0] pb-2">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item) => (
                    <tr key={item.name} className="border-b border-[#F0EAE0]">
                      <td className="py-3 text-sm font-medium">{item.name}</td>
                      <td className="py-3 text-sm">{item.orders}</td>
                      <td className="py-3 text-sm font-semibold">₦{item.revenue.toLocaleString()}</td>
                      <td className="py-3 text-sm">★ {item.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Peak Hours */}
            <Card className="p-5">
              <h3 className="font-bold mb-4">Peak Hours</h3>
              <div className="space-y-2">
                {peakHours.map((hour) => (
                  <div key={hour.hour} className="flex items-center gap-2">
                    <span className="text-xs w-8">{hour.hour}:00</span>
                    <div className="flex-1 h-4 bg-[#F0EAE0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#E8621A]" style={{ width: `${(hour.orders / 85) * 100}%` }} />
                    </div>
                    <span className="text-xs text-[#636366] w-12 text-right">{hour.orders}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="p-5">
              <h3 className="font-bold mb-4">Recent Orders</h3>
              <p className="text-[#636366]">Orders management coming soon...</p>
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
              <p className="text-[#636366]">Menu management coming soon...</p>
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
                <h3 className="font-bold mb-4">Revenue by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Main Course', value: 400 },
                        { name: 'Appetizers', value: 300 },
                        { name: 'Desserts', value: 200 },
                        { name: 'Beverages', value: 100 },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#E8621A" />
                      <Cell fill="#C4501A" />
                      <Cell fill="#BE3A2A" />
                      <Cell fill="#FF8C42" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-5">
                <h3 className="font-bold mb-4">Customer Satisfaction</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Food Quality</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#F0EAE0] rounded-full">
                        <div className="h-full bg-[#16A34A]" style={{ width: '92%' }} />
                      </div>
                      <span className="text-sm font-bold">4.6</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Delivery Speed</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#F0EAE0] rounded-full">
                        <div className="h-full bg-[#E8621A]" style={{ width: '88%' }} />
                      </div>
                      <span className="text-sm font-bold">4.4</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Order Accuracy</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-[#F0EAE0] rounded-full">
                        <div className="h-full bg-[#2563EB]" style={{ width: '95%' }} />
                      </div>
                      <span className="text-sm font-bold">4.8</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
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
