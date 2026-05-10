'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash, Plus } from 'lucide-react';

export default function RestaurantPromotionsPage() {
  const [showForm, setShowForm] = useState(false);

  const promotions = [
    { id: 'RP001', discount: '20%', type: '%', value: 20, minOrder: 2000, status: 'approved', dates: 'May 1 - May 31' },
    { id: 'RP002', discount: '₦1000', type: 'fixed', value: 1000, minOrder: 5000, status: 'pending', dates: 'May 10 - June 10' },
    { id: 'RP003', discount: '15%', type: '%', value: 15, minOrder: 3000, status: 'rejected', dates: 'Apr 15 - Apr 30' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#F0EAE0] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-[#1C1C1E]">Restaurant Promotions</h1>
          <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white px-4 py-2 rounded-xl text-sm font-medium hover:scale-105">
            <Plus className="w-4 h-4 mr-2" /> Create Promotion
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Form */}
        {showForm && (
          <Card className="p-6 mb-6">
            <h3 className="font-bold mb-4">Create Promotion</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Discount Type</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Value</Label>
                <Input type="number" placeholder="20" />
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Start Date</Label>
                <Input type="date" />
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">End Date</Label>
                <Input type="date" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Min Order Value (₦)</Label>
                <Input type="number" placeholder="2000" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Description</Label>
                <Input placeholder="Summer Special Offer" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                Submit for Approval
              </Button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-[#E8E8E8] text-sm text-[#636366] hover:bg-[#FFF1E8]">
                Cancel
              </button>
            </div>
            <p className="text-xs text-[#A0A0A0] mt-2">Promotions require admin approval before going live</p>
          </Card>
        )}

        {/* Promotions List */}
        <div className="space-y-4">
          {promotions.map((promo) => (
            <Card key={promo.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#1C1C1E]">{promo.discount} OFF</h3>
                  <p className="text-sm text-[#636366]">Min order: ₦{promo.minOrder.toLocaleString()} • {promo.dates}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    promo.status === 'approved' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                    promo.status === 'pending' ? 'bg-[#FFF1E8] text-[#E8621A]' :
                    'bg-[#FEE2E2] text-[#D32F2F]'
                  }>
                    {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                  </Badge>
                  <button className="text-[#A0A0A0] hover:text-[#E8621A]"><Pencil className="w-4 h-4" /></button>
                  <button className="text-[#D32F2F] hover:text-[#D32F2F]/80"><Trash className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
