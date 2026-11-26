'use client'

import { API_V2 } from './apiBase'

export interface AuthPayload {
  token?: string
  accessToken?: string
  refreshToken?: string
  user?: any
  mfaRequired?: boolean
  mfaToken?: string
}

export interface StoredAuth {
  token: string | null
  refreshToken: string | null
  user: any | null
}

// In-tab notification. The native `storage` event never fires in the tab that
// performed the write, so AuthContext listens to both this and `storage`.
export const AUTH_CHANGED_EVENT = 'vibe:auth-changed'
const AUTH_MESSAGE_KEY = 'authMessage'

function notifyAuthChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function persistAuthSession(data: AuthPayload) {
  if (typeof window === 'undefined' || !data?.token) return
  localStorage.setItem('token', data.token)
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('userRole', data.user.role)
  }
  notifyAuthChanged()
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('userRole')
  notifyAuthChanged()
}

export function readStoredAuth(): StoredAuth {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, user: null }
  }
  let user: any = null
  try {
    const raw = localStorage.getItem('user')
    user = raw ? JSON.parse(raw) : null
  } catch {
    user = null
  }
  return {
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    user,
  }
}

export function setSessionMessage(message: string) {
  if (typeof window === 'undefined') return
  if (message) sessionStorage.setItem(AUTH_MESSAGE_KEY, message)
  else sessionStorage.removeItem(AUTH_MESSAGE_KEY)
}

export function takeSessionMessage(): string {
  if (typeof window === 'undefined') return ''
  const message = sessionStorage.getItem(AUTH_MESSAGE_KEY) || ''
  if (message) sessionStorage.removeItem(AUTH_MESSAGE_KEY)
  return message
}

/**
 * Only relative, single-slash paths are accepted so `?next=` can never be used
 * as an open redirect. Returns null for anything unsafe.
 */
export function sanitizeNextPath(next?: string | null): string | null {
  if (!next) return null
  let value = String(next).trim()
  if (!value) return null
  try {
    value = decodeURIComponent(value)
  } catch {
    return null
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}

export function dashboardPathForRole(role?: string | null): string {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'restaurant') return '/restaurant-dashboard'
  if (role === 'vendor') return '/vendor-dashboard'
  if (role === 'delivery_rider') return '/rider-dashboard'
  if (role === 'delivery_company') return '/delivery-company-dashboard'
  return '/'
}

export function loginPathForRole(role?: string | null) {
  if (role === 'admin') return '/admin/login'
  if (role === 'restaurant') return '/restaurant-login'
  if (role === 'vendor') return '/vendor-login'
  if (role === 'delivery_rider') return '/rider-login'
  if (role === 'delivery_company') return '/delivery-company-login'
  return '/login'
}

/**
 * Where to send someone after a successful sign-in/registration: the safe
 * `?next=` path when present, otherwise the role's home (customer homepage or
 * the partner dashboard).
 */
export function resolvePostAuthPath(user: any, next?: string | null): string {
  const requested = sanitizeNextPath(next)
  if (requested) return requested
  return dashboardPathForRole(user?.role)
}

export function redirectToLogin(next?: string) {
  if (typeof window === 'undefined') return
  const role = localStorage.getItem('userRole')
  clearAuthSession()
  if (!window.location.pathname.endsWith('/login')) {
    const loginPath = loginPathForRole(role)
    const safeNext = sanitizeNextPath(next)
    const canReturn = loginPath === '/login'
    window.location.href = safeNext && canReturn ? `${loginPath}?next=${encodeURIComponent(safeNext)}` : loginPath
  }
}

let refreshInFlight: Promise<string | null> | null = null
const REFRESH_LOCK = 'vibechops-refresh-lock'

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && (navigator as any).locks?.request) {
    return (navigator as any).locks.request(REFRESH_LOCK, fn)
  }
  if (typeof localStorage === 'undefined') return fn()
  const id = `${Date.now()}-${Math.random()}`
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    let lock: any = null
    try { lock = JSON.parse(localStorage.getItem(REFRESH_LOCK) || 'null') } catch {}
    if (!lock || Number(lock.expires) <= Date.now()) {
      localStorage.setItem(REFRESH_LOCK, JSON.stringify({ id, expires: Date.now() + 8000 }))
      let check: any = null
      try { check = JSON.parse(localStorage.getItem(REFRESH_LOCK) || 'null') } catch {}
      if (check?.id === id) {
        try {
          return await fn()
        } finally {
          try {
            const current = JSON.parse(localStorage.getItem(REFRESH_LOCK) || 'null')
            if (current?.id === id) localStorage.removeItem(REFRESH_LOCK)
          } catch {}
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return fn()
}

async function performRefresh(failedAccessToken?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null

  // Another tab may already have refreshed while this request was in flight.
  const currentAccess = localStorage.getItem('token')
  if (failedAccessToken && currentAccess && currentAccess !== failedAccessToken) {
    const payload = (() => {
      try {
        return JSON.parse(atob(currentAccess.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      } catch { return null }
    })()
    if (!payload?.exp || payload.exp * 1000 - Date.now() > 30_000) {
      return currentAccess
    }
  }

  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_V2}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429) {
      // A limiter must not sign the customer out; keep the session and report.
      setSessionMessage('Too many attempts. Please try again shortly.')
      return null
    }
    if (!response.ok) {
      setSessionMessage('Your session expired. Sign in to continue.')
      clearAuthSession()
      return null
    }
    const data: AuthPayload = await response.json()
    if (!data.token) {
      setSessionMessage('Your session expired. Sign in to continue.')
      clearAuthSession()
      return null
    }
    persistAuthSession(data)
    return data.token
  } catch {
    setSessionMessage('Your session expired. Sign in to continue.')
    clearAuthSession()
    return null
  }
}

// Concurrent callers (and other tabs) share one refresh. The refresh token is
// re-read inside the lock so a pair saved by another tab is adopted instead of
// being replayed and revoking the family.
export function refreshAccessToken(failedAccessToken?: string): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(() => performRefresh(failedAccessToken))
      .finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

export async function completeMfaIfRequired(data: AuthPayload): Promise<AuthPayload> {
  if (!data?.mfaRequired) return data
  if (typeof window === 'undefined') throw new Error('MFA requires a browser session')

  const code = window.prompt('Enter the 6-digit code from your authenticator app')
  if (!code) throw new Error('Authentication code is required')

  const response = await fetch(`${API_V2}/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfaToken: data.mfaToken, code }),
  })
  const verified: AuthPayload & { message?: string } = await response.json()
  if (!response.ok) throw new Error(verified.message || 'MFA verification failed')
  return verified
}
