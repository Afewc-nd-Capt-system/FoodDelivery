'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Legacy path. The working implementation lives at /delivery-company-login.
export default function DeliveryCompanyLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/delivery-company-login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]">
      <p className="text-sm text-[#636366]">Redirecting to sign in…</p>
    </div>
  );
}
