'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';

interface PaystackWindow extends Window {
  PaystackPop: any;
}

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payOnDeliveryEligible, setPayOnDeliveryEligible] = useState(true);
  const [eligibilityReason, setEligibilityReason] = useState('');
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (cart.items.length === 0) {
      router.push('/cart');
    }
  }, [user, cart, router]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!cart.restaurantId) return;

      try {
        const data = await api.payments.checkEligibility(
          cart.restaurantId,
          cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) + 40
        );
        setPayOnDeliveryEligible(data.eligible);
        setEligibilityReason(data.reason || '');
      } catch (err) {
        console.error('Failed to check eligibility', err);
      } finally {
        setCheckingEligibility(false);
      }
    };

    checkEligibility();
  }, [cart.restaurantId]);

  useEffect(() => {
    if (paymentMethod === 'card' && !(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [paymentMethod]);

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 40;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Please enter delivery address');
      return;
    }

    if (paymentMethod === 'cash' && !payOnDeliveryEligible) {
      setError(eligibilityReason || 'Pay on delivery is not available');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.orders.create({
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
      });

      const orderId = response.order?._id || response._id;

      if (paymentMethod === 'card') {
        const paystackResponse = await api.payments.initialize({
          orderId,
          email: user?.email || '',
          amount: total,
        });

        if (paystackResponse.authorizationUrl) {
          window.location.href = paystackResponse.authorizationUrl;
          return;
        }
      }

      await clearCart();
      router.push(`/orders/success/${orderId}`);
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
              {checkingEligibility ? (
                <div className="text-gray-500">Checking payment options...</div>
              ) : (
                <div className="space-y-3">
                  {payOnDeliveryEligible && (
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-primary-500"
                      />
                      <span className="font-medium">Cash on Delivery</span>
                    </label>
                  )}
                  {!payOnDeliveryEligible && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                      {eligibilityReason || 'Pay on delivery is not available for this order.'}
                    </div>
                  )}
                  {['card', 'upi'].map(method => (
                    <label key={method} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-primary-500"
                      />
                      <span className="font-medium capitalize">{method === 'card' ? 'Pay with Card (Paystack)' : 'UPI Payment'}</span>
                    </label>
                  ))}
                </div>
              )}
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
