'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/apiClient';

export default function RiderLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiPost('/riders/login', { email, password });

      router.push('/delivery/rider-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#1C1C1E' }}>Rider Login</h1>
            <p className="text-sm" style={{ color: '#636366' }}>Sign in to manage your deliveries</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm font-semibold bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="rider@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#636366' }}>
              Don't have an account?{' '}
              <Link href="/rider/register" className="font-bold" style={{ color: '#E8621A' }}>
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
