'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Crown, Pause, X, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetchSubscription();
    fetchPlans();
  }, []);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/v2/subscription/my-subscription`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/v2/subscription/plans`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      await fetch(`${API_URL}/v2/subscription/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchSubscription();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };

  const handlePause = async () => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      await fetch(`${API_URL}/v2/subscription/pause`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchSubscription();
    } catch (error) {
      console.error('Failed to pause subscription:', error);
    }
  };

  const handleSubscribe = async (planType: string) => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/v2/subscription/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType }),
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof window !== 'undefined') window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8621A]"></div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-black text-white">Subscription</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {subscription && subscription.active ? (
          <Card className="p-6 mb-8 bg-gradient-to-br from-[#E8621A] to-[#C4501A] text-white">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">VibePass {subscription.planType}</h2>
                  <p className="text-sm opacity-80">Active Subscription</p>
                </div>
              </div>
              <Badge className="bg-[#F0FDF4] text-[#16A34A]">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-sm opacity-80">Monthly Cost</p>
                <p className="text-2xl font-black">₦{subscription.price?.toLocaleString()}</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-sm opacity-80">Free Deliveries</p>
                <p className="text-2xl font-black">{subscription.freeDeliveries}</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-sm opacity-80">Discount</p>
                <p className="text-2xl font-black">{subscription.discount}%</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-sm opacity-80">Renewal Date</p>
                <p className="text-sm font-bold">{new Date(subscription.renewalDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handlePause}
                variant="outline"
                className="flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Subscription
              </Button>
              <Button
                onClick={handleCancel}
                className="flex-1 bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Subscription
              </Button>
            </div>
          </Card>
        ) : (
          <Alert className="mb-8 bg-[#FFF1E8] border-[#E8621A]">
            <AlertTriangle className="h-4 w-4 text-[#E8621A]" />
            <AlertDescription className="text-[#1C1C1E]">
              You don't have an active subscription. Subscribe to VibePass to unlock exclusive benefits.
            </AlertDescription>
          </Alert>
        )}

        <h2 className="text-xl font-black text-[#1C1C1E] mb-6">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`p-6 ${plan.popular ? 'border-2 border-[#E8621A] relative' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8621A] text-white">
                  Most Popular
                </Badge>
              )}
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-[#1C1C1E] mb-2">{plan.name}</h3>
                <p className="text-3xl font-black text-[#E8621A] mb-2">
                  ₦{plan.price.toLocaleString()}
                  <span className="text-sm text-[#636366] font-normal">/month</span>
                </p>
                <p className="text-sm text-[#636366]">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#1C1C1E]">
                    <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.type)}
                disabled={subscription?.planType === plan.type}
                className={`w-full font-semibold py-3 rounded-xl ${
                  subscription?.planType === plan.type
                    ? 'bg-[#F5F5F5] text-[#636366]'
                    : 'bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white'
                }`}
              >
                {subscription?.planType === plan.type ? 'Current Plan' : 'Subscribe Now'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
