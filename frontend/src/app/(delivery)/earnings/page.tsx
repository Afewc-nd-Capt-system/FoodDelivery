'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Download, Package } from 'lucide-react';
import { apiGet } from '@/lib/apiClient';

interface EarningsSummary {
  totalEarnings: number;
  deliveriesCount: number;
  chartData: { day: string; amount: number }[];
}

interface Delivery {
  _id: string;
  restaurant?: { name?: string };
  restaurantName?: string;
  deliveryFee?: number;
  totalAmount?: number;
  updatedAt?: string;
  deliveredAt?: string;
}

export default function DeliveryEarningsPage() {
  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [earnings, setEarnings] = useState<EarningsSummary>({
    totalEarnings: 0,
    deliveriesCount: 0,
    chartData: [],
  });
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [summary, completed] = await Promise.all([
          apiGet(`/riders/earnings?period=${period}`),
          apiGet('/riders/deliveries/completed'),
        ]);
        if (!active) return;

        setEarnings({
          totalEarnings: summary.totalEarnings || 0,
          deliveriesCount: summary.deliveriesCount || 0,
          chartData: summary.chartData || [],
        });
        setDeliveries(completed.deliveries || []);
      } catch (err: any) {
        if (active) setError(err.message || 'Could not load earnings');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [period]);

  const averagePerOrder =
    earnings.deliveriesCount > 0
      ? Math.round(earnings.totalEarnings / earnings.deliveriesCount)
      : 0;

  const exportCsv = () => {
    const rows = [
      ['Order', 'Restaurant', 'Date', 'Delivery Fee'],
      ...deliveries.map((order) => [
        order._id,
        order.restaurant?.name || order.restaurantName || '',
        new Date(order.deliveredAt || order.updatedAt || Date.now()).toISOString(),
        String(order.deliveryFee || 0),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `earnings-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/rider-dashboard">
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
            <Button onClick={exportCsv} className="bg-white/10 text-white hover:bg-white/20">
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
            <p className="text-3xl font-black">₦{earnings.totalEarnings.toLocaleString()}</p>
            <p className="text-sm opacity-80">Total Earnings</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-[#A0A0A0] mb-1">Completed Deliveries</p>
            <p className="text-2xl font-black text-[#1C1C1E]">{earnings.deliveriesCount}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-[#A0A0A0] mb-1">Avg. per Delivery</p>
            <p className="text-2xl font-black text-[#16A34A]">₦{averagePerOrder.toLocaleString()}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-[#A0A0A0] mb-1">Period</p>
            <p className="text-2xl font-black text-[#1C1C1E] capitalize">{period}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-black text-[#1C1C1E] mb-6">Completed Deliveries</h2>

          {loading && <p className="text-sm text-[#636366]">Loading earnings...</p>}
          {!loading && error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && deliveries.length === 0 && (
            <p className="text-sm text-[#636366]">No completed deliveries yet.</p>
          )}

          <div className="space-y-4">
            {deliveries.map((order) => (
              <div key={order._id} className="flex items-center justify-between p-4 bg-[#F5F5F5] rounded-xl">
                <div>
                  <p className="font-bold text-[#1C1C1E]">
                    {order.restaurant?.name || order.restaurantName || 'Order'}
                  </p>
                  <p className="text-sm text-[#636366]">
                    {new Date(order.deliveredAt || order.updatedAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1C1C1E]">₦{(order.deliveryFee || 0).toLocaleString()}</p>
                  <p className="text-xs text-[#A0A0A0] flex items-center justify-end gap-1">
                    <Package className="w-3 h-3" /> delivery fee
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
