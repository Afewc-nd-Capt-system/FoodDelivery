'use client'
import { useState } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { Bike, Package, DollarSign, Star, MapPin, TrendingUp, CheckCircle, XCircle, Clock, User, Settings } from 'lucide-react'

export default function RiderDashboardPage() {
  const { user, loading, authorized } = useAuthGuard('rider')
  const [activeTab, setActiveTab] = useState('overview')
  const [riderStats] = useState({
    totalDeliveries: 156,
    earnings: 128500,
    rating: 4.9,
    online: true,
    activeOrder: null as string | null,
  })

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'deliveries', label: 'Deliveries', icon: Package },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'profile', label: 'Profile', icon: User },
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
              <h1 className="text-2xl font-black text-white mb-1">Rider Dashboard</h1>
              <p className="text-white/40 text-sm">Welcome back, {user?.name || 'Rider'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '12px',
                background: riderStats.online ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)',
                color: riderStats.online ? '#16A34A' : '#EF4444',
                fontWeight: '700', fontSize: '14px'
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: riderStats.online ? '#16A34A' : '#EF4444',
                }} />
                {riderStats.online ? 'Online' : 'Offline'}
              </div>
              <button style={{
                padding: '10px', borderRadius: '12px', border: 'none',
                background: 'rgba(255,255,255,0.1)', color: 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}>
                <Settings size={18} />
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
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap',
                    background: activeTab === tab.id ? 'linear-gradient(135deg, #E8621A, #C4501A)' : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#636366',
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Bike, label: 'Total Deliveries', value: riderStats.totalDeliveries, color: '#E8621A' },
                { icon: DollarSign, label: 'Earnings', value: `₦${(riderStats.earnings || 0).toLocaleString()}`, color: '#16A34A' },
                { icon: Star, label: 'Rating', value: riderStats.rating, color: '#EAB308' },
                { icon: CheckCircle, label: 'Completed', value: '152', color: '#2563EB' },
              ].map((stat, i) => {
                const Icon = stat.icon
                return (
                  <div key={i} className="p-4 bg-white rounded-2xl shadow-sm">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${stat.color}15` }}>
                      <Icon size={16} style={{ color: stat.color }} />
                    </div>
                    <p className="text-xl font-black" style={{ color: '#1C1C1E' }}>{stat.value}</p>
                    <p className="text-xs" style={{ color: '#A0A0A0' }}>{stat.label}</p>
                  </div>
                )
              })}
            </div>

            {riderStats.activeOrder ? (
              <div className="p-6 bg-white rounded-2xl shadow-sm border-l-4 mb-6" style={{ borderLeftColor: '#E8621A' }}>
                <h3 className="font-bold mb-2" style={{ color: '#1C1C1E' }}>Active Delivery</h3>
                <p style={{ color: '#636366' }}>Order #{riderStats.activeOrder}</p>
              </div>
            ) : (
              <div className="p-6 bg-white rounded-2xl shadow-sm mb-6">
                <div className="text-center py-6">
                  <MapPin size={48} style={{ color: '#E8E8E8' }} />
                  <p className="mt-2 font-bold" style={{ color: '#1C1C1E' }}>Waiting for orders</p>
                  <p className="text-sm" style={{ color: '#636366' }}>You'll be notified when a new delivery is available</p>
                </div>
              </div>
            )}

            <div className="p-6 bg-white rounded-2xl shadow-sm">
              <h3 className="font-bold mb-4" style={{ color: '#1C1C1E' }}>Recent Deliveries</h3>
              <div className="text-center py-6" style={{ color: '#636366' }}>
                <Package size={48} style={{ color: '#E8E8E8' }} />
                <p className="mt-2">No recent deliveries</p>
              </div>
            </div>
          </>
        )}
        {activeTab === 'deliveries' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1C1C1E' }}>Delivery History</h2>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Package size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Delivery history coming soon</p>
            </div>
          </div>
        )}
        {activeTab === 'earnings' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1C1C1E' }}>Earnings</h2>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <DollarSign size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Earnings details coming soon</p>
            </div>
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1C1C1E' }}>Profile Settings</h2>
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
