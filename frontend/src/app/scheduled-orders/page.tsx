'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, X, Edit } from 'lucide-react';

export default function ScheduledOrdersPage() {
  const [showPast, setShowPast] = useState(false);

  const upcomingOrders = [
    { id: 'SO-001', restaurant: 'Spice Garden', date: 'May 10, 2026', time: '7:00 PM', party: 4, status: 'confirmed' },
    { id: 'SO-002', restaurant: 'Bella Italia', date: 'May 12, 2026', time: '1:00 PM', party: 2, status: 'confirmed' },
  ];

  const pastOrders = [
    { id: 'SO-003', restaurant: 'Burger Barn', date: 'May 5, 2026', time: '8:00 PM', party: 3, status: 'completed' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-[#1C1C1E]">Scheduled Orders 📅</h1>
        <Link href="/restaurants">
          <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
            <Plus className="w-4 h-4 mr-2" /> Schedule New Order
          </Button>
        </Link>
      </div>

      {/* Upcoming Orders */}
      <h2 className="font-bold text-lg mb-4">Upcoming Orders</h2>
      <div className="space-y-4 mb-8">
        {upcomingOrders.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF1E8] flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#E8621A]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1C1E]">{order.restaurant}</h3>
                  <p className="text-sm text-[#636366]">{order.date} at {order.time}</p>
                  <p className="text-xs text-[#A0A0A0]">Party of {order.party}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#F0FDF4] text-[#16A34A]">{order.status}</Badge>
                <Button className="bg-[#FFF1E8] text-[#E8621A] px-3 py-1.5 text-xs">
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button className="border border-[#D32F2F] text-[#D32F2F] px-3 py-1.5 text-xs hover:bg-red-50">
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Past Orders Accordion */}
      <button
        onClick={() => setShowPast(!showPast)}
        className="flex items-center gap-2 font-bold text-lg mb-4 hover:text-[#E8621A]"
      >
        Past Orders
        <span className="text-sm">{showPast ? '↑' : '↓'}</span>
      </button>

      {showPast && (
        <div className="space-y-4">
          {pastOrders.map((order) => (
            <Card key={order.id} className="p-6 opacity-75">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#A0A0A0]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1C1C1E]">{order.restaurant}</h3>
                    <p className="text-sm text-[#636366]">{order.date} at {order.time}</p>
                  </div>
                </div>
                <Badge className="bg-[#F5F5F5] text-[#636366]">{order.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {upcomingOrders.length === 0 && (
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
    </div>
  );
}
