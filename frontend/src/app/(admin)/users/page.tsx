'use client';
import { API_V2 as API_URL } from '@/lib/apiBase';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft, Search } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  createdAt: string;
}

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    // Wait for AuthContext to restore the session; a null user during the
    // first paint is not an unauthenticated admin.
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [user, authLoading]);

  const fetchUsers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/admin/users?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!user || user.role !== 'admin') return null;

  const adminRequest = async (id: string, action: 'verify-email' | 'resend-verification') => {
    setActionMessage('');
    setActionError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/admin/users/${id}/${action}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(body?.message || 'The action could not be completed.');
        return;
      }
      setActionMessage(body?.message || (action === 'verify-email' ? 'User marked as verified.' : 'Verification email sent.'));
      await fetchUsers();
    } catch {
      setActionError('Network error. Please try again.');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-500 mt-1">View all registered users</p>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          {actionMessage && (
            <div data-testid="admin-users-message" className="bg-green-50 text-green-700 px-4 py-2 text-sm">{actionMessage}</div>
          )}
          {actionError && (
            <div role="alert" className="bg-red-50 text-red-700 px-4 py-2 text-sm">{actionError}</div>
          )}
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Email status</th>
                  <th className="text-left p-4">Joined</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{u.name}</td>
                    <td className="p-4 text-gray-600">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        data-testid={`admin-email-status-${u._id}`}
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${u.emailVerified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                      >
                        {u.emailVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      {u.emailVerified ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            data-testid={`admin-resend-verification-${u._id}`}
                            onClick={() => adminRequest(u._id, 'resend-verification')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FFF1E8] text-[#E8621A]"
                          >
                            Resend verification
                          </button>
                          <button
                            type="button"
                            data-testid={`admin-mark-verified-${u._id}`}
                            onClick={() => adminRequest(u._id, 'verify-email')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1C1E] text-white"
                          >
                            Mark verified
                          </button>
                        </div>
                      )}
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
