'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const RoleAlias: Record<string, string> = {
  rider: 'delivery_rider',
}

const LOGIN_ROUTES: Record<string, string> = {
  admin: '/admin/login',
  restaurant: '/restaurant-login',
  vendor: '/vendor-login',
  delivery_rider: '/rider-login',
  rider: '/rider-login',
  delivery_company: '/delivery-company-login',
  customer: '/login',
}

export function useAuthGuard(requiredRole?: string) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (!storedToken || !storedUser) {
        const loginRoute = LOGIN_ROUTES[requiredRole || 'customer']
        router.replace(loginRoute)
        return
      }

      let parsedUser: any = null
      try {
        parsedUser = JSON.parse(storedUser)
      } catch {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        router.replace(LOGIN_ROUTES[requiredRole || 'customer'])
        return
      }

      const actualRole = RoleAlias[requiredRole || ''] || requiredRole
      if (requiredRole && parsedUser?.role !== actualRole) {
        router.replace(LOGIN_ROUTES[parsedUser?.role] || '/login')
        return
      }

      setUser(parsedUser)
      setToken(storedToken)
      setAuthorized(true)
    } catch (err) {
      console.error('Auth guard error:', err)
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }, [])

  return { user, token, loading, authorized }
}
