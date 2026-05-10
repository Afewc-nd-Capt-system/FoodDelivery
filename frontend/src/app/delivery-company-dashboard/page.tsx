'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Package, DollarSign, TrendingUp, Star,
  Bike, Settings, Wallet, Plus, Clock
} from 'lucide-react';

export default function DeliveryCompanyDashboardPage() {
  const [companyStats, setCompanyStats] = useState({
    totalRiders: 24,
    activeRiders: 18,
    totalDeliveries: 1250,
    totalEarnings: 375000,
    rating: 4.7,
    wallet: {
      balance: 87500,
      pendingWithdrawals: 12500
    }
  });

  const [riders, setRiders] = useState([
    { id: '1', name: 'Emmanuel Okafor', phone: '08012345678', vehicleType: 'bike', isOnline: true, totalDeliveries: 45, rating: 4.8 },
    { id: '2', name: 'Chinedu Eze', phone: '08023456789', vehicleType: 'scooter', isOnline: true, totalDeliveries: 38, rating: 4.6 },
    { id: '3', name: 'Adebayo Johnson', phone: '08034567890', vehicleType: 'bike', isOnline: false, totalDeliveries: 52, rating: 4.9 },
  ]);

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">Delivery Company</h1>
              <p className="text-white/40 text-sm">Welcome back, Lagos Express Logistics</p>
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-[#E8621A] text-white hover:bg-[#C4501A]">
                <Plus className="w-4 h-4 mr-2" />
                Add Rider
              </Button>
              <Button className="bg-white/10 text-white hover:bg-white/20">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: Users, label: 'Total Riders', value: companyStats.totalRiders, color: '#2563EB' },
            { icon: Bike, label: 'Active Riders', value: companyStats.activeRiders, color: '#16A34A' },
            { icon: Package, label: 'Total Deliveries', value: companyStats.totalDeliveries, color: '#E8621A' },
            { icon: DollarSign, label: 'Total Earnings', value: `₦${(companyStats.totalEarnings / 1000).toFixed(0)}K`, color: '#F59E0B' },
            { icon: Star, label: 'Rating', value: companyStats.rating, color: '#8B5CF6' },
            { icon: Wallet, label: 'Wallet', value: `₦${(companyStats.wallet.balance / 1000).toFixed(0)}K`, color: '#10B981' },
          ].map((stat, i) => (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-xl font-black text-[#1C1C1E]">{stat.value}</p>
              <p className="text-xs text-[#A0A0A0]">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Active Riders */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#1C1C1E]">
              Active Riders
              <Badge className="ml-2 bg-[#FFF1E8] text-[#E8621A]">{riders.length}</Badge>
            </h2>
            <Link href="/(delivery-company)/riders">
              <Button className="bg-[#F5F5F5] text-[#636366] hover:bg-[#E8E8E8] text-xs">
                View All Riders
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {riders.map((rider) => (
              <Card key={rider.id} className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
                      <Bike className="w-6 h-6 text-[#2563EB]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1C1C1E]">{rider.name}</h3>
                      <p className="text-sm text-[#636366]">{rider.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={rider.isOnline ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#636366]'}>
                      {rider.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[#A0A0A0] text-xs mb-1">Vehicle Type</p>
                    <p className="font-bold text-[#1C1C1E]">{rider.vehicleType}</p>
                  </div>
                  <div>
                    <p className="text-[#A0A0A0] text-xs mb-1">Deliveries</p>
                    <p className="font-bold text-[#1C1C1E]">{rider.totalDeliveries}</p>
                  </div>
                  <div>
                    <p className="text-[#A0A0A0] text-xs mb-1">Rating</p>
                    <p className="font-bold text-[#1C1C1E]">{rider.rating} ⭐</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/(delivery-company)/riders">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1C1E]">Manage Riders</h3>
                  <p className="text-sm text-[#A0A0A0]">View & manage riders</p>
                </div>
              </div>
            </Card>
          </Link>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF1E8] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6 text-[#E8621A]" />
              </div>
              <div>
                <h3 className="font-bold text-[#1C1C1E]">Wallet</h3>
                <p className="text-sm text-[#A0A0A0]">Balance: ₦{companyStats.wallet.balance.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-[#16A34A]" />
              </div>
              <div>
                <h3 className="font-bold text-[#1C1C1E]">Analytics</h3>
                <p className="text-sm text-[#A0A0A0]">View performance</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
