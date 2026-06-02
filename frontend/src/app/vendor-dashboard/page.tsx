'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  Package, TrendingUp, DollarSign, Star, Calendar,
  Clock, Utensils, Plus, Settings, AlertCircle, User, X
} from 'lucide-react'

export default function VendorDashboardPage() {
  const { user, loading, authorized } = useAuthGuard('vendor')
  const [activeTab, setActiveTab] = useState('overview')
  const [vendorStats] = useState({
    totalOrders: 45,
    totalRevenue: 125000,
    totalDeliveries: 42,
    rating: 4.8,
    activeMenuItems: 12,
    pendingOrders: 3,
  })
  const [upcomingCookingDays] = useState([
    { date: 'Monday, May 12', orders: 8, status: 'upcoming' },
    { date: 'Wednesday, May 14', orders: 12, status: 'upcoming' },
    { date: 'Friday, May 16', orders: 15, status: 'upcoming' },
  ])
  const [showAddForm, setShowAddForm] = useState(false)
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price: '', category: '', image: '',
    availableDate: '', availableFrom: '08:00', availableTo: '18:00',
    cutoffHours: 12, maxPreOrders: 20, cookingDay: '',
  })
  const [recentOrders] = useState([
    { id: 'ORD-001', customer: 'Funmi Adeyemi', items: 3, total: 8500, status: 'pending', deliveryDate: 'Monday, May 12' },
    { id: 'ORD-002', customer: 'Tunde Bello', items: 2, total: 5200, status: 'confirmed', deliveryDate: 'Monday, May 12' },
    { id: 'ORD-003', customer: 'Chioma Nwosu', items: 4, total: 12000, status: 'pending', deliveryDate: 'Wednesday, May 14' },
  ])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'preorders', label: 'Pre-orders', icon: Clock },
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'schedule', label: 'Cooking Schedule', icon: Calendar },
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
                <div className="flex items-center justify-between mb-2">
                  <Package size={20} style={{ color: '#E8621A' }} />
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '2px 8px',
                    borderRadius: '6px', color: '#E8621A', border: '1px solid #E8621A'
                  }}>+12%</span>
                </div>
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats.totalOrders}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Orders</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign size={20} style={{ color: '#16A34A' }} />
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '2px 8px',
                    borderRadius: '6px', color: '#16A34A', border: '1px solid #16A34A'
                  }}>+8%</span>
                </div>
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>₦{(vendorStats.totalRevenue || 0).toLocaleString()}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Total Revenue</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Star size={20} style={{ color: '#EAB308' }} />
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '2px 8px',
                    borderRadius: '6px', color: '#CA8A04', border: '1px solid #CA8A04'
                  }}>4.8★</span>
                </div>
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats.rating}</h3>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Customer Rating</p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Utensils size={20} style={{ color: '#2563EB' }} />
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '2px 8px',
                    borderRadius: '6px', color: '#2563EB', border: '1px solid #2563EB'
                  }}>Active</span>
                </div>
                <h3 className="text-2xl font-black" style={{ color: '#1C1C1E' }}>{vendorStats.activeMenuItems}</h3>
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
                  {(upcomingCookingDays || []).map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#FFF1E8' }}>
                      <div className="flex items-center gap-3">
                        <Calendar size={20} style={{ color: '#E8621A' }} />
                        <div>
                          <p className="font-bold" style={{ color: '#1C1C1E' }}>{day.date}</p>
                          <p className="text-sm" style={{ color: '#636366' }}>{(day.orders || 0)} orders scheduled</p>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 12px', borderRadius: '8px', background: '#E8621A',
                        color: 'white', fontSize: '12px', fontWeight: '700'
                      }}>Upcoming</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                    Recent Orders
                  </h2>
                  <Link href="/vendor/orders" className="text-sm font-bold" style={{ color: '#E8621A' }}>
                    View All →
                  </Link>
                </div>
                <div className="space-y-4">
                  {(recentOrders || []).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: '#F0EAE0' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFF1E8' }}>
                          <Package size={20} style={{ color: '#E8621A' }} />
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: '#1C1C1E' }}>{order.customer}</p>
                          <p className="text-sm" style={{ color: '#636366' }}>
                            {(order.items || 0)} items • ₦{(order.total || 0).toLocaleString()}
                          </p>
                          <p className="text-xs" style={{ color: '#A0A0A0' }}>
                            Delivery: {order.deliveryDate}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 12px', borderRadius: '8px',
                        background: order.status === 'confirmed' ? '#16A34A' : '#EAB308',
                        color: 'white', fontSize: '12px', fontWeight: '700'
                      }}>{order.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(vendorStats.pendingOrders || 0) > 0 && (
              <div className="p-6 bg-white rounded-2xl shadow-sm border-l-4" style={{ borderLeftColor: '#E8621A' }}>
                <div className="flex items-center gap-4">
                  <AlertCircle size={24} style={{ color: '#E8621A' }} />
                  <div className="flex-1">
                    <h3 className="font-bold" style={{ color: '#1C1C1E' }}>
                      {(vendorStats.pendingOrders || 0)} Pending Orders
                    </h3>
                    <p className="text-sm" style={{ color: '#636366' }}>
                      You have orders awaiting confirmation. Review them now to avoid delays.
                    </p>
                  </div>
                  <button style={{
                    padding: '10px 20px', borderRadius: '12px', border: 'none',
                    background: '#E8621A', color: 'white', fontWeight: '700',
                    cursor: 'pointer'
                  }}>Review Orders</button>
                </div>
              </div>
            )}
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
                <p className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>₦{(vendorStats.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                <p className="text-sm" style={{ color: '#636366' }}>Commission (15%)</p>
                <p className="text-2xl font-bold" style={{ color: '#16A34A' }}>₦{((vendorStats.totalRevenue || 0) * 0.15).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                <p className="text-sm" style={{ color: '#636366' }}>Net Earnings</p>
                <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>₦{((vendorStats.totalRevenue || 0) * 0.85).toLocaleString()}</p>
              </div>
            </div>
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
