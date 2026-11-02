'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Gift, Info } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

interface LoyaltyEntry {
  _id: string;
  points: number;
  type: string;
  description?: string;
  createdAt: string;
}

export default function LoyaltyPage() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [points, setPoints] = useState(0);
  const [config, setConfig] = useState<{
    pointsEarnRate?: number;
    pointsRedemptionValue?: number;
    minPointsRedemption?: number;
    maxRedemptionPercent?: number;
  } | null>(null);
  const [history, setHistory] = useState<LoyaltyEntry[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const run = async () => {
      try {
        const [summary, entries, program] = await Promise.all([
          fetch(`${API_V2}/loyalty/balance`, { headers }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_V2}/loyalty/history?limit=20`, { headers }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_V2}/loyalty/config`).then((r) => (r.ok ? r.json() : null)),
        ]);
        setPoints(Number(summary?.data?.points || 0));
        setHistory(Array.isArray(entries?.data) ? entries.data : []);
        setConfig(program?.data || null);
      } catch (error) {
        console.error('Failed to fetch loyalty data:', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const redemptionValue = config?.pointsRedemptionValue || 100;
  const nairaValue = Math.floor(points / redemptionValue);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-black text-[#1C1C1E] mb-8">VibeChops Loyalty</h1>

      {authRequired ? (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-black mb-2 text-[#1C1C1E]">Sign in to see your points</h2>
          <p className="text-sm text-[#636366]">
            Log in to track loyalty points you earn on every completed order.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] rounded-3xl p-8 text-white">
              <p className="text-white/80 text-sm mb-2">Loyalty Balance</p>
              <h2 className="text-4xl font-black mb-4 flex items-center gap-3">
                <Gift size={30} /> {loading ? '…' : points.toLocaleString()} points
              </h2>
              <p className="text-white/60 text-xs">
                {nairaValue > 0
                  ? `Redeemable for up to ₦${nairaValue.toLocaleString()} off your next order`
                  : `Keep ordering — ${redemptionValue} points save you ₦1 at checkout`}
              </p>
            </div>
            <Card className="p-6">
              <h3 className="font-black mb-3 flex items-center gap-2"><Info size={16} /> How it works</h3>
              <ul className="text-sm text-[#636366] space-y-2">
                <li>Earn {config?.pointsEarnRate || 1} point{config?.pointsEarnRate === 1 ? '' : 's'} per ₦1 spent</li>
                {config?.maxRedemptionPercent ? (
                  <li>Redeem up to {config.maxRedemptionPercent}% of an order with points</li>
                ) : null}
                <li>Toggle points at checkout to apply the discount automatically</li>
              </ul>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-black mb-4">Points History</h3>
            <div className="space-y-3">
              {loading && <p className="text-sm text-[#A0A0A0]">Loading…</p>}
              {!loading && history.length === 0 && (
                <p className="text-sm text-[#A0A0A0]">
                  No points yet — complete an order to start earning.
                </p>
              )}
              {!loading && history.map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between py-3 border-b border-[#F0EAE0] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1E]">
                      {entry.description || entry.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-[#A0A0A0]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold ${entry.points >= 0 ? 'text-[#16A34A]' : 'text-[#636366]'}`}
                  >
                    {entry.points >= 0 ? '+' : ''}{entry.points.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <p className="text-xs text-[#A0A0A0] mt-6">
            Have a code from a friend? Apply it during signup at{' '}
            <Link href="/register" className="text-[#E8621A] font-bold">/register</Link>.
          </p>
        </>
      )}
    </div>
  );
}
