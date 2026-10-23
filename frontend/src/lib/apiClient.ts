'use client'

import { API_V2 as API_BASE } from './apiBase'
import { refreshAccessToken, redirectToLogin } from './authClient'

export async function apiCall(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${API_BASE}${path}`

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token')
    : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(url, { ...options, headers })

  if (res.status === 401 && !(options as any).__retried && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const retryOptions = { ...options, __retried: true } as RequestInit
      const retryHeaders = { ...headers, Authorization: `Bearer ${refreshed}` }
      res = await fetch(url, { ...retryOptions, headers: retryHeaders })
    } else {
      redirectToLogin()
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `Request failed: ${res.status}`)
  }

  return res.json()
}

export async function apiGet(path: string) {
  return apiCall(path, { method: 'GET' })
}

export async function apiPost(path: string, body: any) {
  return apiCall(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function apiPut(path: string, body: any) {
  return apiCall(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function apiPatch(path: string, body: any) {
  return apiCall(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
