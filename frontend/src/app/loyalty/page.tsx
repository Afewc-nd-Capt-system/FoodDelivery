'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface PointsHistory {
  _id: string;
  points: number;
  type: string;
  description: string;
  createdAt: string;
  order?: string;
}

export default function LoyaltyPage() {
  const { user, loading: authLoading } = useAuth();
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [balanceData, configData, historyData] = await Promise.all([
        api.loyalty.getBalance(),
        api.loyalty.getConfig(),
        api.loyalty.getHistory(1, 20),
      ]);
      setPoints(balanceData.data.points);
      setConfig(configData.data);
      setHistory(historyData.data);
    } catch (err) {
      console.error('Failed to load loyalty data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setProcessing(true);

    try {
      const pointsToRedeem = parseInt(redeemAmount);
      if (isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
        setMessage({ type: 'error', text: 'Please enter a valid number of points' });
        return;
      }

      const data = await api.loyalty.redeem(pointsToRedeem);
      setMessage({ type: 'success', text: data.message });
      setPoints(data.data.remainingPoints);
      setRedeemAmount('');
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to redeem points' });
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Please login</h2>
          <p className="text-gray-600">You need to be logged in to view your points</p>
        </div>
      </div>
    );
  }

  const pointsValue = config ? (points / config.pointsRedemptionValue).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Loyalty Points</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Your Points</p>
              <p className="text-5xl font-bold text-orange-500">{points}</p>
              <p className="text-gray-500 text-sm mt-1">
                Worth up to ₦{pointsValue} in discounts
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-sm font-medium">
                Member
              </span>
            </div>
          </div>
        </div>

        {config && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">How it works</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4">
                <p className="text-2xl font-bold text-orange-500">{config.pointsEarnRate}</p>
                <p className="text-gray-600 text-sm">Point per ₦1 spent</p>
              </div>
              <div className="p-4">
                <p className="text-2xl font-bold text-orange-500">{config.pointsRedemptionValue}</p>
                <p className="text-gray-600 text-sm">Points = ₦1 discount</p>
              </div>
              <div className="p-4">
                <p className="text-2xl font-bold text-orange-500">{config.minPointsRedemption}</p>
                <p className="text-gray-600 text-sm">Min points to redeem</p>
              </div>
              <div className="p-4">
                <p className="text-2xl font-bold text-orange-500">{config.maxRedemptionPercent}%</p>
                <p className="text-gray-600 text-sm">Max discount on order</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Redeem Points</h2>
          <form onSubmit={handleRedeem}>
            <div className="flex gap-4 items-center">
              <input
                type="number"
                placeholder={`Enter points (min ${config?.minPointsRedemption || 100})`}
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                min={config?.minPointsRedemption || 100}
                max={points}
              />
              <button
                type="submit"
                disabled={processing || points < (config?.minPointsRedemption || 100)}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Redeem'}
              </button>
            </div>
            {message.text && (
              <p className={`mt-2 ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                {message.text}
              </p>
            )}
          </form>
          <p className="text-gray-500 text-sm mt-2">
            You can redeem up to {(points / (config?.pointsRedemptionValue || 100)).toFixed(2)} in discounts
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Points History</h2>
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No points history yet</p>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-gray-500 text-sm">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-lg font-semibold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.points > 0 ? '+' : ''}{item.points} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}