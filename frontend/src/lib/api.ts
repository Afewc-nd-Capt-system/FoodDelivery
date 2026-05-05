const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  delivery: {
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
};
