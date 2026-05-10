'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react';

const demandData = [
  { day: 'Monday', demand: 45 },
  { day: 'Tuesday', demand: 52 },
  { day: 'Wednesday', demand: 48 },
  { day: 'Thursday', demand: 61 },
  { day: 'Friday', demand: 73 },
  { day: 'Saturday', demand: 85 },
  { day: 'Sunday', demand: 60 },
];

const inventorySuggestions = [
  { item: 'Jollof Rice', suggestedQty: 45, currentStock: 20, status: 'low' },
  { item: 'Egusi Soup', suggestedQty: 30, currentStock: 35, status: 'ok' },
  { item: 'Pounded Yam', suggestedQty: 40, currentStock: 15, status: 'low' },
  { item: 'Fried Rice', suggestedQty: 35, currentStock: 40, status: 'ok' },
  { item: 'Moimoi', suggestedQty: 25, currentStock: 10, status: 'low' },
];

const salesTrend = [
  { month: 'Jan', sales: 45000 },
  { month: 'Feb', sales: 52000 },
  { month: 'Mar', sales: 48000 },
  { month: 'Apr', sales: 61000 },
  { month: 'May', sales: 55000 },
];

export default function VendorForecastPage() {
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
          {[
            { label: 'Predicted Orders', value: '85', icon: TrendingUp, color: '#E8621A' },
            { label: 'Items to Prep', value: '175', icon: Package, color: '#16A34A' },
            { label: 'Low Stock Alerts', value: '3', icon: AlertTriangle, color: '#D32F2F' },
          ].map((stat) => (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}18` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-black text-[#1C1C1E]">{stat.value}</p>
              <p className="text-xs text-[#A0A0A0] mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Demand Forecast Chart */}
        <Card className="p-6 mb-8">
          <h3 className="font-bold mb-4">Demand Forecast (Next 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={demandData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="demand" fill="#E8621A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Sales Trend */}
        <Card className="p-6 mb-8">
          <h3 className="font-bold mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="sales" fill="#BE3A2A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Inventory Suggestions */}
        <Card className="p-6">
          <h3 className="font-bold mb-4">Inventory Suggestions</h3>
          <div className="space-y-3">
            {inventorySuggestions.map((item) => (
              <div key={item.item} className="flex items-center justify-between py-3 border-b border-[#F0EAE0] last:border-0">
                <div>
                  <p className="font-medium text-sm">{item.item}</p>
                  <p className="text-xs text-[#A0A0A0]">Current stock: {item.currentStock}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-[#E8621A]">Suggest: {item.suggestedQty}</p>
                  {item.status === 'low' && (
                    <p className="text-xs text-[#D32F2F] flex items-center gap-1 justify-end">
                      <AlertTriangle className="w-3 h-3" /> Low Stock
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
