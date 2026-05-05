'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Tag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';

export default function CartPage() {
  const { user } = useAuth();
  const { cart, updateQuantity, clearCart, refreshCart } = useCart();
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    setUpdating(itemId);
    try {
      await updateQuantity(itemId, newQty);
    } catch (error) {
      console.error('Failed to update', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = async () => {
    if (confirm('Are you sure you want to clear the cart?')) {
      await clearCart();
      setPromoApplied(false);
      setPromoDiscount(0);
    }
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    setPromoMessage('');
    
    try {
      const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const result = await api.promoCodes.validate(promoCode, cart.restaurantId, subtotal);
      
      if (result.valid) {
        setPromoApplied(true);
        setPromoDiscount(result.discount);
        setPromoMessage(`Code applied! You save ₹${result.discount.toFixed(2)}`);
      } else {
        setPromoMessage(result.message || 'Invalid promo code');
      }
    } catch (error: any) {
      setPromoMessage(error.message || 'Failed to apply promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 40;
  const total = subtotal + deliveryFee - promoDiscount;

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      {cart.items.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
          <Link href="/restaurants" className="btn-primary">
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {cart.restaurantName && (
              <p className="text-gray-600 mb-4">
                Ordering from: <span className="font-semibold">{cart.restaurantName}</span>
              </p>
            )}
            <div className="space-y-4">
              {cart.items.map(item => (
                <div key={item.itemId} className="card p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-gray-500">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleUpdateQuantity(item.itemId, item.quantity - 1)}
                      disabled={updating === item.itemId}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.itemId, item.quantity + 1)}
                      disabled={updating === item.itemId}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleClearCart}
              className="mt-4 text-red-500 hover:text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear Cart
            </button>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20">
              <h3 className="font-bold text-lg mb-4">Order Summary</h3>
              
              {!promoApplied && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="input-field flex-1"
                    />
                    <button
                      onClick={applyPromoCode}
                      disabled={applyingPromo || !promoCode.trim()}
                      className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      {applyingPromo ? '...' : 'Apply'}
                    </button>
                  </div>
                  {promoMessage && (
                    <p className={`text-sm mt-2 ${promoApplied ? 'text-green-600' : 'text-red-500'}`}>
                      {promoMessage}
                    </p>
                  )}
                </div>
              )}

              {promoApplied && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">Promo Applied</span>
                  </div>
                  <button
                    onClick={() => { setPromoApplied(false); setPromoDiscount(0); setPromoCode(''); }}
                    className="text-sm text-green-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span>₹{deliveryFee.toFixed(2)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
              <Link
                href={`/orders/checkout?promo=${promoCode}&discount=${promoDiscount}`}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
