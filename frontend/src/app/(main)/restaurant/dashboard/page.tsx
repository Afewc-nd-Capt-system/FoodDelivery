'use client';
// Legacy dashboard route — now a redirect to the real restaurant dashboard
// under (restaurant)/restaurant-dashboard so deep links keep working.
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RestaurantDashboardRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const restaurantId = searchParams.get('restaurantId');
    router.replace(restaurantId ? `/restaurant-dashboard?restaurantId=${restaurantId}` : '/restaurant-dashboard');
  }, [router, searchParams]);

  return null;
}

export default function RestaurantDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RestaurantDashboardRedirect />
    </Suspense>
  );
}
