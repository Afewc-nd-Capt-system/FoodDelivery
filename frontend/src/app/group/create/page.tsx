'use client';
import { API_BASE as API_URL } from '@/lib/apiBase';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Clock, Calendar, Share2, Plus, X } from 'lucide-react';

export default function GroupOrderCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [restaurant, setRestaurant] = useState('');
  const [restaurants, setRestaurants] = useState<{ _id: string; name: string; cuisine?: string }[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [error, setError] = useState('');

  // Real restaurant list from the API — the group order must reference an
  // existing restaurant, never a hard-coded demo list.
  useEffect(() => {
    fetch(`${API_URL.replace(/\/v2$/, '')}/v2/restaurants?limit=20`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const list = body?.restaurants || body?.data || [];
        setRestaurants(Array.isArray(list) ? list : []);
      })
      .catch((err) => console.error('Failed to load restaurants:', err))
      .finally(() => setRestaurantsLoading(false));
  }, []);

  const timeSlots = [
    '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'
  ];

  const addEmail = () => {
    if (emailInput && !inviteEmails.includes(emailInput)) {
      setInviteEmails([...inviteEmails, emailInput]);
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };

  const handleCreate = async () => {
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    const selected = restaurants.find((r) => r._id === restaurant);
    if (!selected) {
      setError('Please choose a restaurant.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL.replace(/\/v2$/, '')}/v2/group-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({
          restaurant: selected._id,
          restaurantName: selected.name,
          deliveryAddress: deliveryAddress || groupName || selected.name,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || `status ${response.status}`);
      setGroupCode(body.data?.groupOrder?.shareCode || body.data?.groupOrder?.share_code || '');
      setStep(3);
    } catch (err) {
      console.error('Failed to create group order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create group order');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(groupCode);
  };

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/restaurants">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-black text-white">Create Group Order</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-black text-[#1C1C1E] mb-6">Step 1: Basic Details</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-[#1C1C1E]">Group Name</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Lunch with the team"
                  className="border-[#E8E8E8] rounded-xl"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-[#1C1C1E]">Select Restaurant</Label>
                <Select value={restaurant} onValueChange={setRestaurant}>
                  <SelectTrigger className="border-[#E8E8E8] rounded-xl">
                    <SelectValue placeholder="Choose a restaurant" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {restaurantsLoading && <SelectItem value="loading" disabled>Loading restaurants…</SelectItem>}
                    {!restaurantsLoading && restaurants.length === 0 && (
                      <SelectItem value="none" disabled>No restaurants available yet</SelectItem>
                    )}
                    {restaurants.map((r) => (
                      <SelectItem key={r._id} value={r._id}>
                        {r.name}{r.cuisine ? ` - ${r.cuisine}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-[#1C1C1E]">Delivery Date</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="border-[#E8E8E8] rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-[#1C1C1E]">Delivery Time</Label>
                  <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                    <SelectTrigger className="border-[#E8E8E8] rounded-xl">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-[#1C1C1E]">Max Participants</Label>
                <Select value={maxParticipants} onValueChange={setMaxParticipants}>
                  <SelectTrigger className="border-[#E8E8E8] rounded-xl">
                    <Users className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {[5, 10, 15, 20, 25, 30].map((num) => (
                      <SelectItem key={num} value={num.toString()}>{num} people</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!groupName || !restaurant || !deliveryDate || !deliveryTime}
                className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white font-semibold py-3 rounded-xl"
              >
                Continue
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-xl font-black text-[#1C1C1E] mb-6">Step 2: Invite Participants</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email address"
                  className="border-[#E8E8E8] rounded-xl flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                />
                <Button onClick={addEmail} className="bg-[#E8621A] text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {inviteEmails.length > 0 && (
                <div className="space-y-2">
                  {inviteEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-3 bg-[#F5F5F5] rounded-xl">
                      <span className="text-sm text-[#1C1C1E]">{email}</span>
                      <Button size="sm" variant="ghost" onClick={() => removeEmail(email)}>
                        <X className="w-4 h-4 text-[#D32F2F]" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 border-[#E8E8E8]"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white font-semibold py-3 rounded-xl"
                >
                  {loading ? 'Creating...' : 'Create Group Order'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-8 h-8 text-[#16A34A]" />
            </div>
            <h2 className="text-2xl font-black text-[#1C1C1E] mb-2">Group Order Created!</h2>
            <p className="text-[#636366] mb-6">Share this code with your friends to join</p>
            
            <div className="bg-[#F5F5F5] p-6 rounded-xl mb-6">
              <p className="text-4xl font-black text-[#E8621A] mb-2">{groupCode}</p>
              <p className="text-sm text-[#A0A0A0]">Group Code</p>
            </div>

            <div className="flex gap-4">
              <Button onClick={copyCode} className="flex-1 bg-[#E8621A] text-white">
                <Share2 className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              <Link href={`/group/${groupCode}`} className="flex-1">
                <Button className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                  Go to Group
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
