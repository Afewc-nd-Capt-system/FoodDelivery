'use client'
import { useState } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'

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

function AdminTabContent({ tab, token }: { tab: string, token: string }) {
  const apiBase = 'https://vibechops.onrender.com/api'

  return (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '40px',
      textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
      <p style={{ fontWeight: '700', color: '#1C1C1E', marginBottom: '8px' }}>
        {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
      </p>
      <p style={{ color: '#636366', fontSize: '14px' }}>
        Loading data from {apiBase}
      </p>
    </div>
  )
}
