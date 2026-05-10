'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter, Calendar, MapPin, Clock, DollarSign, CheckCircle } from 'lucide-react';

export default function DeliveryHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const orders = [
    { id: 'DEL-4520', customer: 'Funmi Adeyemi', address: '12 Glover Road, Ikoyi', restaurant: 'Mama Cass', amount: 8500, status: 'delivered', date: 'May 7, 2026', time: '2:30 PM' },
    { id: 'DEL-4519', customer: 'Tunde Bello', address: '5B Victoria Island', restaurant: 'Chop Chop', amount: 5200, status: 'delivered', date: 'May 7, 2026', time: '1:15 PM' },
    { id: 'DEL-4518', customer: 'Chioma Okafor', address: '23 Adetokunbo Ademola', restaurant: 'Spice Garden', amount: 12400, status: 'delivered', date: 'May 6, 2026', time: '8:45 PM' },
    { id: 'DEL-4517', customer: 'Emeka Nwosu', address: '45 Awolowo Road', restaurant: 'Bella Italia', amount: 9800, status: 'delivered', date: 'May 6, 2026', time: '6:20 PM' },
    { id: 'DEL-4516', customer: 'Aisha Mohammed', address: '8 Lekki Expressway', restaurant: 'Dragon Palace', amount: 15600, status: 'delivered', date: 'May 5, 2026', time: '3:10 PM' },
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          {filteredOrders.map((order) => (
            <Card key={order.id} className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-[#16A34A]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1C1C1E]">{order.id}</h3>
                    <p className="text-sm text-[#636366]">{order.restaurant}</p>
                  </div>
                </div>
                <Badge className="bg-[#F0FDF4] text-[#16A34A]">{order.status}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-[#636366]">
                  <Calendar size={14} />
                  <span>{order.date} at {order.time}</span>
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
