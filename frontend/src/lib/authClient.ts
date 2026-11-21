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

export function redirectToLogin() {
  if (typeof window === 'undefined') return
  const role = localStorage.getItem('userRole')
  clearAuthSession()
  if (!window.location.pathname.endsWith('/login')) {
    window.location.href = loginPathForRole(role)
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_V2}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    })
    if (!response.ok) {
      setSessionMessage('Your session expired. Please sign in again.')
      clearAuthSession()
      return null
    }
    const data: AuthPayload = await response.json()
    if (!data.token) {
      setSessionMessage('Your session expired. Please sign in again.')
      clearAuthSession()
      return null
    }
    persistAuthSession(data)
    return data.token
  } catch {
    setSessionMessage('Your session expired. Please sign in again.')
    clearAuthSession()
    return null
  }
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
