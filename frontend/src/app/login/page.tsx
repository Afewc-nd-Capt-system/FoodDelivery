'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { resolvePostAuthPath, sanitizeNextPath } from '@/lib/authClient'

function readNextFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  return sanitizeNextPath(new URLSearchParams(window.location.search).get('next'))
}

export default function LoginPage() {
  const router = useRouter()
  const { login, sessionMessage, clearSessionMessage } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }
    setLoading(true)
    setError('')
    clearSessionMessage()
    try {
      const next = readNextFromLocation()
      const user = await login(email.trim(), password)
      router.replace(resolvePostAuthPath(user, next))
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const notice = error || sessionMessage

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFF8F0, #FFE8D0)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px'
    }}>
      <div style={{
        background: 'white', borderRadius: '24px',
        padding: '48px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
            fontSize: '24px', fontWeight: '900', color: 'white'
          }}>V</div>
          <h1 style={{ fontWeight: '900', fontSize: '24px',
            color: '#1C1C1E', margin: '0 0 4px' }}>
            Welcome back
          </h1>
          <p style={{ color: '#636366', fontSize: '14px', margin: 0 }}>
            Sign in to your account
          </p>
        </div>

        {notice && (
          <div role="alert" style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: '12px', padding: '12px 16px',
            color: '#D32F2F', fontSize: '14px', marginBottom: '20px'
          }}>{notice}</div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600',
            color: '#636366', display: 'block', marginBottom: '6px' }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{
              width: '100%', padding: '12px 16px',
              border: '1.5px solid #E8E8E8', borderRadius: '12px',
              fontSize: '15px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600',
            color: '#636366', display: 'block', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', padding: '12px 16px',
              border: '1.5px solid #E8E8E8', borderRadius: '12px',
              fontSize: '15px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', marginBottom: '16px',
            background: loading
              ? '#ccc'
              : 'linear-gradient(135deg, #E8621A, #C4501A)',
            color: 'white', border: 'none', borderRadius: '12px',
            fontSize: '16px', fontWeight: '800',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '14px',
          color: '#636366' }}>
          Don't have an account?{' '}
          <Link href="/register"
            style={{ color: '#E8621A', fontWeight: '600' }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
