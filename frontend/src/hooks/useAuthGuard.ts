'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  name: string
  email: string
  role: string
}

export function useAuthGuard(requiredRole?: string) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (!storedToken || !storedUser) {
      const loginRoutes: Record<string, string> = {
        admin: '/admin/login',
        restaurant: '/restaurant-login',
        vendor: '/vendor-login',
        delivery_rider: '/rider-login',
        delivery_company: '/delivery-company-login',
        customer: '/login',
      }
      router.replace(loginRoutes[requiredRole || 'customer'] || '/login')
      return
    }

    let u: User
    try {
      u = JSON.parse(storedUser)
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.replace('/login')
      return
    }

    if (requiredRole && u.role !== requiredRole) {
      const roleRedirect: Record<string, string> = {
        admin: '/admin/login',
        restaurant: '/restaurant-login',
        vendor: '/vendor-login',
        delivery_rider: '/rider-login',
        delivery_company: '/delivery-company-login',
        customer: '/login',
      }
      router.replace(roleRedirect[u.role] || '/login')
      return
    }

    setUser(u)
    setToken(storedToken)
    setLoading(false)
  }, [])

  return { user, token, loading }
}
