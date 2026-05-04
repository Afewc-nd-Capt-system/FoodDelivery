'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock, Truck, UtensilsCrossed } from 'lucide-react';

interface Order {
  _id: string;
  user: { name: string; email: string };
  restaurant: { name: string };
  totalAmount: number;
  status: string;
  createdAt: string;
  items: Array<{ name: string; quantity: number }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  preparing: { label: 'Preparing', color: 'bg-purple-100 text-purple-800', icon: UtensilsCrossed },
  'out-for-delivery': { label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: Clock },
};

export default function AdminOrders() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchOrders();
  }, [user, filterStatus]);

  const fetchOrders = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const url = filterStatus
        ? `${API_URL}/admin/orders?status=${filterStatus}`
        : `${API_URL}/admin/orders`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Orders</h1>
            <p className="text-gray-500 mt-1">Track and update order status</p>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('')}
              className={`px-4 py-2 rounded-lg text-sm ${!filterStatus ? 'bg-primary-500 text-white' : 'bg-gray-100'}`}
            >
              All
            </button>
            {Object.entries(statusConfig).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-4 py-2 rounded-lg text-sm ${filterStatus === key ? 'bg-primary-500 text-white' : 'bg-gray-100'}`}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="card p-8 text-center">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">No orders found</div>
          ) : (
            orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              return (
                <div key={order._id} className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">Order #{order._id.slice(-6)}</h3>
                      <p className="text-sm text-gray-500">{order.restaurant?.name} • {order.user?.name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    {order.items.map((item, idx) => (
                      <span key={idx}>{item.name} x{item.quantity}{idx < order.items.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">₹{order.totalAmount}</span>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order._id, e.target.value)}
                      className="input-field w-auto"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="out-for-delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
