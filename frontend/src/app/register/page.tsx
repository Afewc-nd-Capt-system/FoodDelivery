'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, User, Mail, Phone, Lock, Check } from 'lucide-react';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);

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
    if (preferences.includes(pref)) {
      setPreferences(preferences.filter(p => p !== pref));
    } else {
      setPreferences([...preferences, pref]);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.07)] border border-[#F0EAE0]">
        {/* Logo */}
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

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input placeholder="John Doe" className="pl-10" />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input type="email" placeholder="you@example.com" className="pl-10" />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input placeholder="+234 800 000 0000" className="pl-10" />
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
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4 text-[#A0A0A0]" /> : <Eye className="w-4 h-4 text-[#A0A0A0]" />}
              </button>
            </div>
            {/* Password Strength */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map(i => (
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
              <Input type={showConfirm ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10" />
              <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showConfirm ? <EyeOff className="w-4 h-4 text-[#A0A0A0]" /> : <Eye className="w-4 h-4 text-[#A0A0A0]" />}
              </button>
            </div>
          </div>

          {/* Dietary Preferences */}
          <div>
            <label className="text-xs text-[#A0A0A0] mb-2 block">Dietary Preferences</label>
            <div className="flex flex-wrap gap-2">
              {['Vegetarian', 'Vegan', 'Halal', 'Gluten-free'].map(pref => (
                <button
                  key={pref}
                  onClick={() => togglePreference(pref)}
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
              className="w-4 h-4 accent-[#E8621A]"
            />
            <span className="text-xs text-[#636366]">I agree to the <span className="text-[#E8621A]">Terms</span> and <span className="text-[#E8621A]">Privacy Policy</span></span>
          </label>

          <Button className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_6px_20px_rgba(232,98,26,0.35)]">
            Create Account
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
