'use client'

const API_BASE = 'https://vibechops.onrender.com/api/v2'

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

  const res = await fetch(url, { ...options, headers })

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
