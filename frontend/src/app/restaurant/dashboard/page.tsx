'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, DollarSign, ShoppingCart, Users, Star, Clock } from 'lucide-react';

interface DashboardData {
  summary: {
    revenue: number;
    totalOrders: number;
    avgOrderValue: number;
    returnRate: number;
    cancelledRate: number;
  };
  chartData: Array<{ date: string; revenue: number; orderCount: number }>;
  topItems: Array<{ name: string; orderCount: number; revenue: number }>;
  peakHours: Array<{ hour: number; orderCount: number }>;
}

export default function RestaurantDashboardPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const restaurantId = searchParams.get('restaurantId');

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, period]);

  const loadData = async () => {
    try {
      const result = await api.analytics.getDashboard(restaurantId!, period);
      setData(result.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `₦${value.toFixed(2)}`;
  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  };

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Restaurant ID required</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Restaurant Dashboard</h1>
          <div className="flex gap-2">
            {['day', 'week', 'month'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  period === p ? 'bg-orange-500 text-white' : 'bg-white border'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Revenue</p>
                    <p className="text-xl font-bold">{formatCurrency(data.summary.revenue)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Orders</p>
                    <p className="text-xl font-bold">{data.summary.totalOrders}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500">Avg Order</p>
                    <p className="text-xl font-bold">{formatCurrency(data.summary.avgOrderValue)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-500">Return Rate</p>
                    <p className="text-xl font-bold">{data.summary.returnRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-500">Cancelled</p>
                    <p className="text-xl font-bold">{data.summary.cancelledRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-4">Top Selling Items</h3>
                <div className="space-y-3">
                  {data.topItems.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-500 font-bold">{idx + 1}</span>
                        <span>{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.revenue)}</p>
                        <p className="text-sm text-gray-500">{item.orderCount} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-4">Peak Order Hours</h3>
                <div className="space-y-3">
                  {data.peakHours.map((hour, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatHour(hour.hour)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${(hour.orderCount / (data.peakHours[0]?.orderCount || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{hour.orderCount} orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-4">Revenue Trend</h3>
              <div className="h-64 flex items-end gap-2">
                {data.chartData.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-orange-500 rounded-t"
                      style={{
                        height: `${Math.max(10, (day.revenue / Math.max(...data.chartData.map(d => d.revenue))) * 200))}px`
                      }}
                    />
                    <span className="text-xs text-gray-500 mt-2">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}