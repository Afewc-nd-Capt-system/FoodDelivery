'use client'
import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { API_V2 } from '@/lib/apiBase'
import {
  Package, TrendingUp, DollarSign, Star, Calendar,
  Clock, Utensils, Plus, Settings, User, X
} from 'lucide-react'
import Link from 'next/link'

export default function VendorDashboardPage() {
  const { user, loading, authorized } = useAuthGuard('vendor')
  const [activeTab, setActiveTab] = useState('overview')
  // Real vendor data from GET /v2/vendor-forecast/me (resolves the signed-in
  // vendor and aggregates its historic orders per cooking day).
  const [vendorStats, setVendorStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price: '', category: '', image: '',
    availableDate: '', availableFrom: '08:00', availableTo: '18:00',
    cutoffHours: 12, maxPreOrders: 20, cookingDay: '',
  })

  useEffect(() => {
    if (!authorized) return;
    const token = localStorage.getItem('token');
    if (!token) { setStatsLoading(false); return; }
    fetch(`${API_V2}/vendor-forecast/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || `status ${res.status}`);
        setVendorStats(body?.data || null);
      })
      .catch((error) => console.error('Failed to load vendor stats:', error))
      .finally(() => setStatsLoading(false));
  }, [authorized]);

  const cookingDays = Array.isArray(vendorStats?.cookingDays) ? vendorStats.cookingDays : [];
  const upcomingCookingDays = cookingDays.map((day: any) => ({
    date: day.day,
    orders: day.historicalOrders ?? 0,
    forecast: day.forecastedOrders ?? 0,
    revenue: day.historicalRevenue ?? 0,
  }));
  const totalRevenue = cookingDays.reduce((sum: number, d: any) => sum + (d.historicalRevenue || 0), 0);

  const tabs = [    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
  ]

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FFF8F0'
    }}>
      <div>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '4px solid #F0EAE0', borderTop: '4px solid #E8621A',
          animation: 'spin 1s linear infinite', margin: '0 auto 16px'
        }} />
        <p style={{ color: '#636366', textAlign: 'center' }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (!authorized || !user) return null

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">Vendor Dashboard</h1>
              <p className="text-white/40 text-sm">Welcome back, {user?.name || 'Vendor'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: '#E8621A', color: 'white', fontWeight: '700', fontSize: '14px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <Plus size={16} />
                Add Menu Item
              </button>
              <button style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '600', fontSize: '14px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <Settings size={16} />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b" style={{ borderColor: '#E8E8E8' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
                  style={{
                    background: activeTab === tab.id ? 'linear-gradient(135deg, #E8621A, #C4501A)' : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#636366',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <Package size={20} style={{ color: '#E8621A' }} />
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats ? vendorStats.totalHistoricalOrders ?? 0 : '…'}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Orders</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <DollarSign size={20} style={{ color: '#16A34A' }} />
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats ? `₦${Number(totalRevenue || 0).toLocaleString()}` : '…'}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Revenue</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <Star size={20} style={{ color: '#EAB308' }} />
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats?.rating ?? '—'}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Customer Rating</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <Utensils size={20} style={{ color: '#2563EB' }} />
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats?.menuCount ?? '—'}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Menu Items</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                    Upcoming Cooking Days
                  </h2>
                  <Link href="/vendor/forecast" className="text-sm font-bold" style={{ color: '#E8621A' }}>
                    View Forecast →
                  </Link>
                </div>
                <div className="space-y-4">
                  {(upcomingCookingDays || []).length === 0 && (
                    <p className="text-sm" style={{ color: '#A0A0A0' }}>
                      {statsLoading ? 'Loading cooking days…' : 'No cooking days configured yet. Add them in your vendor profile.'}
                    </p>
                  )}
                  {(upcomingCookingDays || []).map((day: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#FFF1E8' }}>
                      <div className="flex items-center gap-3">
                        <Calendar size={20} style={{ color: '#E8621A' }} />
                        <div>
                          <p className="font-bold" style={{ color: '#1C1C1E' }}>{day.date}</p>
                          <p className="text-sm" style={{ color: '#636366' }}>
                            {(day.orders || 0)} orders historically • ₦{Number(day.revenue || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 12px', borderRadius: '8px', background: '#E8621A',
                        color: 'white', fontSize: '12px', fontWeight: '700'
                      }}>~{(day.forecast || 0)} expected</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <h2 className="text-xl font-black mb-6" style={{ color: '#1C1C1E' }}>
                  Recent Orders
                </h2>
                <div className="text-center py-8">
                  <Package size={40} style={{ color: '#E8E8E8', margin: '0 auto 8px' }} />
                  <p className="font-bold" style={{ color: '#1C1C1E' }}>Order list coming soon</p>
                  <p className="text-sm" style={{ color: '#636366' }}>A vendor order inbox isn't built yet — totals above are counted straight from your completed orders.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'menu' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>Menu Management</h2>
              <button onClick={() => setShowAddForm(!showAddForm)} style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: '#E8621A', color: 'white', fontWeight: '700',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {showAddForm ? <X size={16} /> : <Plus size={16} />}
                {showAddForm ? 'Cancel' : 'Add Menu Item'}
              </button>
            </div>
            {showAddForm && (
              <div className="mb-8 p-6 rounded-2xl" style={{ backgroundColor: '#FAFAFA', border: '1px solid #E8E8E8' }}>
                <h3 className="font-bold text-lg mb-5" style={{ color: '#1C1C1E' }}>New Menu Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Item Name</label>
                    <input type="text" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Category</label>
                    <input type="text" value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Price (₦)</label>
                    <input type="number" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Image URL</label>
                    <input type="text" value={menuForm.image} onChange={e => setMenuForm({...menuForm, image: e.target.value})}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold" style={{ color: '#636366' }}>Description</label>
                    <textarea value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})}
                      rows={2} className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                      style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Utensils size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Menu management coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'preorders' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-xl font-black mb-6" style={{ color: '#1C1C1E' }}>Pre-orders</h2>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Clock size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Pre-orders management coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-xl font-black mb-6" style={{ color: '#1C1C1E' }}>Cooking Schedule</h2>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Calendar size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Cooking schedule management coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-xl font-black mb-6" style={{ color: '#1C1C1E' }}>Earnings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF1E8' }}>
                <p className="text-sm" style={{ color: '#636366' }}>Total Revenue</p>
                <p className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>{vendorStats ? `₦${Number(totalRevenue || 0).toLocaleString()}` : '…'}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                <p className="text-sm" style={{ color: '#636366' }}>Per order (avg)</p>
                <p className="text-2xl font-bold" style={{ color: '#16A34A' }}>
                  {vendorStats && vendorStats.totalHistoricalOrders > 0
                    ? `₦${Number(Math.round(totalRevenue / vendorStats.totalHistoricalOrders)).toLocaleString()}`
                    : '—'}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                <p className="text-sm" style={{ color: '#636366' }}>Historic Orders</p>
                <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{vendorStats ? vendorStats.totalHistoricalOrders ?? 0 : '…'}</p>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#A0A0A0' }}>
              Commission statements will appear here once per-vendor commission settlement is enabled.
            </p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-xl font-black mb-6" style={{ color: '#1C1C1E' }}>Profile Settings</h2>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <User size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Profile management coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
