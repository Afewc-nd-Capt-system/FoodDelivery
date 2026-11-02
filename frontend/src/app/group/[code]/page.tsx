'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Loader2 } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

interface GroupItem {
  name?: string;
  price?: number;
  quantity?: number;
  user?: { name?: string } | string;
}
interface GroupOrder {
  restaurantName?: string;
  deliveryAddress?: string;
  status: string;
  items: GroupItem[];
}

export default function GroupOrderPage() {
  const params = useParams();
  const code = params.code as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);

  useEffect(() => {
    if (!code) return;
    fetch(`${API_V2}/group-orders/${encodeURIComponent(code)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || `status ${res.status}`);
        setGroupOrder(body.data || null);
      })
      .catch((err) => setError(err.message || 'Group order not found'))
      .finally(() => setLoading(false));
  }, [code]);

  const items = groupOrder?.items || [];
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-[#636366] hover:text-[#E8621A]">
          <span className="text-2xl">←</span>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1C1C1E]">Group Order 👥</h1>
          <p className="text-sm text-[#636366]">Share this code with friends</p>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#E8621A]" /></div>}

      {error && !loading && (
        <Card className="p-8 text-center mb-8">
          <h3 className="font-black text-lg mb-2 text-[#1C1C1E]">This group order is not available</h3>
          <p className="text-sm text-[#636366]">{error}. It may have expired or already been closed.</p>
          <p className="text-xs text-[#A0A0A0] mt-2">Codes are valid only while an active group order is open.</p>
        </Card>
      )}

      {groupOrder && !loading && (
        <>
          {/* Code Display */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#A0A0A0] mb-1">Group Code</p>
                <p className="text-2xl font-mono font-bold text-[#E8621A]">{code}</p>
              </div>
              <button onClick={copyCode} className="flex items-center gap-2 bg-[#FFF1E8] text-[#E8621A] px-4 py-2 rounded-xl text-sm">
                <Copy className="w-4 h-4" /> Copy Code
              </button>
            </div>
          </Card>

          <h2 className="text-xl font-black text-[#1C1C1E] mb-4">{groupOrder.restaurantName || 'Restaurant'}</h2>

          {/* Shared Cart */}
          <h3 className="text-lg font-black text-[#1C1C1E] mb-4">Shared Cart</h3>
          <div className="space-y-3 mb-8">
            {items.length === 0 && (
              <p className="text-sm text-[#A0A0A0]">No items added yet — be the first to add something from the menu.</p>
            )}
            {items.map((item, index) => {
              const contributor = typeof item.user === 'object' ? item.user?.name : item.user;
              return (
                <Card key={`${index}-${item.name}`} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.name || 'Item'}</p>
                      <p className="text-xs text-[#A0A0A0]">Added by {contributor || 'a member'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#E8621A]">₦{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}</p>
                      <p className="text-xs text-[#A0A0A0]">Qty: {item.quantity || 1}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Checkout note */}
          <div className="sticky bottom-6 bg-white rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#636366]">Running total</p>
                <p className="text-2xl font-black text-[#E8621A]">₦{total.toLocaleString()}</p>
              </div>
              <p className="text-sm text-[#636366] max-w-[220px] text-right">
                The group host places one checkout when everyone has added their items.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
