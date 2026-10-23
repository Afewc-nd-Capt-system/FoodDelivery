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

export function persistAuthSession(data: AuthPayload) {
  if (typeof window === 'undefined' || !data?.token) return
  localStorage.setItem('token', data.token)
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('userRole', data.user.role)
  }
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('userRole')
}

export function loginPathForRole(role?: string | null) {
  if (role === 'admin') return '/admin/login'
  if (role === 'restaurant') return '/restaurant-login'
  if (role === 'vendor') return '/vendor-login'
  if (role === 'delivery_rider') return '/rider-login'
  if (role === 'delivery_company') return '/delivery-company-login'
  return '/login'
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
      clearAuthSession()
      return null
    }
    const data: AuthPayload = await response.json()
    if (!data.token) {
      clearAuthSession()
      return null
    }
    persistAuthSession(data)
    return data.token
  } catch {
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
