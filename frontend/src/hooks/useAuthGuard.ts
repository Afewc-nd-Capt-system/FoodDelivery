'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

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

/**
 * Role guard backed by the single AuthContext session. It waits for the
 * provider to restore the session from storage (and refresh it) before
 * deciding, so a hard refresh never bounces a signed-in user to login.
 */
export function useAuthGuard(requiredRole?: string) {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user || !token) {
      router.replace(LOGIN_ROUTES[requiredRole || 'customer'])
      return
    }

    const actualRole = RoleAlias[requiredRole || ''] || requiredRole
    if (requiredRole && user.role !== actualRole) {
      router.replace(LOGIN_ROUTES[user.role] || '/login')
      return
    }

    setAuthorized(true)
  }, [user, token, loading, requiredRole, router])

  return { user, token: token || '', loading, authorized }
}
