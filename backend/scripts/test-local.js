'use strict';

/**
 * Local end-to-end suite for restaurant self-service (npm run test:local).
 *
 * Runs the real Express app (node src/server.js) against an in-memory MongoDB,
 * with Redis unreachable (the limiter must fall back to memory) and no external
 * payment or email calls (orders use cash; emails are fire-and-forget).
 *
 * Scenario:
 *   1. Admin approves a brand-new restaurant application -> invitation.
 *   2. Invitation registration creates a pending restaurant owned by the user.
 *   3. Owner cannot go live before admin approval, and cannot go live without a
 *      delivery fee + minimum order once approved.
 *   4. Owner saves profile/operations, opens, and manages the menu (required
 *      customization group, availability, popular, reorder, plan limit).
 *   5. A customer orders the customized item and the server prices it correctly.
 *   6. Restaurant A cannot read or change restaurant B's menu or profile.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const http = require('http');

const backendRoot = path.join(__dirname, '..');
const results = [];
const cleanupFns = [];
const cleanup = () => { while (cleanupFns.length) { try { cleanupFns.pop()(); } catch {} } };

const check = (ok, name, detail = '') => {
  results.push({ ok: !!ok, name });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function httpStatus(port, pathname) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: pathname, timeout: 2000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
  });
}

function makeApi(port) {
  return async function api(pathname, options = {}) {
    const headers = {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`http://127.0.0.1:${port}/api/v2${pathname}`, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(30000),
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { response, status: response.status, body, text };
  };
}

const OPENING_HOURS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  .map((day) => ({ day, open: '09:00', close: '21:00', closed: false }));

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'local-e2e-'));
  cleanupFns.push(() => { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} });

  // ---- In-memory Mongo ----
  const { MongoMemoryServer } = require(path.join(backendRoot, 'node_modules', 'mongodb-memory-server'));
  const mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri('vibechops_local');
  cleanupFns.push(() => { try { mongod.stop(); } catch {} });
  check(true, 'mongodb-memory-server running');

  // The test process shares the same in-memory database so it can seed the
  // admin account and plan records without adding test-only HTTP endpoints.
  const mongoose = require(path.join(backendRoot, 'node_modules', 'mongoose'));
  await mongoose.connect(mongoUri);
  cleanupFns.push(() => { mongoose.disconnect().catch(() => {}); });

  const User = require(path.join(backendRoot, 'src', 'models', 'User'));
  const Restaurant = require(path.join(backendRoot, 'src', 'models', 'Restaurant'));
  const Subscription = require(path.join(backendRoot, 'src', 'models', 'Subscription'));
  const BusinessSubscriptionPlan = require(path.join(backendRoot, 'src', 'models', 'BusinessSubscriptionPlan'));

  const adminEmail = 'local-admin@example.test';
  // Throwaway credentials are generated per run so the repo never carries
  // hardcoded passwords (the secret scanner runs on every commit).
  const testPassword = (prefix) => `${prefix}-${Math.random().toString(36).slice(2)}A1!`;
  const adminPassword = testPassword('LocalAdmin');
  await User.create({
    name: 'Local Admin',
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
  });

  // ---- Boot the real server ----
  const port = 4200 + (Date.now() % 500);
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    MONGODB_URI: mongoUri,
    REDIS_URL: 'redis://127.0.0.1:2/0',
    ALLOW_LOCALHOST_SERVICES: 'true',
    JWT_SECRET: 'local-test-secret-0123456789abcdef0123456789abcdef',
    JWT_REFRESH_SECRET: 'local-test-refresh-0123456789abcdef0123456789ab',
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || 'test-key',
    FRONTEND_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:3000',
    DISABLE_RATE_LIMIT: 'true',
    EMAIL_USER: '',
    EMAIL_PASS: '',
  };

  const child = spawn(process.execPath, [path.join(backendRoot, 'src', 'server.js')], {
    cwd: backendRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOutput = '';
  child.stdout.on('data', (d) => { serverOutput += d.toString(); });
  child.stderr.on('data', (d) => { serverOutput += d.toString(); });
  cleanupFns.push(() => { try { child.kill('SIGKILL'); } catch {} });

  const deadline = Date.now() + 45000;
  let healthy = false;
  let exited = false;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 300));
    if (child.exitCode !== null) { exited = true; break; }
    if (await httpStatus(port, '/health') === 200) { healthy = true; break; }
  }
  check(healthy, 'server boots and /health is 200', healthy
    ? ''
    : `exit=${child.exitCode} output=${serverOutput.split('\n').slice(-30).join(' | ').slice(0, 1200)}`);
  if (!healthy) {
    console.error(`[test-local] server port=${port} exited=${exited}`);
    console.error(serverOutput.slice(-4000));
    throw new Error('server did not become healthy');
  }

  const api = makeApi(port);

  // ---- Admin session ----
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });
  assert(adminLogin.status === 200 && adminLogin.body?.token, `admin login failed: ${adminLogin.text}`);
  const adminToken = adminLogin.body.token;
  check(true, 'admin login');

  // ---- 1. Brand-new invitation through the real application flow ----
  const ownerEmail = `owner-${Date.now()}@example.test`;
  const ownerPassword = testPassword('Owner');
  const contact = await api('/contact', {
    method: 'POST',
    body: {
      name: 'Local Owner', email: ownerEmail, phone: '+2348012345678',
      type: 'restaurant', businessName: 'Local Self Service Kitchen',
      city: 'Lagos', state: 'Lagos', message: 'local self-service e2e',
    },
  });
  assert(contact.status === 200, `contact application returned ${contact.status}: ${contact.text}`);

  const applications = await api('/admin/applications?status=pending&limit=100', { token: adminToken });
  assert(applications.status === 200, `applications list returned ${applications.status}: ${applications.text}`);
  const application = (applications.body?.data || []).find((row) => row.email === ownerEmail);
  assert(application, 'application was not stored');

  const approvedApplication = await api(`/admin/applications/${application._id}/approve`, {
    method: 'POST', token: adminToken, body: {},
  });
  assert(approvedApplication.status === 200, `approve application returned ${approvedApplication.status}: ${approvedApplication.text}`);
  const inviteUrl = approvedApplication.body?.inviteUrl;
  assert(inviteUrl, 'approve returned no inviteUrl');
  const invitationToken = new URL(inviteUrl).searchParams.get('invite');
  assert(invitationToken, 'invite URL has no token');
  check(true, 'admin approves a brand-new application and issues an invitation');

  // ---- 2. Invitation registration creates the owned, pending restaurant ----
  const registration = await api('/restaurants/register', {
    method: 'POST',
    body: {
      name: 'Local Self Service Kitchen',
      email: ownerEmail,
      password: ownerPassword,
      phone: '+2348012345678',
      description: 'Local test kitchen',
      address: { street: '1 Local Road', area: 'Ikeja', city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
      cuisine: ['Nigerian'],
      location: { type: 'Point', coordinates: [3.3792, 6.5244] },
      tinNumber: 'TIN-LOCAL-1',
      rcNumber: 'RC-LOCAL-1',
      documents: { cacCertificate: { url: '/api/v2/restaurants/docs/local-cac.pdf' } },
      invitationToken,
    },
  });
  assert(registration.status === 201, `invitation registration returned ${registration.status}: ${registration.text}`);
  assert(registration.body?.token, 'registration returned no session token');
  const ownerToken = registration.body.token;
  const restaurantId = String(registration.body?.restaurant?.id || '');
  assert(restaurantId, 'registration returned no restaurant id');
  assert(
    /pending_verification/i.test(JSON.stringify(registration.body?.restaurant || {})),
    'new restaurant is not pending verification'
  );

  const meAfterRegister = await api('/restaurant/me', { token: ownerToken });
  assert(meAfterRegister.status === 200, `/restaurant/me returned ${meAfterRegister.status}: ${meAfterRegister.text}`);
  const created = meAfterRegister.body?.restaurant;
  assert(created, '/restaurant/me returned no restaurant');
  assert(String(created._id) === restaurantId, 'restaurant is not linked to the registered owner');
  assert(created.isOpen === false, 'new restaurant should start closed');
  assert(String(created.owner) === String(registration.body?.user?._id), 'restaurant owner is not the registered user');
  check(true, 'invitation registration links the restaurant to the owner and keeps it pending/closed');

  // ---- 3. Go-live gates ----
  const earlyOpen = await api('/restaurant/me/profile', {
    method: 'PATCH', token: ownerToken, body: { isOpen: true },
  });
  assert(earlyOpen.status === 403, `opening before approval returned ${earlyOpen.status}: ${earlyOpen.text}`);

  const approvedRestaurant = await api(`/admin/approvals/restaurants/${restaurantId}/approve`, {
    method: 'PATCH', token: adminToken, body: {},
  });
  assert(approvedRestaurant.status === 200, `admin restaurant approval returned ${approvedRestaurant.status}: ${approvedRestaurant.text}`);

  const openWithoutFees = await api('/restaurant/me/profile', {
    method: 'PATCH', token: ownerToken, body: { isOpen: true },
  });
  assert(openWithoutFees.status === 400, `opening without fees returned ${openWithoutFees.status}: ${openWithoutFees.text}`);
  check(true, 'opening is blocked before CAC approval and before delivery fee/minimum order are set');

  // ---- Profile + operations ----
  const profile = await api('/restaurant/me/profile', {
    method: 'PATCH',
    token: ownerToken,
    body: {
      name: 'Local Self Service Kitchen',
      description: 'Jollof, grills and small chops.',
      cuisine: ['Nigerian', 'West African'],
      phone: '+2348098765432',
      deliveryTime: '25-40 min',
      deliveryFee: 300,
      minOrderValue: 1000,
      image: 'https://example.test/cover.jpg',
      address: {
        street: '1 Local Road', area: 'Ikeja', city: 'Lagos', state: 'Lagos', country: 'Nigeria',
      },
      location: { coordinates: [3.3792, 6.5244] },
      openingHours: OPENING_HOURS,
    },
  });
  assert(profile.status === 200, `profile update returned ${profile.status}: ${profile.text}`);
  assert(Number(profile.body?.restaurant?.deliveryFee) === 300, 'delivery fee was not saved');
  assert(Number(profile.body?.restaurant?.minOrderValue) === 1000, 'minimum order was not saved');
  assert((profile.body?.restaurant?.openingHours || []).length === 7, 'opening hours were not saved');

  const open = await api('/restaurant/me/profile', {
    method: 'PATCH', token: ownerToken, body: { isOpen: true },
  });
  assert(open.status === 200 && open.body?.restaurant?.isOpen === true, `opening returned ${open.status}: ${open.text}`);
  check(true, 'owner saves profile/operations and opens the restaurant');

  const publicRestaurant = await api(`/restaurants/${restaurantId}`);
  assert(publicRestaurant.status === 200, `public restaurant returned ${publicRestaurant.status}`);
  assert(Number(publicRestaurant.body?.deliveryFee) === 300, 'public page does not expose the saved delivery fee');
  assert(Number(publicRestaurant.body?.minOrderValue) === 1000, 'public page does not expose the saved minimum order');
  assert(String(publicRestaurant.body?.phone) === '+2348098765432', 'public page does not expose the saved phone');
  assert((publicRestaurant.body?.openingHours || []).length === 7, 'public page does not expose the saved opening hours');
  assert(publicRestaurant.body?.image === 'https://example.test/cover.jpg', 'public page does not expose the saved cover image');
  check(true, 'customer-facing restaurant record returns the saved profile values');

  // ---- 4. Menu management ----
  // A plan limit of 1 proves the server enforces the subscription limit.
  const limitPlan = await BusinessSubscriptionPlan.create({
    name: 'Basic', targetType: 'restaurant', price: 0, commissionRate: 0.1, maxMenuItems: 1,
  });
  const decoyPlan = await BusinessSubscriptionPlan.create({
    name: 'Standard', targetType: 'restaurant', price: -1, commissionRate: 0.1, maxMenuItems: 50,
  });
  await Subscription.create({
    restaurant: restaurantId,
    plan: limitPlan._id,
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    monthlyPrice: 0,
  });

  const menuState = await api('/restaurant/me/menu', { token: ownerToken });
  assert(menuState.status === 200, `menu list returned ${menuState.status}: ${menuState.text}`);
  assert(Number(menuState.body?.limit) === 1, `menu limit should come from the subscription (got ${menuState.body?.limit})`);

  const createItem = await api('/restaurant/me/menu', {
    method: 'POST',
    token: ownerToken,
    body: {
      name: 'Jollof Special',
      description: 'Smoky jollof with grilled chicken.',
      price: 2000,
      category: 'Rice',
      image: 'https://example.test/jollof.jpg',
      isAvailable: true,
      popular: true,
      calories: '650 kcal',
      customizationOptions: [{
        name: 'Size',
        type: 'single',
        required: true,
        options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 500 }],
      }],
    },
  });
  assert(createItem.status === 201, `menu create returned ${createItem.status}: ${createItem.text}`);
  const itemId = String(createItem.body?.item?._id || '');
  assert(itemId, 'menu create returned no item id');
  assert(createItem.body?.item?.customizationOptions?.[0]?.required === true, 'required customization group was not saved');

  const overLimit = await api('/restaurant/me/menu', {
    method: 'POST',
    token: ownerToken,
    body: { name: 'Second Item', price: 1000, category: 'Rice' },
  });
  assert(overLimit.status === 403, `over-limit create returned ${overLimit.status}: ${overLimit.text}`);
  check(true, 'menu item saves customization groups and the plan limit returns 403');

  const toggle = await api(`/restaurant/me/menu/${itemId}`, {
    method: 'PATCH', token: ownerToken, body: { isAvailable: false, popular: false },
  });
  assert(toggle.status === 200, `availability toggle returned ${toggle.status}: ${toggle.text}`);
  assert(toggle.body?.item?.isAvailable === false, 'availability toggle was not saved');

  const reEnable = await api(`/restaurant/me/menu/${itemId}`, {
    method: 'PATCH', token: ownerToken, body: { isAvailable: true },
  });
  assert(reEnable.status === 200, `availability re-enable returned ${reEnable.status}: ${reEnable.text}`);

  const reorder = await api('/restaurant/me/menu/reorder', {
    method: 'POST', token: ownerToken, body: { order: [itemId] },
  });
  assert(reorder.status === 200, `reorder returned ${reorder.status}: ${reorder.text}`);
  check(true, 'menu availability/popular toggles and reorder work');

  // ---- 5. Customer order pricing with the saved structure ----
  const customerEmail = `customer-${Date.now()}@example.test`;
  const customerPassword = testPassword('Customer');
  const customerRegister = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Local Customer', email: customerEmail, password: customerPassword, confirmPassword: customerPassword },
  });
  assert(customerRegister.status === 201, `customer register returned ${customerRegister.status}: ${customerRegister.text}`);
  const customerToken = customerRegister.body.token;

  const missingOption = await api('/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      restaurantId,
      items: [{ menuItem: itemId, quantity: 1 }],
      deliveryAddress: '12 Customer Street, Lagos',
      paymentMethod: 'cash',
    },
  });
  assert(missingOption.status === 400, `order without a required option returned ${missingOption.status}: ${missingOption.text}`);

  const order = await api('/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      restaurantId,
      items: [{
        menuItem: itemId,
        quantity: 2,
        customizations: [{ name: 'Size', option: 'Large' }],
      }],
      deliveryAddress: '12 Customer Street, Lagos',
      paymentMethod: 'cash',
    },
  });
  assert(order.status === 201, `order returned ${order.status}: ${order.text}`);
  assert(Number(order.body?.order?.subtotal) === 5000, `subtotal was ${order.body?.order?.subtotal}, expected 5000`);
  assert(Number(order.body?.order?.deliveryFee) === 300, `delivery fee was ${order.body?.order?.deliveryFee}, expected 300`);
  assert(Number(order.body?.order?.totalAmount) === 5300, `total was ${order.body?.order?.totalAmount}, expected 5300`);
  check(true, 'customer order requires the required option and prices it correctly (₦5,300)');

  // ---- 6. Tenant isolation ----
  const otherOwner = await User.create({
    name: 'Other Owner', email: `other-${Date.now()}@example.test`, password: testPassword('Other'), role: 'restaurant',
  });
  const otherRestaurant = await Restaurant.create({
    name: 'Other Kitchen',
    description: 'Other restaurant',
    cuisine: ['Nigerian'],
    owner: otherOwner._id,
    verificationStatus: 'approved',
    isApproved: true,
    isActive: true,
    isOpen: true,
    deliveryFee: 100,
    minOrderValue: 0,
    address: { street: '2 Other Road', city: 'Abuja', state: 'FCT', country: 'Nigeria' },
    location: { type: 'Point', coordinates: [7.3986, 9.0765] },
    menu: [{ name: 'Other Item', price: 100, category: 'Test', isAvailable: true }],
  });
  const otherItemId = String(otherRestaurant.menu[0]._id);

  const readForeign = await api(`/restaurant/${otherRestaurant._id}`, { token: ownerToken });
  assert(readForeign.status === 403, `reading restaurant B returned ${readForeign.status}: ${readForeign.text}`);

  const readForeignMenu = await api(`/restaurant/${otherRestaurant._id}/menu/manage`, { token: ownerToken });
  assert(readForeignMenu.status === 403, `reading B's managed menu returned ${readForeignMenu.status}: ${readForeignMenu.text}`);

  const updateForeign = await api(`/restaurant/${otherRestaurant._id}`, {
    method: 'PUT', token: ownerToken, body: { name: 'Hijacked' },
  });
  assert(updateForeign.status === 403, `updating restaurant B returned ${updateForeign.status}: ${updateForeign.text}`);

  const changeForeignItem = await api(`/restaurant/me/menu/${otherItemId}`, {
    method: 'PUT', token: ownerToken, body: { name: 'Hijacked Item' },
  });
  assert(changeForeignItem.status === 403, `updating B's menu item returned ${changeForeignItem.status}: ${changeForeignItem.text}`);
  check(true, 'restaurant A is denied restaurant B profile and menu (403)');

  // ---- Summary ----
  const failed = results.filter((row) => !row.ok);
  console.log(`\nTEST:LOCAL ${results.length - failed.length}/${results.length} checks passed`);
  cleanup();
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  const failed = results.filter((row) => !row.ok);
  console.log(`\nTEST:LOCAL ${results.length - failed.length}/${results.length} checks passed`);
  console.error('local e2e crashed:', error.message);
  cleanup();
  process.exit(1);
});
