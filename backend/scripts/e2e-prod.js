'use strict';

const crypto = require('crypto');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env.e2e'),
});

const BASE_URL = (process.env.BASE_URL || 'https://vibechops.onrender.com').replace(/\/+$/, '');
const API = `${BASE_URL}/api/v2`;
const ORIGIN = process.env.E2E_ORIGIN || 'https://food-delivery-app-ten-beta.vercel.app';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const RIDER_PARTNER_ID = process.env.RIDER_PARTNER_ID || '6adafa60150af7e777101440';
const RESTAURANT_NAME = process.env.E2E_RESTAURANT_NAME || 'Mama Cass Kitchen';

const accounts = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
  },
  customer: {
    email: process.env.E2E_CUSTOMER_EMAIL,
    password: process.env.E2E_CUSTOMER_PASSWORD,
  },
  vendor: {
    email: process.env.E2E_VENDOR_EMAIL,
    password: process.env.E2E_VENDOR_PASSWORD,
  },
  restaurant: {
    email: process.env.E2E_RESTAURANT_EMAIL,
    password: process.env.E2E_RESTAURANT_PASSWORD,
  },
  rider: {
    email: process.env.E2E_RIDER_EMAIL,
    password: process.env.E2E_RIDER_PASSWORD,
  },
  deliveryCompany: {
    email: process.env.E2E_DELIVERY_EMAIL,
    password: process.env.E2E_DELIVERY_PASSWORD,
  },
};

const results = [];
const tokens = {};
const users = {};

function log(message) {
  console.log(message);
}

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(pathname, options = {}) {
  const headers = {
    Origin: ORIGIN,
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined
      ? undefined
      : (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)),
  });

  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, status: response.status, body, text };
}

async function login(role) {
  const account = accounts[role];
  if (!account.email || !account.password) {
    throw new Error(`Missing E2E credentials for ${role}`);
  }

  const result = await api('/auth/login', {
    method: 'POST',
    body: { email: account.email, password: account.password },
  });

  const cors = result.response.headers.get('access-control-allow-origin');
  assert(result.status === 200, `login returned ${result.status}: ${result.text}`);
  assert(result.body?.token, 'login returned no token');
  assert(cors === ORIGIN, `CORS header was ${cors || '(missing)'}, expected ${ORIGIN}`);

  tokens[role] = result.body.token;
  users[role] = result.body.user;
  return result;
}

async function requestStep(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail || '');
    return detail;
  } catch (error) {
    record(name, false, error.message);
    throw error;
  }
}

async function main() {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is required in .env.e2e or the environment');
  }

  log(`E2E target: ${BASE_URL}`);
  log(`Allowed origin under test: ${ORIGIN}`);

  await requestStep('health', async () => {
    const result = await api('/health');
    assert(result.status === 200, `health returned ${result.status}`);
    return `uptime=${Math.round(result.body?.uptime || 0)}s`;
  });

  for (const role of Object.keys(accounts)) {
    await requestStep(`login ${role} with allowed Origin`, async () => {
      const result = await login(role);
      return `${result.body.user?.email} role=${result.body.user?.role}`;
    });
  }

  await requestStep('customer wallet credit is forbidden', async () => {
    const result = await api('/wallet/credit', {
      method: 'POST',
      token: tokens.customer,
      body: { amount: 1, userId: users.customer.id },
    });
    assert(result.status === 403, `expected 403, got ${result.status}: ${result.text}`);
    return '403';
  });

  const restaurant = await requestStep('load restaurant menu', async () => {
    const result = await api('/restaurants?limit=50');
    assert(result.status === 200, `restaurants returned ${result.status}`);
    const list = result.body?.restaurants || result.body?.data || result.body;
    const found = Array.isArray(list) ? list.find((item) => item.name === RESTAURANT_NAME) : null;
    assert(found, `${RESTAURANT_NAME} not found`);
    const item = (found.menu || []).find((menuItem) => menuItem.isAvailable !== false);
    assert(item, 'No available menu item');
    return { found, item };
  });

  const deliveryFee = Number(restaurant.found.deliveryFee || 500);
  const customization = (restaurant.item.customizationOptions || [])
    .flatMap((group) => (group.options || []).map((option) => ({ group, option })))
    .find(({ option }) => Number(option.price || 0) > 0);
  const customizationDelta = customization ? Number(customization.option.price) : 0;
  const expectedTotal = Number(restaurant.item.price) + customizationDelta + deliveryFee;

  const order = await requestStep('create order', async () => {
    const result = await api('/orders', {
      method: 'POST',
      token: tokens.customer,
      body: {
        restaurantId: restaurant.found._id,
        items: [{
          menuItem: restaurant.item._id,
          name: restaurant.item.name,
          price: Number(restaurant.item.price),
          quantity: 1,
          customizations: customization ? [{
            name: customization.group.name,
            option: customization.option.name,
            price: customizationDelta,
          }] : [],
        }],
        totalAmount: expectedTotal,
        deliveryFee,
        deliveryAddress: '12 E2E Test Street, Ikeja, Lagos',
        paymentMethod: 'card',
      },
    });
    assert(result.status === 201 || result.status === 200, `create order returned ${result.status}: ${result.text}`);
    assert(result.body?.order?._id, 'create order returned no order id');
    return result.body.order;
  });

  await requestStep('order total is server total', async () => {
    assert(Number(order.totalAmount) === expectedTotal, `order total ${order.totalAmount}, expected ${expectedTotal}`);
    return `total=${order.totalAmount}`;
  });

  const payment = await requestStep('initialize payment', async () => {
    const result = await api('/payments/initialize', {
      method: 'POST',
      token: tokens.customer,
      body: {
        orderId: order._id,
        email: users.customer.email,
        amount: Number(order.totalAmount),
      },
    });
    assert(result.status === 200, `initialize returned ${result.status}: ${result.text}`);
    assert(result.body?.reference, 'initialize returned no reference');
    return result.body;
  });

  const webhookPayload = {
    event: 'charge.success',
    data: {
      reference: payment.reference,
      status: 'success',
      amount: Math.round(Number(order.totalAmount) * 100),
      currency: 'NGN',
      metadata: { orderId: order._id },
    },
  };
  const rawWebhook = JSON.stringify(webhookPayload);
  const goodSignature = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawWebhook).digest('hex');

  await requestStep('bad webhook signature is rejected', async () => {
    const result = await api('/payments/webhook', {
      method: 'POST',
      headers: { 'x-paystack-signature': '0'.repeat(128) },
      body: rawWebhook,
    });
    assert(result.status === 401, `expected 401, got ${result.status}: ${result.text}`);
    return '401';
  });

  await requestStep('valid webhook marks order paid', async () => {
    const result = await api('/payments/webhook', {
      method: 'POST',
      headers: { 'x-paystack-signature': goodSignature },
      body: rawWebhook,
    });
    assert(result.status === 200, `webhook returned ${result.status}: ${result.text}`);
    return result.body?.message || '200';
  });

  await requestStep('duplicate webhook is idempotent', async () => {
    const result = await api('/payments/webhook', {
      method: 'POST',
      headers: { 'x-paystack-signature': goodSignature },
      body: rawWebhook,
    });
    assert(result.status === 200, `duplicate webhook returned ${result.status}: ${result.text}`);
    assert(/already/i.test(result.body?.message || ''), `unexpected duplicate message: ${result.text}`);
    return result.body.message;
  });

  await requestStep('payment verify returns paid order', async () => {
    const result = await api('/payments/verify', {
      method: 'POST',
      token: tokens.customer,
      body: { reference: payment.reference },
    });
    assert(result.status === 200, `verify returned ${result.status}: ${result.text}`);
    assert(result.body?.order?.isPaid === true, 'verified order is not paid');
    return `status=${result.body.order.status}`;
  });

  await requestStep('restaurant order feed contains order', async () => {
    const result = await api('/orders/restaurants/orders', { token: tokens.restaurant });
    assert(result.status === 200, `restaurant feed returned ${result.status}: ${result.text}`);
    const found = (result.body?.orders || []).find((item) => item._id === order._id);
    assert(found, 'order not visible to restaurant');
    return `status=${found.status}`;
  });

  for (const [label, pathname, method] of [
    ['restaurant accept', `/orders/restaurants/orders/${order._id}/accept`, 'PATCH'],
    ['restaurant preparing', `/orders/restaurants/orders/${order._id}/preparing`, 'PATCH'],
    ['restaurant ready', `/orders/restaurants/orders/${order._id}/ready`, 'PATCH'],
  ]) {
    await requestStep(label, async () => {
      const result = await api(pathname, { method, token: tokens.restaurant });
      assert(result.status === 200, `${label} returned ${result.status}: ${result.text}`);
      return `status=${result.body?.order?.status}`;
    });
  }

  await requestStep('restaurant forward to delivery', async () => {
    const result = await api(`/orders/restaurants/orders/${order._id}/forward-delivery`, {
      method: 'POST',
      token: tokens.restaurant,
      body: {},
    });
    assert(result.status === 200, `forward-delivery returned ${result.status}: ${result.text}`);
    assert(result.body?.order?.deliveryCompany, 'no delivery company assigned');
    return `company=${result.body.order.deliveryCompany}`;
  });

  await requestStep('delivery company accepts', async () => {
    const result = await api(`/delivery/orders/${order._id}/accept`, {
      method: 'PATCH',
      token: tokens.deliveryCompany,
    });
    assert(result.status === 200, `company accept returned ${result.status}: ${result.text}`);
    return `status=${result.body?.order?.status}`;
  });

  await requestStep('delivery company assigns rider', async () => {
    const result = await api(`/delivery/orders/${order._id}/assign-rider`, {
      method: 'POST',
      token: tokens.deliveryCompany,
      body: { riderId: RIDER_PARTNER_ID },
    });
    assert(result.status === 200, `assign rider returned ${result.status}: ${result.text}`);
    assert(result.body?.order?.deliveryPartner, 'no rider assigned');
    return `rider=${result.body.order.deliveryPartner}`;
  });

  await requestStep('rider confirms pickup', async () => {
    const result = await api(`/delivery/orders/${order._id}/picked-up`, {
      method: 'PATCH',
      token: tokens.rider,
    });
    assert(result.status === 200, `pickup returned ${result.status}: ${result.text}`);
    return `status=${result.body?.order?.status}`;
  });

  const verificationCode = await requestStep('rider confirms arrival', async () => {
    const result = await api(`/delivery/orders/${order._id}/confirm-arrival`, {
      method: 'POST',
      token: tokens.rider,
    });
    assert(result.status === 200, `arrival returned ${result.status}: ${result.text}`);
    const code = result.body?.order?.deliveryConfirmation?.customerVerificationCode;
    assert(code, 'no verification code generated');
    return code;
  });

  await requestStep('customer completes order with OTP', async () => {
    const result = await api(`/delivery/orders/${order._id}/confirm-customer`, {
      method: 'POST',
      token: tokens.customer,
      body: { verificationCode },
    });
    assert(result.status === 200, `confirm-customer returned ${result.status}: ${result.text}`);
    assert(result.body?.order?.status === 'completed', `order status is ${result.body?.order?.status}`);
    return `status=${result.body.order.status}`;
  });

  await requestStep('completion side effects are present', async () => {
    const [restaurantEarnings, deliveryEarnings, riderEarnings, verify] = await Promise.all([
      api('/earnings/restaurants/earnings', { token: tokens.restaurant }),
      api('/earnings/delivery/earnings', { token: tokens.deliveryCompany }),
      api('/riders/earnings?period=today', { token: tokens.rider }),
      api('/payments/verify', { method: 'POST', token: tokens.customer, body: { reference: payment.reference } }),
    ]);

    assert(restaurantEarnings.status === 200, `restaurant earnings ${restaurantEarnings.status}`);
    assert(deliveryEarnings.status === 200, `delivery earnings ${deliveryEarnings.status}`);
    assert(riderEarnings.status === 200, `rider earnings ${riderEarnings.status}`);
    assert(verify.status === 200, `verify ${verify.status}`);
    assert(Number(verify.body?.order?.loyaltyPointsEarned || 0) > 0, 'no loyalty points recorded');
    assert(Number(restaurantEarnings.body?.pendingEarnings || 0) > 0, 'no restaurant pending earnings');
    assert(Number(deliveryEarnings.body?.pendingEarnings || 0) > 0, 'no delivery pending earnings');
    assert(Number(riderEarnings.body?.totalEarnings || 0) > 0, 'no rider earnings');
    return `loyalty=${verify.body.order.loyaltyPointsEarned} restaurant=${restaurantEarnings.body.pendingEarnings} delivery=${deliveryEarnings.body.pendingEarnings} rider=${riderEarnings.body.totalEarnings}`;
  });

  log(`ORDER_ID=${order._id}`);
  log(`REFERENCE=${payment.reference}`);

  const failures = results.filter((result) => !result.passed);
  log(`\n${failures.length === 0 ? 'E2E PASS' : 'E2E FAIL'} — ${results.length - failures.length}/${results.length} checks`);
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  const failures = results.filter((result) => !result.passed);
  log(`\nE2E FAIL — ${results.length - failures.length}/${results.length} checks`);
  console.error(error.message);
  process.exit(1);
});
