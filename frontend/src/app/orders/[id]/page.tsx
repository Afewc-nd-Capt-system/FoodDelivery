'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrderSocket, useSocket } from '@/context/SocketContext';
import { CheckCircle, Clock, Truck, UtensilsCrossed, Home, X } from 'lucide-react';

interface Order {
  _id: string;
  restaurantName: string;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: string;
  createdAt: string;
  deliveryAddress: string;
  paymentMethod: string;
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: UtensilsCrossed },
  { key: 'out-for-delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

export default function OrderDetail() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { orderUpdates } = useSocket();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useOrderSocket(params.id as string);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (params.id) {
      fetchOrder();
    }
  }, [user, params.id]);

  useEffect(() => {
    if (orderUpdates.length > 0) {
      const latestUpdate = orderUpdates[orderUpdates.length - 1];
      if (latestUpdate.orderId === params.id) {
        setOrder(latestUpdate.order);
      }
    }
  }, [orderUpdates, params.id]);

  const fetchOrder = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/orders/${params.id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Failed to fetch order', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/orders/${params.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        fetchOrder();
      }
    } catch (error) {
      console.error('Failed to cancel order', error);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusStep = (status: string) => {
    return statusSteps.findIndex(s => s.key === status);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Order not found</p>
        <Link href="/orders" className="btn-primary mt-4 inline-block">
          Back to Orders
        </Link>
      </div>
    );
  }

  const currentStep = getStatusStep(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/orders" className="text-gray-600 hover:text-gray-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Order #{order._id.slice(-6)}</h1>
          <p className="text-gray-500">
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          {order.status !== 'cancelled' && (
            <div className="card p-6">
              <h2 className="font-bold text-lg mb-6">Order Status</h2>
              <div className="flex items-center justify-between">
                {statusSteps.map((step, idx) => {
                  const StepIcon = step.icon;
                  const isActive = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={step.key} className={`flex flex-col items-center ${idx < statusSteps.length - 1 ? 'flex-1' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'} ${isCurrent ? 'ring-4 ring-primary-200' : ''}`}>
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs mt-1 ${isActive ? 'text-primary-500 font-medium' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="card p-6 bg-red-50">
              <div className="flex items-center gap-3">
                <X className="w-8 h-8 text-red-500" />
                <div>
                  <h2 className="font-bold text-lg text-red-700">Order Cancelled</h2>
                  <p className="text-red-600">This order has been cancelled.</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-20">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Restaurant</span>
                <span className="font-medium">{order.restaurantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Address</span>
                <span className="text-right text-sm">{order.deliveryAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="capitalize">{order.paymentMethod}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${order.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {order.status === 'pending' && (
              <button
                onClick={cancelOrder}
                disabled={cancelling}
                className="w-full btn-secondary text-red-600 border-red-200 hover:bg-red-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}

            <Link href="/orders" className="block text-center text-primary-500 hover:text-primary-600 mt-4 text-sm">
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
