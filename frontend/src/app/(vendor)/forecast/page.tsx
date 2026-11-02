'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, Calendar } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';
import { useAuthGuard } from '@/hooks/useAuthGuard';

interface ForecastDay {
  day: string;
  historicalOrders: number;
  historicalRevenue: number;
  forecastedOrders: number;
  estimatedRevenue: number;
}

export default function VendorForecastPage() {
  const { authorized } = useAuthGuard('vendor');
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<{
    cookingDays: ForecastDay[];
    nextCookingDay?: string;
    nextDayForecast?: ForecastDay | null;
    totalHistoricalOrders: number;
    avgOrdersPerDay: number;
  } | null>(null);

  // Real forecast from GET /v2/vendor-forecast/me (resolves the signed-in vendor).
  useEffect(() => {
    if (!authorized) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_V2}/vendor-forecast/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || `status ${res.status}`);
        setForecast(body?.data || null);
      })
      .catch((error) => console.error('Failed to load forecast:', error))
      .finally(() => setLoading(false));
  }, [authorized]);

  const days = Array.isArray(forecast?.cookingDays) ? forecast.cookingDays : [];
  const prepTotal = Math.round(days.reduce((sum, d) => sum + (d.forecastedOrders || 0), 0));

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#F0EAE0] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-[#1C1C1E]">Demand Forecast</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E8621A18' }}>
                <Calendar className="w-5 h-5 text-[#E8621A]" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#1C1C1E]">
              {loading ? '…' : forecast?.nextDayForecast ? Math.round(Number(forecast.nextDayForecast.forecastedOrders || 0)) : '—'}
            </p>
            <p className="text-xs text-[#A0A0A0] mt-1">Expected Orders ({forecast?.nextCookingDay || 'next cooking day'})</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#16A34A18' }}>
                <Package className="w-5 h-5 text-[#16A34A]" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#1C1C1E]">{loading ? '…' : prepTotal || '—'}</p>
            <p className="text-xs text-[#A0A0A0] mt-1">Orders to Prep (all cooking days)</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2563EB18' }}>
                <TrendingUp className="w-5 h-5 text-[#2563EB]" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#1C1C1E]">{loading ? '…' : forecast?.totalHistoricalOrders ?? '—'}</p>
            <p className="text-xs text-[#A0A0A0] mt-1">Completed Orders (last 4 weeks)</p>
          </Card>
        </div>

        {/* Demand Forecast Chart — per cooking day, from 4-week order history */}
        <Card className="p-6 mb-8">
          <h3 className="font-bold mb-4">Forecast per Cooking Day</h3>
          {loading ? (
            <p className="text-sm text-[#A0A0A0] py-8 text-center">Loading forecast…</p>
          ) : days.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-bold text-[#1C1C1E]">No forecast yet</p>
              <p className="text-sm text-[#A0A0A0] mt-1">
                Forecasts appear once cooking days are configured and you have ~4 weeks of completed orders.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={days.map((d) => ({ day: d.day, forecastedOrders: d.forecastedOrders, historicalOrders: d.historicalOrders }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="historicalOrders" fill="#F0C9AF" radius={[6, 6, 0, 0]} name="Last 4 weeks" />
                <Bar dataKey="forecastedOrders" fill="#E8621A" radius={[6, 6, 0, 0]} name="Forecast" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
