'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

type UserRole = 'customer' | 'restaurant' | 'vendor' | 'delivery_company' | 'delivery_rider' | 'admin';

interface RouteGuardConfig {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

const ROLE_LOGIN: Record<UserRole, string> = {
  customer: '/login',
  restaurant: '/restaurant-login',
  vendor: '/vendor-login',
  delivery_company: '/delivery-company-login',
  delivery_rider: '/rider-login',
  admin: '/admin/login',
};

const ROLE_DASHBOARD: Record<UserRole, string> = {
  customer: '/',
  restaurant: '/restaurant-dashboard',
  vendor: '/vendor-dashboard',
  delivery_company: '/delivery-company-dashboard',
  delivery_rider: '/rider-dashboard',
  admin: '/admin',
};

export function useRouteGuard(config: RouteGuardConfig) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole') as UserRole | null;

    if (!token) {
      router.push('/login');
      return;
    }

    if (config.allowedRoles.length > 0 && (!userRole || !config.allowedRoles.includes(userRole))) {
      const redirectPath = config.redirectTo || (userRole ? ROLE_DASHBOARD[userRole] : '/login');
      router.push(redirectPath);
      return;
    }
  }, [pathname]);
}

export function checkRoleAccess(requiredRole: UserRole): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('user');
  if (!stored) return false;
  try {
    const user = JSON.parse(stored);
    return user.role === requiredRole;
  } catch {
    return false;
  }
}

export function getDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARD[role] || '/';
}
