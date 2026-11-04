'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Send, CheckCircle, Clock, X, Loader2 } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

interface Dispute {
  _id: string;
  order?: { _id: string; status: string; totalAmount: number; restaurantName?: string };
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function DisputesPage() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<{ _id: string; restaurantName?: string; totalAmount?: number; createdAt?: string }[]>([]);
  const [orderId, setOrderId] = useState('');
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [disputesRes, ordersRes] = await Promise.all([
      fetch(`${API_V2}/disputes`, { headers }),
      fetch(`${API_V2}/orders?limit=20`, { headers }),
    ]);
    if (disputesRes.ok) {
      const body = await disputesRes.json();
      setDisputes(Array.isArray(body?.data) ? body.data : []);
    }
    if (ordersRes.ok) {
      const body = await ordersRes.json();
      const list = Array.isArray(body?.orders) ? body.orders : [];
      setDeliveryHistory(
        list.filter((o: { status?: string }) => ['delivered', 'completed'].includes(String(o.status)))
      );
    }
  };

  // Fetch the user's delivered orders for the dispute form and their existing disputes.
  useEffect(() => {
    const run = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }
      try {
        await loadData(token);
      } catch (error) {
        console.error('Failed to load disputes:', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const submit = async () => {
    setFormError('');
    setFormSuccess('');
    if (!orderId || !issueType || !description.trim()) {
      setFormError('Please choose the order, an issue type, and describe the problem.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setFormError('Your session expired. Please sign in again to file a dispute.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_V2}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, type: issueType, description }),
        signal: AbortSignal.timeout(25000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `status ${res.status}`);
      setFormSuccess(body.message || 'Dispute submitted for review');
      setOrderId('');
      setIssueType('');
      setDescription('');
      await loadData(token);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    submitted: 'bg-[#FFF1E8] text-[#E8621A]',
    under_review: 'bg-[#EFF6FF] text-[#2563EB]',
    resolved: 'bg-[#F0FDF4] text-[#16A34A]',
    rejected: 'bg-[#F5F5F5] text-[#636366]',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-[#1C1C1E]">Disputes 📝</h1>
        {!authRequired && (
          <Button
            onClick={() => {
              setFormError('');
              setFormSuccess('');
            }}
            className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white"
          >
            <AlertTriangle className="w-4 h-4 mr-2" /> Submit Dispute
          </Button>
        )}
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#E8621A]" /></div>}

      {authRequired && (
        <Card className="p-8 text-center mb-8">
          <h3 className="font-black text-lg mb-2 text-[#1C1C1E]">Sign in to manage disputes</h3>
          <p className="text-sm text-[#636366]">Log in to see the disputes you filed and report a problem with a delivered order.</p>
        </Card>
      )}

      {!loading && !authRequired && (
        <>
          <Card className="p-6 mb-8">
            <h2 className="font-bold text-lg mb-4">Submit a Dispute</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Order</Label>
                <Select value={orderId} onValueChange={setOrderId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={deliveryHistory.length ? 'Select order' : 'No delivered orders yet'} />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryHistory.map((order) => (
                      <SelectItem key={order._id} value={order._id}>
                        {order.restaurantName || 'Order'} — {new Date(order.createdAt || Date.now()).toLocaleDateString()} (₦{Number(order.totalAmount || 0).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Issue Type</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wrong_item">Wrong Item</SelectItem>
                    <SelectItem value="missing_item">Missing Item</SelectItem>
                    <SelectItem value="quality">Quality Issue</SelectItem>
                    <SelectItem value="late_delivery">Late Delivery</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-[#A0A0A0] mb-1 block">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue..."
                />
              </div>

              {formError && <p className="text-sm text-[#D32F2F]">{formError}</p>}
              {formSuccess && <p className="text-sm text-[#16A34A]">{formSuccess}</p>}

              <div className="flex gap-2">
                <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                  <Send className="w-4 h-4 mr-2" /> {submitting ? 'Submitting…' : 'Submit'}
                </Button>
              </div>
            </div>
          </Card>

          <h2 className="font-bold text-lg mb-4">My Disputes</h2>
          <div className="space-y-4">
            {disputes.length === 0 && (
              <p className="text-sm text-[#A0A0A0]">No disputes filed.</p>
            )}
            {disputes.map((dispute) => (
              <Card key={dispute._id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      dispute.status === 'resolved' ? 'bg-[#F0FDF4]' : 'bg-[#EFF6FF]'
                    }`}>
                      {dispute.status === 'resolved' ? (
                        <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                      ) : (
                        <Clock className="w-5 h-5 text-[#2563EB]" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1C1C1E]">{dispute.type.replace(/_/g, ' ')}</h3>
                      <p className="text-xs text-[#A0A0A0]">Order: {dispute.order?.restaurantName || dispute.order?._id || '—'}</p>
                    </div>
                  </div>
                  <Badge className={statusColors[dispute.status] || 'bg-[#F5F5F5] text-[#636366]'}>
                    {dispute.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Badge>
                </div>
                <p className="text-sm text-[#636366] mb-2">{dispute.description}</p>
                <p className="text-xs text-[#A0A0A0]">Submitted: {new Date(dispute.createdAt).toLocaleDateString()}</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
