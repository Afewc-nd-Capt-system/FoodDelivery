'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/components/ui/utils';

interface ReservationModalProps {
  restaurantId?: string;
  restaurantName?: string;
  onReservationCreated?: () => void;
}

export function ReservationModal({ restaurantId, restaurantName, onReservationCreated }: ReservationModalProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);

  const timeSlots = [
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !partySize) return;

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/v2/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId: restaurantId,
          date: format(date, 'yyyy-MM-dd'),
          time,
          partySize: parseInt(partySize),
          specialRequests,
        }),
      });

      if (response.ok) {
        setOpen(false);
        setDate(undefined);
        setTime('');
        setPartySize('');
        setSpecialRequests('');
        onReservationCreated?.();
      }
    } catch (error) {
      console.error('Failed to create reservation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
          <CalendarIcon className="w-4 h-4 mr-2" /> Book a Table
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-[#1C1C1E]">
            {restaurantName ? `Book a Table at ${restaurantName}` : 'Book a Table'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1C1C1E]">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal border-[#E8E8E8] rounded-xl',
                    !date && 'text-[#A0A0A0]'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-[#E8621A]" />
                  {date ? format(date, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1C1C1E]">Time</Label>
            <Select value={time} onValueChange={setTime} required>
              <SelectTrigger className="border-[#E8E8E8] rounded-xl">
                <Clock className="w-4 h-4 mr-2 text-[#E8621A]" />
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1C1C1E]">Party Size</Label>
            <Select value={partySize} onValueChange={setPartySize} required>
              <SelectTrigger className="border-[#E8E8E8] rounded-xl">
                <Users className="w-4 h-4 mr-2 text-[#E8621A]" />
                <SelectValue placeholder="Select party size" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} {size === 1 ? 'Guest' : 'Guests'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1C1C1E]">Special Requests (Optional)</Label>
            <Textarea
              placeholder="Any dietary restrictions, seating preferences, etc."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="border-[#E8E8E8] rounded-xl resize-none"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white font-semibold py-3 rounded-xl"
            disabled={loading || !date || !time || !partySize}
          >
            {loading ? 'Booking...' : 'Confirm Reservation'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
