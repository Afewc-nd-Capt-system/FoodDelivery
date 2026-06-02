const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vibechops.onrender.com/api/v2';

interface RequestOptions {
  method?: string;
  body?: any;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body } = options;

  const res = await fetch(API_URL + endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string; phone?: string }) =>
      request('/auth/register', { method: 'POST', body: data }),
    login: (data: { email: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: data }),
    getProfile: () =>
      request('/auth/profile'),
    updateProfile: (data: any) =>
      request('/auth/profile', { method: 'PUT', body: data }),
    logout: () =>
      request('/auth/logout', { method: 'POST' }),
    forgotPassword: (email: string) =>
      request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (token: string, password: string) =>
      request('/auth/reset-password/' + token, { method: 'POST', body: { password } }),
    socialLogin: (data: { email: string; provider: string; socialId: string; name: string }) =>
      request('/auth/social-login', { method: 'POST', body: data }),
    getFavorites: () =>
      request('/auth/favorites'),
    addFavorite: (restaurantId: string) =>
      request('/auth/favorites/' + restaurantId, { method: 'POST' }),
    removeFavorite: (restaurantId: string) =>
      request('/auth/favorites/' + restaurantId, { method: 'DELETE' }),
  },
  restaurants: {
    getAll: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/restaurants' + query);
    },
    getCuisines: () => request('/restaurants/cuisines'),
    getById: (id: string) => request('/restaurants/' + id),
    getByLocation: (city: string, area: string) =>
      request(`/restaurants?city=${city}&area=${area}`),
  },
  orders: {
    create: (data: any) =>
      request('/orders', { method: 'POST', body: data }),
    getAll: (page: number = 1) =>
      request('/orders?page=' + page),
    getById: (id: string) =>
      request('/orders/' + id),
    updateStatus: (id: string, status: string) =>
      request('/orders/' + id + '/status', { method: 'PUT', body: { status } }),
  },
  cart: {
    get: () => request('/cart'),
    addItem: (data: any) =>
      request('/cart/add', { method: 'POST', body: data }),
    updateItem: (data: any) =>
      request('/cart/update', { method: 'POST', body: data }),
    clear: () =>
      request('/cart/clear', { method: 'DELETE' }),
  },
  payments: {
    initialize: (data: { orderId: string; email: string; amount: number }) =>
      request('/payments/initialize', { method: 'POST', body: data }),
    verify: (reference: string) =>
      request('/payments/verify/' + reference),
    checkEligibility: (restaurantId: string, totalAmount: number) =>
      request(`/payments/eligibility?restaurantId=${restaurantId}&totalAmount=${totalAmount}`),
  },
  promoCodes: {
    validate: (code: string, restaurantId?: string, orderAmount?: number) =>
      request('/promo-codes/validate', { method: 'POST', body: { code, restaurantId, orderAmount } }),
    getAll: () =>
      request('/promo-codes'),
    getAdmin: () =>
      request('/promo-codes/admin'),
    create: (data: any) =>
      request('/promo-codes', { method: 'POST', body: data }),
    update: (id: string, data: any) =>
      request('/promo-codes/' + id, { method: 'PUT', body: data }),
    delete: (id: string) =>
      request('/promo-codes/' + id, { method: 'DELETE' }),
  },
  deliveryAuth: {
    register: (data: any) =>
      request('/delivery/register', { method: 'POST', body: data }),
    login: (data: any) =>
      request('/delivery/login', { method: 'POST', body: data }),
    getProfile: () =>
      request('/delivery/profile'),
    updateStatus: (isOnline: boolean) =>
      request('/delivery/status', { method: 'PUT', body: { isOnline } }),
    updateLocation: (data: { lat: number; lng: number; address: string }) =>
      request('/delivery/location', { method: 'PUT', body: data }),
    getAvailableOrders: () =>
      request('/delivery/orders/available'),
    acceptOrder: (orderId: string) =>
      request('/delivery/orders/' + orderId + '/accept', { method: 'POST' }),
    getCurrentOrder: () =>
      request('/delivery/orders/current'),
    deliverOrder: (orderId: string, otp: string) =>
      request('/delivery/orders/' + orderId + '/delivered', { method: 'POST', body: { otp } }),
    getEarnings: () =>
      request('/delivery/earnings'),
  },
  vendors: {
    getAll: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/vendors' + query);
    },
    getCuisines: () => request('/vendors/cuisines'),
    getById: (id: string) => request('/vendors/' + id),
    getNextCookingDay: (id: string) => request('/vendors/' + id + '/next-cooking-day'),
  },
  loyalty: {
    getConfig: () => request('/v2/loyalty/config'),
    getBalance: () => request('/v2/loyalty/balance'),
    getHistory: (page: number = 1, limit: number = 20) =>
      request(`/v2/loyalty/history?page=${page}&limit=${limit}`),
    redeem: (points: number) =>
      request('/v2/loyalty/redeem', { method: 'POST', body: { points } }),
    calculateRedeemable: (orderAmount: number) =>
      request('/v2/loyalty/calculate-redeemable', { method: 'POST', body: { orderAmount } }),
    awardPoints: (orderId: string) =>
      request('/v2/loyalty/award-points', { method: 'POST', body: { orderId } }),
  },
  wallet: {
    get: () => request('/v2/wallet'),
    getTransactions: (page: number = 1, limit: number = 20, type?: string) => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (type) params.append('type', type);
      return request(`/v2/wallet/transactions?${params.toString()}`);
    },
    topup: (amount: number, email?: string) =>
      request('/v2/wallet/topup', { method: 'POST', body: { amount, email } }),
    topupVerify: (reference: string) =>
      request('/v2/wallet/topup/verify', { method: 'POST', body: { reference } }),
    deduct: (amount: number, description: string, orderId?: string) =>
      request('/v2/wallet/deduct', { method: 'POST', body: { amount, description, orderId } }),
    credit: (amount: number, description: string, orderId?: string, reference?: string) =>
      request('/v2/wallet/credit', { method: 'POST', body: { amount, description, orderId, reference } }),
    checkBalance: (amount: number) =>
      request(`/v2/wallet/balance-check?amount=${amount}`),
  },
  subscription: {
    getPlans: () => request('/v2/subscription/plans'),
    getMySubscription: () => request('/v2/subscription/my-subscription'),
    subscribe: (planType: string, email?: string) =>
      request('/v2/subscription/subscribe', { method: 'POST', body: { planType, email } }),
    verifySubscription: (reference: string, subscriptionId: string) =>
      request('/v2/subscription/verify-subscription', { method: 'POST', body: { reference, subscriptionId } }),
    cancel: () =>
      request('/v2/subscription/cancel', { method: 'POST' }),
    checkFreeDelivery: () =>
      request('/v2/subscription/check-free-delivery'),
    useFreeDelivery: () =>
      request('/v2/subscription/use-free-delivery', { method: 'POST' }),
  },
  referral: {
    getMyCode: () => request('/v2/referral/my-code'),
    validateCode: (code: string) =>
      request('/v2/referral/validate-code', { method: 'POST', body: { code } }),
    applyOnRegister: (referralCode: string, email: string) =>
      request('/v2/referral/apply-on-register', { method: 'POST', body: { referralCode, email } }),
    trackSignup: (referralCode: string, userId: string) =>
      request('/v2/referral/track-signup', { method: 'POST', body: { referralCode, userId } }),
    completeFirstOrder: (orderId: string) =>
      request('/v2/referral/complete-first-order', { method: 'POST', body: { orderId } }),
    getMyReferrals: (page: number = 1, limit: number = 20) =>
      request(`/v2/referral/my-referrals?page=${page}&limit=${limit}`),
    getMyRewards: () => request('/v2/referral/my-rewards'),
  },
  recommendations: {
    getAll: (limit: number = 10) => request(`/v2/recommendations?limit=${limit}`),
    getDishes: (limit: number = 10) => request(`/v2/recommendations/dishes?limit=${limit}`),
    getTrending: (limit: number = 10) => request(`/v2/recommendations/trending?limit=${limit}`),
    trackOrder: (orderId: string, restaurantId: string, totalAmount: number) =>
      request('/v2/recommendations/track-order', { method: 'POST', body: { orderId, restaurantId, totalAmount } }),
  },
  search: {
    query: (params: Record<string, string>) => {
      const query = '?' + new URLSearchParams(params).toString();
      return request('/v2/search' + query);
    },
    getSuggestions: (q: string) => request(`/v2/search/suggestions?q=${encodeURIComponent(q)}`),
  },
  delivery: {
    calculateFee: (restaurantId: string, lat?: number, lng?: number, orderValue?: number) => {
      const params = new URLSearchParams({ restaurantId });
      if (lat) params.append('lat', lat.toString());
      if (lng) params.append('lng', lng.toString());
      if (orderValue) params.append('orderValue', orderValue.toString());
      return request(`/v2/delivery/calculate?${params.toString()}`);
    },
    calculateVendorFee: (vendorId: string, lat?: number, lng?: number) => {
      const params = new URLSearchParams({ vendorId });
      if (lat) params.append('lat', lat.toString());
      if (lng) params.append('lng', lng.toString());
      return request(`/v2/delivery/vendor-calculate?${params.toString()}`);
    },
    getConfig: () => request('/v2/delivery/config'),
  },
  analytics: {
    getDashboard: (restaurantId: string, period?: string) =>
      request(`/v2/analytics/dashboard?restaurantId=${restaurantId}${period ? `&period=${period}` : ''}`),
    getMenuPerformance: (restaurantId: string) =>
      request(`/v2/analytics/menu-performance?restaurantId=${restaurantId}`),
    getSummary: (restaurantId: string) =>
      request(`/v2/analytics/summary?restaurantId=${restaurantId}`),
  },
  restaurantPromotions: {
    getAll: (restaurantId: string, status?: string) => {
      const params = new URLSearchParams({ restaurantId });
      if (status) params.append('status', status);
      return request(`/v2/restaurant-promotions?${params.toString()}`);
    },
    create: (data: any) => request('/v2/restaurant-promotions', { method: 'POST', body: data }),
    update: (id: string, data: any) => request(`/v2/restaurant-promotions/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request(`/v2/restaurant-promotions/${id}`, { method: 'DELETE' }),
  },
  vendorForecast: {
    getDemandForecast: (vendorId: string) => request(`/v2/vendor-forecast/demand-forecast?vendorId=${vendorId}`),
  },
  adminPromotions: {
    getAll: (status?: string, page?: number) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (page) params.append('page', page.toString());
      return request(`/v2/admin/promotions?${params.toString()}`);
    },
    approve: (id: string) => request(`/v2/admin/promotions/${id}/approve`, { method: 'PUT' }),
    reject: (id: string, reason?: string) => request(`/v2/admin/promotions/${id}/reject`, { method: 'PUT', body: { reason } }),
  },
  scheduledOrders: {
    create: (data: any) => request('/v2/scheduled-orders', { method: 'POST', body: data }),
    getAll: (page?: number) => request(`/v2/scheduled-orders?page=${page || 1}`),
    getById: (id: string) => request(`/v2/scheduled-orders/${id}`),
    cancel: (id: string) => request(`/v2/scheduled-orders/${id}/cancel`, { method: 'PUT' }),
  },
  groupOrders: {
    create: (data: any) => request('/v2/group-orders', { method: 'POST', body: data }),
    getByCode: (code: string) => request(`/v2/group-orders/${code}`),
    addItem: (code: string, items: any[]) => request(`/v2/group-orders/${code}/items`, { method: 'POST', body: { items } }),
    close: (code: string) => request(`/v2/group-orders/${code}/close`, { method: 'PUT' }),
    checkout: (code: string, data: any) => request(`/v2/group-orders/${code}/checkout`, { method: 'POST', body: data }),
  },
  reorder: {
    reorder: (orderId: string) => request(`/v2/reorder/${orderId}`, { method: 'POST' }),
  },
  reservations: {
    create: (data: any) => request('/v2/reservations', { method: 'POST', body: data }),
    getAll: (page?: number) => request(`/v2/reservations?page=${page || 1}`),
    getRestaurantSettings: (restaurantId: string) => request(`/v2/reservations/restaurant/${restaurantId}`),
  },
  catering: {
    create: (data: any) => request('/v2/catering', { method: 'POST', body: data }),
    getAll: () => request('/v2/catering'),
  },
  disputes: {
    create: (data: any) => request('/v2/disputes', { method: 'POST', body: data }),
    getAll: () => request('/v2/disputes'),
  },
  adminDisputes: {
    getAll: (status?: string, page?: number) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (page) params.append('page', (page || 1).toString());
      return request(`/v2/admin/disputes?${params.toString()}`);
    },
    resolve: (id: string, data: any) => request(`/v2/admin/disputes/${id}/resolve`, { method: 'PUT', body: data }),
  },
};
