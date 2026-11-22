'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const COOLDOWN_SECONDS = 60;

/**
 * Shown for any signed-in account whose email is not verified yet. Ordering
 * is only blocked when the server switch is on; the banner is informational
 * while email delivery is being brought online.
 */
export function EmailVerificationBanner() {
  const { user, loading, resendVerification } = useAuth();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (loading || !user || user.emailVerified) return null;

  const handleResend = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    const result = await resendVerification();
    setSending(false);
    setNotice(result?.message || 'If your email needs verification, a new link will be sent.');
    setCooldown(COOLDOWN_SECONDS);
  };

  return (
    <div
      data-testid="email-verification-banner"
      className="w-full"
      style={{
        backgroundColor: '#FFF1E8',
        borderBottom: '1px solid #FFD4B8',
        color: '#7A3A1A',
        fontSize: '13px',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span aria-hidden="true">📧</span>
          <span className="truncate">
            Verify your email <strong>{user.email}</strong> to secure your account.
          </span>
        </div>
        <div className="flex items-center gap-3">
          {notice && (
            <span data-testid="verification-resend-status" className="text-xs" style={{ color: '#8A5A3A', maxWidth: '320px' }}>
              {notice}
            </span>
          )}
          <button
            type="button"
            data-testid="resend-verification"
            onClick={handleResend}
            disabled={sending || cooldown > 0}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity"
            style={{
              backgroundColor: cooldown > 0 ? '#E8C9B5' : '#E8621A',
              color: cooldown > 0 ? '#8A5A3A' : 'white',
              cursor: sending || cooldown > 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationBanner;
