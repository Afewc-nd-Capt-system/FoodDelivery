'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package, TrendingUp, DollarSign, Star, Calendar,
  Clock, Utensils, Plus, Settings, AlertCircle, User, X
} from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function VendorDashboardPage() {
  const { user, loading } = useAuthGuard('vendor')
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8F0' }}><div style={{ color: '#E8621A' }}>Loading...</div></div>

  const [vendorStats, setVendorStats] = useState({
    totalOrders: 45,
    totalRevenue: 125000,
    totalDeliveries: 42,
    rating: 4.8,
    activeMenuItems: 12,
    pendingOrders: 3,
  });

  const [upcomingCookingDays, setUpcomingCookingDays] = useState([
    { date: 'Monday, May 12', orders: 8, status: 'upcoming' },
    { date: 'Wednesday, May 14', orders: 12, status: 'upcoming' },
    { date: 'Friday, May 16', orders: 15, status: 'upcoming' },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price: '', category: '', image: '',
    availableDate: '', availableFrom: '08:00', availableTo: '18:00',
    cutoffHours: 12, maxPreOrders: 20, cookingDay: '',
  });

  const [recentOrders, setRecentOrders] = useState([
    { id: 'ORD-001', customer: 'Funmi Adeyemi', items: 3, total: 8500, status: 'pending', deliveryDate: 'Monday, May 12' },
    { id: 'ORD-002', customer: 'Tunde Bello', items: 2, total: 5200, status: 'confirmed', deliveryDate: 'Monday, May 12' },
    { id: 'ORD-003', customer: 'Chioma Nwosu', items: 4, total: 12000, status: 'pending', deliveryDate: 'Wednesday, May 14' },
  ]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'preorders', label: 'Pre-orders', icon: Clock },
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'schedule', label: 'Cooking Schedule', icon: Calendar },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">Vendor Dashboard</h1>
              <p className="text-white/40 text-sm">Welcome back, Mama Nkechi's Kitchen</p>
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-[#E8621A] text-white hover:bg-[#C4501A]">
                <Plus className="w-4 h-4 mr-2" />
                Add Menu Item
              </Button>
              <Button className="bg-white/10 text-white hover:bg-white/20">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
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
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-[#E8621A]" />
                  <Badge variant="outline" className="text-[#E8621A] border-[#E8621A]">
                    +12%
                  </Badge>
                </div>
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats.totalOrders}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Orders</p>
              </Card>

              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    +8%
                  </Badge>
                </div>
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>₦{vendorStats.totalRevenue.toLocaleString()}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Revenue</p>
              </Card>

              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    4.8★
                  </Badge>
                </div>
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats.rating}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Customer Rating</p>
              </Card>

              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <Utensils className="w-5 h-5 text-blue-600" />
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    Active
                  </Badge>
                </div>
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats.activeMenuItems}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Menu Items</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Upcoming Cooking Days */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                    Upcoming Cooking Days
                  </h2>
                  <Link href="/vendor/forecast" className="text-sm font-bold text-[#E8621A] hover:underline">
                    View Forecast
                  </Link>
                </div>
                <div className="space-y-4">
                  {upcomingCookingDays.map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ backgroundColor: '#FFF1E8' }}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[#E8621A]" />
                        <div>
                          <p className="font-bold" style={{ color: '#1C1C1E' }}>{day.date}</p>
                          <p className="text-sm" style={{ color: '#636366' }}>{day.orders} orders scheduled</p>
                        </div>
                      </div>
                      <Badge className="bg-[#E8621A] text-white">Upcoming</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent Orders */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                    Recent Orders
                  </h2>
                  <Link href="/vendor/orders" className="text-sm font-bold text-[#E8621A] hover:underline">
                    View All
                  </Link>
                </div>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: '#FFF1E8' }}
                        >
                          <Package className="w-5 h-5 text-[#E8621A]" />
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: '#1C1C1E' }}>{order.customer}</p>
                          <p className="text-sm" style={{ color: '#636366' }}>
                            {order.items} items • ₦{order.total.toLocaleString()}
                          </p>
                          <p className="text-xs" style={{ color: '#A0A0A0' }}>
                            Delivery: {order.deliveryDate}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          order.status === 'confirmed'
                            ? 'bg-green-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Pending Orders Alert */}
            {vendorStats.pendingOrders > 0 && (
              <Card className="p-6 bg-white border-l-4 border-[#E8621A]">
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-6 h-6 text-[#E8621A]" />
                  <div className="flex-1">
                    <h3 className="font-bold" style={{ color: '#1C1C1E' }}>
                      {vendorStats.pendingOrders} Pending Orders
                    </h3>
                    <p className="text-sm" style={{ color: '#636366' }}>
                      You have orders awaiting confirmation. Review them now to avoid delays.
                    </p>
                  </div>
                  <Button className="bg-[#E8621A] text-white hover:bg-[#C4501A]">
                    Review Orders
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === 'preorders' && (
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                Pre-orders
              </h2>
            </div>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Clock className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Pre-orders management coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'menu' && (
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                Menu Management
              </h2>
              <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-[#E8621A] text-white hover:bg-[#C4501A]">
                {showAddForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {showAddForm ? 'Cancel' : 'Add Menu Item'}
              </Button>
            </div>

            {showAddForm && (
              <div className="mb-8 p-6 rounded-2xl" style={{ backgroundColor: '#FAFAFA', border: '1px solid #E8E8E8' }}>
                <h3 className="font-bold text-lg mb-5" style={{ color: '#1C1C1E' }}>New Menu Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Item Name</label>
                    <input type="text" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Category</label>
                    <input type="text" value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Price (₦)</label>
                    <input type="number" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Image URL</label>
                    <input type="text" value={menuForm.image} onChange={e => setMenuForm({...menuForm, image: e.target.value})}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Description</label>
                    <textarea value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})}
                      rows={2}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                    />
                  </div>
                </div>

                {/* Availability Settings */}
                <div className="mt-6 pt-6 border-t" style={{ borderColor: '#E8E8E8' }}>
                  <h4 className="font-bold mb-4" style={{ color: '#1C1C1E' }}>Pre-order Availability</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold" style={{ color: '#636366' }}>Next Available Date</label>
                      <input type="date" value={menuForm.availableDate}
                        onChange={e => setMenuForm({...menuForm, availableDate: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold" style={{ color: '#636366' }}>Available From</label>
                      <input type="time" value={menuForm.availableFrom || '08:00'}
                        onChange={e => setMenuForm({...menuForm, availableFrom: e.target.value})}
                        className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold" style={{ color: '#636366' }}>Available Until</label>
                      <input type="time" value={menuForm.availableTo || '18:00'}
                        onChange={e => setMenuForm({...menuForm, availableTo: e.target.value})}
                        className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold" style={{ color: '#636366' }}>Pre-order Cutoff (hours before)</label>
                      <input type="number" value={menuForm.cutoffHours || 12}
                        onChange={e => setMenuForm({...menuForm, cutoffHours: Number(e.target.value)})}
                        min={1} max={72}
                        className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold" style={{ color: '#636366' }}>Max Pre-orders for this Date</label>
                      <input type="number" value={menuForm.maxPreOrders || 20}
                        onChange={e => setMenuForm({...menuForm, maxPreOrders: Number(e.target.value)})}
                        min={1}
                        className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button onClick={() => setShowAddForm(false)} variant="outline">Cancel</Button>
                  <Button className="bg-[#E8621A] text-white hover:bg-[#C4501A]">Save Menu Item</Button>
                </div>
              </div>
            )}

            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Utensils className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Menu management coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'schedule' && (
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                Cooking Schedule
              </h2>
            </div>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Cooking schedule management coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'earnings' && (
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                Earnings
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF1E8' }}>
                <p className="text-sm" style={{ color: '#636366' }}>Total Revenue</p>
                <p className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>₦{vendorStats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                <p className="text-sm" style={{ color: '#636366' }}>Commission (15%)</p>
                <p className="text-2xl font-bold" style={{ color: '#16A34A' }}>₦{(vendorStats.totalRevenue * 0.15).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                <p className="text-sm" style={{ color: '#636366' }}>Net Earnings</p>
                <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>₦{(vendorStats.totalRevenue * 0.85).toLocaleString()}</p>
              </div>
            </div>

            <div className="text-center py-8" style={{ color: '#636366' }}>
              <p>Detailed earnings report coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'profile' && (
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                Profile Settings
              </h2>
            </div>
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
