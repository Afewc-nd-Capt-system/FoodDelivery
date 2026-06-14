'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const { user, token, loading, authorized } = useAuthGuard('admin')
  const [activeTab, setActiveTab] = useState('overview')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8F0' }}>
      <div>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #F0EAE0', borderTop: '4px solid #E8621A', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#636366', textAlign: 'center' }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (!authorized || !user) return null

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'restaurants', label: 'Restaurants' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'orders', label: 'Orders' },
    { id: 'users', label: 'Users' },
    { id: 'disputes', label: 'Disputes' },
    { id: 'promotions', label: 'Promotions' },
    { id: 'promo-codes', label: 'Promo Codes' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'profile', label: 'Profile' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    window.location.href = '/admin/login'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', display: 'flex' }}>
      <div style={{ width: '240px', background: '#1C1C1E', minHeight: '100vh', padding: '24px 0', position: 'fixed', top: 0, left: 0 }}>
        <div style={{ padding: '0 24px 32px', borderBottom: '1px solid #333' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #E8621A, #BE3A2A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '18px' }}>V</div>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>Admin Panel</span>
          </div>
        </div>
        <nav style={{ padding: '16px 12px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginBottom: '4px', background: activeTab === tab.id ? 'rgba(232,98,26,0.15)' : 'transparent', color: activeTab === tab.id ? '#E8621A' : 'rgba(255,255,255,0.6)', fontWeight: activeTab === tab.id ? '700' : '400', fontSize: '14px' }}
            >{tab.label}</button>
          ))}
        </nav>
        <div style={{ padding: '0 12px', marginTop: '16px' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#FF453A', fontWeight: '600', fontSize: '14px', textAlign: 'left' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ marginLeft: '240px', flex: 1, padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontWeight: '900', fontSize: '24px', color: '#1C1C1E' }}>{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p style={{ color: '#636366', fontSize: '14px' }}>Welcome back, {user?.name}</p>
          </div>
        </div>
        {activeTab === 'overview' && <OverviewTab token={token} />}
        {activeTab === 'restaurants' && <RestaurantsTab token={token} />}
        {activeTab === 'vendors' && <VendorsTab token={token} />}
        {activeTab === 'orders' && <OrdersTab token={token} />}
        {activeTab === 'users' && <UsersTab token={token} />}
        {activeTab === 'disputes' && <DisputesTab token={token} />}
        {activeTab === 'promotions' && <PromotionsTab token={token} />}
        {activeTab === 'promo-codes' && <PromoCodesTab token={token} />}
        {activeTab === 'revenue' && <RevenueTab token={token} />}
        {activeTab === 'profile' && <AdminProfileTab user={user} token={token} />}
      </div>
    </div>
  )
}

const API_BASE = 'https://vibechops.onrender.com/api'

function ErrorFallback({ tab, onRetry }: { tab: string, onRetry: () => void }) {
  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h3 style={{ fontWeight: '700', color: '#1C1C1E', marginBottom: '8px' }}>Could not load {tab}</h3>
      <p style={{ color: '#636366', marginBottom: '24px', fontSize: '14px' }}>There was an error loading this section. The data may not be available yet.</p>
      <button onClick={onRetry} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Try Again</button>
    </div>
  )
}

function OverviewTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch(`${API_BASE}/v2/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      setData(d)
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading overview...</div>
  if (error) return <ErrorFallback tab="overview" onRetry={fetchData} />

  const stats = data || {}
  const cards = [
    { label: 'Total Users', value: stats.totalUsers?.toLocaleString() || '0', icon: '👥', color: '#7C3AED' },
    { label: 'Restaurants', value: stats.totalRestaurants?.toLocaleString() || '0', icon: '🍽️', color: '#16A34A' },
    { label: 'Vendors', value: stats.totalVendors?.toLocaleString() || '0', icon: '👨‍🍳', color: '#2563EB' },
    { label: 'Total Orders', value: stats.totalOrders?.toLocaleString() || '0', icon: '📦', color: '#E8621A' },
    { label: 'Today Revenue', value: `₦${(stats.todayRevenue || 0).toLocaleString()}`, icon: '💰', color: '#F59E0B' },
    { label: 'Open Disputes', value: stats.openDisputes?.toLocaleString() || '0', icon: '⚖️', color: '#D32F2F' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{c.icon}</div>
            <p style={{ color: '#636366', fontSize: '12px', marginBottom: '4px', fontWeight: '600' }}>{c.label}</p>
            <p style={{ color: c.color, fontSize: '22px', fontWeight: '900' }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontWeight: '700', marginBottom: '16px', color: '#1C1C1E' }}>Platform Overview</h3>
        <p style={{ color: '#636366', lineHeight: 1.6 }}>Manage all aspects of VibeChops from this dashboard. Use the sidebar tabs to manage restaurants, vendors, orders, users, disputes, promotions, promo codes, and view revenue analytics.</p>
      </div>
    </div>
  )
}

function RestaurantsTab({ token }: { token: string }) {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [docModal, setDocModal] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3000)
  }

  const apiFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...options })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Request failed: ${res.status}`)
    return res.json()
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const [pending, approved, rejected, all] = await Promise.all([
        apiFetch(`${API_BASE}/v2/admin/restaurants?status=pending_verification`).catch(() => ({ restaurants: [] })),
        apiFetch(`${API_BASE}/v2/admin/restaurants?status=approved`).catch(() => ({ restaurants: [] })),
        apiFetch(`${API_BASE}/v2/admin/restaurants?status=rejected`).catch(() => ({ restaurants: [] })),
        apiFetch(`${API_BASE}/v2/admin/restaurants`).catch(() => ({ restaurants: [] })),
      ])
      setData({ pending, approved, rejected, all })
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async (id: string, action: string, reason?: string) => {
    try {
      await apiFetch(`${API_BASE}/v2/admin/restaurants/${id}/${action}`, { method: 'PATCH', body: reason ? JSON.stringify({ reason }) : undefined })
      showToast(`Restaurant ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'}!`)
      fetchData()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading restaurants...</div>
  if (error) return <ErrorFallback tab="restaurants" onRetry={fetchData} />

  const pending = data?.pending?.restaurants || []
  const approved = data?.approved?.restaurants || []
  const rejected = data?.rejected?.restaurants || []
  const all = data?.all?.restaurants || data?.restaurants || []
  const list = filter === 'pending' ? pending : filter === 'approved' ? approved : filter === 'rejected' ? rejected : all

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 200, padding: '12px 24px', borderRadius: '12px', background: toast.type === 'success' ? '#16A34A' : '#D32F2F', color: 'white', fontWeight: '600', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>{toast.message}</div>}
      {docModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ fontWeight: '800', fontSize: '18px', marginBottom: '16px' }}>Documents — {docModal.name}</h3>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#636366', marginBottom: '8px' }}><strong>RC Number:</strong> {docModal.rcNumber || docModal.businessRegistration || 'N/A'}</p>
              <p style={{ fontSize: '14px', color: '#636366', marginBottom: '8px' }}><strong>TIN:</strong> {docModal.tin || 'N/A'}</p>
              <p style={{ fontSize: '14px', color: '#636366', marginBottom: '8px' }}><strong>Owner:</strong> {docModal.ownerName || docModal.owner?.name || 'N/A'}</p>
              <p style={{ fontSize: '14px', color: '#636366', marginBottom: '8px' }}><strong>Email:</strong> {docModal.email}</p>
              <p style={{ fontSize: '14px', color: '#636366', marginBottom: '8px' }}><strong>Phone:</strong> {docModal.phone}</p>
              <p style={{ fontSize: '14px', color: '#636366', marginBottom: '8px' }}><strong>Registered:</strong> {docModal.createdAt ? new Date(docModal.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            {docModal.cacDocument && <a href={docModal.cacDocument} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '8px 16px', background: '#E8621A', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>View CAC Certificate</a>}
            <button onClick={() => setDocModal(null)} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E8E8E8', background: 'white', color: '#1C1C1E', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '12px' }}>Close</button>
          </div>
        </div>
      )}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: filter === f ? '#E8621A' : '#F5F5F7', color: filter === f ? 'white' : '#636366' }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {list.length === 0 ? <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No restaurants found</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Owner</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>RC Number</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
            </tr></thead>
            <tbody>{list.map((r: any) => (
              <tr key={r._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>{r.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{r.ownerName || r.owner?.name || r.email || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{r.rcNumber || r.businessRegistration || '-'}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: r.verificationStatus === 'approved' ? '#F0FDF4' : r.verificationStatus === 'rejected' ? '#FEF2F2' : '#FFF1E8', color: r.verificationStatus === 'approved' ? '#16A34A' : r.verificationStatus === 'rejected' ? '#D32F2F' : '#E8621A' }}>{r.verificationStatus || 'pending'}</span></td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setDocModal(r)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>View Docs</button>
                    <button onClick={() => handleAction(r._id, 'approve')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Approve</button>
                    <button onClick={() => { const reason = prompt('Reason for request:'); if (reason) handleAction(r._id, 'request-info', reason) }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEFCE8', color: '#A16207', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Request Info</button>
                    <button onClick={() => { const reason = prompt('Reason for rejection:'); if (reason) handleAction(r._id, 'reject', reason) }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function VendorsTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [filter, setFilter] = useState('all')

  const showToast = (msg: string) => { setToast({ message: msg, type: 'success' }); setTimeout(() => setToast(null), 3000) }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch(`${API_BASE}/v2/admin/vendors`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      setData(d)
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const apiFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...options })
    if (!res.ok) throw new Error('Failed')
    return res.json()
  }

  const handleAction = async (id: string, action: string, reason?: string) => {
    try {
      await apiFetch(`${API_BASE}/v2/admin/vendors/${id}/${action}`, { method: 'PATCH', body: reason ? JSON.stringify({ reason }) : undefined })
      showToast(`Vendor ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'}!`)
      fetchData()
    } catch { showToast('Action failed') }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading vendors...</div>
  if (error) return <ErrorFallback tab="vendors" onRetry={fetchData} />

  const vendors = data?.vendors || []
  const filtered = filter === 'all' ? vendors : vendors.filter((v: any) => v.verificationStatus === filter)

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 200, padding: '12px 24px', borderRadius: '12px', background: '#16A34A', color: 'white', fontWeight: '600', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>{toast.message}</div>}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: filter === f ? '#E8621A' : '#F5F5F7', color: filter === f ? 'white' : '#636366' }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {filtered.length === 0 ? <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No vendors found</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Cuisine</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>City</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
            </tr></thead>
            <tbody>{filtered.map((v: any) => (
              <tr key={v._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>{v.businessName || v.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{v.cuisineType || v.cuisine || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{v.address?.city || v.city || '-'}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: v.verificationStatus === 'approved' ? '#F0FDF4' : v.verificationStatus === 'rejected' ? '#FEF2F2' : '#FFF1E8', color: v.verificationStatus === 'approved' ? '#16A34A' : v.verificationStatus === 'rejected' ? '#D32F2F' : '#E8621A' }}>{v.verificationStatus || 'pending'}</span></td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleAction(v._id, 'approve')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Approve</button>
                    <button onClick={() => { const reason = prompt('Reason:'); if (reason) handleAction(v._id, 'reject', reason) }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function OrdersTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch(`${API_BASE}/v2/admin/orders?page=1`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading orders...</div>
  if (error) return <ErrorFallback tab="orders" onRetry={fetchData} />

  const orders = data?.orders || []
  const filtered = filter === 'all' ? orders : orders.filter((o: any) => o.status === filter)

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'preparing', 'delivered', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: filter === f ? '#E8621A' : '#F5F5F7', color: filter === f ? 'white' : '#636366', textTransform: 'capitalize' }}>{f === 'all' ? 'All Orders' : f}</button>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {filtered.length === 0 ? <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No orders found</div> : filtered.map((o: any) => (
          <div key={o._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
            <div onClick={() => setExpandedOrder(expandedOrder === o._id ? null : o._id)} style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <span style={{ fontWeight: '700', fontSize: '14px', minWidth: '100px' }}>{o._id?.slice(-8).toUpperCase() || 'N/A'}</span>
                <span style={{ fontSize: '14px', color: '#636366', flex: 1 }}>{o.customerName || o.user?.name || 'Customer'}</span>
                <span style={{ fontSize: '14px', color: '#636366', flex: 1 }}>{o.restaurantName || o.restaurant?.name || '-'}</span>
                <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '80px' }}>₦{(o.totalAmount || 0).toLocaleString()}</span>
                <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: o.status === 'delivered' ? '#F0FDF4' : o.status === 'cancelled' ? '#FEF2F2' : '#FFF1E8', color: o.status === 'delivered' ? '#16A34A' : o.status === 'cancelled' ? '#D32F2F' : '#E8621A', textTransform: 'capitalize' }}>{o.status}</span>
              </div>
            </div>
            {expandedOrder === o._id && (
              <div style={{ padding: '16px 16px 16px 48px', background: '#FAFAFA', borderTop: '1px solid #F0EAE0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                  <div><strong>Customer:</strong> {o.customerName || o.user?.name || '-'}</div>
                  <div><strong>Phone:</strong> {o.phone || o.user?.phone || '-'}</div>
                  <div><strong>Delivery:</strong> {typeof o.deliveryAddress === 'object' ? `${o.deliveryAddress.street || ''}, ${o.deliveryAddress.city || ''}` : o.deliveryAddress || '-'}</div>
                  <div><strong>Payment:</strong> {o.paymentMethod || '-'} · {o.isPaid ? 'Paid' : 'Unpaid'}</div>
                  <div><strong>Items:</strong> {o.items?.length || 0}</div>
                  <div><strong>Date:</strong> {o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</div>
                </div>
                {o.items?.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <strong style={{ fontSize: '14px' }}>Items:</strong>
                    {o.items.map((item: any, i: number) => (
                      <div key={i} style={{ fontSize: '13px', color: '#636366', marginTop: '4px', paddingLeft: '12px' }}>• {item.name || item.menuItem?.name || 'Item'} x{item.quantity || 1} — ₦{(item.price || 0).toLocaleString()}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch(`${API_BASE}/v2/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading users...</div>
  if (error) return <ErrorFallback tab="users" onRetry={fetchData} />

  const users = data?.users || []
  return (
    <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {users.length === 0 ? <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No users found</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Name</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Email</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Role</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Joined</th>
          </tr></thead>
          <tbody>{users.map((u: any) => (
            <tr key={u._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
              <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>{u.name}</td>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{u.email}</td>
              <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: '#FFF1E8', color: '#E8621A' }}>{u.role}</span></td>
              <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: u.isActive !== false ? '#F0FDF4' : '#FEF2F2', color: u.isActive !== false ? '#16A34A' : '#D32F2F' }}>{u.isActive !== false ? 'Active' : 'Suspended'}</span></td>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

function DisputesTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [evidenceModal, setEvidenceModal] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch(`${API_BASE}/v2/admin/disputes`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const apiFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...options })
    if (!res.ok) throw new Error('Failed')
    return res.json()
  }

  const handleResolve = async (id: string, resolution: 'refund' | 'reject') => {
    try {
      await apiFetch(`${API_BASE}/v2/admin/disputes/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolution }) })
      showToast(resolution === 'refund' ? 'Refund issued!' : 'Dispute rejected!')
      fetchData()
    } catch { showToast('Action failed', 'error') }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading disputes...</div>
  if (error) return <ErrorFallback tab="disputes" onRetry={fetchData} />

  const disputes = data?.disputes || []

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 200, padding: '12px 24px', borderRadius: '12px', background: toast.type === 'success' ? '#16A34A' : '#D32F2F', color: 'white', fontWeight: '600', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>{toast.message}</div>}
      {evidenceModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ fontWeight: '800', marginBottom: '16px' }}>Evidence — Order #{evidenceModal.orderId || evidenceModal._id?.slice(-8)}</h3>
            <p style={{ fontSize: '14px', color: '#636366', marginBottom: '8px' }}><strong>Issue:</strong> {evidenceModal.issue || evidenceModal.reason}</p>
            <p style={{ fontSize: '14px', color: '#636366', marginBottom: '16px' }}><strong>Description:</strong> {evidenceModal.description}</p>
            {evidenceModal.photos?.map((photo: string, i: number) => <img key={i} src={photo} alt={`Evidence ${i + 1}`} style={{ width: '100%', borderRadius: '12px', marginBottom: '8px' }} />)}
            {(!evidenceModal.photos || evidenceModal.photos.length === 0) && <p style={{ color: '#A0A0A0', fontSize: '14px' }}>No photos attached</p>}
            <button onClick={() => setEvidenceModal(null)} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E8E8E8', background: 'white', color: '#1C1C1E', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '12px' }}>Close</button>
          </div>
        </div>
      )}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {disputes.length === 0 ? <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No disputes found</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Order ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Issue</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
            </tr></thead>
            <tbody>{disputes.map((d: any) => (
              <tr key={d._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>#{d.orderId?.slice(-8) || d._id?.slice(-8)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{d.customerName || d.user?.name || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{d.issue || d.reason || '-'}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: d.status === 'resolved' ? '#F0FDF4' : d.status === 'rejected' ? '#FEF2F2' : '#FFF1E8', color: d.status === 'resolved' ? '#16A34A' : d.status === 'rejected' ? '#D32F2F' : '#E8621A' }}>{d.status || 'open'}</span></td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setEvidenceModal(d)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Evidence</button>
                    <button onClick={() => handleResolve(d._id, 'refund')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Refund</button>
                    <button onClick={() => handleResolve(d._id, 'reject')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function PromotionsTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch(`${API_BASE}/v2/admin/promotions`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading promotions...</div>
  if (error) return <ErrorFallback tab="promotions" onRetry={fetchData} />

  const promotions = data?.promotions || []
  return (
    <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {promotions.length === 0 ? <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No promotions found</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Restaurant</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Discount</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Dates</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
          </tr></thead>
          <tbody>{promotions.map((p: any) => (
            <tr key={p._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
              <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>{p.restaurantName || p.restaurant?.name || '-'}</td>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{p.discountType === 'percentage' ? `${p.discountValue}%` : `₦${p.discountValue}`}</td>
              <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'} — {p.endDate ? new Date(p.endDate).toLocaleDateString() : p.validUntil ? new Date(p.validUntil).toLocaleDateString() : '-'}</td>
              <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: p.status === 'active' || p.status === 'approved' ? '#F0FDF4' : p.status === 'rejected' ? '#FEF2F2' : '#FFF1E8', color: p.status === 'active' || p.status === 'approved' ? '#16A34A' : p.status === 'rejected' ? '#D32F2F' : '#E8621A' }}>{p.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

function PromoCodesTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [codeForm, setCodeForm] = useState({ code: '', discountType: 'percentage', discountValue: '', minOrder: '', expiresAt: '' })

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000) }

  const apiFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...options })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed')
    return res.json()
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch(`${API_BASE}/v2/admin/promo-codes`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!codeForm.code || !codeForm.discountValue) { showToast('Code and discount value required', 'error'); return }
    try {
      await apiFetch(`${API_BASE}/v2/admin/promo-codes`, { method: 'POST', body: JSON.stringify({ ...codeForm, discountValue: Number(codeForm.discountValue), minOrder: codeForm.minOrder ? Number(codeForm.minOrder) : 0 }) })
      showToast('Promo code created!')
      setCodeForm({ code: '', discountType: 'percentage', discountValue: '', minOrder: '', expiresAt: '' })
      fetchData()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promo code?')) return
    try {
      await apiFetch(`${API_BASE}/v2/admin/promo-codes/${id}`, { method: 'DELETE' })
      showToast('Promo code deleted!')
      fetchData()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading promo codes...</div>
  if (error) return <ErrorFallback tab="promo-codes" onRetry={fetchData} />

  const promoCodes = data?.codes || []
  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 200, padding: '12px 24px', borderRadius: '12px', background: toast.type === 'success' ? '#16A34A' : '#D32F2F', color: 'white', fontWeight: '600', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>{toast.message}</div>}
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontWeight: '700', marginBottom: '16px', color: '#1C1C1E' }}>Create Promo Code</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          <input placeholder="Code (e.g. VIBES20)" value={codeForm.code} onChange={e => setCodeForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }} />
          <select value={codeForm.discountType} onChange={e => setCodeForm(p => ({ ...p, discountType: e.target.value }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}>
            <option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option>
          </select>
          <input placeholder="Discount value" type="number" value={codeForm.discountValue} onChange={e => setCodeForm(p => ({ ...p, discountValue: e.target.value }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }} />
          <input placeholder="Min order (₦)" type="number" value={codeForm.minOrder} onChange={e => setCodeForm(p => ({ ...p, minOrder: e.target.value }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }} />
          <input placeholder="Expiry date" type="date" value={codeForm.expiresAt} onChange={e => setCodeForm(p => ({ ...p, expiresAt: e.target.value }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }} />
          <button onClick={handleCreate} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Create Code</button>
        </div>
      </div>
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {promoCodes.length === 0 ? <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No promo codes yet</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Code</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Value</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Uses</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Expiry</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
            </tr></thead>
            <tbody>{promoCodes.map((pc: any) => {
              const isExpired = pc.expiresAt ? new Date(pc.expiresAt) < new Date() : false
              return (
                <tr key={pc._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>{pc.code}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366', textTransform: 'capitalize' }}>{pc.discountType}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{pc.discountType === 'percentage' ? `${pc.discountValue}%` : `₦${pc.discountValue}`}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{pc.usageCount || 0}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{pc.expiresAt ? new Date(pc.expiresAt).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: isExpired ? '#FEF2F2' : '#F0FDF4', color: isExpired ? '#D32F2F' : '#16A34A' }}>{isExpired ? 'Expired' : 'Active'}</span></td>
                  <td style={{ padding: '12px 16px' }}><button onClick={() => handleDelete(pc._id)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Delete</button></td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function AdminProfileTab({ user, token }: { user: any, token: string }) {
  const [name, setName] = useState(user?.name || '')
  const [email] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('https://vibechops.onrender.com/api/v2/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {} finally { setSaving(false) }
  }

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) return
    setPwSaving(true)
    try {
      await fetch('https://vibechops.onrender.com/api/v2/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      })
      setOldPassword('')
      setNewPassword('')
      alert('Password changed successfully')
    } catch {} finally { setPwSaving(false) }
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontWeight: '700', marginBottom: '24px', color: '#1C1C1E' }}>Admin Profile</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #E8621A, #BE3A2A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: 'white' }}>
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <p style={{ fontWeight: '800', fontSize: '18px', color: '#1C1C1E', margin: '0 0 4px' }}>{user?.name}</p>
            <p style={{ color: '#636366', margin: '0 0 4px', fontSize: '14px' }}>{user?.email}</p>
            <span style={{ background: '#FFF1E8', color: '#E8621A', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>Super Admin</span>
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: '600', color: '#636366', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8E8E8', borderRadius: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontWeight: '600', color: '#636366', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Email Address</label>
          <input value={email} disabled style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8E8E8', borderRadius: '12px', fontSize: '15px', background: '#FAFAFA', color: '#A0A0A0', boxSizing: 'border-box' }} />
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding: '12px 24px', border: 'none', borderRadius: '12px', background: saved ? '#16A34A' : 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontWeight: '700', marginBottom: '24px', color: '#1C1C1E' }}>Change Password</h3>
        {[
          { label: 'Current Password', value: oldPassword, set: setOldPassword },
          { label: 'New Password', value: newPassword, set: setNewPassword },
        ].map(field => (
          <div key={field.label} style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: '600', color: '#636366', display: 'block', marginBottom: '6px', fontSize: '13px' }}>{field.label}</label>
            <input type="password" value={field.value} onChange={e => field.set(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8E8E8', borderRadius: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
        <button onClick={handlePasswordChange} disabled={pwSaving} style={{ padding: '12px 24px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
          {pwSaving ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}

function RevenueTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch(`${API_BASE}/v2/admin/revenue/overview?period=30`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch { setError(true) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#636366' }}>Loading revenue...</div>
  if (error) return <ErrorFallback tab="revenue" onRetry={fetchData} />

  const rev = data || {}
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Revenue', value: `₦${(rev.totalRevenue || 0).toLocaleString()}`, color: '#1C1C1E' },
          { label: 'Commission Revenue', value: `₦${(rev.commissionRevenue || 0).toLocaleString()}`, color: '#16A34A' },
          { label: 'Subscription Revenue', value: `₦${(rev.subscriptionRevenue || 0).toLocaleString()}`, color: '#2563EB' },
          { label: 'Ad Revenue', value: `₦${(rev.adRevenue || 0).toLocaleString()}`, color: '#E8621A' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ color: '#636366', fontSize: '12px', marginBottom: '4px', fontWeight: '600' }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: '22px', fontWeight: '900' }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
