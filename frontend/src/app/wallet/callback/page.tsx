'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Paystack returns the customer here with ?reference=...&trxref=...
// Forward to the wallet page, which verifies the reference with the server.
export default function WalletCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    router.replace(reference ? `/wallet?reference=${encodeURIComponent(reference)}` : '/wallet');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]">
      <p className="text-sm text-[#636366]">Confirming your payment…</p>
    </div>
  );
}
