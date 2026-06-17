'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { Star, MapPin, Clock, Plus, Minus, ChevronLeft, Calendar } from 'lucide-react';

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const [vendor, setVendor] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{id: string; name: string; price: number; quantity: number}[]>([]);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await fetch(`https://vibechops.onrender.com/api/v2/vendors/${vendorId}`);
        const data = await res.json();
        const v = data.vendor || data;
        setVendor(v);
        setMenu(v.menuItems || v.items || []);
      } catch (err) {
        console.error('Failed to fetch vendor:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-3xl" />
          <div className="h-8 bg-gray-200 rounded-full w-1/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-black mb-4">Vendor not found</h2>
        <Link href="/vendors">
          <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">Back to Vendors</Button>
        </Link>
      </div>
    );
  }

  const addToCart = (item: any) => {
    const itemId = item._id || item.id;
    const existing = cart.find(ci => ci.id === itemId);
    if (existing) {
      setCart(cart.map(ci => ci.id === itemId ? {...ci, quantity: ci.quantity + 1} : ci));
    } else {
      setCart([...cart, {id: itemId, name: item.name, price: item.price, quantity: 1}]);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link href="/vendors" className="inline-flex items-center gap-2 text-sm text-[#636366] hover:text-[#E8621A] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Vendors
      </Link>

      {/* Vendor Header */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.07)] mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center text-white font-bold text-3xl">
            {vendor.name?.charAt(0) || 'V'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-[#1C1C1E] mb-2">{vendor.name}</h1>
            <p className="text-[#636366] mb-2">{vendor.bio || vendor.cuisine || ''}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[#E8621A] text-[#E8621A]" />
                <span className="font-bold text-[#E8621A]">{vendor.rating}</span>
                {vendor.reviewCount != null && <span className="text-sm text-[#A0A0A0]">({vendor.reviewCount} reviews)</span>}
              </div>
              <span className="flex items-center gap-1 text-sm text-[#636366]">
                <MapPin className="w-3 h-3" /> {vendor.location || vendor.address || ''}
              </span>
            </div>
          </div>
        </div>

        {/* Cooking Schedule */}
        {vendor.cookingDays && vendor.cookingDays.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[#F0EAE0]">
          <h3 className="font-bold mb-3">Cooking Schedule</h3>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div
                key={day}
                className={`text-center py-2 rounded-xl text-xs ${
                  vendor.cookingDays.includes(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i])
                    ? 'bg-[#E8621A] text-white font-medium'
                    : 'bg-[#F5F5F5] text-[#A0A0A0]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="flex items-center gap-4 mt-4">
          {vendor.cookingDays && vendor.cookingDays.length > 0 && (
          <Badge className="bg-[#FFF1E8] text-[#E8621A]">
            <Calendar className="w-3 h-3 mr-1" />
            Next available: {vendor.cookingDays[0]}
          </Badge>
          )}
          <span className="text-sm text-[#636366]">
            {vendor.currentOrders || 0}/{vendor.maxOrdersPerDay || 10} slots filled
          </span>
        </div>
      </div>

      {/* Pre-order Menu */}
      <h2 className="text-xl font-black text-[#1C1C1E] mb-4">Pre-order Menu</h2>
      <div className="space-y-4 mb-8">
        {menu.map((item: any) => {
          const itemId = item._id || item.id;
          return (
          <Card key={itemId} className="p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] transition-all">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-sm text-[#1C1C1E]">{item.name}</h3>
                <p className="text-xs text-[#636366] mt-1">{item.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-black text-[#E8621A]">₦{item.price?.toLocaleString()}</span>
                  <span className="text-xs text-[#A0A0A0]">
                    {item.currentOrders || 0}/{item.maxOrders || item.maxPreOrders || 10} ordered
                  </span>
                </div>
              </div>
              {cart.find(ci => ci.id === itemId) ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const existing = cart.find(ci => ci.id === itemId);
                      if (existing && existing.quantity > 1) {
                        setCart(cart.map(ci => ci.id === itemId ? {...ci, quantity: ci.quantity - 1} : ci));
                      } else {
                        setCart(cart.filter(ci => ci.id !== itemId));
                      }
                    }}
                    className="w-8 h-8 rounded-xl border border-[#E8621A] text-[#E8621A] flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold w-4 text-center">{cart.find(ci => ci.id === itemId)?.quantity}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white flex items-center justify-center hover:scale-105"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(item)}
                  className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white text-xs font-black px-3 py-1.5 rounded-xl hover:scale-105"
                >
                  Pre-order
                </button>
              )}
            </div>
          </Card>
          );
        })}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-40 lg:hidden">
          <div className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white rounded-2xl py-4 px-6 flex items-center justify-between shadow-[0_8px_32px_rgba(232,98,26,0.4)]">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white">{cartCount}</Badge>
              <span className="font-bold">View Cart</span>
            </div>
            <span className="font-black">₦{cartTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <h2 className="text-xl font-black text-[#1C1C1E] mb-4">Reviews</h2>
      <div className="space-y-4">
        {[
          {user: 'Chioma A.', comment: 'Best home-cooked Igbo food! Tastes like home.', date: 'May 2, 2026'},
          {user: 'Tola B.', comment: 'Always fresh and delicious. Highly recommend!', date: 'Apr 28, 2026'},
        ].map((review, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center text-white font-bold">
                {review.user.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm">{review.user}</p>
                <p className="text-xs text-[#A0A0A0]">{review.date}</p>
              </div>
              <div className="ml-auto flex">
                {[1,2,3,4,5].map(star => (
                  <Star key={star} className="w-3 h-3 fill-[#E8621A] text-[#E8621A]" />
                ))}
              </div>
            </div>
            <p className="text-sm text-[#636366]">{review.comment}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
