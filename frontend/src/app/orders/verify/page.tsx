'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      
      if (!reference || !token) {
        setStatus('error');
        setMessage('Invalid payment reference');
        return;
      }

      try {
        const data = await api.payments.verify(reference, token);
        setStatus('success');
        setMessage('Payment verified successfully!');
        
        setTimeout(() => {
          router.push(`/orders/success/${data.order?._id || data._id || ''}`);
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [searchParams, token, router]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Verifying Payment</h1>
          <p className="text-gray-600">Please wait while we verify your payment...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-8">{message}</p>
          <p className="text-sm text-gray-500">Redirecting to order details...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
          <p className="text-gray-600 mb-8">{message}</p>
          <Link href="/orders" className="btn-primary">
            View Orders
          </Link>
        </>
      )}
    </div>
  );
}
