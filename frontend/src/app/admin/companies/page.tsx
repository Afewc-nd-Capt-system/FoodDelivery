'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, ArrowLeft, Search, CheckCircle, XCircle } from 'lucide-react';

interface DeliveryCompany {
  _id: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  isActive: boolean;
  verificationStatus: string;
  totalRiders: number;
  totalDeliveries: number;
  createdAt: string;
}

export default function AdminCompanies() {
  const { user } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchCompanies();
  }, [user]);

  const fetchCompanies = async () => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const res = await fetch(`${API_URL}/admin/delivery-companies?limit=100`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  const filtered = companies.filter(c =>
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Delivery Companies</h1>
            <p className="text-gray-500 mt-1">View and manage all delivery company partners</p>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
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
                  <th className="text-left p-4">Company</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Phone</th>
                  <th className="text-left p-4">Riders</th>
                  <th className="text-left p-4">Deliveries</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Verification</th>
                  <th className="text-left p-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c._id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{c.companyName}</td>
                    <td className="p-4 text-gray-600">{c.email}</td>
                    <td className="p-4 text-gray-600">{c.phone}</td>
                    <td className="p-4 text-gray-600">{c.totalRiders || 0}</td>
                    <td className="p-4 text-gray-600">{c.totalDeliveries || 0}</td>
                    <td className="p-4">
                      {c.isActive ? (
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
                        c.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                        c.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {c.verificationStatus}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No delivery companies found</p>
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
