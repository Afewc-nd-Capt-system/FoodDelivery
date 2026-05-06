'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Users } from 'lucide-react';

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadReservations();
  }, [user]);

  const loadReservations = async () => {
    try {
      const result = await api.reservations.getAll();
      setReservations(result.data);
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
        <h1 className="text-3xl font-bold mb-8">Table Reservations</h1>
        <div className="space-y-4">
          {reservations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">No reservations</div>
          ) : (
            reservations.map(res => (
              <div key={res._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">{res.restaurant?.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Calendar className="w-4 h-4" /> {new Date(res.date).toLocaleDateString()} at {res.time}
                      <Users className="w-4 h-4 ml-2" /> {res.partySize} guests
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${res.status === 'confirmed' ? 'bg-green-100 text-green-800' : res.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100'}`}>
                    {res.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Confirmation: {res.confirmationCode}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}