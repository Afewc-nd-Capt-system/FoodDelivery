'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference was provided.');
      return;
    }

    let active = true;
    api.payments.verify(reference)
      .then((data) => {
        if (!active) return;
        setOrder(data.order);
        setStatus('success');
        setMessage(data.alreadyProcessed
          ? 'This payment was already verified. Your order is confirmed.'
          : 'Payment verified. Your order is confirmed.');
      })
      .catch((error) => {
        if (!active) return;
        setStatus('error');
        setMessage(error.message || 'We could not verify this payment.');
      });

    return () => { active = false; };
  }, [reference]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <Card className="p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#E8621A] animate-spin" />
            <h1 className="text-xl font-black text-[#1C1C1E]">Verifying payment</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-[#16A34A]" />
            <h1 className="text-xl font-black text-[#1C1C1E]">Payment confirmed</h1>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-[#DC2626]" />
            <h1 className="text-xl font-black text-[#1C1C1E]">Verification failed</h1>
          </>
        )}

        <p className="text-sm text-[#636366] mt-3">{message}</p>

        {order && (
          <div className="mt-6 rounded-xl bg-[#FFF8F3] p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#8E8E93]">Order</span>
              <span className="font-mono text-[#1C1C1E]">{order._id}</span>
            </div>
            <div className="flex justify-between gap-4 mt-2">
              <span className="text-[#8E8E93]">Status</span>
              <span className="font-semibold text-[#1C1C1E]">{order.status}</span>
            </div>
            <div className="flex justify-between gap-4 mt-2">
              <span className="text-[#8E8E93]">Total</span>
              <span className="font-semibold text-[#E8621A]">₦{Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-center">
          {status === 'success' && (
            <Link href="/orders">
              <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">View orders</Button>
            </Link>
          )}
          {status === 'error' && (
            <Link href="/auth/login">
              <Button variant="outline">Sign in</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
