'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Plus, Search, Filter, Bike, Phone, Mail,
  Star, MapPin, MoreVertical, Edit, Ban, CheckCircle, Package
} from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

export default function DeliveryCompanyRidersPage() {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Real rider fleet from the company API — GET /v2/delivery-company/:id/riders
  useEffect(() => {
    let token: string | null = null;
    let companyId: string | null = null;
    try {
      token = localStorage.getItem('token');
      const raw = localStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        companyId = typeof user?.company === 'object' ? user?.company?._id || null : user?.company || null;
      }
    } catch {}

    if (!token || !companyId) {
      setLoading(false);
      return;
    }
    fetch(`${API_V2}/delivery-company/${companyId}/riders?status=all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`status ${res.status}`);
        setRiders(Array.isArray(body?.riders) ? body.riders : []);
      })
      .catch((error) => console.error('Failed to load riders:', error))
      .finally(() => setLoading(false));
  }, []);

  const [filter, setFilter] = useState('all');

  const filteredRiders = riders.filter(rider => {
    if (filter === 'active') return rider.isOnline;
    if (filter === 'offline') return rider.isActive && !rider.isOnline;
    if (filter === 'inactive') return !rider.isActive;
    return true;
  }).filter(rider => {
    const q = searchQuery.toLowerCase();
    return !q || rider.name?.toLowerCase().includes(q) || rider.email?.toLowerCase().includes(q) || rider.phone?.includes(q);
  });

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/delivery-company-dashboard" className="text-white/60 hover:text-white text-sm mb-1 block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-black text-white mb-1">Riders Management</h1>
              <p className="text-white/40 text-sm">Manage your delivery fleet</p>
            </div>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          {loading && <p className="text-sm text-[#A0A0A0] py-6 text-center">Loading riders…</p>}
          {!loading && filteredRiders.length === 0 && (
            <Card className="p-10 text-center">
              <Bike className="w-10 h-10 mx-auto mb-3 text-[#E8E8E8]" />
              <p className="font-bold text-[#1C1C1E]">No riders yet</p>
              <p className="text-sm text-[#A0A0A0]">Riders you add to your company will show up here.</p>
            </Card>
          )}
          {filteredRiders.map((rider) => (
            <Card key={rider._id || rider.phone || rider.name} className="p-6 hover:shadow-lg transition-all">
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
                <p className="text-xs text-[#A0A0A0]">Joined: {rider.createdAt ? new Date(rider.createdAt).toLocaleDateString() : '—'}</p>
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
