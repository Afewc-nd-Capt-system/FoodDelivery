'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle } from 'lucide-react';

export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadDisputes();
  }, [user]);

  const loadDisputes = async () => {
    try {
      const result = await api.disputes.getAll();
      setDisputes(result.data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">My Disputes</h1>
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">No disputes</div>
          ) : (
            disputes.map(dispute => (
              <div key={dispute._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className={`w-6 h-6 ${dispute.status === 'resolved' ? 'text-green-500' : 'text-yellow-500'}`} />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-semibold capitalize">{dispute.type.replace('_', ' ')}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${dispute.status === 'resolved' ? 'bg-green-100 text-green-800' : dispute.status === 'under_review' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100'}`}>
                        {dispute.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">{dispute.description}</p>
                    {dispute.resolution && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm"><span className="font-medium">Resolution:</span> {dispute.resolution.replace('_', ' ')}</p>
                        {dispute.refundAmount > 0 && <p className="text-sm text-green-600">Refund: ₦{dispute.refundAmount}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}