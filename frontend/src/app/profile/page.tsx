'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Phone, MapPin, Save, ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setName(user.name || '');
    setPhone(user.phone || '');
    if (user.address) {
      setAddress({
        street: user.address.street || '',
        city: user.address.city || '',
        state: user.address.state || '',
        zipCode: user.address.zipCode || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone,
          address,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        updateUser(updatedUser);
        setSuccess('Profile updated successfully!');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">My Profile</h1>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-gray-500">{user.email}</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
          
          {success && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">{success}</div>
          )}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field pl-10"
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Address
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="Street address"
                className="input-field"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="City"
                  className="input-field"
                />
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  placeholder="State"
                  className="input-field"
                />
              </div>
              <input
                type="text"
                value={address.zipCode}
                onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                placeholder="ZIP Code"
                className="input-field"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-5 h-5" /> Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
