'use client';
import { API_V2 as API_URL } from '@/lib/apiBase';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Phone, MapPin, Save, ArrowLeft, Wallet, Gift, Star, Plus,
  Pencil, Trash2, Check, X, Lock, Bell, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

const DIETARY_OPTIONS = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'gluten-free', label: 'Gluten-Free' },
  { value: 'nut-free', label: 'Nut-Free' },
  { value: 'dairy-free', label: 'Dairy-Free' },
];

interface Address {
  _id?: string;
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

const emptyDraft = { label: 'Home', street: '', city: '', state: '', zipCode: '' };

export default function ProfilePage() {
  const { user, token, loading, updateUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    loyaltyUpdates: true,
  });

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [addressError, setAddressError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const hydrate = useCallback((profile: any) => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setAddresses(Array.isArray(profile?.addresses) ? profile.addresses : []);
    setDietaryPreferences(Array.isArray(profile?.dietaryPreferences) ? profile.dietaryPreferences : []);
    setNotifications({
      orderUpdates: profile?.notificationPreferences?.orderUpdates !== false,
      promotions: profile?.notificationPreferences?.promotions === true,
      loyaltyUpdates: profile?.notificationPreferences?.loyaltyUpdates !== false,
    });
    setLoyaltyPoints(Number(profile?.loyaltyPoints || 0));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user || !token) {
      router.replace('/login?next=/profile');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || 'Could not load your profile.');
        if (!cancelled) hydrate(body);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not load your profile.');
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    (async () => {
      try {
        const [walletData, loyaltyData] = await Promise.all([
          api.wallet.get().catch(() => ({ data: { balance: 0 } })),
          api.loyalty.getBalance().catch(() => ({ data: { points: 0 } })),
        ]);
        if (!cancelled) {
          setWalletBalance(walletData?.data?.balance || 0);
          setLoyaltyPoints(loyaltyData?.data?.points || 0);
        }
      } catch {
        // Stats are optional; the profile form still works without them.
      }
    })();

    return () => { cancelled = true; };
  }, [loading, user, token, router, hydrate]);

  const toggleDietaryPreference = (pref: string) => {
    setDietaryPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const startAddAddress = () => {
    setEditingIndex(-1);
    setAddressError('');
    setDraft({ ...emptyDraft, label: addresses.length === 0 ? 'Home' : 'Work' });
  };

  const startEditAddress = (index: number) => {
    setEditingIndex(index);
    setAddressError('');
    setDraft({
      label: addresses[index].label || '',
      street: addresses[index].street || '',
      city: addresses[index].city || '',
      state: addresses[index].state || '',
      zipCode: addresses[index].zipCode || '',
    });
  };

  const cancelAddress = () => {
    setEditingIndex(null);
    setAddressError('');
    setDraft(emptyDraft);
  };

  const commitAddress = () => {
    if (!draft.street.trim() || !draft.city.trim() || !draft.state.trim()) {
      setAddressError('Street, city and state are required.');
      return;
    }
    const entry: Address = {
      label: draft.label.trim() || 'Address',
      street: draft.street.trim(),
      city: draft.city.trim(),
      state: draft.state.trim(),
      zipCode: draft.zipCode.trim(),
      country: 'Nigeria',
    };
    setAddresses((prev) => {
      const next = [...prev];
      if (editingIndex === -1 || editingIndex === null) {
        next.push({ ...entry, isDefault: next.length === 0 });
      } else {
        next[editingIndex] = { ...next[editingIndex], ...entry };
      }
      return next;
    });
    cancelAddress();
    setSuccess('');
    setError('');
  };

  const removeAddress = (index: number) => {
    setAddresses((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length && !next.some((a) => a.isDefault)) next[0] = { ...next[0], isDefault: true };
      return next;
    });
  };

  const makeDefault = (index: number) => {
    setAddresses((prev) => prev.map((entry, i) => ({ ...entry, isDefault: i === index })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          addresses,
          dietaryPreferences,
          notificationPreferences: notifications,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message || 'Failed to update profile');
        return;
      }
      updateUser({ ...(user as any), ...body });
      hydrate(body);
      setSuccess('Profile updated successfully!');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    setPwSuccess('');
    if (!currentPassword || !newPassword) {
      setPwError('Enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(body?.message || 'Could not change your password.');
        return;
      }
      setPwSuccess('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPwError('Network error. Check your connection and try again.');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#E8621A] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">My Profile</h1>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(user.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-gray-500">{user.email}</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {user.role}
              </span>
              {user.isVibePassMember && (
                <span className="ml-2 inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  VibePass
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Link href="/wallet" className="card p-4 text-center hover:bg-gray-50">
            <Wallet className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-600">₦{walletBalance.toFixed(2)}</p>
            <p className="text-gray-600 text-sm">Wallet</p>
          </Link>
          <Link href="/loyalty" className="card p-4 text-center hover:bg-gray-50">
            <Star className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-orange-600">{loyaltyPoints}</p>
            <p className="text-gray-600 text-sm">Points</p>
          </Link>
          <Link href="/referral" className="card p-4 text-center hover:bg-gray-50">
            <Gift className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-purple-600">Refer</p>
            <p className="text-gray-600 text-sm">Earn</p>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <h2 className="text-xl font-bold mb-4">Edit Profile</h2>

          {success && (
            <div role="status" className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">{success}</div>
          )}
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                data-testid="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                data-testid="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="+234 800 000 0000"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Saved delivery addresses
              </h3>
              <button type="button" onClick={startAddAddress} className="flex items-center gap-1 text-sm font-semibold text-[#E8621A]">
                <Plus className="w-4 h-4" /> Add address
              </button>
            </div>

            {addresses.length === 0 && editingIndex === null && (
              <p className="text-sm text-gray-500">No saved addresses yet. Add one for faster checkout.</p>
            )}

            <div className="space-y-3">
              {addresses.map((entry, index) => (
                <div key={entry._id || index} className="border rounded-xl p-3 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{entry.label || 'Address'}</p>
                      {entry.isDefault && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 rounded-full px-2 py-0.5">DEFAULT</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {[entry.street, entry.city, entry.state, entry.zipCode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!entry.isDefault && (
                      <button type="button" title="Make default" onClick={() => makeDefault(index)} className="p-1.5 text-gray-400 hover:text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button type="button" title="Edit" onClick={() => startEditAddress(index)} className="p-1.5 text-gray-400 hover:text-orange-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" title="Delete" onClick={() => removeAddress(index)} className="p-1.5 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {editingIndex !== null && (
              <div className="mt-4 border rounded-xl p-4 bg-orange-50/40 space-y-3">
                {addressError && <div role="alert" className="text-sm text-red-700">{addressError}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    placeholder="Label (Home, Work)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={draft.zipCode}
                    onChange={(e) => setDraft({ ...draft, zipCode: e.target.value })}
                    placeholder="ZIP / postal code"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={draft.street}
                  onChange={(e) => setDraft({ ...draft, street: e.target.value })}
                  placeholder="Street address"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                    placeholder="City"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={draft.state}
                    onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                    placeholder="State"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={commitAddress} className="px-3 py-2 rounded-lg bg-[#E8621A] text-white text-sm font-semibold">
                    Save address
                  </button>
                  <button type="button" onClick={cancelAddress} className="px-3 py-2 rounded-lg bg-white border text-sm font-semibold text-gray-600">
                    <X className="w-4 h-4 inline" /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Dietary Preferences</h3>
            <p className="text-gray-500 text-sm mb-4">Select your dietary requirements to filter restaurant results</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleDietaryPreference(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    dietaryPreferences.includes(option.value)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notification preferences
            </h3>
            <div className="space-y-3">
              {[
                { key: 'orderUpdates' as const, label: 'Order updates', hint: 'Status changes and delivery notifications' },
                { key: 'promotions' as const, label: 'Promotions', hint: 'Deals, discounts and new restaurant alerts' },
                { key: 'loyaltyUpdates' as const, label: 'Loyalty & referrals', hint: 'Points, rewards and referral activity' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between gap-3 border rounded-xl px-3 py-2 cursor-pointer">
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-xs text-gray-500">{item.hint}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="w-4 h-4 accent-[#E8621A]"
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            data-testid="profile-save"
            disabled={saving}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-5 h-5" /> Save Changes</>
            )}
          </button>
        </form>

        <div className="card p-6 mt-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</h2>
          {pwSuccess && <div role="status" className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">{pwSuccess}</div>}
          {pwError && <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{pwError}</div>}
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            type="button"
            onClick={handlePasswordChange}
            disabled={pwSaving}
            className="px-4 py-2.5 bg-[#1C1C1E] text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {pwSaving ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  );
}
