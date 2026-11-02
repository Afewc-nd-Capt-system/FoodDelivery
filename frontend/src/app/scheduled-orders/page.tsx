'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, Loader2 } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

interface ScheduledOrder {
  _id: string;
  restaurant?: { name?: string } | string;
  restaurantName?: string;
  scheduledTime: string;
  status: string;
  items?: { name: string; quantity: number }[];
  totalAmount?: number;
}

export default function ScheduledOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [orders, setOrders] = useState<ScheduledOrder[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    fetch(`${API_V2}/scheduled-orders?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((body) => setOrders(Array.isArray(body?.data) ? body.data : []))
      .catch((error) => console.error('Failed to load scheduled orders:', error))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = (orders || []).filter((o) => !['cancelled', 'completed'].includes(o.status));
  const past = (orders || []).filter((o) => ['cancelled', 'completed'].includes(o.status));

  const restaurantLabel = (order: ScheduledOrder) =>
    typeof order.restaurant === 'object' ? order.restaurant?.name || order.restaurantName || 'Restaurant' : order.restaurantName || 'Restaurant';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-[#1C1C1E]">Scheduled Orders</h1>
        <Link href="/restaurants">
          <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
            <Plus className="w-4 h-4 mr-2" /> Schedule New Order
          </Button>
        </Link>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#E8621A]" /></div>}

      {authRequired && (
        <Card className="p-8 text-center mb-8">
          <h3 className="font-black text-lg mb-2 text-[#1C1C1E]">Sign in to see your scheduled orders</h3>
          <Link href="/login"><Button className="bg-[#E8621A] text-white">Log in</Button></Link>
        </Card>
      )}

      {!loading && !authRequired && (
        <>
          <h2 className="font-bold text-lg mb-4">Upcoming Orders</h2>
          <div className="space-y-4 mb-8">
            {upcoming.map((order) => (
              <Card key={order._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF1E8] flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-[#E8621A]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1C1C1E]">{restaurantLabel(order)}</h3>
                      <p className="text-sm text-[#636366] flex items-center gap-1">
                        <Clock size={13} /> {new Date(order.scheduledTime).toLocaleString()}
                      </p>
                      {order.items && order.items.length > 0 && (
                        <p className="text-xs text-[#A0A0A0]">
                          {order.items.slice(0, 3).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-[#F0FDF4] text-[#16A34A]">{order.status}</Badge>
                </div>
              </Card>
            ))}
            {upcoming.length === 0 && (
              <p className="text-sm text-[#A0A0A0]">No upcoming scheduled orders.</p>
            )}
          </div>

          {past.length > 0 && (
            <>
              <h2 className="font-bold text-lg mb-4">Past Orders</h2>
              <div className="space-y-4">
                {past.map((order) => (
                  <Card key={order._id} className="p-6 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-[#A0A0A0]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#1C1C1E]">{restaurantLabel(order)}</h3>
                          <p className="text-sm text-[#636366]">{new Date(order.scheduledTime).toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge className="bg-[#F5F5F5] text-[#636366]">{order.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {orders.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="font-black text-xl mb-2">No scheduled orders</h3>
              <p className="text-[#636366] mb-6">Schedule your next meal in advance</p>
              <Link href="/restaurants">
                <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                  Browse Restaurants
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
