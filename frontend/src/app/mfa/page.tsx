'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle } from 'lucide-react';

export default function MFAPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verified, setVerified] = useState(false);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = () => {
    setVerified(true);
  };

  const backupCodes = ['ABCD-EFGH-IJKL', 'MNOP-QRST-UVWX', '1234-5678-90AB', 'CDEF-1234-5678',
    '90AB-CDEF-1234', '5678-90AB-CDEF', '1234-90AB-CDEF', '5678-1234-90AB'];

  if (verified) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#16A34A]" />
          </div>
          <h2 className="text-2xl font-black mb-2">Verified!</h2>
          <p className="text-[#636366]">You're signed in.</p>
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

        <h2 className="text-2xl font-black text-center mb-1">Two-Factor Authentication</h2>
        <p className="text-sm text-[#636366] text-center mb-6">Enter the 6-digit code from your authenticator app</p>

        {/* QR Code Placeholder */}
        <div className="w-48 h-48 bg-[#F5F5F5] rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <span className="text-[#A0A0A0] text-xs">QR Code</span>
        </div>

        {/* OTP Input */}
        <div className="flex gap-2 justify-center mb-6">
          {otp.map((digit, i) => (
            <Input
              key={i}
              ref={inputRefs[i]}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-12 text-center text-xl font-bold border-[#E8E8E8] focus:ring-[#E8621A]"
            />
          ))}
        </div>

        <Button
          onClick={handleVerify}
          className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white py-4 rounded-2xl font-black"
        >
          Verify
        </Button>

        {/* Backup Codes */}
        <div className="mt-6 pt-6 border-t border-[#F0EAE0]">
          <h3 className="font-bold text-sm mb-3">Backup Codes</h3>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code) => (
              <code key={code} className="text-xs bg-[#F5F5F5] p-2 rounded-lg font-mono text-[#1C1C1E]">
                {code}
              </code>
            ))}
          </div>
          <p className="text-xs text-[#A0A0A0] mt-2">Store these codes safely. Each can be used once.</p>
        </div>
      </div>
    </div>
  );
}
