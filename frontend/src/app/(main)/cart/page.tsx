'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Minus, Plus, X, Tag, MapPin, ChevronRight, CheckCircle,
  CreditCard, Smartphone, Banknote, ShoppingBag, Mail, Lock, User, Phone
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { apiPost } from '@/lib/apiClient';

const PAYMENT_METHODS = [
  { id: 'paystack', label: 'Paystack', icon: CreditCard, desc: 'Cards, Bank Transfer, USSD', badge: 'Recommended', badgeColor: '#00C3F7' },
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, Verve' },
  { id: 'transfer', label: 'Bank Transfer', icon: Banknote, desc: 'Direct bank transfer' },
  { id: 'wallet', label: 'VibeChops Wallet', icon: Smartphone, desc: 'Balance: ₦2,500' },
];

const DELIVERY_PRESETS = ['Home', 'Work', "Partner's"];

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, subtotal, promoCode, applyPromoCode, discount } = useCart();

  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [address, setAddress] = useState('12 Allen Avenue, Ikeja, Lagos');
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  // Guest checkout state
  const [checkoutTab, setCheckoutTab] = useState<'guest' | 'signin'>('guest');
  const [guestInfo, setGuestInfo] = useState({
    name: '', email: '', phone: '', password: '',
    confirmPassword: '', createAccount: true
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const deliveryFee = 500;
  const serviceFee = 100;
  const discountAmount = Math.round(subtotal * discount);
  const total = subtotal - discountAmount + deliveryFee + serviceFee;

  const handlePromo = () => {
    const ok = applyPromoCode(promoInput);
    setPromoStatus(ok ? 'success' : 'error');
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    await new Promise(r => setTimeout(r, 2200));
    setPlacing(false);
    setPlaced(true);
    clearCart();
    setTimeout(() => router.push('/tracking'), 1600);
  };

  /* ─── Guest Checkout ───────────────────── */
  if (!user && items.length > 0) {
    return (
      <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-black mb-6" style={{ color: '#1C1C1E' }}>
            Checkout
            <span className="text-base font-normal ml-2" style={{ color: '#A0A0A0' }}>
              ({items.length} item{items.length !== 1 ? 's' : ''})
            </span>
          </h1>

          {/* Tabs */}
          <div className="flex bg-white rounded-2xl p-1 mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <button
              onClick={() => setCheckoutTab('guest')}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: checkoutTab === 'guest' ? 'linear-gradient(135deg, #E8621A, #C4501A)' : 'transparent',
                color: checkoutTab === 'guest' ? 'white' : '#636366',
              }}
            >
              Guest Checkout
            </button>
            <button
              onClick={() => setCheckoutTab('signin')}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: checkoutTab === 'signin' ? 'linear-gradient(135deg, #E8621A, #C4501A)' : 'transparent',
                color: checkoutTab === 'signin' ? 'white' : '#636366',
              }}
            >
              Sign In to Continue
            </button>
          </div>

          {checkoutTab === 'guest' ? (
            <div className="bg-white rounded-3xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 className="font-black text-lg mb-5" style={{ color: '#1C1C1E' }}>Guest Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold" style={{ color: '#636366' }}>Full Name *</label>
                  <input type="text" value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold" style={{ color: '#636366' }}>Email *</label>
                  <input type="email" value={guestInfo.email} onChange={e => setGuestInfo({...guestInfo, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold" style={{ color: '#636366' }}>Phone Number *</label>
                  <input type="tel" value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: e.target.value})}
                    placeholder="+234 80X XXX XXXX"
                    className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold" style={{ color: '#636366' }}>Password *</label>
                  <input type="password" value={guestInfo.password} onChange={e => setGuestInfo({...guestInfo, password: e.target.value})}
                    placeholder="Min 8 characters"
                    className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold" style={{ color: '#636366' }}>Confirm Password *</label>
                  <input type="password" value={guestInfo.confirmPassword} onChange={e => setGuestInfo({...guestInfo, confirmPassword: e.target.value})}
                    placeholder="Re-enter password"
                    className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                  />
                </div>
                <label className="flex items-center gap-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guestInfo.createAccount}
                    onChange={e => setGuestInfo({...guestInfo, createAccount: e.target.checked})}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#E8621A' }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#636366' }}>
                    Save my details for faster checkout next time
                  </span>
                </label>
              </div>

              {authError && (
                <div className="mt-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#D32F2F', border: '1px solid #FCA5A5' }}>
                  {authError}
                </div>
              )}

              <button
                onClick={async () => {
                  setAuthLoading(true); setAuthError('');
                  try {
                      if (guestInfo.createAccount) {
                        const regData = await apiPost('/auth/register', {
                          name: guestInfo.name,
                          email: guestInfo.email,
                          phone: guestInfo.phone,
                          password: guestInfo.password,
                          role: 'customer'
                        });
                        localStorage.setItem('token', regData.token);
                    }
                    router.push('/checkout');
                  } catch (err: any) { setAuthError(err.message) }
                  finally { setAuthLoading(false) }
                }}
                disabled={authLoading}
                className="w-full mt-5 py-4 rounded-2xl text-white font-black text-base transition-all"
                style={{
                  background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
                  opacity: authLoading ? 0.7 : 1,
                }}
              >
                {authLoading ? 'Processing...' : `Place Order — ₦${subtotal.toLocaleString()}`}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 className="font-black text-lg mb-5" style={{ color: '#1C1C1E' }}>Sign In</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold" style={{ color: '#636366' }}>Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold" style={{ color: '#636366' }}>Password</label>
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                  />
                </div>
                <div className="text-right">
                  <Link href="/forgot-password" className="text-xs font-semibold" style={{ color: '#E8621A' }}>
                    Forgot Password?
                  </Link>
                </div>
              </div>

              {authError && (
                <div className="mt-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#D32F2F', border: '1px solid #FCA5A5' }}>
                  {authError}
                </div>
              )}

              <button
                onClick={async () => {
                  setAuthLoading(true); setAuthError('');
                  try {
                    const data = await apiPost('/auth/login', { email: loginEmail, password: loginPassword });
                    localStorage.setItem('token', data.token);
                    window.location.reload();
                  } catch (err: any) { setAuthError(err.message) }
                  finally { setAuthLoading(false) }
                }}
                disabled={authLoading}
                className="w-full mt-5 py-4 rounded-2xl text-white font-black text-base transition-all"
                style={{
                  background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
                  opacity: authLoading ? 0.7 : 1,
                }}
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Success screen ───────────────────── */
  if (placed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FFF8F0' }}
      >
        <div className="text-center p-8 max-w-sm">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #E8621A, #BE3A2A)', boxShadow: '0 12px 32px rgba(232,98,26,0.4)' }}
          >
            <CheckCircle size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: '#1C1C1E' }}>Order Placed! 🎉</h2>
          <p className="text-sm mb-1" style={{ color: '#636366' }}>Your order has been confirmed</p>
          <p className="text-sm" style={{ color: '#A0A0A0' }}>Redirecting to live tracking...</p>
          <div className="flex justify-center mt-5">
            <div className="w-6 h-6 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Empty cart ───────────────────────── */
  if (items.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center py-20"
        style={{ backgroundColor: '#FFF8F0' }}
      >
        <div className="text-7xl mb-6">🛒</div>
        <h2 className="text-2xl font-black mb-2" style={{ color: '#1C1C1E' }}>Your cart is empty</h2>
        <p className="text-sm mb-8" style={{ color: '#636366' }}>Add some delicious items to get started</p>
        <button
          onClick={() => router.push('/restaurants')}
          className="px-8 py-3.5 rounded-2xl text-white font-black transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
        >
          Browse Restaurants
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-black mb-8" style={{ color: '#1C1C1E' }}>
          Your Cart
          <span className="text-base font-normal ml-2" style={{ color: '#A0A0A0' }}>
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── Cart items ─────────────────── */}
            <div
              className="bg-white rounded-3xl p-6"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <h2 className="font-black text-lg mb-5 flex items-center gap-2" style={{ color: '#1C1C1E' }}>
                <ShoppingBag size={18} style={{ color: '#E8621A' }} />
                Order Items
              </h2>
              <div className="space-y-4">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 py-4 border-b last:border-0"
                    style={{ borderColor: '#F5F5F5' }}
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-2xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm mb-0.5" style={{ color: '#1C1C1E' }}>{item.name}</h4>
                      {item.selectedOptions && Object.values(item.selectedOptions).length > 0 && (
                        <p className="text-xs mb-1" style={{ color: '#A0A0A0' }}>
                          {Object.values(item.selectedOptions).join(', ')}
                        </p>
                      )}
                      <span className="font-black text-sm" style={{ color: '#E8621A' }}>
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-colors"
                        style={{ borderColor: '#E8E8E8', color: '#636366' }}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center font-black text-sm" style={{ color: '#1C1C1E' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                        style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center ml-1 transition-colors hover:bg-red-50"
                        style={{ color: '#E8621A' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Promo code ─────────────────── */}
            <div
              className="bg-white rounded-3xl p-6"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <h2 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#1C1C1E' }}>
                <Tag size={18} style={{ color: '#E8621A' }} /> Promo Code
              </h2>

              {promoCode ? (
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #86EFAC' }}
                >
                  <CheckCircle size={18} className="text-green-500 shrink-0" />
                  <span className="text-sm font-bold text-green-700">
                    <strong>{promoCode}</strong> applied — {(discount * 100).toFixed(0)}% off your order!
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus('idle'); }}
                      placeholder="Enter promo code (e.g. VIBES20)"
                      className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                      style={{
                        border: `1.5px solid ${promoStatus === 'error' ? '#EF4444' : '#E8E8E8'}`,
                        color: '#1C1C1E',
                        backgroundColor: promoStatus === 'error' ? '#FEF2F2' : 'white',
                      }}
                    />
                    <button
                      onClick={handlePromo}
                      className="px-5 py-3 rounded-xl text-white text-sm font-bold transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg, #E8621A, #C4501A)' }}
                    >
                      Apply
                    </button>
                  </div>
                  {promoStatus === 'error' && (
                    <p className="text-xs text-red-500 mt-2">
                      Invalid code. Try <strong>VIBES20</strong>, <strong>FIRSTORDER</strong>, or <strong>NAIJA10</strong>
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {['VIBES20', 'FIRSTORDER', 'NAIJA10'].map(code => (
                      <button
                        key={code}
                        onClick={() => { setPromoInput(code); setPromoStatus('idle'); }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                        style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── Delivery address ───────────── */}
            <div
              className="bg-white rounded-3xl p-6"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <h2 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#1C1C1E' }}>
                <MapPin size={18} style={{ color: '#E8621A' }} /> Delivery Address
              </h2>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-3"
                style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
              />
              <div className="flex gap-2 mb-4">
                {DELIVERY_PRESETS.map(label => (
                  <button
                    key={label}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors hover:bg-orange-100"
                    style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
              >
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <p className="text-xs font-medium" style={{ color: '#166534' }}>
                  Estimated delivery: <strong>25–35 minutes</strong>
                </p>
              </div>
            </div>

            {/* ── Payment method ─────────────── */}
            <div
              className="bg-white rounded-3xl p-6"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <h2 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#1C1C1E' }}>
                <CreditCard size={18} style={{ color: '#E8621A' }} /> Payment Method
              </h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(method => (
                  <label
                    key={method.id}
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
                    style={{
                      border: `2px solid ${paymentMethod === method.id ? '#E8621A' : '#E8E8E8'}`,
                      backgroundColor: paymentMethod === method.id ? '#FFF1E8' : 'white',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className="sr-only"
                    />
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: paymentMethod === method.id ? '#E8621A' : '#D0D0D0' }}
                    >
                      {paymentMethod === method.id && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E8621A' }} />
                      )}
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: paymentMethod === method.id
                          ? 'linear-gradient(135deg, #E8621A, #C4501A)'
                          : '#F5F5F5',
                      }}
                    >
                      <method.icon
                        size={17}
                        style={{ color: paymentMethod === method.id ? 'white' : '#636366' }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm" style={{ color: '#1C1C1E' }}>{method.label}</div>
                      <div className="text-xs" style={{ color: '#A0A0A0' }}>{method.desc}</div>
                    </div>
                    {method.badge && (
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-lg text-white shrink-0"
                        style={{ backgroundColor: method.badgeColor }}
                      >
                        {method.badge}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Order summary ── */}
          <div>
            <div
              className="bg-white rounded-3xl p-6 sticky top-24"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
            >
              <h2 className="font-black text-lg mb-5" style={{ color: '#1C1C1E' }}>Order Summary</h2>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#636366' }}>Subtotal</span>
                  <span className="font-semibold" style={{ color: '#1C1C1E' }}>₦{subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#22C55E' }}>Discount ({(discount * 100).toFixed(0)}%)</span>
                    <span className="font-semibold text-green-600">–₦{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#636366' }}>Delivery Fee</span>
                  <span className="font-semibold" style={{ color: '#1C1C1E' }}>₦{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#636366' }}>Service Fee</span>
                  <span className="font-semibold" style={{ color: '#1C1C1E' }}>₦{serviceFee}</span>
                </div>
                <div
                  className="flex justify-between font-black pt-3 border-t"
                  style={{ borderColor: '#F0EAE0' }}
                >
                  <span style={{ color: '#1C1C1E' }}>Total</span>
                  <span className="text-xl" style={{ color: '#E8621A' }}>₦{total.toLocaleString()}</span>
                </div>
              </div>

              {/* ETA */}
              <div
                className="flex items-center gap-2 p-3 rounded-2xl mb-5"
                style={{ backgroundColor: '#FFF1E8' }}
              >
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-xs" style={{ color: '#636366' }}>
                  Estimated arrival: <strong style={{ color: '#1C1C1E' }}>25–35 min</strong>
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #E8621A, #BE3A2A)',
                  boxShadow: '0 8px 24px rgba(232,98,26,0.35)',
                  opacity: placing ? 0.75 : 1,
                  transform: placing ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                {placing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay with {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
                    <ChevronRight size={18} />
                  </>
                )}
              </button>

              <p className="text-center text-xs mt-4" style={{ color: '#A0A0A0' }}>
                By ordering you agree to our Terms & Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
