const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string | null;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body, token } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(API_URL + endpoint, {
    method,
    headers,
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
    getProfile: (token: string) =>
      request('/auth/profile', { token }),
  },
  restaurants: {
    getAll: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request('/restaurants' + query);
    },
    getCuisines: () => request('/restaurants/cuisines'),
    getById: (id: string) => request('/restaurants/' + id),
  },
  orders: {
    create: (data: any, token: string) =>
      request('/orders', { method: 'POST', body: data, token }),
    getAll: (token: string, page: number = 1) =>
      request('/orders?page=' + page, { token }),
    getById: (id: string, token: string) =>
      request('/orders/' + id, { token }),
    updateStatus: (id: string, status: string, token: string) =>
      request('/orders/' + id + '/status', { method: 'PUT', body: { status }, token }),
  },
  cart: {
    get: (token: string) => request('/cart', { token }),
    addItem: (data: any, token: string) =>
      request('/cart/add', { method: 'POST', body: data, token }),
    updateItem: (data: any, token: string) =>
      request('/cart/update', { method: 'POST', body: data, token }),
    clear: (token: string) =>
      request('/cart/clear', { method: 'DELETE', token }),
  },
  payments: {
    initialize: (data: { orderId: string; email: string; amount: number }, token: string) =>
      request('/payments/initialize', { method: 'POST', body: data, token }),
    verify: (reference: string, token: string) =>
      request('/payments/verify/' + reference, { token }),
    checkEligibility: (restaurantId: string, totalAmount: number, token: string) =>
      request(`/payments/eligibility?restaurantId=${restaurantId}&totalAmount=${totalAmount}`, { token }),
  },
};
