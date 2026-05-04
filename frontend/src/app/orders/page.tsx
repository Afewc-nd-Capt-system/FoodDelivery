'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, Truck, Home, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Order {
  _id: string;
  restaurantName: string;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: string;
  createdAt: string;
  deliveryAddress: string;
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: UtensilsCrossed },
  { key: 'out-for-delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

export default function OrdersPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadOrders();
  }, [user, token]);

  const loadOrders = async () => {
    try {
      const data = await api.orders.getAll(token!);
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    return statusSteps.findIndex(s => s.key === status);
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">No orders yet</p>
          <Link href="/restaurants" className="btn-primary">
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => {
            const currentStep = getStatusStep(order.status);
            return (
                  <div key={order._id} className="card p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/orders/${order._id}`)}>
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{order.restaurantName}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div className="mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-bold text-lg mb-6">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>

                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      {statusSteps.map((step, idx) => {
                        const StepIcon = step.icon;
                        const isActive = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                          <div key={step.key} className={`flex flex-col items-center ${
                            idx < statusSteps.length - 1 ? 'flex-1' : ''
                          }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'
                            } ${isCurrent ? 'ring-4 ring-primary-200' : ''}`}>
                              <StepIcon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs mt-1 ${
                              isActive ? 'text-primary-500 font-medium' : 'text-gray-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
