'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api';
import { Wallet, Star } from 'lucide-react';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payOnDeliveryEligible, setPayOnDeliveryEligible] = useState(true);
  const [eligibilityReason, setEligibilityReason] = useState('');
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);

  const [isVibePassMember, setIsVibePassMember] = useState(false);
  const [freeDeliveryAvailable, setFreeDeliveryAvailable] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [user, items, router]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (items.length === 0) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/orders/check-pod-eligibility`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            restaurantId: items[0]?.restaurantId,
            totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0) + 40,
            items: items.map(item => ({
              menuItem: item.id,
              quantity: item.quantity,
            })),
          }),
        });

        const data = await response.json();
        setPayOnDeliveryEligible(data.allowed);
        setEligibilityReason(data.reason || '');
      } catch (err) {
        console.error('Failed to check eligibility', err);
        setPayOnDeliveryEligible(false);
        setEligibilityReason('Failed to check eligibility');
      } finally {
        setCheckingEligibility(false);
      }
    };

    checkEligibility();
  }, [items]);

  useEffect(() => {
    const loadPaymentData = async () => {
      if (!user) return;

      try {
        const [walletData, loyaltyData, subscriptionData, freeDeliveryData] = await Promise.all([
          api.wallet.get().catch(() => ({ data: { balance: 0 } })),
          api.loyalty.getBalance().catch(() => ({ data: { points: 0 } })),
          api.subscription.getMySubscription().catch(() => ({ data: null })),
          api.subscription.checkFreeDelivery().catch(() => ({ data: { eligible: false } })),
        ]);

        setWalletBalance(walletData.data?.balance || 0);
        setLoyaltyPoints(loyaltyData.data?.points || 0);
        setIsVibePassMember(subscriptionData.data?.status === 'active');
        setFreeDeliveryAvailable(freeDeliveryData.data?.eligible || false);
      } catch (err) {
        console.error('Failed to load payment data:', err);
      }
    };

    loadPaymentData();
  }, [user]);

  useEffect(() => {
    const calculateLoyaltyDiscount = async () => {
      if (!useLoyalty || loyaltyPoints === 0) {
        setLoyaltyDiscount(0);
        return;
      }

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      try {
        const data = await api.loyalty.calculateRedeemable(subtotal);
        setLoyaltyDiscount(data.data.discountValue || 0);
      } catch (err) {
        console.error('Failed to calculate loyalty discount:', err);
      }
    };

    calculateLoyaltyDiscount();
  }, [useLoyalty, loyaltyPoints, items]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = isVibePassMember && freeDeliveryAvailable ? 0 : 40;
  const totalAfterLoyalty = subtotal - loyaltyDiscount;
  const walletDeduction = useWallet ? Math.min(walletBalance, totalAfterLoyalty) : 0;
  const finalTotal = Math.max(0, totalAfterLoyalty - walletDeduction);

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

    if (useWallet && walletBalance < (subtotal - loyaltyDiscount)) {
      if (paymentMethod === 'cash') {
        setError('Insufficient wallet balance. Please add funds or choose another payment method.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      let finalTotalAmount = finalTotal;

      if (useWallet && walletDeduction > 0) {
        setWalletLoading(true);
        await api.wallet.deduct(walletDeduction, 'Order payment', undefined);
        setWalletLoading(false);
      }

      const orderData: any = {
        restaurant: items[0]?.restaurantId,
        items: items.map(item => ({
          menuItem: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalAmount: finalTotalAmount,
        deliveryAddress: address,
        paymentMethod: finalTotalAmount === 0 ? 'wallet' : paymentMethod,
        deliveryFee,
        walletAmountUsed: walletDeduction,
        loyaltyDiscount: loyaltyDiscount,
        loyaltyPointsRedeemed: useLoyalty ? Math.floor(loyaltyDiscount * 100) : 0,
        isVibePassFreeDelivery: isVibePassMember && freeDeliveryAvailable,
      };

      if (isVibePassMember && freeDeliveryAvailable) {
        await api.subscription.useFreeDelivery();
      }

      const response = await api.orders.create(orderData);

      const orderId = response.order?._id || response._id;

      if (paymentMethod === 'card' && finalTotalAmount > 0) {
        const paystackResponse = await api.payments.initialize({
          orderId,
          email: user?.email || '',
          amount: finalTotalAmount,
        });

        if (paystackResponse.authorizationUrl) {
          window.location.href = paystackResponse.authorizationUrl;
          return;
        }
      }

      if (useLoyalty) {
        try {
          await api.loyalty.awardPoints(orderId);
        } catch (err) {
          console.error('Failed to award loyalty points:', err);
        }
      }

      await clearCart();
      router.push(`/orders/success/${orderId}`);
    } catch (err: any) {
      if (walletLoading) {
        setError('Payment failed. Please try again or use a different payment method.');
      } else {
        setError(err.message || 'Failed to place order');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user || items.length === 0) return null;

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
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                required
              />
            </div>

            {loyaltyPoints > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-orange-500" />
                    <h2 className="text-xl font-bold">Loyalty Points</h2>
                  </div>
                  <span className="text-orange-500 font-medium">{loyaltyPoints} points available</span>
                </div>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={useLoyalty}
                    onChange={(e) => setUseLoyalty(e.target.checked)}
                    className="text-orange-500"
                  />
                  <div>
                    <span className="font-medium">Use points for discount</span>
                    {loyaltyDiscount > 0 && (
                      <span className="ml-2 text-green-600">(-₦{loyaltyDiscount.toFixed(2)})</span>
                    )}
                  </div>
                </label>
              </div>
            )}

            {walletBalance > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-green-500" />
                    <h2 className="text-xl font-bold">Wallet</h2>
                  </div>
                  <span className="text-green-600 font-medium">₦{walletBalance.toFixed(2)} available</span>
                </div>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="text-green-500"
                  />
                  <div>
                    <span className="font-medium">Pay with wallet</span>
                    {useWallet && finalTotal > 0 && (
                      <span className="ml-2 text-gray-500">(-₦{walletDeduction.toFixed(2)})</span>
                    )}
                  </div>
                </label>
              </div>
            )}

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
                        disabled={finalTotal === 0}
                        className="text-orange-500"
                      />
                      <span className="font-medium">Cash on Delivery</span>
                    </label>
                  )}
                  {['card'].map(method => (
                    <label key={method} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        disabled={finalTotal === 0}
                        className="text-orange-500"
                      />
                      <span className="font-medium">Pay with Card (Paystack)</span>
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
              disabled={loading || walletLoading}
              className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
            >
              {loading || walletLoading ? 'Processing...' : `Place Order - ₦${finalTotal.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-20">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₦{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>₦{subtotal.toFixed(2)}</span>
              </div>
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Loyalty Discount</span>
                  <span>-₦{loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className={isVibePassMember && freeDeliveryAvailable ? 'text-green-600' : ''}>
                  {isVibePassMember && freeDeliveryAvailable ? 'Free' : `₦${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              {walletDeduction > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Wallet</span>
                  <span>-₦{walletDeduction.toFixed(2)}</span>
                </div>
              )}
              {isVibePassMember && freeDeliveryAvailable && (
                <div className="text-xs text-yellow-600">VibePass free delivery applied!</div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>₦{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
