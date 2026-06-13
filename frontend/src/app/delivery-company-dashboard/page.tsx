'use client'
import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  Users, Package, DollarSign, TrendingUp, Star,
  Bike, Settings, Wallet, Plus, User, History, Bell
} from 'lucide-react'

export default function DeliveryCompanyDashboardPage() {
  const { user, loading, authorized } = useAuthGuard('delivery_company')
  const [activeTab, setActiveTab] = useState('overview')
  const [deliveryJobs, setDeliveryJobs] = useState<any[]>([])
  const [socketConnected, setSocketConnected] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  // Socket.io for real-time delivery job notifications
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !user) return

    let socket: any = null

    import('socket.io-client').then(({ io }) => {
      socket = io('https://vibechops.onrender.com', {
        auth: { token },
        transports: ['polling', 'websocket'],
      })

      socket.on('connect', () => {
        setSocketConnected(true)
        socket.emit('join_room', { role: 'delivery_company', id: user._id })
      })

      socket.on('new_delivery_job', (job: any) => {
        setDeliveryJobs((prev: any[]) => [job, ...prev])
        setNotificationCount((prev: number) => prev + 1)
      })

      socket.on('connect_error', () => setSocketConnected(false))
    })

    return () => { if (socket) socket.disconnect() }
  }, [user])
  const [companyStats] = useState({
    totalRiders: 24,
    activeRiders: 18,
    totalDeliveries: 1250,
    totalEarnings: 375000,
    rating: 4.7,
    wallet: { balance: 87500, pendingWithdrawals: 12500 }
  })
  const [riders] = useState([
    { id: '1', name: 'Emmanuel Okafor', phone: '08012345678', vehicleType: 'bike', isOnline: true, totalDeliveries: 45, rating: 4.8 },
    { id: '2', name: 'Chinedu Eze', phone: '08023456789', vehicleType: 'scooter', isOnline: true, totalDeliveries: 38, rating: 4.6 },
    { id: '3', name: 'Adebayo Johnson', phone: '08034567890', vehicleType: 'bike', isOnline: false, totalDeliveries: 52, rating: 4.9 },
  ])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'riders', label: 'Riders', icon: Bike },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'history', label: 'History', icon: History },
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
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-black text-white mb-1">Delivery Company</h1>
                  <p className="text-white/40 text-sm">Welcome back, {user?.name || 'Company'}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-5" style={{ background: socketConnected ? 'rgba(22,163,74,0.2)' : 'rgba(211,47,47,0.2)', color: socketConnected ? '#16A34A' : '#D32F2F' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: socketConnected ? '#16A34A' : '#D32F2F' }} />
                  {socketConnected ? 'Live' : 'Offline'}
                </div>
                {notificationCount > 0 && (
                  <div className="relative mt-5">
                    <Bell size={18} className="text-white" />
                    <span style={{ position: 'absolute', top: '-6px', right: '-6px', padding: '2px 6px', borderRadius: '8px', background: '#E8621A', color: 'white', fontSize: '10px', fontWeight: '700' }}>{notificationCount}</span>
                  </div>
                )}
              </div>
            <div className="flex items-center gap-3">
              <button style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: '#E8621A', color: 'white', fontWeight: '700', fontSize: '14px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <Plus size={16} /> Add Rider
              </button>
              <button style={{
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '600', fontSize: '14px',
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { icon: Users, label: 'Total Riders', value: companyStats.totalRiders, color: '#2563EB' },
                { icon: Bike, label: 'Active Riders', value: companyStats.activeRiders, color: '#16A34A' },
                { icon: Package, label: 'Total Deliveries', value: companyStats.totalDeliveries, color: '#E8621A' },
                { icon: DollarSign, label: 'Total Earnings', value: `₦${((companyStats.totalEarnings || 0) / 1000).toFixed(0)}K`, color: '#F59E0B' },
                { icon: Star, label: 'Rating', value: companyStats.rating, color: '#8B5CF6' },
                { icon: Wallet, label: 'Wallet', value: `₦${((companyStats.wallet?.balance || 0) / 1000).toFixed(0)}K`, color: '#10B981' },
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

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black" style={{ color: '#1C1C1E' }}>
                  Active Riders
                  <span style={{
                    marginLeft: '8px', padding: '2px 10px', borderRadius: '8px',
                    fontSize: '12px', fontWeight: '700', background: '#FFF1E8', color: '#E8621A'
                  }}>{(riders || []).length}</span>
                </h2>
              </div>
              <div className="space-y-4">
                {(riders || []).map((rider) => (
                  <div key={rider.id} className="p-6 bg-white rounded-2xl shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                          <Bike size={24} style={{ color: '#2563EB' }} />
                        </div>
                        <div>
                          <h3 className="font-bold" style={{ color: '#1C1C1E' }}>{rider.name}</h3>
                          <p className="text-sm" style={{ color: '#636366' }}>{rider.phone}</p>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                        background: rider.isOnline ? '#F0FDF4' : '#F5F5F5',
                        color: rider.isOnline ? '#16A34A' : '#636366'
                      }}>{rider.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs" style={{ color: '#A0A0A0' }}>Vehicle Type</p>
                        <p className="font-bold" style={{ color: '#1C1C1E' }}>{rider.vehicleType}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#A0A0A0' }}>Deliveries</p>
                        <p className="font-bold" style={{ color: '#1C1C1E' }}>{rider.totalDeliveries}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#A0A0A0' }}>Rating</p>
                        <p className="font-bold" style={{ color: '#1C1C1E' }}>{rider.rating} ⭐</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'riders' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="font-bold mb-4" style={{ color: '#1C1C1E' }}>Riders Management</h3>
            <div className="space-y-4">
              {(riders || []).map((rider) => (
                <div key={rider.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F5F5F7' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                      <Bike size={20} style={{ color: '#2563EB' }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#1C1C1E' }}>{rider.name}</p>
                      <p className="text-xs" style={{ color: '#636366' }}>{rider.phone}</p>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                    background: rider.isOnline ? '#F0FDF4' : '#F5F5F5',
                    color: rider.isOnline ? '#16A34A' : '#636366'
                  }}>{rider.isOnline ? 'Online' : 'Offline'}</span>
                </div>
              ))}
              {(riders || []).length === 0 && (
                <div className="text-center py-12" style={{ color: '#636366' }}>
                  <Bike size={48} style={{ color: '#E8E8E8' }} />
                  <p className="mt-2 font-bold" style={{ color: '#1C1C1E' }}>No riders yet</p>
                  <p className="text-sm">Add riders from the button above</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'earnings' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Earnings', value: '₦375,000', color: '#16A34A' },
                { label: 'This Month', value: '₦82,500', color: '#2563EB' },
                { label: 'Pending Payout', value: '₦12,500', color: '#E8621A' },
              ].map((stat) => (
                <div key={stat.label} className="p-6 bg-white rounded-2xl shadow-sm">
                  <p className="text-sm" style={{ color: '#636366' }}>{stat.label}</p>
                  <p className="text-2xl font-black mt-1" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm">
              <h3 className="font-bold mb-4" style={{ color: '#1C1C1E' }}>Recent Transactions</h3>
              <div className="text-center py-8" style={{ color: '#636366' }}>
                <DollarSign size={48} style={{ color: '#E8E8E8' }} />
                <p className="mt-2 text-sm">Transaction history will appear here</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'wallet' && (
          <div>
            <div className="p-8 bg-white rounded-2xl shadow-sm mb-6 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FFF1E8' }}>
                <Wallet size={32} style={{ color: '#E8621A' }} />
              </div>
              <p className="text-sm" style={{ color: '#636366' }}>Available Balance</p>
              <p className="text-4xl font-black mt-1" style={{ color: '#1C1C1E' }}>₦87,500</p>
              <p className="text-sm mt-2" style={{ color: '#D32F2F' }}>Pending withdrawals: ₦12,500</p>
              <div className="flex gap-3 justify-center mt-6">
                <button style={{
                  padding: '12px 24px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #E8621A, #C4501A)',
                  color: 'white', fontWeight: '700', cursor: 'pointer'
                }}>Withdraw</button>
                <button style={{
                  padding: '12px 24px', borderRadius: '12px', border: '1.5px solid #E8E8E8',
                  background: 'white', color: '#1C1C1E', fontWeight: '700', cursor: 'pointer'
                }}>Transaction History</button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="font-bold mb-4" style={{ color: '#1C1C1E' }}>Delivery History</h3>
            <div className="space-y-3">
              {[
                { id: 'DEL-4521', customer: 'Funmi Adeyemi', amount: '₦8,500', status: 'Delivered', time: '2 hours ago' },
                { id: 'DEL-4520', customer: 'Tunde Bello', amount: '₦5,200', status: 'Delivered', time: '4 hours ago' },
                { id: 'DEL-4519', customer: 'Chioma Obi', amount: '₦3,800', status: 'Cancelled', time: 'Yesterday' },
                { id: 'DEL-4518', customer: 'Segun Adebayo', amount: '₦12,000', status: 'Delivered', time: 'Yesterday' },
              ].map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F5F5F7' }}>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#1C1C1E' }}>{delivery.customer}</p>
                    <p className="text-xs" style={{ color: '#636366' }}>{delivery.id} · {delivery.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: '#1C1C1E' }}>{delivery.amount}</p>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                      background: delivery.status === 'Delivered' ? '#F0FDF4' : '#FEF2F2',
                      color: delivery.status === 'Delivered' ? '#16A34A' : '#D32F2F'
                    }}>{delivery.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="font-bold mb-4" style={{ color: '#1C1C1E' }}>Company Profile</h3>
            <div className="space-y-4">
              {[
                { label: 'Company Name', value: user?.name || 'VibeChops Delivery Co.' },
                { label: 'Email', value: user?.email || 'company@vibechops.com' },
                { label: 'Phone', value: '08012345678' },
                { label: 'Total Riders', value: String(companyStats.totalRiders) },
                { label: 'Active Riders', value: String(companyStats.activeRiders) },
              ].map((field) => (
                <div key={field.label} className="flex justify-between items-center p-3 rounded-xl" style={{ background: '#F5F5F7' }}>
                  <span className="text-sm" style={{ color: '#636366' }}>{field.label}</span>
                  <span className="text-sm font-bold" style={{ color: '#1C1C1E' }}>{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
