'use client'
import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/apiClient'

export default function TrustProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/users/trust-profile')
      .then(d => setProfile(d))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#FFF8F0' }}>
      <p style={{ color: '#636366' }}>Loading trust profile...</p>
    </div>
  )

  const score = profile?.trustScore || 0
  const level = score >= 80 ? 'Trusted' : score >= 50 ? 'Good' : 'New'
  const levelColor = score >= 80 ? '#16A34A' : score >= 50
    ? '#E8621A' : '#636366'

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F0',
      padding: '32px 16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontWeight: '900', fontSize: '24px',
          color: '#1C1C1E', marginBottom: '8px' }}>
          My Trust Profile
        </h1>
        <p style={{ color: '#636366', marginBottom: '32px' }}>
          Your trust score affects your Pay on Delivery eligibility
        </p>

        <div style={{
          background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
          borderRadius: '24px', padding: '32px',
          marginBottom: '24px', textAlign: 'center', color: 'white'
        }}>
          <div style={{ fontSize: '72px', fontWeight: '900',
            lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: '18px', fontWeight: '700',
            marginTop: '8px', opacity: 0.9 }}>Trust Score</div>
          <div style={{
            display: 'inline-block', marginTop: '12px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px', padding: '4px 16px',
            fontSize: '14px', fontWeight: '700'
          }}>{level} Customer</div>
        </div>

        <div style={{ background: 'white', borderRadius: '24px',
          padding: '24px', marginBottom: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
          <p style={{ fontWeight: '700', marginBottom: '12px',
            color: '#1C1C1E' }}>Score Breakdown</p>
          <div style={{ background: '#F0EAE0', borderRadius: '8px',
            height: '12px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{
              width: `${score}%`, height: '100%',
              background: 'linear-gradient(90deg, #E8621A, #BE3A2A)',
              borderRadius: '8px', transition: 'width 0.5s ease'
            }} />
          </div>

          {[
            { label: 'Orders Completed', value: profile?.completedOrders || 0 },
            { label: 'Orders Cancelled', value: profile?.cancelledOrders || 0 },
            { label: 'POD Orders', value: profile?.podOrders || 0 },
            { label: 'POD Failures', value: profile?.podFailures || 0 },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid #F0EAE0'
            }}>
              <span style={{ color: '#636366', fontSize: '14px' }}>
                {item.label}
              </span>
              <span style={{ fontWeight: '700', color: '#1C1C1E' }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '24px',
          padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
          <p style={{ fontWeight: '700', marginBottom: '16px',
            color: '#1C1C1E' }}>Pay on Delivery Eligibility</p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px', borderRadius: '16px',
            background: score >= 50 ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${score >= 50 ? '#86EFAC' : '#FCA5A5'}`
          }}>
            <span style={{ fontSize: '24px' }}>
              {score >= 50 ? '✅' : '❌'}
            </span>
            <div>
              <p style={{ fontWeight: '700',
                color: score >= 50 ? '#16A34A' : '#D32F2F',
                marginBottom: '4px' }}>
                {score >= 50
                  ? 'You are eligible for Pay on Delivery'
                  : 'Not yet eligible for Pay on Delivery'}
              </p>
              <p style={{ fontSize: '13px', color: '#636366' }}>
                {score >= 50
                  ? 'Complete more orders to maintain eligibility'
                  : 'Complete 3+ orders to become eligible'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
