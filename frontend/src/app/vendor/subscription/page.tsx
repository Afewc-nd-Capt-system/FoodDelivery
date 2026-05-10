'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Star, Crown } from 'lucide-react';

interface Plan {
  _id: string;
  name: string;
  price: number;
  commissionRate: number;
  maxMenuItems: number;
  analyticsAccess: boolean;
  priorityListing: boolean;
  promotionsAllowed: number;
  badgeLabel: string;
  features: string[];
}

export default function VendorSubscriptionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/v2/subscriptions/plans?type=vendor');
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch('/api/v2/subscriptions/current', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.subscription && data.subscription.plan) {
        setCurrentPlan(data.subscription.plan);
      }
    } catch (error) {
      console.error('Error fetching current subscription:', error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(true);
    try {
      const response = await fetch('/api/v2/subscriptions/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          planId,
          paystackRef: 'test_ref',
        }),
      });

      if (response.ok) {
        alert('Plan activated successfully!');
        fetchCurrentSubscription();
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const getPlanStyle = (index: number) => {
    if (index === 1) {
      return {
        borderColor: '#E8621A',
        badge: 'POPULAR',
        badgeBg: '#E8621A',
      };
    }
    if (index === 2) {
      return {
        background: 'linear-gradient(135deg, #E8621A, #C4501A)',
        color: 'white',
        badge: 'BEST VALUE',
        badgeBg: '#16A34A',
      };
    }
    return {
      borderColor: '#E8E8E8',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#FFF8F0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1C1C1E' }}>
            Choose Your Plan
          </h1>
          {currentPlan && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mt-4" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
              <Star className="w-4 h-4" />
              <span className="font-semibold text-sm">Current Plan: {currentPlan.name}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const style = getPlanStyle(index);
            const isCurrent = currentPlan?._id === plan._id;
            
            return (
              <div
                key={plan._id}
                className="rounded-3xl p-6 relative"
                style={{
                  backgroundColor: style.color ? 'transparent' : 'white',
                  border: style.borderColor ? `2px solid ${style.borderColor}` : '2px solid #E8E8E8',
                  ...(style.background && { background: style.background }),
                }}
              >
                {style.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: style.badgeBg }}
                    >
                      {style.badge}
                    </span>
                  </div>
                )}

                {plan.badgeLabel && (
                  <div className="text-center mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: style.color ? 'rgba(255,255,255,0.2)' : '#F0FDF4',
                        color: style.color ? 'white' : '#16A34A',
                      }}
                    >
                      <Crown className="w-3 h-3" />
                      {plan.badgeLabel}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2" style={{ color: style.color || '#1C1C1E' }}>
                    {plan.name}
                  </h3>
                  <p className="text-4xl font-black mb-1" style={{ color: style.color || '#1C1C1E' }}>
                    ₦{plan.price.toLocaleString()}
                    <span className="text-lg font-normal" style={{ color: style.color ? 'rgba(255,255,255,0.8)' : '#636366' }}>
                      /month
                    </span>
                  </p>
                  <p className="text-sm" style={{ color: style.color ? 'rgba(255,255,255,0.8)' : '#636366' }}>
                    {plan.commissionRate * 100}% commission rate
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: style.color ? '#16A34A' : '#16A34A' }} />
                      <span className="text-sm" style={{ color: style.color || '#636366' }}>{feature}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-3">
                    <X className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: style.color ? '#EF4444' : '#EF4444' }} />
                    <span className="text-sm" style={{ color: style.color || '#636366' }}>
                      {plan.maxMenuItems === Infinity ? 'Unlimited menu items' : `${plan.maxMenuItems} menu items max`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleUpgrade(plan._id)}
                  disabled={isCurrent || upgrading}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: style.color || 'linear-gradient(135deg, #E8621A, #C4501A)',
                    color: style.color || 'white',
                  }}
                >
                  {isCurrent ? 'Current Plan' : upgrading ? 'Processing...' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm" style={{ color: '#636366' }}>
            Plans can be upgraded or downgraded at any time. Changes take effect immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
