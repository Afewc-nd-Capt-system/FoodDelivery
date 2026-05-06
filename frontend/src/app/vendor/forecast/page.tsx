'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface Forecast {
  cookingDays: Array<{
    day: string;
    historicalOrders: number;
    forecastedOrders: number;
    estimatedRevenue: number;
    confidence: string;
  }>;
  nextCookingDay: string;
  nextDayForecast: any;
}

export default function VendorForecastPage() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get('vendorId');

  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vendorId) loadForecast();
  }, [vendorId]);

  const loadForecast = async () => {
    try {
      const result = await api.vendorForecast.getDemandForecast(vendorId!);
      setForecast(result.data);
    } catch (error) {
      console.error('Failed to load forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high': return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">High</span>;
      case 'medium': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Medium</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Low</span>;
    }
  };

  if (!vendorId) {
    return <div className="p-8 text-center">Vendor ID required</div>;
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
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Demand Forecasting</h1>

        {forecast && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-semibold">Next Cooking Day: {forecast.nextCookingDay}</h2>
              </div>
              {forecast.nextDayForecast && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{forecast.nextDayForecast.forecastedOrders}</p>
                    <p className="text-sm text-gray-600">Expected Orders</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">₦{forecast.nextDayForecast.estimatedRevenue}</p>
                    <p className="text-sm text-gray-600">Est. Revenue</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-center mb-1">
                      {getConfidenceBadge(forecast.nextDayForecast.confidence)}
                    </div>
                    <p className="text-sm text-gray-600">Confidence</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-semibold">Weekly Forecast by Day</h2>
              </div>
              <div className="space-y-4">
                {forecast.cookingDays.map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold w-24">{day.day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${Math.min(100, (day.forecastedOrders / 20) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-gray-500">Historical</p>
                        <p className="font-medium">{day.historicalOrders} orders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">Forecast</p>
                        <p className="font-medium text-orange-600">{day.forecastedOrders} orders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">Revenue</p>
                        <p className="font-medium">₦{day.estimatedRevenue}</p>
                      </div>
                      {getConfidenceBadge(day.confidence)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">About Forecasts</p>
                  <p className="text-sm text-blue-700">
                    Forecasts are based on your last 4 weeks of orders. "High" confidence means 10+ orders historically, "Medium" is 5-9, "Low" is below 5.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}