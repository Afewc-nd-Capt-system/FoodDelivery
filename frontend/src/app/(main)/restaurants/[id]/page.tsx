'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy restaurant URL. The canonical detail page is /restaurant/[id].
 * This route only exists so old links keep working; it must never render the
 * raw restaurant document (the API returns an address object, which React
 * cannot render).
 */
export default function LegacyRestaurantRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params?.id || '');

  useEffect(() => {
    if (!id) return;
    const query = searchParams?.toString();
    router.replace(`/restaurant/${id}${query ? `?${query}` : ''}`);
  }, [id, router, searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-[#636366]">Opening restaurant…</p>
      </div>
    </div>
  );
}
