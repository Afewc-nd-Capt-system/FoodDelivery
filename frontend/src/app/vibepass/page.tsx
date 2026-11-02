'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2 } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

interface Plan {
  _id: string;
  planType: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  freeDeliveryLimit?: number;
  discountPercent?: number;
  priorityProcessing?: boolean;
  exclusivePromos?: boolean;
  features?: { text?: string }[] | string[];
}

interface Subscription {
  plan?: string;
  planDetails?: Plan | null;
}

export default function VibePassPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Real plans and the signed-in user's active subscription.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch(`${API_V2}/subscriptions/plans`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setPlans(Array.isArray(body?.data) ? body.data : []))
      .catch(() => setPlans([]))
      .finally(() => {
        if (!token) setLoading(false);
      });

    if (token) {
      fetch(`${API_V2}/subscriptions/my-subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          const sub: Subscription | null = body?.data || null;
          if (sub?.plan) setCurrentPlan(sub.plan);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const planFeatures = (plan: Plan): string[] => {
    const list = Array.isArray(plan.features) ? plan.features : [];
    const strings = list
      .map((f) => (typeof f === 'string' ? f : f?.text || ''))
      .filter(Boolean);
    if (plan.freeDeliveryLimit) strings.unshift(`${plan.freeDeliveryLimit} free deliveries per month`);
    if (plan.discountPercent) strings.push(`${plan.discountPercent}% off every order`);
    if (plan.priorityProcessing) strings.push('Priority preparation & delivery');
    return strings;
  };

  const subscribe = async (plan: Plan) => {
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setSubscribing(plan.planType);
    try {
      const res = await fetch(`${API_V2}/subscriptions/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planType: plan.planType }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `status ${res.status}`);
      const payUrl = body?.data?.authorizationUrl || body?.data?.authorization_url || null;
      if (payUrl) {
        window.location.href = payUrl;
      } else {
        setCurrentPlan(plan.planType);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start subscription');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-black text-[#1C1C1E] mb-2">VibePass 🔥</h1>
      <p className="text-[#636366] mb-8">Unlock exclusive perks and savings</p>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#E8621A]" /></div>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="p-6 relative border border-[#E8E8E8]">
            <h3 className="text-xl font-black text-[#1C1C1E] mb-2">No plan</h3>
            <p className="text-3xl font-black text-[#1C1C1E] mb-4">Free</p>
            <ul className="space-y-2 mb-6">
              {['Standard delivery', 'Basic support', 'Earn loyalty points'].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-[#636366]">
                  <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                  {feature}
                </li>
              ))}
            </ul>
            {!currentPlan && (
              <Badge className="absolute top-4 right-4 bg-[#FFF1E8] text-[#E8621A]">Current Plan</Badge>
            )}
            <Button className="w-full bg-[#F5F5F5] text-[#636366] cursor-default">
              {currentPlan ? 'Pay-as-you-go' : 'Current Plan'}
            </Button>
          </Card>

          {plans.map((plan, i) => {
            const isCurrent = currentPlan === plan.planType;
            const dark = i === plans.length - 1 && plans.length > 1;
            return (
              <Card key={plan._id} className={`p-6 relative ${dark ? 'bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white' : 'border border-[#E8E8E8]'}`}>
                {dark && <Badge className="absolute top-4 right-4 bg-white/20 text-white">VibePass</Badge>}
                {isCurrent && (
                  <Badge className={`absolute top-4 right-4 ${dark ? 'bg-white/20 text-white' : 'bg-[#FFF1E8] text-[#E8621A]'}`}>Current Plan</Badge>
                )}
                <h3 className={`text-xl font-black mb-2 ${dark ? '' : 'text-[#1C1C1E]'}`}>{plan.name}</h3>
                <p className={`text-3xl font-black mb-1 ${dark ? '' : 'text-[#1C1C1E]'}`}>
                  ₦{Number(plan.monthlyPrice || 0).toLocaleString()}
                  <span className={`text-lg font-normal ${dark ? '' : 'text-[#636366]'}`}>/month</span>
                </p>
                {plan.description && (
                  <p className={`text-sm mb-4 ${dark ? 'text-white/80' : 'text-[#636366]'}`}>{plan.description}</p>
                )}
                <ul className="space-y-2 mb-6">
                  {planFeatures(plan).map((feature) => (
                    <li key={feature} className={`flex items-center gap-2 text-sm ${dark ? '' : 'text-[#636366]'}`}>
                      <CheckCircle className={`w-4 h-4 ${dark ? 'text-white' : 'text-[#16A34A]'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button className={`w-full ${dark ? 'bg-white/20 text-white' : 'bg-[#F5F5F5] text-[#636366]'} cursor-default`}>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => subscribe(plan)}
                    disabled={subscribing !== null}
                    className={`w-full font-black ${dark ? 'bg-white text-[#E8621A] hover:bg-white/90' : 'bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white'}`}
                  >
                    {subscribing === plan.planType ? 'Redirecting…' : 'Subscribe Now'}
                  </Button>
                )}
              </Card>
            );
          })}

          {plans.length === 0 && (
            <Card className="p-6 text-center md:col-span-2">
              <p className="text-sm text-[#636366]">No active VibePass plans are available right now.</p>
            </Card>
          )}
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto mt-6 text-center">
          <p className="text-sm text-[#D32F2F]">{error}</p>
        </div>
      )}
    </div>
  );
}
