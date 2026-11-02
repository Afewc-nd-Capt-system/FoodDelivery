'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter, Calendar, MapPin, Clock, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

export default function DeliveryHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  // Completed deliveries for the signed-in rider (GET /v2/riders/deliveries/completed)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_V2}/riders/deliveries/completed`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`status ${res.status}`);
        setOrders(Array.isArray(body?.deliveries) ? body.deliveries : []);
      })
      .catch((error) => console.error('Failed to load delivery history:', error))
      .finally(() => setLoading(false));
  }, []);

  const customerName = (order: any) => {
    const u = order?.user;
    return typeof u === 'object' && u?.name ? u.name : order?.deliveryAddress?.customerName || 'Customer';
  };

  const filteredOrders = orders.map((order, index) => ({
    ...order,
    id: order._id,
    label: `DEL-${String(orders.length - index).padStart(4, '0')}`,
    restaurant: order.restaurantName || order.restaurant?.name || 'Restaurant',
    customer: customerName(order),
    address: typeof order.deliveryAddress === 'object'
      ? `${order.deliveryAddress?.street || ''} ${order.deliveryAddress?.city || ''}`.trim() || 'Address'
      : order.deliveryAddress || 'Address',
    amount: order.totalAmount || 0,
    date: order.updatedAt || order.createdAt,
  })).filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.restaurant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/delivery/dashboard">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-black text-white">Order History</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
            <Input
              placeholder="Search orders, customers, restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#E8E8E8] rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 border-[#E8E8E8] rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#E8621A]" /></div>}
        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <p className="font-bold text-lg mb-1">No delivery history yet</p>
            <p className="text-sm text-[#A0A0A0]">Deliveries you complete will appear here.</p>
          </div>
        )}
        {filteredOrders.map((order) => (
            <Card key={order.id} className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-[#16A34A]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1C1C1E]">{order.label}</h3>
                    <p className="text-sm text-[#636366]">{order.restaurant}</p>
                  </div>
                </div>
                <Badge className={order.status === 'cancelled' ? 'bg-[#F5F5F5] text-[#636366]' : 'bg-[#F0FDF4] text-[#16A34A]'}>{order.status}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-[#636366]">
                  <Calendar size={14} />
                  <span>{new Date(order.date).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-[#636366]">
                  <MapPin size={14} />
                  <span className="truncate">{order.address}</span>
                </div>
                <div className="flex items-center gap-2 text-[#636366]">
                  <Clock size={14} />
                  <span>{order.customer}</span>
                </div>
                <div className="flex items-center gap-2 text-[#E8621A] font-bold">
                  <DollarSign size={14} />
                  <span>₦{order.amount.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
