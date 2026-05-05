'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Package, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface Order {
  _id: string;
  user: { name: string; phone: string; address: string };
  restaurant: { name: string; address: string; phone: string };
  items: Array<{ name: string; quantity: number }>;
  totalAmount: number;
  deliveryAddress: string;
  otp: string;
  status: string;
}

export default function DeliveryDashboardPage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [earnings, setEarnings] = useState({ totalEarnings: 0, totalDeliveries: 0, rating: 5 });
  const [loading, setLoading] = useState(true);
  const [deliveredOtp, setDeliveredOtp] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('deliveryToken');
    if (!token) {
      router.push('/delivery/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orderData, ordersData, earningsData] = await Promise.all([
        api.delivery.getCurrentOrder(),
        api.delivery.getAvailableOrders(),
        api.delivery.getEarnings(),
      ]);
      
      setCurrentOrder(orderData.order);
      setAvailableOrders(ordersData);
      setEarnings(earningsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      await api.delivery.updateStatus(newStatus);
      setIsOnline(newStatus);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      await api.delivery.acceptOrder(orderId);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const completeDelivery = async () => {
    if (!currentOrder) return;
    
    try {
      await api.delivery.deliverOrder(currentOrder._id, deliveredOtp);
      setCurrentOrder(null);
      setDeliveredOtp('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('deliveryToken');
    router.push('/delivery/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleOnline}
              className={`px-4 py-2 rounded-lg font-medium ${
                isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isOnline ? '🟢 Online' : '⚪ Offline'}
            </button>
            <button onClick={logout} className="text-red-600 hover:text-red-700">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold">₹{earnings.totalEarnings}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Deliveries</p>
                <p className="text-2xl font-bold">{earnings.totalDeliveries}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-500">Rating</p>
                <p className="text-2xl font-bold">{earnings.rating.toFixed(1)} ⭐</p>
              </div>
            </div>
          </div>
        </div>

        {currentOrder ? (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Current Order</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium">{currentOrder._id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{currentOrder.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{currentOrder.user?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pickup:</span>
                <span className="font-medium">{currentOrder.restaurant?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Address:</span>
                <span className="font-medium">{currentOrder.deliveryAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">OTP:</span>
                <span className="font-bold text-orange-600">{currentOrder.otp}</span>
              </div>
              <div className="border-t pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Customer OTP to Complete Delivery
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deliveredOtp}
                    onChange={(e) => setDeliveredOtp(e.target.value)}
                    className="flex-1 border rounded-lg px-4 py-2"
                    placeholder="Enter OTP"
                    maxLength={4}
                  />
                  <button
                    onClick={completeDelivery}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">No Active Order</h2>
            <p className="text-gray-600">
              {isOnline ? 'Accept orders from the available orders list below' : 'Go online to receive delivery requests'}
            </p>
          </div>
        )}

        {isOnline && !currentOrder && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Available Orders</h2>
            {availableOrders.length === 0 ? (
              <p className="text-gray-500">No available orders at the moment</p>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order) => (
                  <div key={order._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{order.restaurant?.name}</p>
                        <p className="text-sm text-gray-600">{order.restaurant?.address}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          To: {order.deliveryAddress}
                        </p>
                        <p className="text-sm text-gray-500">
                          Items: {order.items?.map(i => i.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{order.totalAmount}</p>
                        <button
                          onClick={() => acceptOrder(order._id)}
                          className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}