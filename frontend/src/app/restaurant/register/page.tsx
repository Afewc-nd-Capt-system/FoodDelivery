'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RestaurantRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    cuisine: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/v2/restaurants/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/restaurant/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: '#FFF8F0' }}>
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#1C1C1E' }}>Restaurant Registration</h1>
            <p className="text-sm" style={{ color: '#636366' }}>Create your restaurant account to start selling</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm font-semibold bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Restaurant Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="Your restaurant name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="restaurant@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="+234 XXX XXX XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="Your full address"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>
                Cuisine Type
              </label>
              <input
                type="text"
                name="cuisine"
                value={formData.cuisine}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E8E8E8', color: '#1C1C1E' }}
                placeholder="e.g., Nigerian, Continental, Fast Food"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#636366' }}>
              Already have an account?{' '}
              <Link href="/restaurant/login" className="font-bold" style={{ color: '#E8621A' }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
