'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const { user, token, loading, authorized } = useAuthGuard('admin')
  const [activeTab, setActiveTab] = useState('overview')

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#FFF8F0'
    }}>
      <div>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '4px solid #F0EAE0',
          borderTop: '4px solid #E8621A',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
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
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    window.location.href = '/admin/login'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', display: 'flex' }}>
      <div style={{
        width: '240px', background: '#1C1C1E', minHeight: '100vh',
        padding: '24px 0', position: 'fixed', top: 0, left: 0
      }}>
        <div style={{ padding: '0 24px 32px', borderBottom: '1px solid #333' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '900', fontSize: '18px'
            }}>V</div>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>
              Admin Panel
            </span>
          </div>
        </div>
        <nav style={{ padding: '16px 12px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: '10px',
                border: 'none', cursor: 'pointer', marginBottom: '4px',
                background: activeTab === tab.id
                  ? 'rgba(232,98,26,0.15)' : 'transparent',
                color: activeTab === tab.id ? '#E8621A' : 'rgba(255,255,255,0.6)',
                fontWeight: activeTab === tab.id ? '700' : '400',
                fontSize: '14px',
              }}
            >{tab.label}</button>
          ))}
        </nav>
        <div style={{ padding: '0 12px', marginTop: '16px' }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '10px 12px', borderRadius: '10px',
            border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#FF453A',
            fontWeight: '600', fontSize: '14px', textAlign: 'left'
          }}>Sign Out</button>
        </div>
      </div>

      <div style={{ marginLeft: '240px', flex: 1, padding: '32px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ fontWeight: '900', fontSize: '24px', color: '#1C1C1E' }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p style={{ color: '#636366', fontSize: '14px' }}>
              Welcome back, {user?.name}
            </p>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px', marginBottom: '24px'
            }}>
              {[
                { label: 'Total Revenue', value: '₦0', color: '#E8621A' },
                { label: 'Total Orders', value: '0', color: '#2563EB' },
                { label: 'Restaurants', value: '0', color: '#16A34A' },
                { label: 'Users', value: '0', color: '#7C3AED' },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: 'white', borderRadius: '16px',
                  padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  <p style={{ color: '#636366', fontSize: '12px',
                    marginBottom: '8px', fontWeight: '600' }}>
                    {stat.label}
                  </p>
                  <p style={{ color: stat.color, fontSize: '24px',
                    fontWeight: '900' }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div style={{
              background: 'white', borderRadius: '16px', padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              <h3 style={{ fontWeight: '700', marginBottom: '16px' }}>
                Platform Overview
              </h3>
              <p style={{ color: '#636366' }}>
                Select a tab from the sidebar to manage restaurants,
                vendors, orders, users, disputes, and more.
              </p>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <AdminTabContent tab={activeTab} token={token} />
        )}
      </div>
    </div>
  )
}

const API_BASE = 'https://vibechops.onrender.com/api'

function AdminTabContent({ tab, token }: { tab: string, token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const apiFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, { headers, ...options })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Request failed: ${res.status}`)
    }
    return res.json()
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    const fetchData = async () => {
      try {
        switch (tab) {
          case 'overview':
            const stats = await apiFetch(`${API_BASE}/v2/admin/stats`).catch(() => null)
            setData(stats || {
              totalUsers: 0, totalRestaurants: 0, totalVendors: 0,
              totalOrders: 0, revenueToday: 0, pendingApprovals: 0
            })
            break
          case 'restaurants': {
            const [pending, approved, rejected, all] = await Promise.all([
              apiFetch(`${API_BASE}/v2/admin/restaurants?status=pending_verification`).catch(() => ({ restaurants: [] })),
              apiFetch(`${API_BASE}/v2/admin/restaurants?status=approved`).catch(() => ({ restaurants: [] })),
              apiFetch(`${API_BASE}/v2/admin/restaurants?status=rejected`).catch(() => ({ restaurants: [] })),
              apiFetch(`${API_BASE}/v2/admin/restaurants`).catch(() => ({ restaurants: [] })),
            ])
            setData({ pending, approved, rejected, all })
            break
          }
          case 'vendors':
            setData(await apiFetch(`${API_BASE}/v2/admin/vendors`).catch(() => ({ vendors: [] })))
            break
          case 'orders':
            setData(await apiFetch(`${API_BASE}/v2/admin/orders?page=1`).catch(() => ({ orders: [] })))
            break
          case 'users':
            setData(await apiFetch(`${API_BASE}/v2/users`).catch(() => ({ users: [] })))
            break
          case 'disputes':
            setData(await apiFetch(`${API_BASE}/v2/admin/disputes`).catch(() => ({ disputes: [] })))
            break
          case 'promotions':
            setData(await apiFetch(`${API_BASE}/v2/admin/promotions`).catch(() => ({ promotions: [] })))
            break
          case 'promo-codes':
            setData(await apiFetch(`${API_BASE}/v2/admin/promo-codes`).catch(() => ({ promoCodes: [] })))
            break
          case 'revenue':
            setData(await apiFetch(`${API_BASE}/v2/admin/revenue/overview?period=30`).catch(() => ({
              totalRevenue: 0, commissionRevenue: 0, subscriptionRevenue: 0, adRevenue: 0, daily: []
            })))
            break
        }
      } catch (err: any) {
        setError(err.message)
        setData({})
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tab])

  if (loading) return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '60px 40px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #F0EAE0', borderTop: '4px solid #E8621A', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ color: '#636366' }}>Loading...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <p style={{ color: '#D32F2F', fontWeight: '700', marginBottom: '8px' }}>Error: {error}</p>
      <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: '#E8621A', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Retry</button>
    </div>
  )

  const renderOverview = () => {
    const stats = data || {}
    const cards = [
      { label: 'Total Users', value: stats.totalUsers?.toLocaleString() || '0', icon: '👥', color: '#7C3AED' },
      { label: 'Restaurants', value: stats.totalRestaurants?.toLocaleString() || '0', icon: '🍽️', color: '#16A34A' },
      { label: 'Vendors', value: stats.totalVendors?.toLocaleString() || '0', icon: '👨‍🍳', color: '#2563EB' },
      { label: 'Total Orders', value: stats.totalOrders?.toLocaleString() || '0', icon: '📦', color: '#E8621A' },
      { label: 'Revenue Today', value: `₦${(stats.revenueToday || 0).toLocaleString()}`, icon: '💰', color: '#F59E0B' },
      { label: 'Pending Approvals', value: stats.pendingApprovals?.toLocaleString() || '0', icon: '⏳', color: '#D32F2F' },
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
          <p style={{ color: '#636366', lineHeight: 1.6 }}>
            Manage all aspects of VibeChops from this dashboard. Use the sidebar tabs to manage restaurants, vendors, orders, users, disputes, promotions, promo codes, and view revenue analytics.
          </p>
        </div>
      </div>
    )
  }

  const renderRestaurants = () => {
    const [restaurantFilter, setRestaurantFilter] = useState('pending')
    const [docModal, setDocModal] = useState<any>(null)
    const all = data?.all?.restaurants || data?.restaurants || []
    const pending = data?.pending?.restaurants || []
    const approved = data?.approved?.restaurants || []
    const rejected = data?.rejected?.restaurants || []
    const list = restaurantFilter === 'pending' ? pending : restaurantFilter === 'approved' ? approved : restaurantFilter === 'rejected' ? rejected : all

    const handleAction = async (id: string, action: string, reason?: string) => {
      try {
        await apiFetch(`${API_BASE}/v2/admin/restaurants/${id}/${action}`, {
          method: 'PATCH',
          body: reason ? JSON.stringify({ reason }) : undefined,
        })
        showToast(`Restaurant ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'} successfully!`)
        setData((prev: any) => ({
          ...prev,
          pending: { restaurants: prev.pending.restaurants.filter((r: any) => r._id !== id) },
          approved: action === 'approve' ? { restaurants: [...prev.approved.restaurants, prev.pending.restaurants.find((r: any) => r._id === id)] } : prev.approved,
          rejected: action === 'reject' ? { restaurants: [...prev.rejected.restaurants, prev.pending.restaurants.find((r: any) => r._id === id)] } : prev.rejected,
        }))
      } catch (err: any) {
        showToast(err.message, 'error')
      }
    }

    return (
      <div>
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
              {docModal.cacDocument && (
                <a href={docModal.cacDocument} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '8px 16px', background: '#E8621A', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>View CAC Certificate</a>
              )}
              <button onClick={() => setDocModal(null)} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E8E8E8', background: 'white', color: '#1C1C1E', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '12px' }}>Close</button>
            </div>
          </div>
        )}
        {toast && (
          <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 200, padding: '12px 24px', borderRadius: '12px', background: toast.type === 'success' ? '#16A34A' : '#D32F2F', color: 'white', fontWeight: '600', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>{toast.message}</div>
        )}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button key={f} onClick={() => setRestaurantFilter(f)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: restaurantFilter === f ? '#E8621A' : '#F5F5F7', color: restaurantFilter === f ? 'white' : '#636366' }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {list.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No restaurants found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Owner</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>RC Number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>{r.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{r.ownerName || r.owner?.name || r.email || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{r.rcNumber || r.businessRegistration || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: r.verificationStatus === 'approved' ? '#F0FDF4' : r.verificationStatus === 'rejected' ? '#FEF2F2' : '#FFF1E8', color: r.verificationStatus === 'approved' ? '#16A34A' : r.verificationStatus === 'rejected' ? '#D32F2F' : '#E8621A' }}>{r.verificationStatus || 'pending'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setDocModal(r)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>View Docs</button>
                        <button onClick={() => handleAction(r._id, 'approve')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Approve</button>
                        <button onClick={() => { const reason = prompt('Reason for request:'); if (reason) handleAction(r._id, 'request-info', reason) }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEFCE8', color: '#A16207', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Request Info</button>
                        <button onClick={() => { const reason = prompt('Reason for rejection:'); if (reason) handleAction(r._id, 'reject', reason) }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  const renderVendors = () => {
    const vendors = (data as any)?.vendors || []
    const [vendorFilter, setVendorFilter] = useState('all')
    const filtered = vendorFilter === 'all' ? vendors : vendors.filter((v: any) => v.verificationStatus === vendorFilter)
    return (
      <div>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setVendorFilter(f)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: vendorFilter === f ? '#E8621A' : '#F5F5F7', color: vendorFilter === f ? 'white' : '#636366' }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No vendors found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Cuisine</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>City</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v: any) => (
                  <tr key={v._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>{v.businessName || v.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{v.cuisineType || v.cuisine || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{v.address?.city || v.city || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: v.verificationStatus === 'approved' ? '#F0FDF4' : v.verificationStatus === 'rejected' ? '#FEF2F2' : '#FFF1E8', color: v.verificationStatus === 'approved' ? '#16A34A' : v.verificationStatus === 'rejected' ? '#D32F2F' : '#E8621A' }}>{v.verificationStatus || 'pending'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={async () => { try { await apiFetch(`${API_BASE}/v2/admin/vendors/${v._id}/approve`, { method: 'PATCH' }); showToast('Vendor approved!'); window.location.reload() } catch (e: any) { showToast(e.message, 'error') } }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Approve</button>
                        <button onClick={async () => { const reason = prompt('Reason for rejection:'); if (!reason) return; try { await apiFetch(`${API_BASE}/v2/admin/vendors/${v._id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }); showToast('Vendor rejected!'); window.location.reload() } catch (e: any) { showToast(e.message, 'error') } }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  const renderOrders = () => {
    const orders = (data as any)?.orders || []
    const [orderFilter, setOrderFilter] = useState('all')
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const filtered = orderFilter === 'all' ? orders : orders.filter((o: any) => o.status === orderFilter)
    return (
      <div>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'preparing', 'delivered', 'cancelled'].map(f => (
            <button key={f} onClick={() => setOrderFilter(f)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: orderFilter === f ? '#E8621A' : '#F5F5F7', color: orderFilter === f ? 'white' : '#636366', textTransform: 'capitalize' }}>{f === 'all' ? 'All Orders' : f}</button>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No orders found</div>
          ) : (
            filtered.map((o: any) => (
              <div key={o._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                <div onClick={() => setExpandedOrder(expandedOrder === o._id ? null : o._id)} style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', minWidth: '100px' }}>{o._id?.slice(-8).toUpperCase() || o.orderId || 'N/A'}</span>
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
                      <div><strong>Delivery Address:</strong> {typeof o.deliveryAddress === 'object' ? `${o.deliveryAddress.street || ''}, ${o.deliveryAddress.city || ''}` : o.deliveryAddress || '-'}</div>
                      <div><strong>Payment:</strong> {o.paymentMethod || '-'} · {o.isPaid ? 'Paid' : 'Unpaid'}</div>
                      <div><strong>Items:</strong> {o.items?.length || 0}</div>
                      <div><strong>Date:</strong> {o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</div>
                    </div>
                    {o.items && o.items.length > 0 && (
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
            ))
          )}
        </div>
      </div>
    )
  }

  const renderUsers = () => {
    const users = (data as any)?.users || []
    return (
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {users.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No users found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Joined</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>{u.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: '#FFF1E8', color: '#E8621A' }}>{u.role}</span></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: u.isActive !== false ? '#F0FDF4' : '#FEF2F2', color: u.isActive !== false ? '#16A34A' : '#D32F2F' }}>{u.isActive !== false ? 'Active' : 'Suspended'}</span></td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={async () => { try { await apiFetch(`${API_BASE}/v2/admin/users/${u._id}/${u.isActive !== false ? 'suspend' : 'restore'}`, { method: 'PATCH' }); showToast(`User ${u.isActive !== false ? 'suspended' : 'restored'}!`); window.location.reload() } catch (e: any) { showToast(e.message, 'error') } }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: u.isActive !== false ? '#FEF2F2' : '#F0FDF4', color: u.isActive !== false ? '#D32F2F' : '#16A34A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{u.isActive !== false ? 'Suspend' : 'Restore'}</button>
                      <button onClick={() => router.push(`/admin/orders?userId=${u._id}`)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Orders</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const renderDisputes = () => {
    const disputes = (data as any)?.disputes || []
    const [evidenceModal, setEvidenceModal] = useState<any>(null)
    return (
      <div>
        {evidenceModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '90%' }}>
              <h3 style={{ fontWeight: '800', marginBottom: '16px' }}>Evidence — Order #{evidenceModal.orderId || evidenceModal._id?.slice(-8)}</h3>
              <p style={{ fontSize: '14px', color: '#636366', marginBottom: '8px' }}><strong>Issue:</strong> {evidenceModal.issue || evidenceModal.reason}</p>
              <p style={{ fontSize: '14px', color: '#636366', marginBottom: '16px' }}><strong>Description:</strong> {evidenceModal.description}</p>
              {evidenceModal.photos?.map((photo: string, i: number) => (
                <img key={i} src={photo} alt={`Evidence ${i + 1}`} style={{ width: '100%', borderRadius: '12px', marginBottom: '8px' }} />
              ))}
              {(!evidenceModal.photos || evidenceModal.photos.length === 0) && <p style={{ color: '#A0A0A0', fontSize: '14px' }}>No photos attached</p>}
              <button onClick={() => setEvidenceModal(null)} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E8E8E8', background: 'white', color: '#1C1C1E', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '12px' }}>Close</button>
            </div>
          </div>
        )}
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {disputes.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No disputes found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Order ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Customer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Issue</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d: any) => (
                  <tr key={d._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>#{d.orderId?.slice(-8) || d._id?.slice(-8)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{d.customerName || d.user?.name || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{d.issue || d.reason || '-'}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: d.status === 'resolved' ? '#F0FDF4' : d.status === 'rejected' ? '#FEF2F2' : '#FFF1E8', color: d.status === 'resolved' ? '#16A34A' : d.status === 'rejected' ? '#D32F2F' : '#E8621A' }}>{d.status || 'open'}</span></td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setEvidenceModal(d)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Evidence</button>
                        <button onClick={async () => { try { await apiFetch(`${API_BASE}/v2/admin/disputes/${d._id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolution: 'refund' }) }); showToast('Refund issued!'); window.location.reload() } catch (e: any) { showToast(e.message, 'error') } }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Refund</button>
                        <button onClick={async () => { try { await apiFetch(`${API_BASE}/v2/admin/disputes/${d._id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolution: 'reject' }) }); showToast('Dispute rejected!'); window.location.reload() } catch (e: any) { showToast(e.message, 'error') } }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  const renderPromotions = () => {
    const promotions = (data as any)?.promotions || []
    return (
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {promotions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No promotions found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Restaurant</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Discount</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Dates</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p: any) => (
                <tr key={p._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600' }}>{p.restaurantName || p.restaurant?.name || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{p.discountType === 'percentage' ? `${p.discountValue}%` : `₦${p.discountValue}`}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'} — {p.endDate ? new Date(p.endDate).toLocaleDateString() : p.validUntil ? new Date(p.validUntil).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: p.status === 'active' || p.status === 'approved' ? '#F0FDF4' : p.status === 'rejected' ? '#FEF2F2' : '#FFF1E8', color: p.status === 'active' || p.status === 'approved' ? '#16A34A' : p.status === 'rejected' ? '#D32F2F' : '#E8621A' }}>{p.status}</span></td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={async () => { try { await apiFetch(`${API_BASE}/v2/admin/promotions/${p._id}/approve`, { method: 'PUT' }); showToast('Promotion approved!'); window.location.reload() } catch (e: any) { showToast(e.message, 'error') } }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Approve</button>
                      <button onClick={async () => { const reason = prompt('Reason for rejection:'); if (!reason) return; try { await apiFetch(`${API_BASE}/v2/admin/promotions/${p._id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }); showToast('Promotion rejected!'); window.location.reload() } catch (e: any) { showToast(e.message, 'error') } }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const renderPromoCodes = () => {
    const [codeForm, setCodeForm] = useState({ code: '', discountType: 'percentage', discountValue: '', minOrder: '', expiresAt: '' })
    const promoCodes = (data as any)?.promoCodes || []
    const handleCreate = async () => {
      if (!codeForm.code || !codeForm.discountValue) { showToast('Code and discount value required', 'error'); return }
      try {
        await apiFetch(`${API_BASE}/v2/admin/promo-codes`, { method: 'POST', body: JSON.stringify({ ...codeForm, discountValue: Number(codeForm.discountValue), minOrder: codeForm.minOrder ? Number(codeForm.minOrder) : 0 }) })
        showToast('Promo code created!')
        setCodeForm({ code: '', discountType: 'percentage', discountValue: '', minOrder: '', expiresAt: '' })
        setData(await apiFetch(`${API_BASE}/v2/admin/promo-codes`))
      } catch (e: any) { showToast(e.message, 'error') }
    }
    return (
      <div>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '16px', color: '#1C1C1E' }}>Create Promo Code</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            <input placeholder="Code (e.g. VIBES20)" value={codeForm.code} onChange={e => setCodeForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }} />
            <select value={codeForm.discountType} onChange={e => setCodeForm(p => ({ ...p, discountType: e.target.value }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
            <input placeholder="Discount value" type="number" value={codeForm.discountValue} onChange={e => setCodeForm(p => ({ ...p, discountValue: e.target.value }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }} />
            <input placeholder="Min order (₦)" type="number" value={codeForm.minOrder} onChange={e => setCodeForm(p => ({ ...p, minOrder: e.target.value }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }} />
            <input placeholder="Expiry date" type="date" value={codeForm.expiresAt} onChange={e => setCodeForm(p => ({ ...p, expiresAt: e.target.value }))} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8E8E8', fontSize: '14px', outline: 'none' }} />
            <button onClick={handleCreate} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8621A, #C4501A)', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Create Code</button>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {promoCodes.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#636366' }}>No promo codes yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F0EAE0', background: '#FAFAFA' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Code</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Value</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Uses</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Expiry</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#636366' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((pc: any) => {
                  const isExpired = pc.expiresAt ? new Date(pc.expiresAt) < new Date() : false
                  return (
                    <tr key={pc._id} style={{ borderBottom: '1px solid #F0EAE0' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>{pc.code}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366', textTransform: 'capitalize' }}>{pc.discountType}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{pc.discountType === 'percentage' ? `${pc.discountValue}%` : `₦${pc.discountValue}`}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{pc.usageCount || 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#636366' }}>{pc.expiresAt ? new Date(pc.expiresAt).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: isExpired ? '#FEF2F2' : '#F0FDF4', color: isExpired ? '#D32F2F' : '#16A34A' }}>{isExpired ? 'Expired' : 'Active'}</span></td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={async () => { if (!confirm('Delete this promo code?')) return; try { await apiFetch(`${API_BASE}/v2/admin/promo-codes/${pc._id}`, { method: 'DELETE' }); showToast('Promo code deleted!'); setData(await apiFetch(`${API_BASE}/v2/admin/promo-codes`)) } catch (e: any) { showToast(e.message, 'error') } }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#D32F2F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  const renderRevenue = () => {
    const rev = data || {}
    const daily = rev.daily || []
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
        {daily.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontWeight: '700', marginBottom: '16px', color: '#1C1C1E' }}>Daily Revenue (30 days)</h3>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#E8621A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {daily.length === 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontWeight: '700', marginBottom: '16px', color: '#1C1C1E' }}>Daily Revenue</h3>
            <p style={{ color: '#636366', textAlign: 'center', padding: '40px 0' }}>No daily revenue data available yet</p>
          </div>
        )}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '16px', color: '#1C1C1E' }}>Commission Breakdown by Restaurant</h3>
          <p style={{ color: '#636366', textAlign: 'center', padding: '24px 0' }}>Restaurant commission breakdown will appear here</p>
        </div>
      </div>
    )
  }

  switch (tab) {
    case 'overview': return renderOverview()
    case 'restaurants': return renderRestaurants()
    case 'vendors': return renderVendors()
    case 'orders': return renderOrders()
    case 'users': return renderUsers()
    case 'disputes': return renderDisputes()
    case 'promotions': return renderPromotions()
    case 'promo-codes': return renderPromoCodes()
    case 'revenue': return renderRevenue()
    default: return <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#636366' }}>Unknown tab: {tab}</div>
  }
}


