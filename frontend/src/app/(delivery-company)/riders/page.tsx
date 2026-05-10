'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Plus, Search, Filter, Bike, Phone, Mail,
  Star, MapPin, MoreVertical, Edit, Ban, CheckCircle, Package
} from 'lucide-react';

export default function DeliveryCompanyRidersPage() {
  const [riders] = useState([
    { id: '1', name: 'Emmanuel Okafor', email: 'emmanuel@vibechops.com', phone: '08012345678', vehicleType: 'bike', isOnline: true, isActive: true, totalDeliveries: 45, rating: 4.8, joinedAt: '2024-01-15' },
    { id: '2', name: 'Chinedu Eze', email: 'chinedu@vibechops.com', phone: '08023456789', vehicleType: 'scooter', isOnline: true, isActive: true, totalDeliveries: 38, rating: 4.6, joinedAt: '2024-02-20' },
    { id: '3', name: 'Adebayo Johnson', email: 'adebayo@vibechops.com', phone: '08034567890', vehicleType: 'bike', isOnline: false, isActive: true, totalDeliveries: 52, rating: 4.9, joinedAt: '2024-01-10' },
    { id: '4', name: 'Funmi Adeyemi', email: 'funmi@vibechops.com', phone: '08045678901', vehicleType: 'bike', isOnline: true, isActive: true, totalDeliveries: 28, rating: 4.7, joinedAt: '2024-03-05' },
    { id: '5', name: 'Tunde Bello', email: 'tunde@vibechops.com', phone: '08056789012', vehicleType: 'scooter', isOnline: false, isActive: false, totalDeliveries: 15, rating: 4.3, joinedAt: '2024-02-28' },
  ]);

  const [filter, setFilter] = useState('all');

  const filteredRiders = riders.filter(rider => {
    if (filter === 'active') return rider.isActive && rider.isOnline;
    if (filter === 'offline') return rider.isActive && !rider.isOnline;
    if (filter === 'inactive') return !rider.isActive;
    return true;
  });

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/(delivery-company)/dashboard" className="text-white/60 hover:text-white text-sm mb-1 block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-black text-white mb-1">Riders Management</h1>
              <p className="text-white/40 text-sm">Manage your delivery fleet</p>
            </div>
            <Button className="bg-[#E8621A] text-white hover:bg-[#C4501A]">
              <Plus className="w-4 h-4 mr-2" />
              Add New Rider
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Riders', value: riders.length, color: '#2563EB' },
            { label: 'Active Online', value: riders.filter(r => r.isActive && r.isOnline).length, color: '#16A34A' },
            { label: 'Active Offline', value: riders.filter(r => r.isActive && !r.isOnline).length, color: '#F59E0B' },
            { label: 'Inactive', value: riders.filter(r => !r.isActive).length, color: '#EF4444' },
          ].map((stat, i) => (
            <Card key={i} className="p-4">
              <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-sm text-[#A0A0A0]">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 flex-1 max-w-md">
            <Search size={16} className="text-[#A0A0A0]" />
            <input
              type="text"
              placeholder="Search riders..."
              className="flex-1 outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#A0A0A0]" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="all">All Riders</option>
              <option value="active">Active Online</option>
              <option value="offline">Active Offline</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Riders List */}
        <div className="space-y-4">
          {filteredRiders.map((rider) => (
            <Card key={rider.id} className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
                    <Bike className="w-7 h-7 text-[#2563EB]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#1C1C1E]">{rider.name}</h3>
                      <Badge className={rider.isActive ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#636366]'}>
                        {rider.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge className={rider.isOnline ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#636366]'}>
                        {rider.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#636366] mb-2">
                      <div className="flex items-center gap-1">
                        <Mail size={14} />
                        {rider.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone size={14} />
                        {rider.phone}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Bike size={14} className="text-[#A0A0A0]" />
                        <span className="text-[#1C1C1E]">{rider.vehicleType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-[#F59E0B]" />
                        <span className="text-[#1C1C1E]">{rider.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package size={14} className="text-[#A0A0A0]" />
                        <span className="text-[#1C1C1E]">{rider.totalDeliveries} deliveries</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="bg-[#F5F5F5] text-[#636366] hover:bg-[#E8E8E8] p-2">
                    <Edit size={16} />
                  </Button>
                  <Button className="bg-[#F5F5F5] text-[#636366] hover:bg-[#E8E8E8] p-2">
                    <MoreVertical size={16} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F5F5F5]">
                <p className="text-xs text-[#A0A0A0]">Joined: {rider.joinedAt}</p>
                <div className="flex items-center gap-2">
                  {rider.isActive ? (
                    <Button className="bg-[#F5F5F5] text-[#EF4444] hover:bg-[#FEE2E2] text-xs">
                      <Ban className="w-3 h-3 mr-1" />
                      Deactivate
                    </Button>
                  ) : (
                    <Button className="bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
