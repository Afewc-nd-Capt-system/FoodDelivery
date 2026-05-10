'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Users, Utensils, CheckCircle, Plus, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/components/ui/utils';

export default function CateringPage() {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    eventType: '',
    guestCount: '',
    restaurantId: '',
    specialRequests: '',
    budget: '',
  });

  const eventTypes = [
    { id: 'wedding', name: 'Wedding Reception' },
    { id: 'corporate', name: 'Corporate Event' },
    { id: 'birthday', name: 'Birthday Party' },
    { id: 'conference', name: 'Conference' },
    { id: 'other', name: 'Other' },
  ];

  const restaurants = [
    { id: '1', name: 'Mama Cass Kitchen', cuisine: 'Nigerian' },
    { id: '2', name: 'Chop Chop Lagos', cuisine: 'Chinese' },
    { id: '3', name: 'Spice Garden', cuisine: 'Indian' },
    { id: '4', name: 'Bella Italia', cuisine: 'Italian' },
  ];

  const fetchRequests = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/v2/catering`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch catering requests:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/v2/catering`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          date: format(date, 'yyyy-MM-dd'),
          guestCount: parseInt(formData.guestCount),
          budget: parseFloat(formData.budget),
        }),
      });
      if (response.ok) {
        setShowForm(false);
        setFormData({
          eventType: '',
          guestCount: '',
          restaurantId: '',
          specialRequests: '',
          budget: '',
        });
        setDate(undefined);
        fetchRequests();
      }
    } catch (error) {
      console.error('Failed to create catering request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-black text-white">Catering Services</h1>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-black text-[#1C1C1E] mb-6">Create Catering Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-[#1C1C1E]">Event Type</Label>
                  <Select value={formData.eventType} onValueChange={(v) => setFormData({ ...formData, eventType: v })}>
                    <SelectTrigger className="border-[#E8E8E8] rounded-xl">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {eventTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-[#1C1C1E]">Guest Count</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                    <Input
                      type="number"
                      value={formData.guestCount}
                      onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                      placeholder="Number of guests"
                      className="pl-10 border-[#E8E8E8] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-[#1C1C1E]">Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn('w-full justify-start text-left font-normal border-[#E8E8E8] rounded-xl', !date && 'text-[#A0A0A0]')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-[#E8621A]" />
                        {date ? format(date, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white">
                      <Calendar mode="single" selected={date} onSelect={setDate} disabled={(date) => date < new Date()} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-[#1C1C1E]">Restaurant</Label>
                  <Select value={formData.restaurantId} onValueChange={(v) => setFormData({ ...formData, restaurantId: v })}>
                    <SelectTrigger className="border-[#E8E8E8] rounded-xl">
                      <Utensils className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Select restaurant" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {restaurants.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name} - {r.cuisine}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-[#1C1C1E]">Budget (₦)</Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="Enter your budget"
                  className="border-[#E8E8E8] rounded-xl"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-[#1C1C1E]">Special Requests</Label>
                <Textarea
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  placeholder="Dietary restrictions, decoration preferences, etc."
                  className="border-[#E8E8E8] rounded-xl resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="flex-1 border-[#E8E8E8]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !date}
                  className="flex-1 bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white font-semibold py-3 rounded-xl"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <h2 className="text-xl font-black text-[#1C1C1E] mb-4">My Catering Requests</h2>
        <div className="space-y-4">
          {requests.length > 0 ? requests.map((req) => (
            <Card key={req.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF1E8] flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-[#E8621A]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1C1C1E]">{req.eventType}</h3>
                    <p className="text-sm text-[#636366]">{req.restaurantName || req.restaurant}</p>
                  </div>
                </div>
                <Badge className={req.status === 'confirmed' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FFF1E8] text-[#E8621A]'}>
                  {req.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-[#636366]">
                  <CalendarIcon size={14} />
                  <span>{new Date(req.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-[#636366]">
                  <Users size={14} />
                  <span>{req.guestCount} guests</span>
                </div>
                <div className="flex items-center gap-2 text-[#E8621A]">
                  <Clock size={14} />
                  <span>₦{req.budget?.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          )) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="font-black text-xl mb-2">No catering requests</h3>
              <p className="text-[#636366] mb-6">Create your first catering request</p>
              <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
