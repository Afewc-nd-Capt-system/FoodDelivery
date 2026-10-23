import { API_V2 as API_URL } from './apiBase';
import { refreshAccessToken, redirectToLogin } from './authClient';

interface RequestOptions {
  method?: string;
  body?: any;
}

async function request(endpoint: string, options: RequestOptions = {}, retried = false): Promise<any> {
  const { method = 'GET', body } = options;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(API_URL + endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried && !endpoint.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(endpoint, options, true);
    redirectToLogin();
  }

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
      request('/auth/logout', { method: 'POST', body: { refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : undefined } }),
    refresh: (refreshToken: string) =>
      request('/auth/refresh', { method: 'POST', body: { refreshToken } }),
    mfaStatus: () => request('/auth/mfa/status'),
    mfaSetup: () => request('/auth/mfa/setup', { method: 'POST' }),
    mfaEnable: (code: string) => request('/auth/mfa/enable', { method: 'POST', body: { code } }),
    mfaDisable: (password: string, code: string) => request('/auth/mfa/disable', { method: 'POST', body: { password, code } }),
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
      request('/payments/verify', { method: 'POST', body: { reference } }),
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
    getConfig: () => request('/loyalty/config'),
    getBalance: () => request('/loyalty/balance'),
    getHistory: (page: number = 1, limit: number = 20) =>
      request(`/loyalty/history?page=${page}&limit=${limit}`),
    redeem: (points: number) =>
      request('/loyalty/redeem', { method: 'POST', body: { points } }),
    calculateRedeemable: (orderAmount: number) =>
      request('/loyalty/calculate-redeemable', { method: 'POST', body: { orderAmount } }),
    awardPoints: (orderId: string) =>
      request('/loyalty/award-points', { method: 'POST', body: { orderId } }),
  },
  wallet: {
    get: () => request('/wallet'),
    getTransactions: (page: number = 1, limit: number = 20, type?: string) => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (type) params.append('type', type);
      return request(`/wallet/transactions?${params.toString()}`);
    },
    topup: (amount: number, email?: string) =>
      request('/wallet/topup', { method: 'POST', body: { amount, email } }),
    topupVerify: (reference: string) =>
      request('/wallet/topup/verify', { method: 'POST', body: { reference } }),
    deduct: (amount: number, description: string, orderId?: string) =>
      request('/wallet/deduct', { method: 'POST', body: { amount, description, orderId } }),
    credit: (amount: number, description: string, orderId?: string, reference?: string) =>
      request('/wallet/credit', { method: 'POST', body: { amount, description, orderId, reference } }),
    checkBalance: (amount: number) =>
      request(`/wallet/balance-check?amount=${amount}`),
  },
  subscription: {
    getPlans: () => request('/subscription/plans'),
    getMySubscription: () => request('/subscription/my-subscription'),
    subscribe: (planType: string, email?: string) =>
      request('/subscription/subscribe', { method: 'POST', body: { planType, email } }),
    verifySubscription: (reference: string, subscriptionId: string) =>
      request('/subscription/verify-subscription', { method: 'POST', body: { reference, subscriptionId } }),
    cancel: () =>
      request('/subscription/cancel', { method: 'POST' }),
    checkFreeDelivery: () =>
      request('/subscription/check-free-delivery'),
    useFreeDelivery: () =>
      request('/subscription/use-free-delivery', { method: 'POST' }),
  },
  referral: {
    getMyCode: () => request('/referral/my-code'),
    validateCode: (code: string) =>
      request('/referral/validate-code', { method: 'POST', body: { code } }),
    applyOnRegister: (referralCode: string, email: string) =>
      request('/referral/apply-on-register', { method: 'POST', body: { referralCode, email } }),
    trackSignup: (referralCode: string, userId: string) =>
      request('/referral/track-signup', { method: 'POST', body: { referralCode, userId } }),
    completeFirstOrder: (orderId: string) =>
      request('/referral/complete-first-order', { method: 'POST', body: { orderId } }),
    getMyReferrals: (page: number = 1, limit: number = 20) =>
      request(`/referral/my-referrals?page=${page}&limit=${limit}`),
    getMyRewards: () => request('/referral/my-rewards'),
  },
  recommendations: {
    getAll: (limit: number = 10) => request(`/recommendations?limit=${limit}`),
    getDishes: (limit: number = 10) => request(`/recommendations/dishes?limit=${limit}`),
    getTrending: (limit: number = 10) => request(`/recommendations/trending?limit=${limit}`),
    trackOrder: (orderId: string, restaurantId: string, totalAmount: number) =>
      request('/recommendations/track-order', { method: 'POST', body: { orderId, restaurantId, totalAmount } }),
  },
  search: {
    query: (params: Record<string, string>) => {
      const query = '?' + new URLSearchParams(params).toString();
      return request('/search' + query);
    },
    getSuggestions: (q: string) => request(`/search/suggestions?q=${encodeURIComponent(q)}`),
  },
  delivery: {
    calculateFee: (restaurantId: string, lat?: number, lng?: number, orderValue?: number) => {
      const params = new URLSearchParams({ restaurantId });
      if (lat) params.append('lat', lat.toString());
      if (lng) params.append('lng', lng.toString());
      if (orderValue) params.append('orderValue', orderValue.toString());
      return request(`/delivery/calculate?${params.toString()}`);
    },
    calculateVendorFee: (vendorId: string, lat?: number, lng?: number) => {
      const params = new URLSearchParams({ vendorId });
      if (lat) params.append('lat', lat.toString());
      if (lng) params.append('lng', lng.toString());
      return request(`/delivery/vendor-calculate?${params.toString()}`);
    },
    getConfig: () => request('/delivery/config'),
  },
  analytics: {
    getDashboard: (restaurantId: string, period?: string) =>
      request(`/analytics/dashboard?restaurantId=${restaurantId}${period ? `&period=${period}` : ''}`),
    getMenuPerformance: (restaurantId: string) =>
      request(`/analytics/menu-performance?restaurantId=${restaurantId}`),
    getSummary: (restaurantId: string) =>
      request(`/analytics/summary?restaurantId=${restaurantId}`),
  },
  restaurantPromotions: {
    getAll: (restaurantId: string, status?: string) => {
      const params = new URLSearchParams({ restaurantId });
      if (status) params.append('status', status);
      return request(`/restaurant-promotions?${params.toString()}`);
    },
    create: (data: any) => request('/restaurant-promotions', { method: 'POST', body: data }),
    update: (id: string, data: any) => request(`/restaurant-promotions/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request(`/restaurant-promotions/${id}`, { method: 'DELETE' }),
  },
  vendorForecast: {
    getDemandForecast: (vendorId: string) => request(`/vendor-forecast/demand-forecast?vendorId=${vendorId}`),
  },
  adminPromotions: {
    getAll: (status?: string, page?: number) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (page) params.append('page', page.toString());
      return request(`/admin/promotions?${params.toString()}`);
    },
    approve: (id: string) => request(`/admin/promotions/${id}/approve`, { method: 'PUT' }),
    reject: (id: string, reason?: string) => request(`/admin/promotions/${id}/reject`, { method: 'PUT', body: { reason } }),
  },
  scheduledOrders: {
    create: (data: any) => request('/scheduled-orders', { method: 'POST', body: data }),
    getAll: (page?: number) => request(`/scheduled-orders?page=${page || 1}`),
    getById: (id: string) => request(`/scheduled-orders/${id}`),
    cancel: (id: string) => request(`/scheduled-orders/${id}/cancel`, { method: 'PUT' }),
  },
  groupOrders: {
    create: (data: any) => request('/group-orders', { method: 'POST', body: data }),
    getByCode: (code: string) => request(`/group-orders/${code}`),
    addItem: (code: string, items: any[]) => request(`/group-orders/${code}/items`, { method: 'POST', body: { items } }),
    close: (code: string) => request(`/group-orders/${code}/close`, { method: 'PUT' }),
    checkout: (code: string, data: any) => request(`/group-orders/${code}/checkout`, { method: 'POST', body: data }),
  },
  reorder: {
    reorder: (orderId: string) => request(`/reorder/${orderId}`, { method: 'POST' }),
  },
  reservations: {
    create: (data: any) => request('/reservations', { method: 'POST', body: data }),
    getAll: (page?: number) => request(`/reservations?page=${page || 1}`),
    getRestaurantSettings: (restaurantId: string) => request(`/reservations/restaurant/${restaurantId}`),
  },
  catering: {
    create: (data: any) => request('/catering', { method: 'POST', body: data }),
    getAll: () => request('/catering'),
  },
  disputes: {
    create: (data: any) => request('/disputes', { method: 'POST', body: data }),
    getAll: () => request('/disputes'),
  },
  adminDisputes: {
    getAll: (status?: string, page?: number) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (page) params.append('page', (page || 1).toString());
      return request(`/admin/disputes?${params.toString()}`);
    },
    resolve: (id: string, data: any) => request(`/admin/disputes/${id}/resolve`, { method: 'PUT', body: data }),
  },
};
