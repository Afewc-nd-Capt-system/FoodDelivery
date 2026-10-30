'use strict';

const crypto = require('crypto');
const path = require('path');
const { authenticator } = require('otplib');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env.e2e'),
});

function normalizeE2eOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error('E2E_ORIGIN must be set to an absolute URL such as https://vibechops.com');
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`E2E_ORIGIN is not a valid URL: ${raw}`);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('E2E_ORIGIN must be an origin only, without a path, query or hash');
  }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('E2E_ORIGIN must use HTTPS (HTTP is only allowed for localhost)');
  }
  return url.origin;
}

const BASE_URL = (process.env.BASE_URL || 'https://vibechops.onrender.com').replace(/\/+$/, '');
const API = `${BASE_URL}/api/v2`;
const ORIGIN = normalizeE2eOrigin(
  process.env.E2E_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000'
);
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
const refreshTokens = {};
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
    signal: AbortSignal.timeout(45000),
  });

  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, status: response.status, body, text };
}

async function paystackVerify(reference) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const body = await response.json();
  // An initialized checkout is normally still "abandoned" until the customer
  // pays. The regression needs its amount/currency, not a completed charge.
  assert(response.ok && body.status && body.data, `Paystack verify failed: ${JSON.stringify(body)}`);
  return body.data;
}

async function login(role) {
  const account = accounts[role];
  if (!account.email || !account.password) {
    throw new Error(`Missing E2E credentials for ${role}`);
  }

  let result = await api('/auth/login', {
    method: 'POST',
    body: { email: account.email, password: account.password },
  });

  assert(result.status === 200, `login returned ${result.status}: ${result.text}`);

  // Admin MFA returns a challenge instead of a session. The E2E admin must
  // complete it with the same TOTP secret used when MFA was enrolled. Keep the
  // secret in the ignored backend/.env.e2e, never in source or logs.
  if (result.body?.mfaRequired) {
    assert(
      role === 'admin',
      `MFA challenge is only supported for the admin E2E account, received ${role}`
    );
    const totpSecret = process.env.E2E_ADMIN_TOTP_SECRET;
    assert(
      totpSecret,
      'Admin MFA is enabled but E2E_ADMIN_TOTP_SECRET is missing from backend/.env.e2e'
    );
    assert(result.body?.mfaToken, 'MFA challenge returned no mfaToken');

    const code = authenticator.generate(totpSecret.replace(/\s+/g, '').toUpperCase());
    const verified = await api('/auth/mfa/verify', {
      method: 'POST',
      body: { mfaToken: result.body.mfaToken, code },
    });
    assert(verified.status === 200, `MFA verify returned ${verified.status}: ${verified.text}`);
    result = verified;
    result.mfaVerified = true;
  }

  const cors = result.response.headers.get('access-control-allow-origin');
  assert(result.body?.token, 'login returned no token');
  assert(cors === ORIGIN, `CORS header was ${cors || '(missing)'}, expected ${ORIGIN}`);

  tokens[role] = result.body.token;
  refreshTokens[role] = result.body.refreshToken;
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
    const response = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: ORIGIN },
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    assert(response.status === 200, `health returned ${response.status}: ${text}`);
    return `uptime=${Math.round(body?.uptime || 0)}s`;
  });

  for (const role of Object.keys(accounts)) {
    await requestStep(`login ${role} with allowed Origin`, async () => {
      const result = await login(role);
      return `${result.body.user?.email} role=${result.body.user?.role}${result.mfaVerified ? ' mfa=verified' : ''}`;
    });
  }

  await requestStep('production seed routes are not mounted', async () => {
    const result = await api('/seed/init');
    assert(result.status === 404, `seed returned ${result.status}: ${result.text}`);
    return '404';
  });

  await requestStep('verification documents are admin-only', async () => {
    const customerAttempt = await api('/restaurants/docs/does-not-exist.jpg', {
      token: tokens.customer,
    });
    assert(customerAttempt.status === 403, `customer docs returned ${customerAttempt.status}`);
    const anonymousAttempt = await api('/restaurants/docs/does-not-exist.jpg');
    assert(anonymousAttempt.status === 401, `anonymous docs returned ${anonymousAttempt.status}`);
    const adminAttempt = await api('/restaurants/docs/does-not-exist.jpg', {
      token: tokens.admin,
    });
    assert(adminAttempt.status === 404, `admin docs returned ${adminAttempt.status}`);
    return '403/401/404';
  });

  await requestStep('legacy public verification-doc path is blocked', async () => {
    const response = await fetch(`${BASE_URL}/uploads/restaurant-docs/does-not-exist.pdf`, {
      headers: { Origin: ORIGIN },
    });
    assert(response.status === 404, `legacy docs returned ${response.status}`);
    return '404';
  });

  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    await requestStep('Cloudinary verification upload is private and admin-signed', async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
        'base64'
      );
      const form = new FormData();
      form.append('cacCertificate', new Blob([png], { type: 'image/png' }), 'cac.png');
      form.append('tinNumber', `TIN-E2E-${Date.now()}`);
      form.append('rcNumber', `RC-E2E-${Date.now()}`);

      const upload = await fetch(`${API}/restaurants/upload-docs`, {
        method: 'POST',
        headers: { Origin: ORIGIN, Authorization: `Bearer ${tokens.admin}` },
        body: form,
        signal: AbortSignal.timeout(45000),
      });
      const uploadBody = await upload.json().catch(() => ({}));
      assert(upload.status === 200, `document upload returned ${upload.status}: ${JSON.stringify(uploadBody)}`);
      const documentUrl = uploadBody.cacCertificate?.url;
      assert(documentUrl, 'document upload returned no URL');

      const anonymous = await fetch(`${BASE_URL}${documentUrl}`, {
        headers: { Origin: ORIGIN },
        redirect: 'manual',
        signal: AbortSignal.timeout(45000),
      });
      assert(anonymous.status === 401, `anonymous document returned ${anonymous.status}`);

      const customer = await fetch(`${BASE_URL}${documentUrl}`, {
        headers: { Origin: ORIGIN, Authorization: `Bearer ${tokens.customer}` },
        redirect: 'manual',
        signal: AbortSignal.timeout(45000),
      });
      assert(customer.status === 403, `customer document returned ${customer.status}`);

      const admin = await fetch(`${BASE_URL}${documentUrl}`, {
        headers: { Origin: ORIGIN, Authorization: `Bearer ${tokens.admin}` },
        redirect: 'manual',
        signal: AbortSignal.timeout(45000),
      });
      assert(admin.status === 302, `admin document returned ${admin.status}`);
      const location = admin.headers.get('location') || '';
      assert(
        location.includes('api.cloudinary.com') && location.includes('signature=') && location.includes('expires_at='),
        'admin redirect is not a signed, expiring Cloudinary URL'
      );
      return 'private; signed admin redirect';
    });
  } else {
    log('SKIP  Cloudinary verification upload — CLOUDINARY_* not set');
  }

  await requestStep('refresh token rotates and reuse revokes family', async () => {
    assert(refreshTokens.customer, 'login returned no refresh token');
    const oldRefresh = refreshTokens.customer;
    const rotated = await api('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: oldRefresh },
    });
    assert(rotated.status === 200, `refresh returned ${rotated.status}: ${rotated.text}`);
    assert(rotated.body?.token && rotated.body?.refreshToken, 'refresh returned incomplete token pair');

    const reused = await api('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: oldRefresh },
    });
    assert(reused.status === 401, `reused refresh token returned ${reused.status}`);
    assert(reused.body?.code === 'REFRESH_REUSE', `expected REFRESH_REUSE, got ${reused.body?.code}`);

    tokens.customer = rotated.body.token;
    refreshTokens.customer = rotated.body.refreshToken;
    return 'rotated; replay rejected';
  });

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

  // Jollof Rice & Chicken is the canonical required-option item used by the
  // cart/options contract tests below.
  const jollof = (restaurant.found.menu || []).find(
    (item) => item.name === 'Jollof Rice & Chicken'
      && (item.customizationOptions || []).some((group) => group.required && (group.options || []).length)
  );
  const proteinGroup = jollof
    ? (jollof.customizationOptions || []).find((group) => group.required && (group.options || []).length)
    : null;

  await requestStep('non-image upload bytes are rejected', async () => {
    const form = new FormData();
    form.append('image', new Blob(['this is not an image'], { type: 'image/png' }), 'fake.png');
    const response = await fetch(`${API}/uploads/restaurant/${restaurant.found._id}`, {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        Authorization: `Bearer ${tokens.admin}`,
      },
      body: form,
    });
    const text = await response.text();
    assert(response.status === 400, `fake image returned ${response.status}: ${text}`);
    return '400';
  });

  const order = await requestStep('create order', async () => {
    const result = await api('/orders', {
      method: 'POST',
      token: tokens.customer,
      body: {
        restaurantId: restaurant.found._id,
        items: [{
          menuItem: restaurant.item._id,
          name: restaurant.item.name,
          price: 1,
          quantity: 1,
          customizations: customization ? [{
            name: customization.group.name,
            option: customization.option.name,
            price: 1,
          }] : [],
        }],
        totalAmount: 1,
        subtotal: 1,
        deliveryFee: 1,
        serviceFee: 9999,
        discount: 9999,
        promoDiscount: 9999,
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
    assert(Number(order.subtotal) === expectedTotal - deliveryFee, `order subtotal ${order.subtotal}, expected ${expectedTotal - deliveryFee}`);
    assert(Number(order.deliveryFee) === deliveryFee, `order delivery fee ${order.deliveryFee}, expected ${deliveryFee}`);
    return `total=${order.totalAmount}`;
  });

  await requestStep('tampered price and totals are ignored', async () => {
    assert(Number(order.items?.[0]?.price) === Number(restaurant.item.price),
      `item price ${order.items?.[0]?.price}, expected ${restaurant.item.price}`);
    assert(Number(order.promoDiscount || 0) === 0, `unexpected promo discount ${order.promoDiscount}`);
    return 'client amounts ignored';
  });

  await requestStep('(a) each required option is priced from the menu', async () => {
    assert(jollof, 'Jollof Rice & Chicken with a required option group not found');
    assert(proteinGroup, 'Jollof Rice & Chicken has no required option group');
    const totals = [];
    for (const option of proteinGroup.options) {
      const result = await api('/orders', {
        method: 'POST',
        token: tokens.customer,
        body: {
          restaurantId: restaurant.found._id,
          items: [{
            menuItem: jollof._id,
            quantity: 1,
            // Deliberately tampered price; the server must use the DB delta.
            customizations: [{ name: proteinGroup.name, option: option.name, price: 99999 }],
          }],
          deliveryAddress: '12 E2E Test Street, Ikeja, Lagos',
          paymentMethod: 'cash',
        },
      });
      assert(result.status === 201 || result.status === 200,
        `option ${option.name} returned ${result.status}: ${result.text}`);
      const created = result.body.order;
      const saved = (created.items?.[0]?.customizations || [])
        .find((item) => item.option === option.name);
      assert(saved, `saved order has no ${option.name} customization`);
      assert(Number(saved.price) === Number(option.price),
        `${option.name} saved delta ${saved.price}, expected ${option.price}`);
      const expected = Number(jollof.price) + Number(option.price) + deliveryFee;
      assert(Number(created.totalAmount) === expected,
        `${option.name} total ${created.totalAmount}, expected ${expected}`);
      totals.push(`${option.name}=${created.totalAmount}`);
    }
    return totals.join(', ');
  });

  await requestStep('(b) missing required option is rejected with 400', async () => {
    assert(jollof && proteinGroup, 'required-option item not found');
    const result = await api('/orders', {
      method: 'POST',
      token: tokens.customer,
      body: {
        restaurantId: restaurant.found._id,
        items: [{ menuItem: jollof._id, quantity: 1 }],
        deliveryAddress: '12 E2E Test Street, Ikeja, Lagos',
        paymentMethod: 'cash',
      },
    });
    assert(result.status === 400, `expected 400, got ${result.status}: ${result.text}`);
    assert(/required/i.test(result.body?.message || result.text),
      `unclear rejection: ${result.body?.message || result.text}`);
    return result.body?.message;
  });

  await requestStep('(c) unknown option is rejected and tampered price ignored', async () => {
    assert(jollof && proteinGroup, 'required-option item not found');
    const unknown = await api('/orders', {
      method: 'POST',
      token: tokens.customer,
      body: {
        restaurantId: restaurant.found._id,
        items: [{
          menuItem: jollof._id,
          quantity: 1,
          customizations: [{ name: proteinGroup.name, option: 'Unicorn Meat', price: 0 }],
        }],
        deliveryAddress: '12 E2E Test Street, Ikeja, Lagos',
        paymentMethod: 'cash',
      },
    });
    assert(unknown.status === 400, `unknown option returned ${unknown.status}: ${unknown.text}`);
    assert(/invalid customization/i.test(unknown.body?.message || unknown.text),
      `unclear unknown-option rejection: ${unknown.body?.message || unknown.text}`);

    const chosen = proteinGroup.options.find((option) => Number(option.price) > 0)
      || proteinGroup.options[0];
    const tampered = await api('/orders', {
      method: 'POST',
      token: tokens.customer,
      body: {
        restaurantId: restaurant.found._id,
        items: [{
          menuItem: jollof._id,
          quantity: 1,
          customizations: [{ name: proteinGroup.name, option: chosen.name, price: 1 }],
        }],
        deliveryAddress: '12 E2E Test Street, Ikeja, Lagos',
        paymentMethod: 'cash',
      },
    });
    assert(tampered.status === 201 || tampered.status === 200,
      `tampered order returned ${tampered.status}: ${tampered.text}`);
    const saved = (tampered.body.order.items?.[0]?.customizations || [])
      .find((item) => item.option === chosen.name);
    assert(saved && Number(saved.price) === Number(chosen.price),
      `tampered price was not replaced by the DB price (${saved?.price} vs ${chosen.price})`);
    return `unknown=400; saved=${saved.price}`;
  });

  await requestStep('(d) vendor pre-order item with options is priced', async () => {
    const list = await api('/vendors?limit=50');
    assert(list.status === 200, `vendors returned ${list.status}`);
    const vendorList = list.body?.vendors || list.body?.data || list.body;
    const vendor = Array.isArray(vendorList) ? vendorList[0] : null;
    assert(vendor, 'no vendor available for pre-order test');
    const originalMenu = vendor.menu || [];
    const tempItem = {
      name: `E2E Pre-order ${Date.now()}`,
      description: 'Temporary E2E pre-order item',
      price: 1000,
      image: '',
      category: 'E2E',
      isAvailable: true,
      maxOrders: 10,
      customizationOptions: [{
        name: 'Spice Level',
        type: 'single',
        required: true,
        options: [
          { name: 'Mild', price: 0 },
          { name: 'Hot', price: 150 },
        ],
        min: 1,
        max: 1,
      }],
    };

    try {
      const update = await api(`/vendors/${vendor._id}`, {
        method: 'PUT',
        token: tokens.admin,
        body: { menu: [...originalMenu, tempItem] },
      });
      assert(update.status === 200, `vendor menu update returned ${update.status}: ${update.text}`);
      const savedItem = (update.body.menu || []).find((item) => item.name === tempItem.name);
      assert(savedItem, 'temporary vendor menu item was not saved');
      const hot = (savedItem.customizationOptions?.[0]?.options || [])
        .find((option) => option.name === 'Hot');
      assert(hot, 'temporary vendor item lost its option group');

      const result = await api('/orders', {
        method: 'POST',
        token: tokens.customer,
        body: {
          vendorId: vendor._id,
          items: [{
            menuItem: savedItem._id,
            quantity: 2,
            customizations: [{ name: 'Spice Level', option: 'Hot', price: 1 }],
          }],
          deliveryAddress: '12 E2E Test Street, Ikeja, Lagos',
          paymentMethod: 'cash',
        },
      });
      assert(result.status === 201 || result.status === 200,
        `vendor order returned ${result.status}: ${result.text}`);
      const created = result.body.order;
      assert(created.vendor, 'vendor order is not linked to a vendor');
      const expected = (1000 + Number(hot.price)) * 2 + 40;
      assert(Number(created.totalAmount) === expected,
        `vendor total ${created.totalAmount}, expected ${expected}`);
      return `vendor=${vendor.businessName} total=${created.totalAmount}`;
    } finally {
      await api(`/vendors/${vendor._id}`, {
        method: 'PUT',
        token: tokens.admin,
        body: { menu: originalMenu },
      });
    }
  });

  await requestStep('(e) quantity greater than one multiplies the option delta', async () => {
    assert(jollof && proteinGroup, 'required-option item not found');
    const chosen = proteinGroup.options.find((option) => Number(option.price) > 0)
      || proteinGroup.options[0];
    const quantity = 3;
    const result = await api('/orders', {
      method: 'POST',
      token: tokens.customer,
      body: {
        restaurantId: restaurant.found._id,
        items: [{
          menuItem: jollof._id,
          quantity,
          customizations: [{ name: proteinGroup.name, option: chosen.name }],
        }],
        deliveryAddress: '12 E2E Test Street, Ikeja, Lagos',
        paymentMethod: 'cash',
      },
    });
    assert(result.status === 201 || result.status === 200,
      `quantity order returned ${result.status}: ${result.text}`);
    const created = result.body.order;
    const expected = (Number(jollof.price) + Number(chosen.price)) * quantity + deliveryFee;
    assert(Number(created.items?.[0]?.quantity) === quantity, 'quantity was not persisted');
    assert(Number(created.totalAmount) === expected,
      `quantity total ${created.totalAmount}, expected ${expected}`);
    return `qty=${quantity} total=${created.totalAmount}`;
  });

  const otherOrder = await requestStep('create order for ownership test', async () => {
    const result = await api('/orders', {
      method: 'POST',
      token: tokens.admin,
      body: {
        restaurantId: restaurant.found._id,
        items: [{
          menuItem: restaurant.item._id,
          quantity: 1,
          customizations: customization ? [{
            name: customization.group.name,
            option: customization.option.name,
          }] : [],
        }],
        deliveryAddress: '99 Ownership Test Street, Lagos',
        paymentMethod: 'card',
      },
    });
    assert(result.status === 201 || result.status === 200, `ownership order returned ${result.status}: ${result.text}`);
    assert(result.body?.order?._id, 'ownership order has no id');
    return result.body.order;
  });

  await requestStep('cannot initialize another user\'s order', async () => {
    const result = await api('/payments/initialize', {
      method: 'POST',
      token: tokens.customer,
      body: { orderId: otherOrder._id, amount: 1 },
    });
    assert(result.status === 403, `expected 403, got ${result.status}: ${result.text}`);
    return '403';
  });

  const payment = await requestStep('initialize payment', async () => {
    let last = null;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const result = await api('/payments/initialize', {
        method: 'POST',
        token: tokens.customer,
        body: {
          orderId: order._id,
          email: users.customer.email,
          amount: 1,
        },
      });
      last = result;
      if (result.status === 200 && result.body?.reference) {
        assert(Number(result.body.amount) === Math.round(expectedTotal * 100),
          `initialize amount ${result.body.amount}, expected ${Math.round(expectedTotal * 100)}`);
        return { ...result.body, attempts: attempt };
      }
      if (result.status !== 400 || !/An error occurred/i.test(result.text)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    throw new Error(`initialize returned ${last?.status}: ${last?.text}`);
  });

  await requestStep('Paystack charge uses order total', async () => {
    const data = await paystackVerify(payment.reference);
    assert(Number(data.amount) === Math.round(expectedTotal * 100),
      `Paystack amount ${data.amount}, expected ${Math.round(expectedTotal * 100)}`);
    assert(String(data.currency).toUpperCase() === 'NGN', `Paystack currency ${data.currency}`);
    return `amount=${data.amount} currency=${data.currency}`;
  });

  const webhookPayload = {
    event: 'charge.success',
    data: {
      reference: payment.reference,
      status: 'success',
      amount: Math.round(Number(order.totalAmount) * 100),
      currency: 'NGN',
      metadata: { orderId: order._id, userId: users.customer.id },
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
