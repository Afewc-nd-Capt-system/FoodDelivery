'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export default function VibePassPage() {
  const [currentPlan] = useState('basic');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-black text-[#1C1C1E] mb-2">VibePass 🔥</h1>
      <p className="text-[#636366] mb-8">Unlock exclusive perks and savings</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Basic Plan */}
        <Card className={`p-6 relative ${currentPlan === 'basic' ? 'border-2 border-[#E8621A]' : 'border border-[#E8E8E8]'}`}>
          {currentPlan === 'basic' && (
            <Badge className="absolute top-4 right-4 bg-[#FFF1E8] text-[#E8621A]">Current Plan</Badge>
          )}
          <h3 className="text-xl font-black text-[#1C1C1E] mb-2">Basic</h3>
          <p className="text-3xl font-black text-[#1C1C1E] mb-4">Free</p>
          <ul className="space-y-2 mb-6">
            {['Standard delivery', 'Basic support', 'Earn loyalty points'].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-[#636366]">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                {feature}
              </li>
            ))}
          </ul>
          <Button className="w-full bg-[#F5F5F5] text-[#636366] cursor-default">
            Current Plan
          </Button>
        </Card>

        {/* Premium Plan */}
        <Card className="p-6 relative bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
          <Badge className="absolute top-4 right-4 bg-white/20 text-white">POPULAR</Badge>
          <h3 className="text-xl font-black mb-2">Premium</h3>
          <p className="text-3xl font-black mb-1">₦2,500<span className="text-lg font-normal">/month</span></p>
          <p className="text-white/80 text-sm mb-4">Billed monthly</p>
          <ul className="space-y-2 mb-6">
            {[
              'Free delivery on all orders',
              'Priority customer support',
              '2x loyalty points',
              'Exclusive restaurant deals',
              'Early access to new features',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white" />
                {feature}
              </li>
            ))}
          </ul>
          {currentPlan === 'premium' ? (
            <Button className="w-full bg-white/20 text-white cursor-default">Current Plan</Button>
          ) : (
            <Button className="w-full bg-white text-[#E8621A] hover:bg-white/90 font-black">
              Subscribe Now
            </Button>
          )}
        </Card>
      </div>

      {/* Cancel Section */}
      {currentPlan === 'premium' && (
        <div className="max-w-3xl mx-auto mt-8 text-center">
          <button className="text-sm text-[#D32F2F] hover:underline">
            Cancel Subscription
          </button>
        </div>
      )}
    </div>
  );
}
