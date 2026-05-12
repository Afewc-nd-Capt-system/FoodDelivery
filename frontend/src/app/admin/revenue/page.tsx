'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, CreditCard, BarChart3 } from 'lucide-react';

export default function AdminRevenuePage() {
  const [period, setPeriod] = useState('30');
  const [overview, setOverview] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
    fetchChartData();
  }, [period]);

  const fetchOverview = async () => {
    try {
      const response = await fetch(`/api/v2/admin/revenue/overview?period=${period}`, {
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });
      const data = await response.json();
      setOverview(data);
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await fetch(`/api/v2/admin/revenue/chart?period=${period}`, {
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });
      const data = await response.json();
      setChartData(data.chartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  if (loading || !overview) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#FFF8F0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1C1C1E' }}>
            Revenue Analytics
          </h1>
          <div className="flex gap-2">
            {['7', '30', '90', '365'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  period === p
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  background: period === p ? 'linear-gradient(135deg, #E8621A, #C4501A)' : 'transparent',
                }}
              >
                {p === '365' ? '1 Year' : `${p} Days`}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#FFF1E8' }}>
                <TrendingUp className="w-6 h-6" style={{ color: '#E8621A' }} />
              </div>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#636366' }}>
              Total Revenue
            </p>
            <p className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>
              {formatCurrency(overview.totalRevenue)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#FFF1E8' }}>
                <DollarSign className="w-6 h-6" style={{ color: '#E8621A' }} />
              </div>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#636366' }}>
              Commission Revenue
            </p>
            <p className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>
              {formatCurrency(overview.commissionRevenue)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#DBEAFE' }}>
                <CreditCard className="w-6 h-6" style={{ color: '#2563EB' }} />
              </div>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#636366' }}>
              Subscription Revenue
            </p>
            <p className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>
              {formatCurrency(overview.subscriptionRevenue)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#DCFCE7' }}>
                <BarChart3 className="w-6 h-6" style={{ color: '#16A34A' }} />
              </div>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#636366' }}>
              Ad Revenue
            </p>
            <p className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>
              {formatCurrency(overview.adRevenue)}
            </p>
          </div>
        </div>

        {/* Revenue Breakdown Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1C1C1E' }}>
            Revenue Breakdown
          </h2>
          <div className="h-64 flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
            <p className="text-sm" style={{ color: '#636366' }}>
              Chart visualization would go here (Recharts or Chart.js)
            </p>
          </div>
          <div className="mt-4 flex gap-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E8621A' }} />
              <span className="text-sm" style={{ color: '#636366' }}>Commission</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2563EB' }} />
              <span className="text-sm" style={{ color: '#636366' }}>Subscription</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#16A34A' }} />
              <span className="text-sm" style={{ color: '#636366' }}>Ads</span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1C1C1E' }}>
            Daily Revenue Data
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E8E8' }}>
                  <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: '#636366' }}>
                    Date
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: '#636366' }}>
                    Commission
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: '#636366' }}>
                    Subscription
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: '#636366' }}>
                    Ads
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: '#636366' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((day, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #E8E8E8' }}>
                    <td className="py-3 px-4 text-sm" style={{ color: '#1C1C1E' }}>
                      {day.date}
                    </td>
                    <td className="py-3 px-4 text-sm text-right" style={{ color: '#1C1C1E' }}>
                      {formatCurrency(day.commissionRevenue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right" style={{ color: '#1C1C1E' }}>
                      {formatCurrency(day.subscriptionRevenue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right" style={{ color: '#1C1C1E' }}>
                      {formatCurrency(day.adRevenue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-bold" style={{ color: '#1C1C1E' }}>
                      {formatCurrency(day.commissionRevenue + day.subscriptionRevenue + day.adRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
