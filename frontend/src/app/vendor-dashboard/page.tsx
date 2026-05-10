'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package, TrendingUp, DollarSign, Star, Calendar,
  Clock, Utensils, Plus, Settings, AlertCircle
} from 'lucide-react';

export default function VendorDashboardPage() {
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

  const [recentOrders, setRecentOrders] = useState([
    { id: 'ORD-001', customer: 'Funmi Adeyemi', items: 3, total: 8500, status: 'pending', deliveryDate: 'Monday, May 12' },
    { id: 'ORD-002', customer: 'Tunde Bello', items: 2, total: 5200, status: 'confirmed', deliveryDate: 'Monday, May 12' },
    { id: 'ORD-003', customer: 'Chioma Nwosu', items: 4, total: 12000, status: 'pending', deliveryDate: 'Wednesday, May 14' },
  ]);

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>
    </div>
  );
}
