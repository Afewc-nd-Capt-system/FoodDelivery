'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Users, ShoppingBag, Store, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalRestaurants: number;
  totalRevenue: number;
}

interface Order {
  _id: string;
  user: { name: string; email: string };
  restaurant: { name: string };
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setOrdersByStatus(data.ordersByStatus);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-purple-100 text-purple-800',
    'out-for-delivery': 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Monitor your food delivery business</p>
          </div>
          <Link href="/" className="btn-secondary">View Site</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalUsers || 0}</p>
              </div>
              <Users className="w-10 h-10 text-primary-500" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalOrders || 0}</p>
              </div>
              <ShoppingBag className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Restaurants</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalRestaurants || 0}</p>
              </div>
              <Store className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">₹{stats?.totalRevenue?.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Orders by Status</h2>
            <div className="space-y-3">
              {Object.entries(ordersByStatus || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="capitalize text-sm text-gray-600">{status.replace(/-/g, ' ')}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100'}`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Order ID</th>
                    <th className="text-left py-2">Customer</th>
                    <th className="text-left py-2">Restaurant</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 text-xs text-gray-500">#{order._id.slice(-6)}</td>
                      <td className="py-3">{order.user?.name || 'N/A'}</td>
                      <td className="py-3">{order.restaurant?.name || 'N/A'}</td>
                      <td className="py-3">₹{order.totalAmount}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusColors[order.status] || 'bg-gray-100'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/admin/orders" className="inline-block mt-4 text-primary-500 hover:text-primary-600 text-sm font-medium">
              View All Orders →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/users" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <Users className="w-8 h-8 text-primary-500 mb-3" />
            <h3 className="font-semibold">Manage Users</h3>
            <p className="text-sm text-gray-500 mt-1">View and manage registered users</p>
          </Link>
          <Link href="/admin/orders" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <ShoppingBag className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-semibold">Manage Orders</h3>
            <p className="text-sm text-gray-500 mt-1">Track and update order status</p>
          </Link>
          <Link href="/admin/restaurants" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <Store className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-semibold">Manage Restaurants</h3>
            <p className="text-sm text-gray-500 mt-1">Add or update restaurant listings</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
