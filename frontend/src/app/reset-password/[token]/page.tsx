'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reset, setReset] = useState(false);

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

  const handleReset = () => {
    setReset(true);
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  if (reset) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2">Password Reset!</h2>
          <p className="text-[#636366]">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

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

        <h2 className="text-2xl font-black text-center mb-1">Set New Password</h2>
        <p className="text-sm text-[#636366] text-center mb-6">Create a strong password for your account</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1 block">New Password</label>
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
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-10 pr-10"
              />
              <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showConfirm ? <EyeOff className="w-4 h-4 text-[#A0A0A0]" /> : <Eye className="w-4 h-4 text-[#A0A0A0]" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleReset}
            className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_6px_20px_rgba(232,98,26,0.35)]"
          >
            Reset Password
          </Button>
        </div>
      </div>
    </div>
  );
}
