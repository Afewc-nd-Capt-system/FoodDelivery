'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';

export default function DeliveryEarningsPage() {
  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(true);

  const mockEarnings = {
    totalEarnings: 15400,
    basePay: 12000,
    tips: 3400,
    completedOrders: 12,
    averagePerOrder: 1283,
    bonus: 0,
  };

  const transactions = [
    { id: 'TXN-001', date: 'May 7, 2026', order: 'DEL-4521', amount: 1200, type: 'base' },
    { id: 'TXN-002', date: 'May 7, 2026', order: 'DEL-4522', amount: 1500, type: 'base' },
    { id: 'TXN-003', date: 'May 7, 2026', order: 'DEL-4523', amount: 300, type: 'tip' },
    { id: 'TXN-004', date: 'May 7, 2026', order: 'DEL-4524', amount: 1400, type: 'base' },
    { id: 'TXN-005', date: 'May 7, 2026', order: 'DEL-4525', amount: 200, type: 'tip' },
  ];

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
            <h1 className="text-2xl font-black text-white">Earnings</h1>
          </div>
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 bg-white/10 text-white border-white/20">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-white/10 text-white hover:bg-white/20">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gradient-to-br from-[#E8621A] to-[#C4501A] text-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5" />
              <TrendingUp className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-3xl font-black">₦{mockEarnings.totalEarnings.toLocaleString()}</p>
            <p className="text-sm opacity-80">Total Earnings</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-[#A0A0A0] mb-1">Base Pay</p>
            <p className="text-2xl font-black text-[#1C1C1E]">₦{mockEarnings.basePay.toLocaleString()}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-[#A0A0A0] mb-1">Tips</p>
            <p className="text-2xl font-black text-[#16A34A]">₦{mockEarnings.tips.toLocaleString()}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-[#A0A0A0] mb-1">Completed Orders</p>
            <p className="text-2xl font-black text-[#1C1C1E]">{mockEarnings.completedOrders}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-black text-[#1C1C1E] mb-6">Transaction History</h2>
          <div className="space-y-4">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-4 bg-[#F5F5F5] rounded-xl">
                <div>
                  <p className="font-bold text-[#1C1C1E]">{txn.order}</p>
                  <p className="text-sm text-[#636366]">{txn.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1C1C1E]">₦{txn.amount.toLocaleString()}</p>
                  <p className="text-xs text-[#A0A0A0] capitalize">{txn.type}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
