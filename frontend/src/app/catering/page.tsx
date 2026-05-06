'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function CateringPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadRequests();
  }, [user]);

  const loadRequests = async () => {
    try {
      const result = await api.catering.getAll();
      setRequests(result.data);
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
        <h1 className="text-3xl font-bold mb-8">Catering Requests</h1>
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">No catering requests</div>
          ) : (
            requests.map(req => (
              <div key={req._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">{req.restaurant?.name}</h3>
                    <p className="text-sm text-gray-600">{req.eventType} - {req.numberOfPeople} people</p>
                    <p className="text-sm text-gray-500">{new Date(req.eventDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${req.status === 'quoted' ? 'bg-blue-100 text-blue-800' : req.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100'}`}>
                    {req.status}
                  </span>
                </div>
                {req.quotedPrice && <p className="mt-2 font-medium">Quote: ₦{req.quotedPrice}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}