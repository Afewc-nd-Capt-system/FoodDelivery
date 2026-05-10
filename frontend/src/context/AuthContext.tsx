'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'restaurant' | 'vendor' | 'delivery_company' | 'delivery_rider' | 'admin';
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  dietaryPreferences?: string[];
  isVibePassMember?: boolean;
  trustMetrics?: {
    successfulDeliveries: number;
    failedDeliveries: number;
    prepaidOrdersCompleted: number;
    refundCount: number;
    disputeCount: number;
    reliabilityScore: number;
    lastUpdated: Date;
  };
  payOnDeliveryEnabled?: boolean;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch(API_BASE + '/auth/profile', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      // Silently handle backend unavailability during frontend development
      // console.error('Failed to fetch user', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    setUser(data.user);
    setToken('logged-in');
    // Store user role in localStorage for role-based routing
    if (data.user?.role) {
      localStorage.setItem('userRole', data.user.role);
    }
    await fetchUser();
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await fetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    setUser(data.user);
    setToken('logged-in');
    // Store user role in localStorage for role-based routing
    if (data.user?.role) {
      localStorage.setItem('userRole', data.user.role);
    }
    await fetchUser();
  };

  const logout = async () => {
    try {
      await fetch(API_BASE + '/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      // Clear user role from localStorage
      localStorage.removeItem('userRole');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
