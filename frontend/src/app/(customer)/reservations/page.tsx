'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, X, Edit, CheckCircle, Loader2 } from 'lucide-react';
import { ReservationModal } from '@/components/ReservationModal';

export default function ReservationsPage() {
  const [showPast, setShowPast] = useState(false);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/v2/reservations`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const now = new Date();
        const upcomingRes = data.filter((r: any) => new Date(r.date) >= now);
        const pastRes = data.filter((r: any) => new Date(r.date) < now);
        setUpcoming(upcomingRes);
        setPast(pastRes);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-[#1C1C1E]">Reservations 🍽️</h1>
        <ReservationModal onReservationCreated={fetchReservations} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#E8621A] animate-spin" />
        </div>
      ) : (
        <>
          {/* Upcoming Reservations */}
          <h2 className="font-bold text-lg mb-4">Upcoming</h2>
          <div className="space-y-4 mb-8">
            {upcoming.length > 0 ? upcoming.map((res) => (
              <Card key={res.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF1E8] flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-[#E8621A]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1C1C1E]">{res.restaurantName || res.restaurant}</h3>
                      <p className="text-sm text-[#636366]">{new Date(res.date).toLocaleDateString()} at {res.time}</p>
                      <p className="text-xs text-[#A0A0A0]">Party of {res.partySize}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#F0FDF4] text-[#16A34A]">{res.status}</Badge>
                    <Button className="bg-[#FFF1E8] text-[#E8621A] px-3 py-1.5 text-xs">
                      <Edit className="w-3 h-3 mr-1" /> Modify
                    </Button>
                    <Button className="border border-[#D32F2F] text-[#D32F2F] px-3 py-1.5 text-xs hover:bg-red-50">
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )) : (
              <div className="text-center py-8 text-[#636366]">No upcoming reservations</div>
            )}
          </div>

          {/* Past Reservations */}
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 font-bold text-lg mb-4 hover:text-[#E8621A]"
          >
            Past Reservations
            <span className="text-sm">{showPast ? '↑' : '↓'}</span>
          </button>

          {showPast && (
            <div className="space-y-4">
              {past.length > 0 ? past.map((res) => (
                <Card key={res.id} className="p-6 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-[#A0A0A0]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1C1C1E]">{res.restaurantName || res.restaurant}</h3>
                        <p className="text-sm text-[#636366]">{new Date(res.date).toLocaleDateString()} at {res.time}</p>
                        <p className="text-xs text-[#A0A0A0]">Party of {res.partySize}</p>
                      </div>
                    </div>
                    <Badge className="bg-[#F5F5F5] text-[#636366]">{res.status}</Badge>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-8 text-[#636366]">No past reservations</div>
              )}
            </div>
          )}

          {/* Empty State */}
          {upcoming.length === 0 && past.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="font-black text-xl mb-2">No reservations</h3>
              <p className="text-[#636366] mb-6">Book a table at your favorite restaurant</p>
              <ReservationModal onReservationCreated={fetchReservations} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
