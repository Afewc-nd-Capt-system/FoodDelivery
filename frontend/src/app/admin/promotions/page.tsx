'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Clock, Search } from 'lucide-react';

interface Promotion {
  _id: string;
  name: string;
  description: string;
  restaurant: { name: string };
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  startDate: string;
  endDate: string;
  approvalStatus: string;
  createdAt: string;
}

export default function AdminPromotionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadPromotions();
  }, [user]);

  const loadPromotions = async () => {
    try {
      const result = await api.adminPromotions.getAll(filter || undefined);
      setPromotions(result.data);
    } catch (error) {
      console.error('Failed to load promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, [filter]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api.adminPromotions.approve(id);
      loadPromotions();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason (optional):');
    setProcessing(id);
    try {
      await api.adminPromotions.reject(id, reason || undefined);
      loadPromotions();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Restaurant Promotions</h1>
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status === 'pending' ? '' : status)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  (filter === status || (status === 'pending' && !filter))
                    ? 'bg-orange-500 text-white'
                    : 'bg-white border'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {promotions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">No promotions to review</p>
            </div>
          ) : (
            promotions.map(promo => (
              <div key={promo._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{promo.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        promo.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        promo.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {promo.approvalStatus}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{promo.description || 'No description'}</p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Restaurant: {promo.restaurant?.name || 'N/A'}</span>
                      <span>{promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₦${promo.discountValue}`} OFF</span>
                      <span>Min: ₦{promo.minOrderValue}</span>
                      <span>{promo.startDate.split('T')[0]} - {promo.endDate.split('T')[0]}</span>
                    </div>
                  </div>
                  {promo.approvalStatus === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(promo._id)}
                        disabled={processing === promo._id}
                        className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(promo._id)}
                        disabled={processing === promo._id}
                        className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Created: {new Date(promo.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}