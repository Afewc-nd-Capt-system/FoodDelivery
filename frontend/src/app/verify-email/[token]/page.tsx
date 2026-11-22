'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_V2 } from '@/lib/apiBase';
import { useAuth } from '@/context/AuthContext';

type Status = 'loading' | 'success' | 'expired' | 'invalid';

export default function VerifyEmailPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const { user, refreshSession, resendVerification } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Verifying your email…');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage('This verification link is missing its token.');
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_V2}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(20000),
        });
        const body = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && body?.success) {
          setStatus('success');
          setMessage(body.message || 'Your email is verified.');
          if (user) await refreshSession().catch(() => {});
        } else if (body?.code === 'EMAIL_VERIFICATION_EXPIRED') {
          setStatus('expired');
          setMessage(body.message || 'This verification link has expired. Request a new one.');
        } else {
          setStatus('invalid');
          setMessage(body?.message || 'This verification link is invalid or has already been used.');
        }
      } catch {
        if (active) {
          setStatus('invalid');
          setMessage('Network error while verifying. Check your connection and try again.');
        }
      }
    })();
    return () => { active = false; };
  }, [token, user, refreshSession]);

  const handleResend = async () => {
    setResending(true);
    const result = await resendVerification();
    setResending(false);
    setResendNotice(result?.message || 'If your email needs verification, a new link will be sent.');
  };

  const icon = status === 'success' ? '✅' : status === 'loading' ? '⏳' : '⚠️';
  const title = status === 'success'
    ? 'Email verified'
    : status === 'loading'
      ? 'Verifying your email'
      : status === 'expired'
        ? 'Link expired'
        : 'Invalid link';

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFF8F0' }}>
      <div className="card w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
        <h1
          className="text-2xl font-black mb-2"
          data-testid={`verify-email-${status}`}
          style={{ color: '#1C1C1E' }}
        >
          {title}
        </h1>
        <p className="text-sm mb-6" style={{ color: '#636366' }}>{message}</p>

        {status === 'success' && (
          <Link href="/">
            <button className="btn-primary w-full py-3">Continue shopping</button>
          </Link>
        )}

        {status !== 'success' && status !== 'loading' && (
          <div className="space-y-3">
            {user && !user.emailVerified && (
              <button
                type="button"
                data-testid="verify-email-resend"
                onClick={handleResend}
                disabled={resending}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
            )}
            {resendNotice && (
              <p className="text-xs" style={{ color: '#636366' }}>{resendNotice}</p>
            )}
            {!user && (
              <Link href="/login" className="text-sm font-semibold" style={{ color: '#E8621A' }}>
                Sign in to request a new link
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
