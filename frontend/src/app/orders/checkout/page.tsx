'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';

export default function CheckoutPage() {
  const { user, token } = useAuth();
  const { cart, clearCart } = useCart();
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (cart.items.length === 0) {
      router.push('/cart');
    }
  }, [user, cart, router]);

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 40;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Please enter delivery address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.orders.create({
        restaurant: cart.restaurantId,
        restaurantName: cart.restaurantName,
        items: cart.items.map(item => ({
          menuItem: item.itemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalAmount: total,
        deliveryAddress: address,
        paymentMethod,
        deliveryFee,
      }, token!);

      await clearCart(token);
      router.push('/orders');
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!user || cart.items.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handlePlaceOrder} className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">Delivery Address</h2>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full delivery address"
                className="input-field min-h-[100px]"
                required
              />
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <div className="space-y-3">
                {['cash', 'card', 'upi'].map(method => (
                  <label key={method} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-primary-500"
                    />
                    <span className="font-medium capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : `Place Order - $${total.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-20">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            <p className="text-gray-600 mb-2">{cart.restaurantName}</p>
            <div className="space-y-2 mb-4">
              {cart.items.map(item => (
                <div key={item.itemId} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
