'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { API_V2 } from '@/lib/apiBase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Package, Truck, Home, UtensilsCrossed } from 'lucide-react';

interface Order {
  _id: string;
  restaurantName?: string;
  restaurant?: { name?: string } | string;
  items: {
    name: string;
    quantity: number;
    customizations?: { name?: string; option: string; price?: number }[];
  }[];
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${API_V2}/orders?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || `status ${response.status}`);
        if (!cancelled) setOrders(body.orders || []);
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  const getStatusStep = (status: string) => {
    const normalizedStatus = (status || 'pending').replace(/_/g, '-');
    const stepIndex = statusSteps.findIndex((step) => {
      if (step.key === 'pending') return ['pending', 'confirmed'].includes(normalizedStatus);
      if (step.key === 'preparing') return ['accepted', 'preparing', 'ready', 'awaiting-pickup', 'assigned'].includes(normalizedStatus);
      if (step.key === 'out-for-delivery') return ['picked-up', 'out-for-delivery'].includes(normalizedStatus);
      return ['completed', 'delivered'].includes(normalizedStatus);
    });
    return stepIndex;
  };

  const getStatusColor = (status: string) => {
    const normalized = (status || '').replace(/_/g, '-');
    switch (normalized) {
      case 'delivered': return 'bg-[#F0FDF4] text-[#16A34A]';
      case 'preparing': return 'bg-[#FFF1E8] text-[#E8621A]';
      case 'out-for-delivery': return 'bg-[#EFF6FF] text-[#2563EB]';
      default: return 'bg-[#F5F5F5] text-[#636366]';
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8621A]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-black text-[#1C1C1E] mb-8">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => {
          const stepIndex = getStatusStep(order.status);
          return (
            <Card key={order._id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-[#1C1C1E]">
                    {typeof order.restaurant === 'object' && order.restaurant?.name
                      ? order.restaurant.name
                      : order.restaurantName || 'Order'}
                  </h3>
                  <p className="text-xs text-[#A0A0A0]">
                    {order.items.map(i => {
                      const options = (i.customizations || [])
                        .map(c => [c?.name, c?.option].filter(Boolean).join(': ') || c?.option)
                        .filter(Boolean)
                        .join(', ');
                      return `${i.quantity}x ${i.name}${options ? ` (${options})` : ''}`;
                    }).join(', ')}
                  </p>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {order.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Badge>
              </div>

              {/* Status Timeline */}
              <div className="flex items-center gap-2 mb-4">
                {statusSteps.map((step, i) => (
                  <div key={step.key} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      i <= stepIndex ? 'bg-[#E8621A] text-white' : 'bg-[#F0EAE0] text-[#A0A0A0]'
                    }`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`h-0.5 flex-1 ${i < stepIndex ? 'bg-[#E8621A]' : 'bg-[#F0EAE0]'}`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-xs text-[#A0A0A0]">
                  <span className="font-mono text-[#E8621A]">{order._id}</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="font-bold text-[#E8621A]">₦{order.totalAmount.toLocaleString()}</span>
              </div>

              <div className="flex gap-2 mt-4">
                <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white text-xs px-4 py-2">
                  Reorder
                </Button>
                <Button className="bg-[#F5F5F5] text-[#636366] hover:bg-[#E8E8E8] text-xs px-4 py-2">
                  Receipt
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#636366]">No orders yet</p>
        </div>
      )}
    </div>
  );
}
