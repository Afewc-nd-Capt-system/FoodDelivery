'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock, MapPin, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Order {
  _id: string;
  restaurantName: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  totalAmount: number;
  deliveryAddress: string;
  status: string;
  createdAt: string;
}

export default function OrderSuccessPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const fetchOrder = async () => {
      try {
        const data = await api.orders.getById(id as string, token!);
        setOrder(data.order || data);
      } catch (err) {
        console.error('Failed to fetch order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [user, token, id, router]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading order details...</p>
      </div>
    );
  }

  const estimatedTime = new Date();
  estimatedTime.setMinutes(estimatedTime.getMinutes() + 30);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h1>
        <p className="text-xl text-gray-600">Your order has been confirmed and is being prepared.</p>
      </div>

      <div className="card p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="text-lg font-bold">#{order?._id?.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Estimated Delivery</p>
            <p className="text-lg font-bold flex items-center gap-2 justify-end">
              <Clock className="w-5 h-5 text-primary-500" />
              {estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-bold text-lg mb-4">Order Details</h3>
          {order && (
            <>
              <p className="text-gray-600 mb-4">{order.restaurantName}</p>
              <div className="space-y-3 mb-6">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t pt-6 mt-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="font-medium">Delivery Address</p>
              <p className="text-gray-600">{order?.deliveryAddress}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={`/orders/${id}`} className="btn-primary text-center py-3 px-8">
          Track Order
        </Link>
        <Link href="/" className="btn-secondary text-center py-3 px-8">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
