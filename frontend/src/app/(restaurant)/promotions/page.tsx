'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash, Plus, Loader2 } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

export default function RestaurantPromotionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    name: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderValue: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_V2}/restaurant-promotions`, {
        headers,
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message || 'Could not load promotions.');
        setPromotions([]);
        return;
      }
      setPromotions(Array.isArray(body?.data) ? body.data : []);
    } catch {
      setError('Network error while loading promotions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setError('');
    setNotice('');
    if (!form.name.trim() || !form.discountValue || !form.startDate || !form.endDate) {
      setError('Name, discount value, start date and end date are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_V2}/restaurant-promotions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        }),
        signal: AbortSignal.timeout(25000),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message || 'Could not create the promotion.');
        return;
      }
      setNotice('Promotion submitted for admin approval.');
      setShowForm(false);
      setForm({ name: '', discountType: 'percentage', discountValue: '', minOrderValue: '', startDate: '', endDate: '', description: '' });
      load();
    } catch {
      setError('Network error while creating the promotion.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this promotion?')) return;
    setDeleting(id);
    setError('');
    try {
      const res = await fetch(`${API_V2}/restaurant-promotions/${id}`, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message || 'Could not delete the promotion.');
        return;
      }
      setPromotions((prev) => prev.filter((p) => p._id !== id));
    } catch {
      setError('Network error while deleting the promotion.');
    } finally {
      setDeleting(null);
    }
  };

  const statusColor = (status: string) =>
    status === 'approved' ? '#F0FDF4' : status === 'rejected' ? '#FEF2F2' : '#FFF1E8';
  const statusText = (status: string) =>
    status === 'approved' ? '#16A34A' : status === 'rejected' ? '#D32F2F' : '#B45309';

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-[#F0EAE0] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-[#1C1C1E]">Restaurant Promotions</h1>
          <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white px-4 py-2 rounded-xl text-sm font-medium hover:scale-105">
            <Plus className="w-4 h-4 mr-2 inline" /> Create Promotion
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#D32F2F]">{error}</div>
        )}
        {notice && (
          <div role="status" className="mb-4 rounded-xl border border-[#86EFAC] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div>
        )}

        {showForm && (
          <Card className="p-6 mb-6">
            <h3 className="font-bold mb-4">Create Promotion</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Weekend Special" />
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Discount Type</Label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                  className="w-full border border-[#E8E8E8] rounded-xl px-3 py-2 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Discount Value</Label>
                <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder="10" />
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Min Order Value (₦)</Label>
                <Input type="number" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} placeholder="2000" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Summer Special Offer" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                {saving ? 'Submitting…' : 'Submit for Approval'}
              </Button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-[#E8E8E8] text-sm text-[#636366] hover:bg-[#FFF1E8]">
                Cancel
              </button>
            </div>
            <p className="text-xs text-[#A0A0A0] mt-2">Promotions require admin approval before going live</p>
          </Card>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#E8621A]" /></div>
          ) : promotions.length === 0 ? (
            <Card className="p-8 text-center text-sm text-[#636366]">No promotions yet. Create one to get started.</Card>
          ) : promotions.map((promo) => (
            <Card key={promo._id} className="p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-bold text-[#1C1C1E]">{promo.name}</p>
                  <Badge style={{ backgroundColor: statusColor(promo.approvalStatus), color: statusText(promo.approvalStatus) }}>
                    {promo.approvalStatus}
                  </Badge>
                </div>
                <p className="text-sm text-[#636366]">
                  {promo.discountType === 'percentage' ? `${promo.discountValue}% off` : `₦${Number(promo.discountValue).toLocaleString()} off`}
                  {Number(promo.minOrderValue) > 0 ? ` · min ₦${Number(promo.minOrderValue).toLocaleString()}` : ''}
                </p>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  {new Date(promo.startDate).toLocaleDateString()} – {new Date(promo.endDate).toLocaleDateString()}
                </p>
                {promo.description && <p className="text-xs text-[#636366] mt-1">{promo.description}</p>}
              </div>
              <button
                onClick={() => remove(promo._id)}
                disabled={deleting === promo._id}
                className="text-[#D32F2F] p-2 rounded-lg hover:bg-[#FEF2F2] disabled:opacity-50"
                aria-label="Delete promotion"
              >
                {deleting === promo._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
