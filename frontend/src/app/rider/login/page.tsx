'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Legacy path. The working implementation lives at /rider-login.
export default function RiderLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/rider-login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]">
      <p className="text-sm text-[#636366]">Redirecting to sign in…</p>
    </div>
  );
}
