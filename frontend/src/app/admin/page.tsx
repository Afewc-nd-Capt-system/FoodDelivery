'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Store, Package, TrendingUp, DollarSign, AlertTriangle,
  Settings, BarChart3, ShoppingCart, Bike, Utensils, ChefHat, Shield
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const [adminStats, setAdminStats] = useState({
    totalUsers: 15420,
    totalRestaurants: 342,
    totalVendors: 128,
    totalDeliveryCompanies: 45,
    totalOrders: 12580,
    totalRevenue: 45800000,
    activeUsers: 8920,
    pendingApprovals: 12,
  });

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, type: 'user', message: 'New user registered: Funmi Adeyemi', time: '2 min ago' },
    { id: 2, type: 'order', message: 'Order #DEL-4521 completed', time: '5 min ago' },
    { id: 3, type: 'restaurant', message: 'New restaurant application: Mama Cass Kitchen', time: '12 min ago' },
    { id: 4, type: 'vendor', message: 'New vendor application: Chef Nkechi', time: '18 min ago' },
    { id: 5, type: 'delivery', message: 'Delivery company registered: Lagos Express', time: '25 min ago' },
  ]);

  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'REST-001', type: 'restaurant', name: 'Mama Cass Kitchen', submittedAt: '2024-05-09' },
    { id: 'VEND-001', type: 'vendor', name: 'Chef Nkechi', submittedAt: '2024-05-09' },
    { id: 'DEL-001', type: 'delivery_company', name: 'Lagos Express Logistics', submittedAt: '2024-05-09' },
  ]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'restaurants', label: 'Restaurants', icon: Store },
    { id: 'vendors', label: 'Vendors', icon: ChefHat },
    { id: 'delivery', label: 'Delivery', icon: Bike },
    { id: 'approvals', label: 'Approvals', icon: Shield },
  ];

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">Admin Dashboard</h1>
              <p className="text-white/40 text-sm">Welcome back, Admin</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/users">
                <Button className="bg-white/10 text-white hover:bg-white/20">
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </Button>
              </Link>
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
              <Users className="w-5 h-5 text-[#E8621A]" />
              <Badge variant="outline" className="text-[#E8621A] border-[#E8621A]">
                +12%
              </Badge>
            </div>
            <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{adminStats.totalUsers.toLocaleString()}</h3>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Users</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <Store className="w-5 h-5 text-blue-600" />
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                +8%
              </Badge>
            </div>
            <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{adminStats.totalRestaurants}</h3>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Restaurants</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <ChefHat className="w-5 h-5 text-green-600" />
              <Badge variant="outline" className="text-green-600 border-green-600">
                +15%
              </Badge>
            </div>
            <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{adminStats.totalVendors}</h3>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Vendors</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <Bike className="w-5 h-5 text-purple-600" />
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                +5%
              </Badge>
            </div>
            <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{adminStats.totalDeliveryCompanies}</h3>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Delivery Companies</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-5 h-5 text-[#E8621A]" />
              <Badge variant="outline" className="text-[#E8621A] border-[#E8621A]">
                +18%
              </Badge>
            </div>
            <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{adminStats.totalOrders.toLocaleString()}</h3>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Orders</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <Badge variant="outline" className="text-green-600 border-green-600">
                +22%
              </Badge>
            </div>
            <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>₦{(adminStats.totalRevenue / 1000000).toFixed(1)}M</h3>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Revenue</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                Active
              </Badge>
            </div>
            <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{adminStats.activeUsers.toLocaleString()}</h3>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Active Users</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Pending
              </Badge>
            </div>
            <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{adminStats.pendingApprovals}</h3>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Pending Approvals</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pending Approvals */}
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                Pending Approvals
              </h2>
              <Link href="/admin/approvals" className="text-sm font-bold text-[#E8621A] hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {pendingApprovals.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#FFF1E8' }}
                    >
                      {item.type === 'restaurant' && <Store className="w-5 h-5 text-[#E8621A]" />}
                      {item.type === 'vendor' && <ChefHat className="w-5 h-5 text-green-600" />}
                      {item.type === 'delivery_company' && <Bike className="w-5 h-5 text-purple-600" />}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: '#1C1C1E' }}>{item.name}</p>
                      <p className="text-sm" style={{ color: '#636366' }}>
                        {item.type.replace('_', ' ')} • {item.submittedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
                      Approve
                    </Button>
                    <Button size="sm" variant="outline">
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                Recent Activity
              </h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: '#FFF1E8' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E8621A' }}>
                    {activity.type === 'user' && <Users className="w-4 h-4 text-white" />}
                    {activity.type === 'order' && <ShoppingCart className="w-4 h-4 text-white" />}
                    {activity.type === 'restaurant' && <Store className="w-4 h-4 text-white" />}
                    {activity.type === 'vendor' && <ChefHat className="w-4 h-4 text-white" />}
                    {activity.type === 'delivery' && <Bike className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: '#1C1C1E' }}>{activity.message}</p>
                    <p className="text-xs" style={{ color: '#A0A0A0' }}>{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFF1E8' }}>
                  <Users className="w-6 h-6 text-[#E8621A]" />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#1C1C1E' }}>Manage Users</h3>
                  <p className="text-sm" style={{ color: '#A0A0A0' }}>View all users</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/restaurants">
            <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                  <Store className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#1C1C1E' }}>Restaurants</h3>
                  <p className="text-sm" style={{ color: '#A0A0A0' }}>Manage restaurants</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/vendors">
            <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                  <ChefHat className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#1C1C1E' }}>Vendors</h3>
                  <p className="text-sm" style={{ color: '#A0A0A0' }}>Manage vendors</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/companies">
            <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3E8FF' }}>
                  <Bike className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#1C1C1E' }}>Delivery Companies</h3>
                  <p className="text-sm" style={{ color: '#A0A0A0' }}>Manage companies</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
          </>
        )}

        {activeTab === 'users' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Users Management</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Users management coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'restaurants' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Restaurants Management</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Store className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Restaurants management coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'vendors' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Vendors Management</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <ChefHat className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Vendors management coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'delivery' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Delivery Management</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Bike className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Delivery management coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'approvals' && (
          <Card className="p-6">
            <h3 className="font-bold mb-4">Pending Approvals</h3>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: '#E8E8E8' }} />
              <p>Approvals management coming soon</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
