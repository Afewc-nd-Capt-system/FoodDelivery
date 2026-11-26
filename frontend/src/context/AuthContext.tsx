'use client'
import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode
} from 'react'

import { API_V2 as BACKEND } from '@/lib/apiBase'
import {
  completeMfaIfRequired, persistAuthSession, clearAuthSession, readStoredAuth,
  refreshAccessToken, setSessionMessage, takeSessionMessage, AUTH_CHANGED_EVENT,
  type AuthPayload,
} from '@/lib/authClient'
import { installAuthFetchInterceptor } from '@/lib/apiClient'

export interface User {
  _id?: string
  id?: string
  name: string
  email: string
  phone?: string
  role: string
  isVerified?: boolean
  address?: {
    street?: string
    area?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    phone?: string
  }
  addresses?: Array<{
    _id?: string
    label?: string
    street?: string
    area?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    phone?: string
    isDefault?: boolean
  }>
  notificationPreferences?: {
    orderUpdates?: boolean
    promotions?: boolean
    loyaltyUpdates?: boolean
  }
  dietaryPreferences?: string[]
  isVibePassMember?: boolean
  loyaltyPoints?: number
  referralCode?: string
  emailVerified?: boolean
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  phone?: string
  confirmPassword?: string
  dietaryPreferences?: string[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  sessionMessage: string
  register: (input: RegisterInput) => Promise<User>
  login: (email: string, password: string) => Promise<User>
  applySession: (data: AuthPayload) => User | null
  logout: (redirectTo?: string) => Promise<void>
  updateUser: (userData: User) => void
  refreshSession: () => Promise<boolean>
  resendVerification: () => Promise<{ success: boolean; message?: string }>
  clearSessionMessage: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, loading: true, sessionMessage: '',
  register: async () => { throw new Error('Not initialized') },
  login: async () => { throw new Error('Not initialized') },
  applySession: () => null,
  logout: async () => {},
  updateUser: () => {},
  refreshSession: async () => false,
  resendVerification: async () => ({ success: false }),
  clearSessionMessage: () => {},
  isAuthenticated: false,
})

const PROFILE_TIMEOUT = 12000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionMessage, setSessionMessageState] = useState('')
  const validating = useRef(false)
  // Bumped whenever this tab changes the session/user. A background refresh
  // that started earlier must not overwrite a newer local edit (e.g. saving a
  // profile name while the mount-time validation is still in flight).
  const versionRef = useRef(0)

  const applyStoredState = useCallback(() => {
    const stored = readStoredAuth()
    if (stored.token && stored.user) {
      setToken(stored.token)
      setUser(stored.user)
    } else if (!stored.token) {
      setToken(null)
      setUser(null)
    }
    setLoading(false)
  }, [])

  const clearSessionMessage = useCallback(() => {
    setSessionMessageState('')
    setSessionMessage('')
  }, [])

  const expireSession = useCallback(() => {
    versionRef.current += 1
    clearAuthSession()
    setToken(null)
    setUser(null)
    const message = 'Your session expired. Please sign in again.'
    setSessionMessage(message)
    setSessionMessageState(message)
  }, [])

  const fetchProfile = useCallback(async (accessToken: string) => {
    const res = await fetch(`${BACKEND}/auth/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
      signal: AbortSignal.timeout(PROFILE_TIMEOUT),
    })
    return res
  }, [])

  // Keep the signed-in user and their stored profile in sync with the server.
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const stored = readStoredAuth()
    if (!stored.token) return false
    if (validating.current) return true
    validating.current = true
    const startVersion = versionRef.current
    try {
      let res = await fetchProfile(stored.token)
      if (res.status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          expireSession()
          return false
        }
        res = await fetchProfile(refreshed)
      }
      if (res.status === 401) {
        expireSession()
        return false
      }
      if (res.ok) {
        // A local edit (profile save, login, logout) happened while this
        // request was in flight; keep the local state.
        if (versionRef.current !== startVersion) return true
        const profile = await res.json()
        const merged = { ...stored.user, ...profile }
        persistAuthSession({ token: readStoredAuth().token || stored.token, user: merged })
        setUser(merged)
        setToken(readStoredAuth().token || stored.token)
      }
      return true
    } catch {
      // Network hiccups must not sign anyone out; only an explicit 401 does.
      return true
    } finally {
      validating.current = false
    }
  }, [expireSession, fetchProfile])

  const resendVerification = useCallback(async () => {
    const stored = readStoredAuth()
    if (!stored.token) return { success: false }
    try {
      const res = await fetch(`${BACKEND}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${stored.token}` },
        credentials: 'include',
      })
      return await res.json().catch(() => ({ success: true }))
    } catch {
      // The endpoint is intentionally opaque; a network hiccup looks the same.
      return { success: true }
    }
  }, [])

  // Restore the session from storage once on mount, then validate in the
  // background so an expired 15-minute access token is refreshed silently.
  useEffect(() => {
    installAuthFetchInterceptor()
    applyStoredState()
    const message = takeSessionMessage()
    if (message) setSessionMessageState(message)
    const stored = readStoredAuth()
    if (stored.token) void refreshSession()

    const onStorage = (event: StorageEvent) => {
      if (event.key && !['token', 'user', 'refreshToken', 'userRole'].includes(event.key)) return
      applyStoredState()
    }
    const onAuthChanged = () => applyStoredState()
    window.addEventListener('storage', onStorage)
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh the server profile on focus/visibility so a verification completed
  // on another device (or an admin action) clears the banner without reload.
  useEffect(() => {
    let last = 0
    const refreshIfStale = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now - last < 5000) return
      last = now
      if (readStoredAuth().token) void refreshSession()
    }
    window.addEventListener('focus', refreshIfStale)
    document.addEventListener('visibilitychange', refreshIfStale)
    return () => {
      window.removeEventListener('focus', refreshIfStale)
      document.removeEventListener('visibilitychange', refreshIfStale)
    }
  }, [refreshSession])

  const applySession = useCallback((data: AuthPayload): User | null => {    if (!data?.token || !data?.user) return null
    versionRef.current += 1
    persistAuthSession(data)
    setToken(data.token)
    setUser(data.user)
    setLoading(false)
    return data.user
  }, [])

  const register = useCallback(async (input: RegisterInput): Promise<User> => {
    const res = await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    })
    let data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const error = new Error(data.message || 'Registration failed') as Error & { status?: number }
      error.status = res.status
      throw error
    }
    data = await completeMfaIfRequired(data)
    const sessionUser = applySession(data)
    if (!sessionUser) throw new Error('Account created, but the session could not start. Please sign in.')
    return sessionUser
  }, [applySession])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    let data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const error = new Error(data.message || 'Login failed') as Error & { status?: number }
      error.status = res.status
      throw error
    }
    data = await completeMfaIfRequired(data)
    const sessionUser = applySession(data)
    if (!sessionUser) throw new Error('Login succeeded, but the session could not be started.')
    return sessionUser
  }, [applySession])

  const logout = useCallback(async (redirectTo?: string) => {
    versionRef.current += 1
    const stored = readStoredAuth()
    if (stored.token) {
      void fetch(`${BACKEND}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stored.token}`,
        },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      }).catch(() => {})
    }
    clearAuthSession()
    setToken(null)
    setUser(null)
    setSessionMessageState('')
    setSessionMessage('')
    if (redirectTo && typeof window !== 'undefined') {
      window.location.href = redirectTo
    }
  }, [])

  const updateUser = useCallback((userData: User) => {
    versionRef.current += 1
    const stored = readStoredAuth()
    persistAuthSession({ token: stored.token || undefined, refreshToken: stored.refreshToken || undefined, user: userData })
    setUser(userData)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, token, loading, sessionMessage,
      register, login, applySession, logout, updateUser, refreshSession,
      resendVerification,
      clearSessionMessage,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export default AuthContext
