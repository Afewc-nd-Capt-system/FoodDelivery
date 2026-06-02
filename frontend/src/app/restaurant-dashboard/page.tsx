'use client'
import { useState } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { Store, Package, DollarSign, TrendingUp, Star, Clock, Settings, User, Plus } from 'lucide-react'

export default function RestaurantDashboardPage() {
  const { user, loading, authorized } = useAuthGuard('restaurant')
  const [activeTab, setActiveTab] = useState('overview')
  const [restaurantStats] = useState({
    totalOrders: 89,
    totalRevenue: 456000,
    rating: 4.6,
    menuItems: 24,
    pendingOrders: 5,
    avgDelivery: '28min',
  })

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'menu', label: 'Menu', icon: Store },
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
              <h1 className="text-2xl font-black text-white mb-1">Restaurant Dashboard</h1>
              <p className="text-white/40 text-sm">Welcome back, {user?.name || 'Partner'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: '#E8621A', color: 'white', fontWeight: '700',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <Plus size={16} /> Add Item
              </button>
              <button style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <Settings size={16} /> Settings
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {[
                { icon: Package, label: 'Total Orders', value: restaurantStats.totalOrders, color: '#E8621A' },
                { icon: DollarSign, label: 'Revenue', value: `₦${(restaurantStats.totalRevenue || 0).toLocaleString()}`, color: '#16A34A' },
                { icon: Star, label: 'Rating', value: restaurantStats.rating, color: '#EAB308' },
                { icon: Store, label: 'Menu Items', value: restaurantStats.menuItems, color: '#2563EB' },
                { icon: Clock, label: 'Avg Delivery', value: restaurantStats.avgDelivery, color: '#8B5CF6' },
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

            <div className="p-6 bg-white rounded-2xl shadow-sm mb-8">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#1C1C1E' }}>Recent Orders</h2>
              <div className="text-center py-8" style={{ color: '#636366' }}>
                <Package size={48} style={{ color: '#E8E8E8' }} />
                <p className="mt-2">No recent orders to display</p>
              </div>
            </div>

            {(restaurantStats.pendingOrders || 0) > 0 && (
              <div className="p-6 bg-white rounded-2xl shadow-sm border-l-4" style={{ borderLeftColor: '#E8621A' }}>
                <div className="flex items-center gap-4">
                  <Clock size={24} style={{ color: '#E8621A' }} />
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: '#1C1C1E' }}>{(restaurantStats.pendingOrders || 0)} Pending Orders</p>
                  </div>
                  <button style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#E8621A', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Review</button>
                </div>
              </div>
            )}
          </>
        )}
        {activeTab === 'orders' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1C1C1E' }}>Orders</h2>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Package size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Orders management coming soon</p>
            </div>
          </div>
        )}
        {activeTab === 'menu' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1C1C1E' }}>Menu Management</h2>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <Store size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Menu management coming soon</p>
            </div>
          </div>
        )}
        {activeTab === 'earnings' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1C1C1E' }}>Earnings</h2>
            <div className="text-center py-12" style={{ color: '#636366' }}>
              <DollarSign size={64} style={{ color: '#E8E8E8' }} />
              <p className="mt-4">Earnings dashboard coming soon</p>
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
