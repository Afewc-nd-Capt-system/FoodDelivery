'use client'
import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { apiGet, apiPut } from '@/lib/apiClient'

export default function PODConfigPage() {
  const { user, token, loading } = useAuthGuard('restaurant')
  const [config, setConfig] = useState({
    allowPayOnDelivery: true,
    podThreshold: 5000,
    requireTrustedCustomers: false,
    podPenaltyEnabled: true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!token) return
    apiGet('/restaurants/pod-config')
      .then(d => setConfig(d.config || config))
      .catch(() => {})
  }, [token])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPut('/restaurants/pod-config', config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <p>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7',
      padding: '32px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontWeight: '900', fontSize: '24px',
          color: '#1C1C1E', marginBottom: '8px' }}>
          Pay on Delivery Settings
        </h1>
        <p style={{ color: '#636366', marginBottom: '32px' }}>
          Configure pay-on-delivery options for your restaurant
        </p>

        <div style={{ background: 'white', borderRadius: '24px',
          padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '24px',
            paddingBottom: '24px', borderBottom: '1px solid #F0EAE0' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#1C1C1E',
                marginBottom: '4px' }}>Allow Pay on Delivery</p>
              <p style={{ fontSize: '13px', color: '#636366' }}>
                Let customers pay when their order arrives
              </p>
            </div>
            <button
              onClick={() => setConfig(c =>
                ({ ...c, allowPayOnDelivery: !c.allowPayOnDelivery }))}
              style={{
                width: '52px', height: '28px', borderRadius: '14px',
                border: 'none', cursor: 'pointer',
                background: config.allowPayOnDelivery ? '#E8621A' : '#E8E8E8',
                position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'white', position: 'absolute',
                top: '3px', transition: 'left 0.2s',
                left: config.allowPayOnDelivery ? '27px' : '3px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          <div style={{ marginBottom: '24px',
            paddingBottom: '24px', borderBottom: '1px solid #F0EAE0' }}>
            <label style={{ fontWeight: '700', color: '#1C1C1E',
              display: 'block', marginBottom: '8px' }}>
              Maximum POD Order Value (₦)
            </label>
            <p style={{ fontSize: '13px', color: '#636366',
              marginBottom: '12px' }}>
              Orders above this amount must be paid online
            </p>
            <input
              type="number"
              value={config.podThreshold}
              onChange={e => setConfig(c =>
                ({ ...c, podThreshold: Number(e.target.value) }))}
              style={{
                width: '100%', padding: '12px 16px',
                border: '1.5px solid #E8E8E8', borderRadius: '12px',
                fontSize: '15px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '24px',
            paddingBottom: '24px', borderBottom: '1px solid #F0EAE0' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#1C1C1E',
                marginBottom: '4px' }}>Trusted Customers Only</p>
              <p style={{ fontSize: '13px', color: '#636366' }}>
                Only allow POD for customers with good order history
              </p>
            </div>
            <button
              onClick={() => setConfig(c =>
                ({ ...c, requireTrustedCustomers: !c.requireTrustedCustomers }))}
              style={{
                width: '52px', height: '28px', borderRadius: '14px',
                border: 'none', cursor: 'pointer',
                background: config.requireTrustedCustomers
                  ? '#E8621A' : '#E8E8E8',
                position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'white', position: 'absolute', top: '3px',
                transition: 'left 0.2s',
                left: config.requireTrustedCustomers ? '27px' : '3px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '14px',
              background: saved
                ? '#16A34A'
                : 'linear-gradient(135deg, #E8621A, #C4501A)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '16px', fontWeight: '800', cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
