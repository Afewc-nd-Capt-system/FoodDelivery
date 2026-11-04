'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Legacy path. The working implementation lives at /vendor-login; keep old
// links/bookmarks functional instead of submitting to a non-existent API.
export default function VendorLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/vendor-login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]">
      <p className="text-sm text-[#636366]">Redirecting to sign in…</p>
    </div>
  );
}
