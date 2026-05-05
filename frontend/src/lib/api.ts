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
};
