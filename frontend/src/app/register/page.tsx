'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { API_V2 } from '@/lib/apiBase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts +234XXXXXXXXXX, 234XXXXXXXXXX and 0XXXXXXXXXX with optional spaces.
const PHONE_RE = /^(\+?234|0)[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}$/;
const SPECIAL_RE = /[!@#$%^&*(),.?":{}|<>]/;

interface RegisterResponse {
  token?: string;
  accessToken?: string;
  user?: { _id?: string; name?: string; email?: string; role?: string };
  message?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = passwordStrength(password);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const togglePreference = (pref: string) => {
    setPreferences((prev) => (prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]));
  };

  const validate = (): string => {
    if (!name.trim()) return 'Please enter your full name.';
    if (!email.trim()) return 'Please enter your email address.';
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      return 'Please enter a valid Nigerian phone number (e.g. +2348012345678).';
    }
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter.';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain a number.';
    if (!SPECIAL_RE.test(password)) return 'Password must contain a special character (e.g. !).';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!agreed) return 'Please accept the Terms and Privacy Policy.';
    return '';
  };

  const describeFailure = (status: number, body: RegisterResponse | null): string => {
    const serverMessage = body?.message || '';
    if (status === 429) {
      const minutes =
        (serverMessage.match(/try again in (\d+) minutes?/i) || [])[1] ||
        (serverMessage.match(/(\d+)\s*min/i) || [])[1];
      return minutes
        ? `Too many attempts. Please try again in ${minutes} minute${minutes === '1' ? '' : 's'}.`
        : 'Too many attempts. Please wait a few minutes and try again.';
    }
    if (status === 409 || /already exists|unable to create/i.test(serverMessage)) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (status >= 500) return 'Something went wrong on our side. Please try again shortly.';
    return serverMessage || 'Registration failed. Please check your details and try again.';
  };

  const handleRegister = async () => {
    if (submitting) return;
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_V2}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          confirmPassword,
          dietaryPreferences: preferences,
        }),
        // Never let the UI hang on a stuck request.
        signal: AbortSignal.timeout(25000),
      });

      const body = (await res.json().catch(() => null)) as RegisterResponse | null;
      if (!res.ok) {
        setError(describeFailure(res.status, body));
        return;
      }

      const token = body?.token || body?.accessToken;
      if (!token) {
        setError('Your account was created, but the session could not be started. Please sign in.');
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2500);
        return;
      }

      localStorage.setItem('token', token);
      if (body?.user) {
        localStorage.setItem('user', JSON.stringify(body.user));
        localStorage.setItem('userRole', body.user.role || 'customer');
      }
      setSuccess(true);
      router.push('/');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        setError('The request timed out. Check your connection and try again.');
      } else if (err instanceof TypeError) {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Registration failed unexpectedly. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.07)] border border-[#F0EAE0]">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center text-white font-black text-lg">
            V
          </div>
          <span className="text-xl font-black">
            <span className="text-[#1C1C1E]">Vibe</span><span className="text-[#E8621A]">Chops</span>
          </span>
        </div>

        <h2 className="text-2xl font-black text-center mb-1">Join VibeChops 🔥</h2>
        <p className="text-sm text-[#636366] text-center mb-6">Create your account</p>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 mb-4 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#D32F2F]"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 mb-4 rounded-xl border border-[#86EFAC] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Account created! Taking you to the app…</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                placeholder="John Doe"
                className="pl-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                placeholder="+234 800 000 0000"
                className="pl-10"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                autoComplete="new-password"
                disabled={submitting}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-[#A0A0A0]" /> : <Eye className="w-4 h-4 text-[#A0A0A0]" />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full ${i < strength ? strengthColors[strength - 1] : 'bg-[#E8E8E8]'}`} />
                  ))}
                </div>
                <p className="text-xs text-[#636366]">{strengthLabels[strength - 1] || 'Weak'}</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                autoComplete="new-password"
                disabled={submitting}
              />
              <button
                type="button"
                aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? <EyeOff className="w-4 h-4 text-[#A0A0A0]" /> : <Eye className="w-4 h-4 text-[#A0A0A0]" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-2 block">Dietary Preferences</label>
            <div className="flex flex-wrap gap-2">
              {['Vegetarian', 'Vegan', 'Halal', 'Gluten-free'].map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => togglePreference(pref)}
                  disabled={submitting}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    preferences.includes(pref)
                      ? 'bg-[#E8621A] text-white'
                      : 'bg-white border border-[#E8E8E8] text-[#636366]'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={submitting}
              className="w-4 h-4 accent-[#E8621A]"
            />
            <span className="text-xs text-[#636366]">
              I agree to the <span className="text-[#E8621A]">Terms</span> and <span className="text-[#E8621A]">Privacy Policy</span>
            </span>
          </label>

          <Button
            type="button"
            onClick={handleRegister}
            disabled={submitting || success}
            className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_6px_20px_rgba(232,98,26,0.35)] disabled:opacity-70 disabled:hover:scale-100"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Creating account…
              </span>
            ) : (
              'Create Account'
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-[#636366] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#E8621A] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
