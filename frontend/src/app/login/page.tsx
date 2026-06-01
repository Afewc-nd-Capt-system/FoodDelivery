'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') as string : null;
      const roleRedirect: Record<string, string> = {
        admin: '/admin',
        restaurant: '/restaurant-dashboard',
        vendor: '/vendor-dashboard',
        delivery_rider: '/rider-dashboard',
        delivery_company: '/delivery-company-dashboard',
        customer: '/',
      };
      router.push(roleRedirect[userRole || 'customer'] || '/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.07)] border border-[#F0EAE0]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center text-white font-black text-lg">
            V
          </div>
          <span className="text-xl font-black">
            <span className="text-[#1C1C1E]">Vibe</span><span className="text-[#E8621A]">Chops</span>
          </span>
        </div>

        <h2 className="text-2xl font-black text-center mb-1">Welcome back 👋</h2>
        <p className="text-sm text-[#636366] text-center mb-6">Sign in to your account</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-[#A0A0A0]" /> : <Eye className="w-4 h-4 text-[#A0A0A0]" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <Link href="/forgot-password" className="text-xs text-[#E8621A] hover:underline">
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_6px_20px_rgba(232,98,26,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-[#E8E8E8]" />
          <span className="text-xs text-[#A0A0A0]">or</span>
          <div className="flex-1 h-px bg-[#E8E8E8]" />
        </div>

        <div className="space-y-3">
          <Button className="w-full border border-[#E8E8E8] bg-transparent text-[#636366] hover:bg-[#FFF1E8] py-3 rounded-2xl">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 4.66v3.11h3.57c2.1-1.94 3.3-4.8 3.3-8.78z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          <Button className="w-full border border-[#E8E8E8] bg-transparent text-[#636366] hover:bg-[#FFF1E8] py-3 rounded-2xl">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.953H15.83c-1.491 0-1.936.925-1.936 1.876V12h3.328l-.532 2.445h-2.796v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            Continue with Apple
          </Button>
        </div>

        <p className="text-center text-sm text-[#636366] mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-[#E8621A] font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
