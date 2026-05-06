'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface LoyaltyConfig {
  pointsEarnRate: number;
  pointsRedemptionValue: number;
  minPointsRedemption: number;
  maxRedemptionPercent: number;
  newUserBonus: number;
  referralPointsReward: number;
  referralDiscountValue: number;
  isActive: boolean;
}

interface SubscriptionPlan {
  planType: string;
  name: string;
  description: string;
  monthlyPrice: number;
  freeDeliveryLimit: number;
  priorityProcessing: boolean;
  exclusivePromos: boolean;
  discountPercent: number;
  isActive: boolean;
}

export default function AdminLoyaltyPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    pointsEarnRate: 1,
    pointsRedemptionValue: 100,
    minPointsRedemption: 100,
    maxRedemptionPercent: 20,
    newUserBonus: 50,
    referralPointsReward: 100,
    referralDiscountValue: 100,
    isActive: true,
  });

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({});

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [configData, plansData] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/v2/admin/loyalty/loyalty-config`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/v2/admin/loyalty/subscription-plans`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ]);

      if (configData.success) {
        setLoyaltyConfig(configData.data);
      }
      if (plansData.success) {
        setPlans(plansData.data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/v2/admin/loyalty/loyalty-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(loyaltyConfig),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Loyalty configuration saved!' });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.planType || !newPlan.name || !newPlan.monthlyPrice) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/v2/admin/loyalty/subscription-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPlan),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Plan created successfully!' });
        setNewPlan({});
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create plan' });
    } finally {
      setSaving(false);
    }
  };

  const togglePlanActive = async (planType: string, currentStatus: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/v2/admin/loyalty/subscription-plans/${planType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to toggle plan:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Loyalty & Subscription Management</h1>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Loyalty Configuration</h2>
            <form onSubmit={handleConfigSave} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Points Earn Rate</label>
                <input
                  type="number"
                  step="0.1"
                  value={loyaltyConfig.pointsEarnRate}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, pointsEarnRate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Points = ₦1 (Value)</label>
                <input
                  type="number"
                  value={loyaltyConfig.pointsRedemptionValue}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, pointsRedemptionValue: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Points to Redeem</label>
                <input
                  type="number"
                  value={loyaltyConfig.minPointsRedemption}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, minPointsRedemption: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Discount %</label>
                <input
                  type="number"
                  value={loyaltyConfig.maxRedemptionPercent}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, maxRedemptionPercent: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New User Bonus</label>
                <input
                  type="number"
                  value={loyaltyConfig.newUserBonus}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, newUserBonus: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referral Reward (Points)</label>
                <input
                  type="number"
                  value={loyaltyConfig.referralPointsReward}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, referralPointsReward: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referral Discount (₦)</label>
                <input
                  type="number"
                  value={loyaltyConfig.referralDiscountValue}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, referralDiscountValue: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={loyaltyConfig.isActive}
                    onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">Active</span>
                </label>
              </div>
              <div className="col-span-full">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Subscription Plans</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {plans.map((plan) => (
                <div key={plan.planType} className={`p-4 border rounded-lg ${plan.isActive ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold">{plan.name}</h3>
                    <button
                      onClick={() => togglePlanActive(plan.planType, plan.isActive)}
                      className={`px-2 py-1 text-xs rounded ${plan.isActive ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{plan.description}</p>
                  <div className="flex justify-between text-sm">
                    <span>₦{plan.monthlyPrice}/month</span>
                    <span>{plan.freeDeliveryLimit} deliveries</span>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-semibold mb-3">Create New Plan</h3>
            <form onSubmit={handleCreatePlan} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan Type</label>
                <input
                  type="text"
                  placeholder="e.g., vibepass-basic"
                  value={newPlan.planType || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, planType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newPlan.name || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price (₦)</label>
                <input
                  type="number"
                  value={newPlan.monthlyPrice || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, monthlyPrice: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Free Deliveries</label>
                <input
                  type="number"
                  value={newPlan.freeDeliveryLimit || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, freeDeliveryLimit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="col-span-full">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}