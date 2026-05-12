'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bike, Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function RiderLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Check if user is already logged in as rider
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userRole === 'delivery_rider') {
      router.push('/rider-dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Check if user has delivery_rider role
      if (data.user.role !== 'delivery_rider') {
        setError('Access denied — Riders only');
        return;
      }

      // Check verification status
      if (!data.user.isVerified) {
        setError('Your rider account is pending verification. Please wait for approval.');
        return;
      }

      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(true);
      
      // Redirect to rider dashboard after successful login
      setTimeout(() => {
        router.push('/rider-dashboard');
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl"
                style={{ background: 'linear-gradient(135deg, #E8621A 0%, #BE3A2A 100%)' }}
              >
                V
              </div>
            </div>
            <h1 className="text-2xl font-black mb-2" style={{ color: '#1C1C1E' }}>
              Vibe<span style={{ color: '#E8621A' }}>Chops</span>
            </h1>
            <p className="text-lg font-bold mb-2" style={{ color: '#636366' }}>
              Rider Portal
            </p>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>
              Manage your deliveries and track your earnings
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-8 bg-white shadow-xl">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#1C1C1E' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ borderColor: '#E8E8E8' }}
                    placeholder="rider@vibechops.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#1C1C1E' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ borderColor: '#E8E8E8' }}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
                  <CheckCircle size={16} />
                  <span className="text-sm">Login successful! Redirecting...</span>
                </div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <Link
                  href="/rider/register"
                  className="text-sm font-bold hover:underline"
                  style={{ color: '#E8621A' }}
                >
                  Become a rider
                </Link>
              </div>
              
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm hover:underline"
                  style={{ color: '#636366' }}
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Rider Benefits */}
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <div className="flex items-start gap-2">
                <Info size={16} className="mt-0.5" style={{ color: '#D97706' }} />
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: '#1C1C1E' }}>
                    Rider Benefits
                  </p>
                  <p className="text-xs" style={{ color: '#636366' }}>
                    • Flexible working hours<br/>
                    • Competitive earnings<br/>
                    • Real-time order tracking<br/>
                    • Weekly payment schedule
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs" style={{ color: '#A0A0A0' }}>
              © 2024 VibeChops. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
