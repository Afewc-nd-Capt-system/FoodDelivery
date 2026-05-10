'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Send, CheckCircle, Clock, X } from 'lucide-react';

export default function DisputesPage() {
  const [showForm, setShowForm] = useState(false);

  const disputes = [
    { id: 'D001', orderId: 'ORD-7821', issueType: 'Missing Item', status: 'under_review', submittedDate: 'May 1, 2026', description: 'Missing fries from my order' },
    { id: 'D002', orderId: 'ORD-7750', issueType: 'Wrong Item', status: 'resolved', submittedDate: 'Apr 28, 2026', description: 'Received chicken instead of fish' },
  ];

  const statusColors = {
    'submitted': 'bg-[#FFF1E8] text-[#E8621A]',
    'under_review': 'bg-[#EFF6FF] text-[#2563EB]',
    'resolved': 'bg-[#F0FDF4] text-[#16A34A]',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-[#1C1C1E]">Disputes 📝</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white"
        >
          <AlertTriangle className="w-4 h-4 mr-2" /> Submit Dispute
        </Button>
      </div>

      {/* Submit Dispute Form */}
      {showForm && (
        <Card className="p-6 mb-8">
          <h2 className="font-bold text-lg mb-4">Submit a Dispute</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-[#A0A0A0] mb-1 block">Order</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORD-8021">ORD-8021 - Spice Garden</SelectItem>
                  <SelectItem value="ORD-7980">ORD-7980 - Burger Barn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-[#A0A0A0] mb-1 block">Issue Type</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wrong">Wrong Item</SelectItem>
                  <SelectItem value="missing">Missing Item</SelectItem>
                  <SelectItem value="quality">Quality Issue</SelectItem>
                  <SelectItem value="late">Late Delivery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-[#A0A0A0] mb-1 block">Description</Label>
              <Textarea placeholder="Describe your issue..." />
            </div>

            <div>
              <Label className="text-xs text-[#A0A0A0] mb-1 block">Photo Upload</Label>
              <div className="border-2 border-dashed border-[#E8E8E8] rounded-xl p-8 text-center hover:border-[#E8621A] cursor-pointer">
                <p className="text-sm text-[#A0A0A0]">Drag & drop or click to upload</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                <Send className="w-4 h-4 mr-2" /> Submit
              </Button>
              <Button onClick={() => setShowForm(false)} className="bg-[#F5F5F5] text-[#636366]">
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* My Disputes */}
      <h2 className="font-bold text-lg mb-4">My Disputes</h2>
      <div className="space-y-4">
        {disputes.map((dispute) => (
          <Card key={dispute.id} className="p-6">
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
                  <h3 className="font-bold text-[#1C1C1E]">{dispute.issueType}</h3>
                  <p className="text-xs text-[#A0A0A0]">Order: {dispute.orderId}</p>
                </div>
              </div>
              <Badge className={statusColors[dispute.status as 'submitted' | 'under_review' | 'resolved'] || 'bg-[#F5F5F5] text-[#636366]'}>
                {dispute.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Badge>
            </div>
            <p className="text-sm text-[#636366] mb-2">{dispute.description}</p>
            <p className="text-xs text-[#A0A0A0]">Submitted: {dispute.submittedDate}</p>

            {/* Status Timeline */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F0EAE0]">
              {['Submitted', 'Under Review', 'Resolved'].map((step, i) => {
                const stepIndex = ['submitted', 'under_review', 'resolved'].indexOf(dispute.status);
                return (
                  <div key={step} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${
                      i <= stepIndex ? 'bg-[#E8621A]' : 'bg-[#E8E8E8]'
                    }`} />
                    <span className={`text-xs ml-1 ${i <= stepIndex ? 'text-[#E8621A]' : 'text-[#A0A0A0]'}`}>
                      {step}
                    </span>
                    {i < 2 && <div className={`w-8 h-0.5 ml-1 ${i < stepIndex ? 'bg-[#E8621A]' : 'bg-[#E8E8E8]'}`} />}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
