'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Plan {
  planType: string;
  name: string;
  description: string;
  monthlyPrice: number;
  freeDeliveryLimit: number;
  priorityProcessing: boolean;
  exclusivePromos: boolean;
  discountPercent: number;
  features: string[];
}

interface Subscription {
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  freeDeliveryLimit: number;
  freeDeliveryUsed: number;
  monthlyPrice: number;
  planDetails?: Plan;
}

export default function VibePassPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [plansData, subData] = await Promise.all([
        api.subscription.getPlans(),
        api.subscription.getMySubscription(),
      ]);
      setPlans(plansData.data);
      setSubscription(subData.data);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const data = await api.subscription.subscribe(planType, user?.email);
      if (data.data.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to initiate subscription' });
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const data = await api.subscription.cancel();
      setMessage({ type: 'success', text: data.message });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to cancel subscription' });
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">VibePass</h1>
        <p className="text-gray-600 mb-8">Unlock exclusive benefits with our subscription plans</p>

        {subscription && subscription.status === 'active' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-orange-500">
                  {subscription.planDetails?.name || 'VibePass'}
                </h2>
                <p className="text-gray-600">Active Subscription</p>
              </div>
              <span className="bg-green-100 text-green-800 px-4 py-1 rounded-full text-sm">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold">{subscription.freeDeliveryLimit - subscription.freeDeliveryUsed}</p>
                <p className="text-gray-600 text-sm">Free Deliveries Left</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold">{subscription.freeDeliveryUsed}</p>
                <p className="text-gray-600 text-sm">Used This Month</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold">₦{subscription.monthlyPrice}</p>
                <p className="text-gray-600 text-sm">Monthly Price</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold">{new Date(subscription.endDate).toLocaleDateString()}</p>
                <p className="text-gray-600 text-sm">Expires</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={processing}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Cancel Subscription
            </button>
          </div>
        )}

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.planType}
              className={`bg-white rounded-lg shadow-md p-6 ${
                plan.planType === 'vibepass-premium' ? 'border-2 border-orange-500' : ''
              }`}
            >
              {plan.planType === 'vibepass-premium' && (
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium mb-4 inline-block">
                  POPULAR
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-4">{plan.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold">₦{plan.monthlyPrice}</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  {plan.freeDeliveryLimit} free deliveries per month
                </li>
                {plan.priorityProcessing && (
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Priority order processing
                  </li>
                )}
                {plan.exclusivePromos && (
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Access to exclusive promos
                  </li>
                )}
                {plan.discountPercent > 0 && (
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    {plan.discountPercent}% extra discount on orders
                  </li>
                )}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.planType)}
                disabled={processing || (subscription?.status === 'active')}
                className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
              >
                {subscription?.status === 'active' ? 'Current Plan' : processing ? 'Processing...' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-gray-100 rounded-lg p-6 mt-8">
          <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">Yes, you can cancel your subscription anytime. You'll retain benefits until your current billing period ends.</p>
            </div>
            <div>
              <h4 className="font-medium">What happens to unused free deliveries?</h4>
              <p className="text-gray-600 text-sm">Free deliveries reset at the beginning of each billing month. They don't roll over.</p>
            </div>
            <div>
              <h4 className="font-medium">How do I use my free deliveries?</h4>
              <p className="text-gray-600 text-sm">Free deliveries are automatically applied to your orders when you have available credits.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}