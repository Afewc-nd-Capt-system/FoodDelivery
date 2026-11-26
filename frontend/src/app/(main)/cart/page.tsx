'use client';
import { API_V2 } from '@/lib/apiBase';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Minus, Plus, X, Tag, MapPin, ChevronRight, CheckCircle,
  CreditCard, Smartphone, Banknote, ShoppingBag, Mail, Lock, User, Phone
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const PAYMENT_METHODS = [
  { id: 'paystack', label: 'Paystack', icon: CreditCard, desc: 'Cards, Bank Transfer, USSD', badge: 'Recommended', badgeColor: '#00C3F7' },
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, Verve' },
  { id: 'transfer', label: 'Bank Transfer', icon: Banknote, desc: 'Direct bank transfer' },
  { id: 'wallet', label: 'VibeChops Wallet', icon: Smartphone, desc: '' },
];

const DELIVERY_PRESETS = [];
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export default function CartPage() {
  const router = useRouter();
  const { user, register, login, resendVerification, refreshSession } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();

  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [address, setAddress] = useState({ street: '', area: '', city: '', state: '', phone: '' });
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [locating, setLocating] = useState(false);
  const [restaurantCity, setRestaurantCity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placed, setPlaced] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);

  useEffect(() => {
    if (verificationCooldown <= 0) return;
    const timer = setInterval(() => setVerificationCooldown((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [verificationCooldown]);

  const handleResendVerification = async () => {
    if (resendingVerification || verificationCooldown > 0) return;
    setResendingVerification(true);
    const result = await resendVerification();
    setResendingVerification(false);
    setVerificationNotice(result?.message || 'If your email needs verification, a new link will be sent.');
    setVerificationCooldown(60);
  };

  const handleVerifiedContinue = async () => {
    setVerificationNotice('');
    setVerificationRequired(false);
    await refreshSession().catch(() => {});
    // The server decides: it places the order when allowed and re-shows this
    // step with EMAIL_NOT_VERIFIED when enforcement is on.
    await handlePlaceOrder();
  };

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

  // Delivery and service fees follow the same rule the backend prices orders
  // with (orderPricingService: fee comes from the restaurant document —
  // its stored deliveryFee/serviceFee, default 40/0 when unset; a stored 0
  // means free delivery). Fetched live so the cart total matches the charged
  // total exactly.
  const [storeFees, setStoreFees] = useState<{ deliveryFee: number; serviceFee: number } | null>(null);
  const deliveryFee = storeFees ? storeFees.deliveryFee : 40;
  const serviceFee = storeFees ? storeFees.serviceFee : 0;
  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const total = subtotal - discountAmount + deliveryFee + serviceFee;
  const addressComplete = Boolean(address.street.trim() && address.city.trim() && address.state && address.phone.trim());
  const serviceAreaMismatch = Boolean(
    restaurantCity
    && address.city.trim()
    && restaurantCity.trim().toLowerCase() !== address.city.trim().toLowerCase()
  );

  useEffect(() => {
    void refreshSession().catch(() => {});
  }, [refreshSession]);

  useEffect(() => {
    const list = Array.isArray(user?.addresses) ? user.addresses : [];
    setSavedAddresses(list);
    if (!address.street && list.length) {
      const preferred = list.find((entry: any) => entry.isDefault) || list[0];
      setAddress({
        street: preferred.street || '',
        area: preferred.area || '',
        city: preferred.city || '',
        state: preferred.state || '',
        phone: preferred.phone || user?.phone || '',
      });
      setSelectedAddressId(preferred._id || '');
    }
    // Only react to a profile refresh; editing must not be overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const chooseSavedAddress = (id: string) => {
    setSelectedAddressId(id);
    const chosen = savedAddresses.find((entry: any) => (entry._id || '') === id);
    if (chosen) {
      setAddress({
        street: chosen.street || '',
        area: chosen.area || '',
        city: chosen.city || '',
        state: chosen.state || '',
        phone: chosen.phone || user?.phone || '',
      });
      setAddressError('');
    }
  };

  const detectAddress = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setAddressError('Location is not available in this browser.');
      return;
    }
    setLocating(true);
    setAddressError('');
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const result = await apiGet(`/geocode/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
        setAddress((previous) => ({
          street: result?.street || previous.street,
          area: result?.area || previous.area,
          city: result?.city || previous.city,
          state: result?.state || previous.state,
          phone: previous.phone,
        }));
      } catch {
        setAddressError('Could not look up that location. Fill the address manually.');
      } finally {
        setLocating(false);
      }
    }, () => {
      setLocating(false);
      setAddressError('Location permission was denied. Fill the address manually.');
    }, { timeout: 10000 });
  };

  const persistAddressIfRequested = async () => {
    if (!saveAddress || !user) return;
    const next = [
      ...savedAddresses,
      { ...address, label: 'Delivery', isDefault: savedAddresses.length === 0 },
    ];
    try {
      await apiPut('/auth/profile', { addresses: next });
      setSavedAddresses(next);
      setSaveAddress(false);
    } catch {
      // A failed profile save must not block this checkout.
    }
  };

  // Promo codes are validated by the server; the same code is sent with the
  // order so the charged total matches the discount shown here.
  const handlePromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoStatus('error');
      setPromoMessage('Enter a promo code.');
      return;
    }
    setPromoStatus('idle');
    setPromoMessage('');
    try {
      const res = await fetch(`${API_V2}/promo-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          orderAmount: subtotal,
          restaurantId: items[0]?.restaurantId,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setPromoStatus('error');
        setPromoMessage(body?.message || 'Could not validate that promo code.');
        return;
      }
      if (body?.valid) {
        setAppliedPromo({ code: body.promo?.code || code, discount: Math.round(Number(body.discount) || 0) });
        setPromoStatus('success');
        setPromoMessage('');
      } else {
        setAppliedPromo(null);
        setPromoStatus('error');
        setPromoMessage(body?.message || 'Invalid promo code.');
      }
    } catch {
      setPromoStatus('error');
      setPromoMessage('Network error while validating the code. Please try again.');
    }
  };

  // Load the fee configuration from the store(s) in the cart. The same fetch
  // supplies the store city used for the visible service-area notice.
  useEffect(() => {
    const firstItem = items[0];
    const storeId = firstItem?.vendorId || firstItem?.restaurantId;
    if (!storeId) return;
    const path = firstItem?.vendorId ? `/vendors/${storeId}` : `/restaurants/${storeId}`;
    apiGet(path)
      .then((data) => {
        if (data) {
          const del = Number(data.deliveryFee);
          const svc = Number(data.serviceFee);
          setStoreFees({
            deliveryFee: Number.isFinite(del) ? del : 40,
            serviceFee: Number.isFinite(svc) && svc > 0 ? svc : 0,
          });
          setRestaurantCity(data.address?.city || '');
        }
      })
      .catch(() => setStoreFees({ deliveryFee: 40, serviceFee: 0 }));
  }, [items]);

  const handlePlaceOrder = async () => {
    setOrderError('');
    setAddressError('');
    if (!addressComplete) {
      setAddressError('Add a complete delivery address to continue.');
      return;
    }
    if (serviceAreaMismatch) {
      setOrderError(`This store delivers in ${restaurantCity} only. Choose a ${restaurantCity} delivery address.`);
      return;
    }

    setPlacing(true);
    try {
      // Build order payload. The server validates every option against the
      // menu in the database and computes prices; we only send selections.
      const firstItem = items[0];
      const orderPayload = {
        items: items.map(i => ({
          menuItem: i.id,
          name: i.name,
          quantity: i.quantity,
          customizations: Object.entries(i.selectedOptions || {}).map(
            ([name, option]) => ({ name, option })
          ),
        })),
        deliveryAddress: {
          street: address.street.trim(),
          area: address.area.trim(),
          city: address.city.trim(),
          state: address.state,
          phone: address.phone.trim(),
        },
        paymentMethod: paymentMethod === 'paystack' ? 'card' : paymentMethod,
        ...(firstItem?.vendorId
          ? { vendorId: firstItem.vendorId }
          : { restaurantId: firstItem?.restaurantId }),
        restaurantName: firstItem?.restaurantName || 'Restaurant',
        ...(appliedPromo?.code ? { promoCode: appliedPromo.code } : {}),
      };

      await persistAddressIfRequested();

      let orderData;
      try {
        orderData = await apiPost('/orders', orderPayload);
      } catch (error: any) {
        if (error?.code === 'EMAIL_NOT_VERIFIED') {
          setVerificationRequired(true);
          return;
        }
        throw error;
      }

      // If Paystack, initialize payment through the same refresh-aware client.
      if (paymentMethod === 'paystack' || paymentMethod === 'card') {
        let paystackData;
        try {
          paystackData = await apiPost('/payments/initialize', {
            orderId: orderData._id || orderData.order?._id,
            amount: total,
            email: user?.email || '',
          });
        } catch (error: any) {
          if (error?.code === 'SESSION_EXPIRED' || error?.name === 'SessionExpiredError') throw error;
          paystackData = null;
        }

        if (paystackData?.authorizationUrl) {
          window.location.href = paystackData.authorizationUrl;
          return;
        }

        // Fallback: use Paystack inline popup. The public key is injected at
        // build time; never keep a test or live key in source control.
        const PaystackPop = (window as any).PaystackPop;
        const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
        if (PaystackPop && paystackPublicKey) {
          const handler = PaystackPop.setup({
            key: paystackPublicKey,
            email: user?.email || 'guest@vibechops.com',
            amount: total * 100,
            ref: `VIBE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            onSuccess: () => {
              clearCart();
              setPlaced(true);
              setTimeout(() => router.push(`/tracking/${orderData._id || orderData.order?._id}`), 1600);
            },
            onCancel: () => {
              setPlacing(false);
            },
          });
          handler.openIframe();
          return;
        }

        throw new Error('Payment could not be initialized. Please try again.');
      }

      // Pay on Delivery or wallet — direct order
      clearCart();
      setPlaced(true);
      setTimeout(() => router.push(`/tracking/${orderData._id || orderData.order?._id}`), 1600);
    } catch (err: any) {
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      if (err?.name === 'SessionExpiredError' || err?.code === 'SESSION_EXPIRED') {
        setOrderError('Your session expired. Sign in to continue.');
      } else if (err?.code === 'OUT_OF_SERVICE_AREA') {
        setOrderError(err.message || 'This address is outside the store’s delivery area.');
      } else {
        setOrderError(
          timedOut
            ? 'The request timed out. Check your connection and try again.'
            : (err?.message || 'Failed to place order. Please try again.')
        );
      }
    } finally {
      setPlacing(false);
    }
  };

  // Load Paystack script
  useEffect(() => {
    if (!(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Show the customer's real wallet balance on the payment method card.
  useEffect(() => {
    if (!user) return;
    apiGet('/wallet')
      .then((data) => {
        const value = Number(
          data?.data?.balance ?? data?.balance ?? data?.wallet?.balance ?? NaN
        );
        if (Number.isFinite(value)) setWalletBalance(value);
      })
      .catch(() => {});
  }, [user]);

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
                    if (!guestInfo.createAccount) {
                      setAuthError('Please sign in or create an account to continue.');
                      return;
                    }
                    if (!guestInfo.name.trim() || !guestInfo.email.trim() || !guestInfo.phone.trim()) {
                      setAuthError('Please enter your name, email and phone number.');
                      return;
                    }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email.trim())) {
                      setAuthError('Please enter a valid email address.');
                      return;
                    }
                    if (guestInfo.password !== guestInfo.confirmPassword) {
                      setAuthError('Passwords do not match.');
                      return;
                    }
                    if (guestInfo.password.length < 8) {
                      setAuthError('Password must be at least 8 characters.');
                      return;
                    }
                    const regData = await register({
                      name: guestInfo.name,
                      email: guestInfo.email,
                      phone: guestInfo.phone,
                      password: guestInfo.password,
                      confirmPassword: guestInfo.confirmPassword,
                    });
                    if (!regData) {
                      setAuthError('Account created, but the session could not start. Please sign in.');
                      return;
                    }
                    if (regData.emailVerified === false) {
                      // Show the verification step instead of failing at the
                      // order call; the switch decides whether it blocks.
                      setVerificationRequired(true);
                      return;
                    }
                    router.push('/orders/checkout');
                  } catch (err: any) { setAuthError(err?.message || 'Could not start checkout. Please try again.') }
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
                    await login(loginEmail, loginPassword);
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
              <h2 className="font-black text-lg mb-1 flex items-center gap-2" style={{ color: '#1C1C1E' }}>
                <ShoppingBag size={18} style={{ color: '#E8621A' }} />
                Order Items
              </h2>
              {items[0]?.restaurantName && (
                <p className="text-xs font-semibold mb-4" style={{ color: '#E8621A' }}>
                  📍 {items[0].restaurantName}
                </p>
              )}
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
                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <p className="text-xs mb-1" style={{ color: '#A0A0A0' }}>
                          {Object.entries(item.selectedOptions)
                            .map(([group, option]) => `${group}: ${option}`)
                            .join(' · ')}
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

              {appliedPromo ? (
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #86EFAC' }}
                >
                  <CheckCircle size={18} className="text-green-500 shrink-0" />
                  <span className="text-sm font-bold text-green-700">
                    <strong>{appliedPromo.code}</strong> applied — ₦{appliedPromo.discount.toLocaleString()} off your order!
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus('idle'); }}
                      placeholder="Enter promo code"
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
                      {promoMessage || 'That promo code could not be applied.'}
                    </p>
                  )}
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

              {savedAddresses.length > 0 && (
                <select
                  data-testid="cart-saved-address"
                  value={selectedAddressId}
                  onChange={(event) => chooseSavedAddress(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
                  style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                >
                  <option value="">Choose a saved address</option>
                  {savedAddresses.map((entry: any) => (
                    <option key={entry._id || `${entry.street}-${entry.city}`} value={entry._id || ''}>
                      {[entry.label, entry.street, entry.city].filter(Boolean).join(' — ')}
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  data-testid="cart-address-street"
                  value={address.street}
                  onChange={(event) => setAddress((previous) => ({ ...previous, street: event.target.value }))}
                  placeholder="Street or landmark"
                  className="sm:col-span-2 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                />
                <input
                  value={address.area}
                  onChange={(event) => setAddress((previous) => ({ ...previous, area: event.target.value }))}
                  placeholder="Area (optional)"
                  className="px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                />
                <input
                  data-testid="cart-address-city"
                  value={address.city}
                  onChange={(event) => setAddress((previous) => ({ ...previous, city: event.target.value }))}
                  placeholder="City"
                  className="px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                />
                <select
                  data-testid="cart-address-state"
                  value={address.state}
                  onChange={(event) => setAddress((previous) => ({ ...previous, state: event.target.value }))}
                  className="px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #E8E8E8', color: address.state ? '#1C1C1E' : '#A0A0A0' }}
                >
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
                <input
                  data-testid="cart-address-phone"
                  value={address.phone}
                  onChange={(event) => setAddress((previous) => ({ ...previous, phone: event.target.value }))}
                  placeholder="Contact phone"
                  inputMode="tel"
                  className="px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #E8E8E8', color: '#1C1C1E' }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                <button
                  type="button"
                  data-testid="cart-use-location"
                  onClick={detectAddress}
                  disabled={locating}
                  className="px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
                  style={{ backgroundColor: '#FFF1E8', color: '#E8621A' }}
                >
                  {locating ? 'Locating…' : 'Use my location'}
                </button>
                <label className="flex items-center gap-2 text-xs" style={{ color: '#636366' }}>
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(event) => setSaveAddress(event.target.checked)}
                  />
                  Save to my profile
                </label>
              </div>

              {addressError && (
                <p data-testid="cart-address-error" className="text-xs mt-3" style={{ color: '#D32F2F' }}>
                  {addressError}
                </p>
              )}
              {serviceAreaMismatch && (
                <p data-testid="cart-service-area-notice" className="text-xs mt-3 p-3 rounded-xl" style={{ color: '#7A3A1A', backgroundColor: '#FFF1E8', border: '1px solid #FFD4B8' }}>
                  This store delivers in <strong>{restaurantCity}</strong> only. Choose a {restaurantCity} delivery address.
                </p>
              )}
              {!addressComplete && !addressError && (
                <p className="text-xs mt-3" style={{ color: '#A0A0A0' }}>
                  A street, city, state and contact phone are required before payment.
                </p>
              )}
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
                      <div className="text-xs" style={{ color: '#A0A0A0' }}>
                        {method.id === 'wallet'
                          ? (Number.isFinite(walletBalance)
                            ? `Balance: ₦${Number(walletBalance).toLocaleString()}`
                            : 'Balance loading…')
                          : method.desc}
                      </div>
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

              <div className="space-y-2 mb-4 pb-4 border-b" style={{ borderColor: '#F0EAE0' }}>
                {items.map((item) => (
                  <div key={item.id} className="text-xs" style={{ color: '#636366' }}>
                    <span className="font-bold" style={{ color: '#1C1C1E' }}>{item.quantity}× {item.name}</span>
                    {Object.keys(item.selectedOptions || {}).length > 0 && (
                      <span> — {Object.entries(item.selectedOptions || {}).map(([group, option]) => `${group}: ${option}`).join(', ')}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#636366' }}>Subtotal</span>
                  <span className="font-semibold" style={{ color: '#1C1C1E' }}>₦{subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#22C55E' }}>Discount</span>
                    <span className="font-semibold text-green-600">–₦{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#636366' }}>Delivery Fee</span>
                  <span className="font-semibold" style={{ color: '#1C1C1E' }}>{deliveryFee > 0 ? `₦${deliveryFee}` : 'Free'}</span>
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

              {verificationRequired && (
                <div data-testid="checkout-email-verification" className="mb-4 p-4 rounded-xl text-sm" style={{ backgroundColor: '#FFF1E8', border: '1px solid #FFD4B8', color: '#7A3A1A' }}>
                  <p className="font-bold mb-1">Verify your email to place this order</p>
                  <p className="mb-3">
                    We sent a verification link to <strong>{user?.email}</strong>. Your cart is saved.
                  </p>
                  {verificationNotice && <p className="text-xs mb-2">{verificationNotice}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="checkout-resend-verification"
                      onClick={handleResendVerification}
                      disabled={resendingVerification || verificationCooldown > 0}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                      style={{ backgroundColor: '#E8621A' }}
                    >
                      {resendingVerification ? 'Sending…' : verificationCooldown > 0 ? `Resend in ${verificationCooldown}s` : 'Resend email'}
                    </button>
                    <button
                      type="button"
                      data-testid="checkout-verified-continue"
                      onClick={handleVerifiedContinue}
                      className="px-3 py-2 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: '#1C1C1E', color: 'white' }}
                    >
                      I've verified, continue
                    </button>
                  </div>
                </div>
              )}

              {orderError && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#D32F2F', border: '1px solid #FCA5A5' }}>
                  {orderError}
                </div>
              )}

              {addressComplete && !serviceAreaMismatch ? (
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  data-testid="cart-pay"
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
              ) : (
                <div
                  data-testid="cart-address-required"
                  className="p-4 rounded-2xl text-sm text-center"
                  style={{ backgroundColor: '#FFF1E8', color: '#7A3A1A', border: '1px solid #FFD4B8' }}
                >
                  Add a complete delivery address to continue.
                </div>
              )}

              <p className="text-center text-xs mt-4" style={{ color: '#A0A0A0' }}>
                Payments are processed securely by Paystack.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
