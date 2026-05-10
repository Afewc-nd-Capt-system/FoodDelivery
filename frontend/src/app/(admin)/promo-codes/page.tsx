'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash } from 'lucide-react';

export default function AdminPromoCodesPage() {
  const [showForm, setShowForm] = useState(false);

  const promoCodes = [
    { code: 'VIBES20', type: '%', value: 20, minOrder: 2000, uses: 145, expiry: 'Dec 31, 2026', status: 'active' },
    { code: 'FIRSTORDER', type: '%', value: 15, minOrder: 1000, uses: 89, expiry: 'Oct 31, 2026', status: 'active' },
    { code: 'NAIJA10', type: '%', value: 10, minOrder: 0, uses: 234, expiry: 'Nov 30, 2026', status: 'active' },
    { code: 'SPRING50', type: 'fixed', value: 500, minOrder: 3000, uses: 0, expiry: 'Apr 30, 2026', status: 'expired' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#1C1C1E] min-h-screen p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center text-white font-black text-lg">V</div>
          <span className="text-xl font-black text-white">Vibe<span className="text-[#E8621A]">Chops</span></span>
        </div>
        <nav className="space-y-1">
          {['Dashboard', 'Restaurants', 'Orders', 'Users', 'Analytics', 'Promotions', 'Promo Codes', 'Loyalty'].map((item) => (
            <div key={item} className={`px-4 py-2.5 rounded-xl ${item === 'Promo Codes' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}>
              {item}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-[#1C1C1E]">Promo Codes</h1>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
            <Plus className="w-4 h-4 mr-2" /> Create Code
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="p-6 mb-6">
            <h3 className="font-bold mb-4">Create Promo Code</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Code</Label>
                <Input placeholder="VIBE20" className="uppercase" />
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Type</Label>
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
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Min Order (₦)</Label>
                <Input type="number" placeholder="2000" />
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Expiry Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">Create</Button>
              <Button onClick={() => setShowForm(false)} className="bg-[#F5F5F5] text-[#636366]">Cancel</Button>
            </div>
          </Card>
        )}

        {/* Table */}
        <Card className="p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0EAE0]">
                <th className="text-left text-xs text-[#A0A0A0] pb-2">Code</th>
                <th className="text-left text-xs text-[#A0A0A0] pb-2">Type</th>
                <th className="text-left text-xs text-[#A0A0A0] pb-2">Value</th>
                <th className="text-left text-xs text-[#A0A0A0] pb-2">Min Order</th>
                <th className="text-left text-xs text-[#A0A0A0] pb-2">Uses</th>
                <th className="text-left text-xs text-[#A0A0A0] pb-2">Expiry</th>
                <th className="text-left text-xs text-[#A0A0A0] pb-2">Status</th>
                <th className="text-right text-xs text-[#A0A0A0] pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map((code) => (
                <tr key={code.code} className="border-b border-[#F0EAE0] last:border-0">
                  <td className="py-3 font-mono text-sm">{code.code}</td>
                  <td className="py-3 text-sm">{code.type}</td>
                  <td className="py-3 text-sm font-bold text-[#E8621A]">{code.type === '%' ? `${code.value}%` : `₦${code.value}`}</td>
                  <td className="py-3 text-sm">₦{code.minOrder.toLocaleString()}</td>
                  <td className="py-3 text-sm">{code.uses}</td>
                  <td className="py-3 text-sm text-[#636366]">{code.expiry}</td>
                  <td className="py-3">
                    <Badge className={code.status === 'active' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#636366]'}>
                      {code.status.charAt(0).toUpperCase() + code.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-[#A0A0A0] hover:text-[#E8621A]"><Pencil className="w-4 h-4" /></button>
                      <button className="text-[#D32F2F] hover:text-[#D32F2F]/80"><Trash className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expired Section */}
          <div className="mt-8 pt-6 border-t border-[#F0EAE0]">
            <h3 className="font-bold text-sm text-[#A0A0A0] mb-4">Expired Codes</h3>
            <div className="space-y-2">
              {promoCodes.filter(c => c.status === 'expired').map((code) => (
                <div key={code.code} className="flex items-center justify-between py-2 opacity-60">
                  <span className="font-mono text-sm">{code.code}</span>
                  <span className="text-xs text-[#A0A0A0]">Expired {code.expiry}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
