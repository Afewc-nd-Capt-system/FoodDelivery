'use client'
import {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode
} from 'react'

import { API_V2 as BACKEND } from '@/lib/apiBase'
import { completeMfaIfRequired, persistAuthSession, clearAuthSession } from '@/lib/authClient'

interface User {
  _id: string
  name: string
  email: string
  phone?: string
  role: string
  isVerified?: boolean
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
  }
  dietaryPreferences?: string[]
  isVibePassMember?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  updateUser: (userData: User) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, loading: true,
  register: async () => { throw new Error('Not initialized') },
  login: async () => { throw new Error('Not initialized') },
  logout: () => {},
  updateUser: () => {},
  isAuthenticated: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch {
      clearAuthSession()
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (
    name: string, email: string, password: string, phone?: string
  ): Promise<User> => {
    const res = await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    })
    let data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Registration failed')
    data = await completeMfaIfRequired(data)

    persistAuthSession(data)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(async (
    email: string, password: string
  ): Promise<User> => {
    const res = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    let data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Login failed')
    data = await completeMfaIfRequired(data)

    persistAuthSession(data)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    const token = localStorage.getItem('token')
    const refreshToken = localStorage.getItem('refreshToken')
    if (token) {
      void fetch(`${BACKEND}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
    clearAuthSession()
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      register, login, logout, updateUser,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export default AuthContext
