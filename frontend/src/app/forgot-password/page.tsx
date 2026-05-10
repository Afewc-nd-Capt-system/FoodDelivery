'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    setSent(true);
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

        {sent ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#16A34A]" />
            </div>
            <h2 className="text-2xl font-black text-center mb-2">Check your email</h2>
            <p className="text-sm text-[#636366] text-center mb-6">
              We've sent a password reset link to<br /><span className="font-semibold text-[#1C1C1E]">{email}</span>
            </p>
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
                Back to Sign In
              </Button>
            </Link>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-center mb-1">Reset Password</h2>
            <p className="text-sm text-[#636366] text-center mb-6">Enter your email to receive a reset link</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_6px_20px_rgba(232,98,26,0.35)]"
              >
                Send Reset Link
              </Button>
            </div>

            <p className="text-center text-sm text-[#636366] mt-6">
              Remember your password?{' '}
              <Link href="/login" className="text-[#E8621A] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
