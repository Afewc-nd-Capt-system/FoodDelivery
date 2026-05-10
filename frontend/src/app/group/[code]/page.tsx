'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, MessageCircle, CheckCircle, ShoppingCart } from 'lucide-react';

export default function GroupOrderPage() {
  const params = useParams();
  const code = params.code as string;
  const [isHost] = useState(true);
  const [joined] = useState(false);

  const contributors = [
    { name: 'Adebayo O.', items: 3, amount: 10500, initials: 'AO' },
    { name: 'Chinua A.', items: 2, amount: 7800, initials: 'CA' },
    { name: 'Bola T.', items: 4, amount: 13200, initials: 'BT' },
  ];

  const sharedCart = [
    { id: '1', name: 'Butter Chicken', contributor: 'Adebayo O.', price: 3500, quantity: 2 },
    { id: '2', name: 'Garlic Naan', contributor: 'Adebayo O.', price: 800, quantity: 3 },
    { id: '3', name: 'Tandoori Chicken', contributor: 'Chinua A.', price: 4500, quantity: 1 },
    { id: '4', name: 'Paneer Tikka', contributor: 'Bola T.', price: 3000, quantity: 2 },
  ];

  const total = sharedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-[#636366] hover:text-[#E8621A]">
          <span className="text-2xl">←</span>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1C1C1E]">Group Order 👥</h1>
          <p className="text-sm text-[#636366]">Share this code with friends</p>
        </div>
        {isHost && (
          <Badge className="bg-[#FFF1E8] text-[#E8621A] ml-auto">You are the host</Badge>
        )}
      </div>

      {/* Code Display */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#A0A0A0] mb-1">Group Code</p>
            <p className="text-2xl font-mono font-bold text-[#E8621A]">{code}</p>
          </div>
          <button onClick={copyCode} className="flex items-center gap-2 bg-[#FFF1E8] text-[#E8621A] px-4 py-2 rounded-xl text-sm">
            <Copy className="w-4 h-4" /> Copy Code
          </button>
        </div>
      </Card>

      {/* Share Buttons */}
      <div className="flex gap-3 mb-8">
        <Button className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
          <MessageCircle className="w-4 h-4 mr-2" /> Share on WhatsApp
        </Button>
        <Button className="bg-[#FFF1E8] text-[#E8621A] hover:bg-[#FFF1E8]/80">
          <Copy className="w-4 h-4 mr-2" /> Copy Link
        </Button>
        {!joined && (
          <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
            Join this order
          </Button>
        )}
      </div>

      {/* Contributor List */}
      <h2 className="text-xl font-black text-[#1C1C1E] mb-4">Contributors</h2>
      <div className="space-y-3 mb-8">
        {contributors.map((person) => (
          <Card key={person.name} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center text-white font-bold">
                {person.initials}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{person.name}</p>
                <p className="text-xs text-[#A0A0A0]">{person.items} items</p>
              </div>
              <p className="font-bold text-[#E8621A]">₦{person.amount.toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Shared Cart */}
      <h2 className="text-xl font-black text-[#1C1C1E] mb-4">Shared Cart</h2>
      <div className="space-y-3 mb-8">
        {sharedCart.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-[#A0A0A0]">Added by {item.contributor}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#E8621A]">₦{(item.price * item.quantity).toLocaleString()}</p>
                <p className="text-xs text-[#A0A0A0]">Qty: {item.quantity}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Checkout */}
      <div className="sticky bottom-6 bg-white rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#636366]">Total</p>
            <p className="text-2xl font-black text-[#E8621A]">₦{total.toLocaleString()}</p>
          </div>
          {isHost ? (
            <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white px-8 py-3 rounded-2xl font-black">
              <ShoppingCart className="w-4 h-4 mr-2" /> Checkout • ₦{total.toLocaleString()}
            </Button>
          ) : (
            <p className="text-sm text-[#636366]">Only the host can checkout</p>
          )}
        </div>
      </div>
    </div>
  );
}
