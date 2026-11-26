'use client'

import { API_V2 as API_BASE } from './apiBase'
import {
  refreshAccessToken, redirectToLogin, setSessionMessage, sanitizeNextPath,
} from './authClient'

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session expired. Sign in to continue.')
    this.name = 'SessionExpiredError'
  }
}

function decodeTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Number(payload?.exp || 0) * 1000
  } catch {
    return 0
  }
}

function needsProactiveRefresh(token: string): boolean {
  const expiry = decodeTokenExpiry(token)
  return expiry > 0 && expiry - Date.now() < 90_000
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search || ''}`
}

function expireAndRedirect() {
  setSessionMessage('Your session expired. Sign in to continue.')
  redirectToLogin(currentPath())
}

/**
 * The single authenticated request boundary. It refreshes proactively shortly
 * before JWT expiry and once on a 401, then retries the original request.
 * A failed refresh keeps the cart (local storage is untouched) and sends the
 * customer to /login?next=<current path> with a clear session message.
 */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}${path}`
  const isAuthPath = path.startsWith('/auth/')
  const refreshToken = typeof window === 'undefined' ? null : localStorage.getItem('refreshToken')
  let token = typeof window === 'undefined' ? null : localStorage.getItem('token')

  if (token && refreshToken && needsProactiveRefresh(token)) {
    const refreshed = await refreshAccessToken()
    if (refreshed) token = refreshed
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const send = (accessToken: string | null) => fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal: options.signal || AbortSignal.timeout(25000),
  })

  let response = await send(token)

  if (response.status === 401 && !isAuthPath) {
    const refreshed = refreshToken ? await refreshAccessToken() : null
    if (!refreshed) {
      expireAndRedirect()
      throw new SessionExpiredError()
    }
    response = await send(refreshed)
    if (response.status === 401) {
      expireAndRedirect()
      throw new SessionExpiredError()
    }
  }

  return response
}

function messageFor(status: number, body: any): { message: string; code?: string; session?: boolean } {
  const serverMessage = String(body?.message || '').trim()
  const code = body?.code

  if (status === 401 || /token is not valid|token.*expired|jwt expired/i.test(serverMessage)) {
    return { message: 'Your session expired. Sign in to continue.', code: 'SESSION_EXPIRED', session: true }
  }
  if (code === 'EMAIL_NOT_VERIFIED') {
    return { message: serverMessage || 'Verify your email to continue.', code }
  }
  if (code === 'OUT_OF_SERVICE_AREA') {
    return { message: serverMessage || 'This address is outside the store’s delivery area.', code }
  }
  if (status === 429) {
    return { message: 'Too many attempts. Please wait a moment and try again.', code: 'RATE_LIMITED' }
  }
  return { message: serverMessage || `Request failed (${status}).`, code }
}

export async function apiCall(path: string, options: RequestInit = {}): Promise<any> {
  const response = await authFetch(path, options)

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const mapped = messageFor(response.status, body)
    const error = new Error(mapped.message) as Error & { code?: string; status?: number }
    error.code = mapped.code
    error.status = response.status
    if (mapped.session) {
      setSessionMessage(mapped.message)
      redirectToLogin(currentPath())
    }
    throw error
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export async function apiGet(path: string) {
  return apiCall(path, { method: 'GET' })
}

export async function apiPost(path: string, body: any) {
  return apiCall(path, { method: 'POST', body: JSON.stringify(body) })
}

export async function apiPut(path: string, body: any) {
  return apiCall(path, { method: 'PUT', body: JSON.stringify(body) })
}

export async function apiPatch(path: string, body: any) {
  return apiCall(path, { method: 'PATCH', body: JSON.stringify(body) })
}

export { sanitizeNextPath }

/**
 * Install a single browser-level wrapper for every API fetch, including pages
 * that still call fetch directly. It refreshes proactively, refreshes once on
 * 401 and retries with the new access token; if refresh fails the customer is
 * sent to /login?next=<path> with a clear message (the cart is untouched).
 */
export function installAuthFetchInterceptor() {
  if (typeof window === 'undefined') return
  const marker = '__vibeAuthFetchInstalled'
  if ((window as any)[marker]) return
  ;(window as any)[marker] = true

  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (!url || !url.startsWith(API_BASE)) return original(input as any, init)

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
    if (!headers.has('Authorization')) return original(input as any, init)

    const currentToken = localStorage.getItem('token')
    if (currentToken && needsProactiveRefresh(currentToken)) {
      const refreshed = await refreshAccessToken()
      if (refreshed) headers.set('Authorization', `Bearer ${refreshed}`)
    }

    let response = await original(input as any, { ...init, headers })
    if (response.status === 401) {
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        setSessionMessage('Your session expired. Sign in to continue.')
        redirectToLogin(currentPath())
        return response
      }
      headers.set('Authorization', `Bearer ${refreshed}`)
      response = await original(input as any, { ...init, headers })
    }
    return response
  }
}
