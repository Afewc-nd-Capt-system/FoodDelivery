'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Referral {
  _id: string;
  referralCode: string;
  referee?: { name: string; email: string; createdAt: string };
  status: string;
  refereeFirstOrderCompleted: boolean;
  createdAt: string;
}

export default function ReferralPage() {
  const { user, loading: authLoading } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [stats, setStats] = useState({ pendingReferrals: 0, completedReferrals: 0 });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rewards, setRewards] = useState({ totalReferrals: 0, totalPointsFromReferral: 0 });
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [codeData, referralsData, rewardsData] = await Promise.all([
        api.referral.getMyCode(),
        api.referral.getMyReferrals(1, 20),
        api.referral.getMyRewards(),
      ]);
      setReferralCode(codeData.data.referralCode);
      setShareUrl(codeData.data.shareUrl);
      setStats({
        pendingReferrals: codeData.data.pendingReferrals,
        completedReferrals: codeData.data.completedReferrals,
      });
      setReferrals(referralsData.data);
      setRewards(rewardsData.data);
    } catch (err) {
      console.error('Failed to load referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join VibeChops!',
        text: `Use my referral code ${referralCode} to get a discount on your first order!`,
        url: shareUrl,
      });
    } else {
      copyToClipboard();
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
          <p className="text-gray-600">You need to be logged in to view referrals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Refer & Earn</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Referral Code</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-gray-100 px-4 py-3 rounded-lg">
              <p className="text-2xl font-bold text-center tracking-wider">{referralCode}</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={shareReferral}
            className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
          >
            Share with Friends
          </button>
          <p className="text-gray-500 text-sm mt-4 text-center">
            Share your code and earn points when your friends complete their first order!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-3xl font-bold text-orange-500">{stats.pendingReferrals}</p>
            <p className="text-gray-600">Pending</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.completedReferrals}</p>
            <p className="text-gray-600">Completed</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Rewards</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-500">{rewards.totalReferrals}</p>
              <p className="text-gray-600">Total Referrals</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-500">{rewards.totalPointsFromReferral}</p>
              <p className="text-gray-600">Points Earned</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Your Referrals</h2>
          {referrals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No referrals yet. Share your code to get started!</p>
          ) : (
            <div className="space-y-4">
              {referrals.map((ref) => (
                <div
                  key={ref._id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                >
                  <div>
                    <p className="font-medium">
                      {ref.referee?.name || 'Pending signup'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {ref.referee?.email || 'Referral code: ' + ref.referralCode}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        ref.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : ref.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ref.status}
                    </span>
                    {ref.refereeFirstOrderCompleted && (
                      <p className="text-green-500 text-xs mt-1">✓ First order completed</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-orange-800 mb-2">How it works</h3>
          <ol className="list-decimal list-inside text-gray-700 space-y-2">
            <li>Share your unique referral code with friends</li>
            <li>Your friend signs up using your code and gets a discount on their first order</li>
            <li>When they complete their first order, you earn {rewards.totalPointsFromReferral > 0 ? 'points' : '100 points'}!</li>
            <li>Use your earned points for discounts on your future orders</li>
          </ol>
        </div>
      </div>
    </div>
  );
}