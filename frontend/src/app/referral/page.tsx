'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CheckCircle, Copy, MessageCircle, Twitter, Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const referralCode = 'VIBE-ABC123';
  const [friendsReferred] = useState(3);
  const [totalEarned] = useState(1500);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-black text-[#1C1C1E] mb-8">Invite & Earn 🎉</h1>

      {/* Hero Card */}
      <div className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] rounded-3xl p-8 text-white mb-8">
        <h2 className="text-3xl font-black mb-2">Invite Friends, Earn Rewards</h2>
        <p className="text-white/80 mb-4">Share your referral code and earn ₦500 for each friend who joins!</p>
        <div className="bg-white/20 rounded-xl p-4 inline-block">
          <p className="text-sm font-mono text-lg font-bold tracking-wider">{referralCode}</p>
        </div>
        <button
          onClick={copyCode}
          className="ml-4 bg-white text-[#E8621A] px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90"
        >
          {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Share Buttons */}
      <Card className="p-6 mb-8">
        <h3 className="font-bold mb-4">Share Your Code</h3>
        <div className="flex gap-3">
          <Button className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
          <Button className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white">
            <Twitter className="w-4 h-4 mr-2" /> Twitter
          </Button>
          <Button onClick={copyCode} className="bg-[#F5F5F5] text-[#636366] hover:bg-[#F5F5F5]/80">
            <Copy className="w-4 h-4 mr-2" /> Copy Link
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-[#E8621A]" />
            <div>
              <p className="text-2xl font-black text-[#1C1C1E]">{friendsReferred}</p>
              <p className="text-xs text-[#A0A0A0]">Friends Referred</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-[#16A34A]" />
            <div>
              <p className="text-2xl font-black text-[#E8621A]">₦{totalEarned.toLocaleString()}</p>
              <p className="text-xs text-[#A0A0A0]">Total Earned</p>
            </div>
          </div>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="p-6 mb-8">
        <h3 className="font-bold mb-4">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Share', desc: 'Send your code to friends' },
            { step: '02', title: 'They Join', desc: 'Friends sign up using your code' },
            { step: '03', title: 'You Earn', desc: 'Get ₦500 for each referral' },
          ].map((item) => (
            <div key={item.step} className="relative">
              <div className="absolute top-0 right-0 text-6xl font-black text-[#F0EAE0]">{item.step}</div>
              <div className="relative z-10">
                <h4 className="font-bold text-[#1C1C1E] mb-1">{item.title}</h4>
                <p className="text-sm text-[#636366]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Referral History */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">Referral History</h3>
        <div className="space-y-4">
          {[
            { name: 'Chinua A.', date: 'May 2, 2026', status: 'completed', reward: 500 },
            { name: 'Bola T.', date: 'Apr 28, 2026', status: 'completed', reward: 500 },
            { name: 'Funke M.', date: 'Apr 15, 2026', status: 'completed', reward: 500 },
          ].map((ref, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[#F0EAE0] last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center text-white font-bold">
                  {ref.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{ref.name}</p>
                  <p className="text-xs text-[#A0A0A0]">{ref.date}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-[#F0FDF4] text-[#16A34A]">Completed</Badge>
                <p className="text-sm font-bold text-[#E8621A] mt-1">+₦{ref.reward}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
