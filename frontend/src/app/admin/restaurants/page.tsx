'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2, Store } from 'lucide-react';

interface Restaurant {
  _id: string;
  name: string;
  cuisine: string[];
  rating: number;
  isOpen: boolean;
  address: string;
}

export default function AdminRestaurants() {
  const { user } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchRestaurants();
  }, [user]);

  const fetchRestaurants = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/restaurants`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      }
    } catch (error) {
      console.error('Failed to fetch restaurants', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isOpen: !currentStatus }),
      });
      if (res.ok) {
        fetchRestaurants();
      }
    } catch (error) {
      console.error('Failed to update restaurant', error);
    }
  };

  const deleteRestaurant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/restaurants/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        fetchRestaurants();
      }
    } catch (error) {
      console.error('Failed to delete restaurant', error);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Restaurants</h1>
              <p className="text-gray-500 mt-1">Add, edit, or remove restaurants</p>
            </div>
          </div>
          <Link href="/admin/restaurants/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Restaurant
          </Link>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Cuisine</th>
                  <th className="text-left p-4">Rating</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r) => (
                  <tr key={r._id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{r.name}</td>
                    <td className="p-4 text-gray-600">{r.cuisine.join(', ')}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span> {r.rating}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(r._id, r.isOpen)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          r.isOpen
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.isOpen ? 'Open' : 'Closed'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/restaurants/${r._id}/edit`}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Pencil className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => deleteRestaurant(r._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
