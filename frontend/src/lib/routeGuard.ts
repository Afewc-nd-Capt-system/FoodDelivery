'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

type UserRole = 'customer' | 'restaurant' | 'vendor' | 'delivery_company' | 'delivery_rider' | 'admin';

interface RouteGuardConfig {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function useRouteGuard(config: RouteGuardConfig) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole') as UserRole | null;

      if (!token) {
        router.push('/login');
        return false;
      }

      if (config.allowedRoles.length > 0 && (!userRole || !config.allowedRoles.includes(userRole))) {
        // Redirect based on user's role
        const roleRedirects: Record<UserRole, string> = {
          customer: '/dashboard',
          restaurant: '/(restaurant)/dashboard',
          vendor: '/(vendor)/dashboard',
          delivery_company: '/(delivery-company)/dashboard',
          delivery_rider: '/(delivery)/dashboard',
          admin: '/admin'
        };

        const redirectPath = config.redirectTo || (userRole ? roleRedirects[userRole] : '/dashboard');
        router.push(redirectPath);
        return false;
      }

      return true;
    };

    checkAuth();
  }, [router, pathname, config]);
}

export function checkRoleAccess(requiredRole: UserRole): boolean {
  if (typeof window === 'undefined') return false;
  const userRole = localStorage.getItem('userRole') as UserRole | null;
  if (!userRole) return false;
  
  if (requiredRole === 'admin') {
    return userRole === 'admin';
  }

  return userRole === requiredRole;
}

export function getDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    customer: '/dashboard',
    restaurant: '/(restaurant)/dashboard',
    vendor: '/(vendor)/dashboard',
    delivery_company: '/(delivery-company)/dashboard',
    delivery_rider: '/(delivery)/dashboard',
    admin: '/admin'
  };
  return paths[role] || '/dashboard';
}
