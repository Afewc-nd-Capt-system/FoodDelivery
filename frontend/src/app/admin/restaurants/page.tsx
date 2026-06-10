'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, ArrowLeft, Search, CheckCircle, XCircle } from 'lucide-react';

interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  cuisine: string;
  isActive: boolean;
  verificationStatus: string;
  createdAt: string;
}

export default function AdminRestaurants() {
  const { user } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchRestaurants();
  }, [user]);

  const fetchRestaurants = async () => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const res = await fetch(`${API_URL}/admin/restaurants?limit=100`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data.restaurants || []);
      }
    } catch (error) {
      console.error('Failed to fetch restaurants', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    r.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Restaurants</h1>
            <p className="text-gray-500 mt-1">View and manage all restaurant partners</p>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search restaurants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">City</th>
                  <th className="text-left p-4">Cuisine</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Verification</th>
                  <th className="text-left p-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{r.name}</td>
                    <td className="p-4 text-gray-600">{r.email}</td>
                    <td className="p-4 text-gray-600">{r.city}</td>
                    <td className="p-4 text-gray-600">{r.cuisine}</td>
                    <td className="p-4">
                      {r.isActive ? (
                        <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        r.verificationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        r.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {r.verificationStatus}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      <Store className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No restaurants found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
