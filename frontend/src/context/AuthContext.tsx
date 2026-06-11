'use client'
import {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode
} from 'react'

const BACKEND = 'https://vibechops.onrender.com/api/v2'

interface User {
  _id: string
  name: string
  email: string
  phone?: string
  role: string
  isVerified?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, loading: true,
  login: async () => { throw new Error('Not initialized') },
  logout: () => {},
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
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (
    email: string, password: string
  ): Promise<User> => {
    const res = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Login failed')

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('userRole', data.user.role)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export default AuthContext
