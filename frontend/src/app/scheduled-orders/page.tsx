'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, X } from 'lucide-react';

export default function ScheduledOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      const result = await api.scheduledOrders.getAll();
      setOrders(result.data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this scheduled order?')) return;
    try {
      await api.scheduledOrders.cancel(id);
      loadOrders();
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Scheduled Orders</h1>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">No scheduled orders</div>
          ) : (
            orders.map(order => (
              <div key={order._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{order.restaurantName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(order.scheduledTime).toLocaleDateString()}
                      <Clock className="w-4 h-4 ml-2" />
                      {new Date(order.scheduledTime).toLocaleTimeString()}
                    </div>
                    <p className="text-sm mt-2">{order.items.length} items - ₦{order.totalAmount}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${order.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                    {order.status}
                  </span>
                </div>
                {order.status === 'scheduled' && (
                  <button onClick={() => handleCancel(order._id)} className="mt-3 text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}