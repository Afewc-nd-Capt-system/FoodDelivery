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
const crypto = require('crypto');
const { spawn } = require('child_process');
const http = require('http');

// Test-only mail configuration: the mock provider captures every message to
// JSONL and never touches SMTP/Resend. The spawned server inherits these too.
process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR
  || path.join(os.homedir(), '.cache', 'mongodb-binaries');
process.env.MONGOMS_LAUNCH_TIMEOUT = process.env.MONGOMS_LAUNCH_TIMEOUT || '60000';
process.env.EMAIL_PROVIDER = 'mock';
process.env.EMAIL_RETRY_BASE_MS = process.env.EMAIL_RETRY_BASE_MS || '50';
process.env.EMAIL_MAX_ATTEMPTS = process.env.EMAIL_MAX_ATTEMPTS || '3';
process.env.EMAIL_MOCK_FAIL_TIMES = process.env.EMAIL_MOCK_FAIL_TIMES || '2';
process.env.EMAIL_MOCK_FAIL_TYPE = process.env.EMAIL_MOCK_FAIL_TYPE || 'retry-test';
process.env.EMAIL_MOCK_FAIL_TO = process.env.EMAIL_MOCK_FAIL_TO || 'always-fail@example.test';
process.env.EMAIL_OWNER = process.env.EMAIL_OWNER || 'owner-notify@example.test';
process.env.EMAIL_FROM = process.env.EMAIL_FROM || '"VibeChops" <no-reply@vibechops.test>';
process.env.EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@vibechops.test';
const switchOn = String(
  process.env.TEST_REQUIRE_EMAIL_VERIFICATION || process.env.REQUIRE_EMAIL_VERIFICATION || ''
).toLowerCase() === 'true';

const backendRoot = path.join(__dirname, '..');
const mailService = require(path.join(backendRoot, 'src', 'services', 'mailService'));
const emailTemplates = require(path.join(backendRoot, 'src', 'services', 'emailTemplates'));
const financialEmailJobs = require(path.join(backendRoot, 'src', 'jobs', 'financialEmailJobs'));
const DeliveryConfirmationService = require(path.join(backendRoot, 'src', 'services', 'DeliveryConfirmationService'));
const migrationRunner = require(path.join(backendRoot, 'src', 'migrations', 'runner.js'));
const { sendEmail } = require(path.join(backendRoot, 'src', 'utils', 'email'));
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

function readCapturedEmails(file) {
  try {
    return fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function waitForEmail(file, predicate, afterMail = null, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const emails = readCapturedEmails(file);
    let candidates = emails;
    if (afterMail) {
      const index = emails.findIndex((mail) => mail.at === afterMail.at && mail.to === afterMail.to && mail.subject === afterMail.subject);
      candidates = index >= 0 ? emails.slice(index + 1) : emails;
    }
    const found = candidates.filter(predicate).pop();
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'local-e2e-'));
  cleanupFns.push(() => { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} });

  // ---- In-memory Mongo ----
  const { MongoMemoryServer } = require(path.join(backendRoot, 'node_modules', 'mongodb-memory-server'));
  const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
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
  const EmailLog = require(path.join(backendRoot, 'src', 'models', 'EmailLog'));
  const Order = require(path.join(backendRoot, 'src', 'models', 'Order'));
  const PromoCode = require(path.join(backendRoot, 'src', 'models', 'PromoCode'));
  const emailCaptureFile = path.join(temp, 'captured-emails.jsonl');
  process.env.EMAIL_CAPTURE_FILE = emailCaptureFile;

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

  // ---- Local Paystack mock (test-only base URL override) ----
  const paystackRequests = [];
  const paystackPort = 4900 + (Date.now() % 100);
  const paystackServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      if (req.method === 'POST' && req.url === '/transaction/initialize') {
        let parsed = {};
        try { parsed = JSON.parse(body || '{}'); } catch {}
        const reference = parsed.reference || `mock_${Date.now()}`;
        paystackRequests.push({ ...parsed, reference });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: true,
          data: {
            authorization_url: `http://127.0.0.1:${paystackPort}/pay/${encodeURIComponent(reference)}`,
            access_code: 'mock_access_code',
            reference,
          },
        }));
        return;
      }
      if (req.method === 'GET' && req.url.startsWith('/transaction/verify/')) {
        const reference = decodeURIComponent(req.url.slice('/transaction/verify/'.length));
        const stored = paystackRequests.find((entry) => entry.reference === reference);
        res.writeHead(stored ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stored
          ? { status: true, data: { status: 'success', amount: stored.amount, currency: 'NGN', reference, metadata: stored.metadata } }
          : { status: false, message: 'Not found' }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: false, message: 'Not found' }));
    });
  });
  await new Promise((resolve) => paystackServer.listen(paystackPort, '127.0.0.1', resolve));
  cleanupFns.push(() => { try { paystackServer.close(); } catch {} });

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
    PAYSTACK_API_BASE_URL: `http://127.0.0.1:${paystackPort}`,
    FRONTEND_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:3000',
    DISABLE_RATE_LIMIT: 'true',
    REQUIRE_EMAIL_VERIFICATION: switchOn ? 'true' : 'false',
    EMAIL_USER: '',
    EMAIL_PASS: '',
    EMAIL_CAPTURE_FILE: path.join(temp, 'captured-emails.jsonl'),
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
  const customerId = String(customerRegister.body.user?._id || '');
  if (switchOn) {
    const verifiedCustomer = await api(`/admin/users/${customerId}/verify-email`, {
      method: 'POST', token: adminToken,
    });
    assert(verifiedCustomer.status === 200, `admin verify customer returned ${verifiedCustomer.status}: ${verifiedCustomer.text}`);
  }

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

  // ---- 5b. Customer account area: profile fields, addresses, password ----
  const initialProfile = await api('/auth/profile', { token: customerToken });
  assert(initialProfile.status === 200, `profile read returned ${initialProfile.status}: ${initialProfile.text}`);
  assert(Array.isArray(initialProfile.body?.addresses), 'profile has no addresses array');
  assert(initialProfile.body?.notificationPreferences && typeof initialProfile.body.notificationPreferences === 'object',
    'profile has no notificationPreferences');

  const savedProfile = await api('/auth/profile', {
    method: 'PUT',
    token: customerToken,
    body: {
      name: 'Local Customer Updated',
      phone: '+2348012345678',
      addresses: [
        { label: 'Home', street: '1 Test Street', city: 'Lagos', state: 'Lagos', zipCode: '100001', isDefault: false },
        { label: 'Work', street: '2 Test Avenue', city: 'Lagos', state: 'Lagos', zipCode: '100002', isDefault: true },
      ],
      dietaryPreferences: ['halal', 'vegan'],
      notificationPreferences: { orderUpdates: false, promotions: true, loyaltyUpdates: false },
    },
  });
  assert(savedProfile.status === 200, `profile update returned ${savedProfile.status}: ${savedProfile.text}`);
  assert(savedProfile.body?.name === 'Local Customer Updated', 'profile name was not saved');
  assert(savedProfile.body?.addresses?.length === 2, 'saved addresses were not persisted');
  assert(savedProfile.body?.addresses?.[1]?.isDefault === true, 'default address was not saved');
  assert(savedProfile.body?.dietaryPreferences?.includes('halal'), 'dietary preferences were not saved');
  assert(savedProfile.body?.notificationPreferences?.orderUpdates === false
    && savedProfile.body?.notificationPreferences?.promotions === true,
    'notification preferences were not saved');

  const singleAddress = await api('/auth/profile', {
    method: 'PUT',
    token: customerToken,
    body: { addresses: [{ label: 'Only', street: '3 Sole Road', city: 'Abuja', state: 'FCT' }] },
  });
  assert(singleAddress.status === 200, `address update returned ${singleAddress.status}: ${singleAddress.text}`);
  assert(singleAddress.body?.addresses?.length === 1 && singleAddress.body.addresses[0].isDefault === true,
    'the first address is not promoted to default');

  const badPhone = await api('/auth/profile', {
    method: 'PUT', token: customerToken, body: { phone: 'not-a-phone' },
  });
  assert(badPhone.status === 400, `invalid phone returned ${badPhone.status}: ${badPhone.text}`);
  check(true, 'customer profile saves addresses, dietary and notification preferences (and validates phone)');

  const wrongPassword = await api('/auth/change-password', {
    method: 'POST', token: customerToken, body: { currentPassword: 'definitely-wrong', newPassword: testPassword('Changed') },
  });
  assert(wrongPassword.status === 400, `wrong current password returned ${wrongPassword.status}: ${wrongPassword.text}`);

  const changedPassword = testPassword('Changed');
  const passwordChange = await api('/auth/change-password', {
    method: 'POST', token: customerToken, body: { currentPassword: customerPassword, newPassword: changedPassword },
  });
  assert(passwordChange.status === 200, `password change returned ${passwordChange.status}: ${passwordChange.text}`);

  const reLogin = await api('/auth/login', {
    method: 'POST', body: { email: customerEmail, password: changedPassword },
  });
  assert(reLogin.status === 200 && reLogin.body?.token, `login with the new password returned ${reLogin.status}: ${reLogin.text}`);
  check(true, 'customer can change password and sign in with it');

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

  // ---- 7. Account recovery: forgot password -> captured email -> reset ----
  const recoveryEmail = `recovery-${Date.now()}@example.test`;
  const recoveryPassword = testPassword('Recovery');
  const recoveryUser = await User.create({
    name: 'Recovery User', email: recoveryEmail, password: recoveryPassword, role: 'customer',
  });
  cleanupFns.push(() => User.deleteOne({ _id: recoveryUser._id }).catch(() => {}));

  const preResetLogin = await api('/auth/login', {
    method: 'POST', body: { email: recoveryEmail, password: recoveryPassword },
  });
  assert(preResetLogin.status === 200 && preResetLogin.body?.refreshToken,
    `pre-reset login failed: ${preResetLogin.status} ${preResetLogin.text}`);
  const preResetRefreshToken = preResetLogin.body.refreshToken;

  const knownRequest = await api('/auth/forgot-password', {
    method: 'POST', body: { email: recoveryEmail },
  });
  const unknownRequest = await api('/auth/forgot-password', {
    method: 'POST', body: { email: `unknown-${Date.now()}@example.test` },
  });
  assert(knownRequest.status === 200 && unknownRequest.status === 200,
    `forgot-password statuses were ${knownRequest.status}/${unknownRequest.status}`);
  assert(knownRequest.body?.message === unknownRequest.body?.message,
    'known and unknown emails receive different forgot-password responses');

  const resetEmail = await waitForEmail(emailCaptureFile,
    (mail) => mail.to === recoveryEmail && /reset/i.test(mail.subject || ''));
  assert(resetEmail, 'no password reset email was captured');
  const resetLinkMatch = String(resetEmail.html || '').match(/https?:\/\/[^"'\s]+\/reset-password\/([A-Za-z0-9_-]+)/);
  assert(resetLinkMatch, 'the reset email does not contain a /reset-password/<token> link');
  const resetUrl = resetLinkMatch[0];
  const resetToken = resetLinkMatch[1];
  assert(resetUrl.startsWith('http://localhost:3000/reset-password/'),
    `the reset link is not on FRONTEND_URL: ${resetUrl}`);
  check(true, 'forgot-password emails a FRONTEND_URL reset link and treats unknown emails identically');

  const resetPassword = testPassword('Reset');
  const reset = await api(`/auth/reset-password/${resetToken}`, {
    method: 'POST', body: { password: resetPassword },
  });
  assert(reset.status === 200, `reset returned ${reset.status}: ${reset.text}`);

  const oldLogin = await api('/auth/login', {
    method: 'POST', body: { email: recoveryEmail, password: recoveryPassword },
  });
  assert(oldLogin.status === 401, `the old password still works after reset: ${oldLogin.status}`);
  const newLogin = await api('/auth/login', {
    method: 'POST', body: { email: recoveryEmail, password: resetPassword },
  });
  assert(newLogin.status === 200 && newLogin.body?.token,
    `login with the new password failed: ${newLogin.status} ${newLogin.text}`);
  check(true, 'password reset changes the password and rejects the old one');

  const reused = await api(`/auth/reset-password/${resetToken}`, {
    method: 'POST', body: { password: testPassword('Reuse') },
  });
  assert(reused.status === 400, `a reused reset link returned ${reused.status}: ${reused.text}`);

  const expiredRequest = await api('/auth/forgot-password', {
    method: 'POST', body: { email: recoveryEmail },
  });
  assert(expiredRequest.status === 200, `expired-link request returned ${expiredRequest.status}`);
  const expiredEmail = await waitForEmail(emailCaptureFile,
    (mail) => mail.to === recoveryEmail && String(mail.html || '').includes('/reset-password/'),
    resetEmail);
  assert(expiredEmail, 'no second reset email was captured');
  const expiredMatch = String(expiredEmail.html || '').match(/\/reset-password\/([A-Za-z0-9_-]+)/);
  assert(expiredMatch, 'the second reset email has no token');
  await User.updateOne({ _id: recoveryUser._id }, { $set: { resetPasswordExpires: new Date(Date.now() - 60000) } });
  const expiredReset = await api(`/auth/reset-password/${expiredMatch[1]}`, {
    method: 'POST', body: { password: testPassword('Expired') },
  });
  assert(expiredReset.status === 400, `an expired reset link returned ${expiredReset.status}: ${expiredReset.text}`);
  assert(/expired|invalid/i.test(expiredReset.body?.message || ''),
    `the expired-link message is unclear: ${expiredReset.body?.message}`);
  check(true, 'reset links are single-use and expired links fail with a clear message');

  const mfaEmail = `mfa-recovery-${Date.now()}@example.test`;
  const mfaSecret = 'JBSWY3DPEHPK3PXP';
  const mfaUser = await User.create({
    name: 'MFA Recovery User', email: mfaEmail, password: testPassword('Mfa'), role: 'customer',
    mfaEnabled: true, mfaSecret,
  });
  cleanupFns.push(() => User.deleteOne({ _id: mfaUser._id }).catch(() => {}));
  const mfaResetRequest = await api('/auth/forgot-password', {
    method: 'POST', body: { email: mfaEmail },
  });
  assert(mfaResetRequest.status === 200, `MFA reset request returned ${mfaResetRequest.status}`);
  const mfaEmailMessage = await waitForEmail(emailCaptureFile,
    (mail) => mail.to === mfaEmail && String(mail.html || '').includes('/reset-password/'));
  assert(mfaEmailMessage, 'no reset email was captured for the MFA user');
  const mfaTokenMatch = String(mfaEmailMessage.html || '').match(/\/reset-password\/([A-Za-z0-9_-]+)/);
  assert(mfaTokenMatch, 'the MFA reset email has no token');
  const mfaReset = await api(`/auth/reset-password/${mfaTokenMatch[1]}`, {
    method: 'POST', body: { password: testPassword('MfaReset') },
  });
  assert(mfaReset.status === 200, `MFA user reset returned ${mfaReset.status}: ${mfaReset.text}`);
  const mfaAfterReset = await User.findById(mfaUser._id);
  assert(mfaAfterReset?.mfaEnabled === true, 'a password reset disabled MFA');
  assert(mfaAfterReset?.mfaSecret === mfaSecret, 'a password reset cleared the MFA secret');
  check(true, 'a password reset does not disable MFA');

  const refreshAfterReset = await api('/auth/refresh', {
    method: 'POST', body: { refreshToken: preResetRefreshToken },
  });
  assert(refreshAfterReset.status === 401,
    `a pre-reset refresh token still works: ${refreshAfterReset.status}`);
  const changeLogin = await api('/auth/login', {
    method: 'POST', body: { email: recoveryEmail, password: resetPassword },
  });
  assert(changeLogin.status === 200 && changeLogin.body?.refreshToken,
    `change-password login failed: ${changeLogin.status} ${changeLogin.text}`);
  const changed = await api('/auth/change-password', {
    method: 'POST', token: changeLogin.body.token,
    body: { currentPassword: resetPassword, newPassword: testPassword('Changed') },
  });
  assert(changed.status === 200, `change-password returned ${changed.status}: ${changed.text}`);
  const refreshAfterChange = await api('/auth/refresh', {
    method: 'POST', body: { refreshToken: changeLogin.body.refreshToken },
  });
  assert(refreshAfterChange.status === 401,
    `change-password left a refresh-token family alive: ${refreshAfterChange.status}`);
  check(true, 'reset and password change revoke existing refresh-token families');

  // ---- 8. Transactional email (mock provider, captured) ----
  const waitForLog = async (filter, timeoutMs = 12000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const log = await EmailLog.findOne(filter).sort({ createdAt: -1 });
      if (log) return log;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  };

  // Trigger the remaining caller paths that the earlier scenarios did not cover.
  const acceptedOrder = await api(`/orders/restaurants/orders/${order.body.order._id}/accept`, {
    method: 'PATCH', token: ownerToken,
  });
  assert(acceptedOrder.status === 200, `order accept returned ${acceptedOrder.status}: ${acceptedOrder.text}`);
  await DeliveryConfirmationService.notifyCustomer(order.body.order, '654321');

  const rejectEmail = `reject-${Date.now()}@example.test`;
  const rejectContact = await api('/contact', {
    method: 'POST',
    body: {
      name: 'Reject Test', email: rejectEmail, phone: '+2348012345678',
      type: 'restaurant', businessName: 'Reject Kitchen', city: 'Lagos', state: 'Lagos',
    },
  });
  assert(rejectContact.status === 200, `reject contact returned ${rejectContact.status}: ${rejectContact.text}`);
  const pendingApplications = await api('/admin/applications?status=pending&limit=100', { token: adminToken });
  const rejectApplication = (pendingApplications.body?.data || []).find((row) => row.email === rejectEmail);
  assert(rejectApplication, 'reject test application was not stored');
  const rejectedApplication = await api(`/admin/applications/${rejectApplication._id}/reject`, {
    method: 'POST', token: adminToken, body: { reason: 'Test rejection' },
  });
  assert(rejectedApplication.status === 200, `application reject returned ${rejectedApplication.status}: ${rejectedApplication.text}`);

  await sendEmail({ to: 'vendor-email@example.test', ...emailTemplates.vendorApproved({ name: 'Vendor' }), type: 'vendor-approved' });
  await sendEmail({ to: 'vendor-email@example.test', ...emailTemplates.vendorRejected({ name: 'Vendor', reason: 'Test' }), type: 'vendor-rejected' });
  await sendEmail({ to: 'rider-email@example.test', ...emailTemplates.riderApproved({ name: 'Rider' }), type: 'rider-approved' });
  await sendEmail({ to: 'rider-email@example.test', ...emailTemplates.riderRejected({ name: 'Rider', reason: 'Test' }), type: 'rider-rejected' });

  const financeAddress = 'finance@example.test';
  await financialEmailJobs.sendWeeklyEarningsSummary(financeAddress, { ordersCount: 1, gross: 1000, commission: 100, net: 900 });
  await financialEmailJobs.sendSubscriptionRenewalReminder(financeAddress, { planName: 'Pro', renewalDate: '2026-01-01', amount: 5000 });
  await financialEmailJobs.sendPayoutProcessed(financeAddress, { amount: 900, bankName: 'Test Bank', accountNumber: '1234567890' });
  await financialEmailJobs.sendAdCampaignLive(financeAddress, { placement: 'Home', startDate: '2026-01-01', endDate: '2026-01-07', budget: 1000 });
  await financialEmailJobs.sendAdBudgetWarning(financeAddress, { remaining: 100 });

  const expectedEmails = [
    ['welcome', customerEmail],
    ['password-reset', recoveryEmail],
    ['partner-application-admin', process.env.EMAIL_OWNER],
    ['partner-application-received', ownerEmail],
    ['partner-approved', ownerEmail],
    ['partner-rejected', rejectEmail],
    ['order-confirmation', customerEmail],
    ['order-status', customerEmail],
    ['delivery-otp', customerEmail],
    ['vendor-approved', 'vendor-email@example.test'],
    ['vendor-rejected', 'vendor-email@example.test'],
    ['rider-approved', 'rider-email@example.test'],
    ['rider-rejected', 'rider-email@example.test'],
    ['weekly-earnings', financeAddress],
    ['subscription-reminder', financeAddress],
    ['payout-processed', financeAddress],
    ['ad-campaign-live', financeAddress],
    ['ad-budget-warning', financeAddress],
  ];
  const missingEmails = [];
  for (const [type, recipient] of expectedEmails) {
    const log = await waitForLog({ type, recipient, status: 'sent' });
    if (!log) missingEmails.push(`${type}->${recipient}`);
  }
  check(missingEmails.length === 0, 'every transactional email type is logged as sent', missingEmails.join(', '));

  const captured = readCapturedEmails(emailCaptureFile);
  const latest = (type, to) => [...captured].reverse().find((mail) => mail.type === type && mail.to === to);
  const resetMail = latest('password-reset', recoveryEmail);
  const approvedMail = latest('partner-approved', ownerEmail);
  const welcomeMail = latest('welcome', customerEmail);
  const orderMail = latest('order-confirmation', customerEmail);
  const otpMail = latest('delivery-otp', customerEmail);
  const linksOk = Boolean(
    resetMail?.html?.includes('http://localhost:3000/reset-password/')
    && resetMail?.text?.includes('http://localhost:3000/reset-password/')
    && approvedMail?.html?.includes('invite=')
    && approvedMail?.text?.includes('invite=')
    && welcomeMail?.html?.includes('/restaurants')
    && welcomeMail?.text?.includes('/restaurants')
    && orderMail?.html?.includes('/orders')
    && otpMail?.text?.includes('654321')
  );
  check(linksOk, 'emails have branded HTML, plain text and FRONTEND_URL links');

  const capturedText = JSON.stringify(captured);
  const secretValues = Object.entries(env)
    .filter(([key, value]) => /SECRET|PASSWORD|PASS|KEY|URI/.test(key) && typeof value === 'string' && value.length >= 8)
    .map(([, value]) => value);
  const leakedSecrets = secretValues.filter((value) => capturedText.includes(value));
  check(leakedSecrets.length === 0, 'captured emails contain no credentials',
    leakedSecrets.length ? `${leakedSecrets.length} leaked value(s)` : 'clean');

  await mailService.queueEmail({
    type: 'retry-test', to: 'retry@example.test', subject: 'Retry test',
    html: '<p>retry</p>', text: 'retry',
  });
  const retriedLog = await waitForLog({ type: 'retry-test', recipient: 'retry@example.test', status: 'sent' });
  check(Boolean(retriedLog && retriedLog.attempts >= 3), 'transient email failures retry with backoff',
    `attempts=${retriedLog?.attempts}`);

  const failureContact = await api('/contact', {
    method: 'POST',
    body: {
      name: 'Always Fail', email: process.env.EMAIL_MOCK_FAIL_TO, phone: '+2348012345678',
      type: 'vendor', businessName: 'Always Fail Kitchen', city: 'Lagos', state: 'Lagos',
    },
  });
  const failedEmailLog = await waitForLog({
    type: 'partner-application-received', recipient: process.env.EMAIL_MOCK_FAIL_TO, status: 'failed',
  });
  check(
    failureContact.status === 200 && Boolean(failedEmailLog && failedEmailLog.attempts >= 3),
    'a provider failure never breaks the API response and is logged',
    `api=${failureContact.status} attempts=${failedEmailLog?.attempts} error=${failedEmailLog?.errorClass}`
  );

  const sampleLog = await EmailLog.findOne({ type: 'welcome' }).lean();
  const logKeys = Object.keys(sampleLog || {});
  check(
    Boolean(sampleLog && sampleLog.provider === 'mock' && /^mock_/.test(sampleLog.providerMessageId || '')
      && !logKeys.includes('html') && !logKeys.includes('text') && !logKeys.includes('subject')),
    'EmailLog stores metadata only',
    logKeys.join(',')
  );

  // ---- 9. Email failure never breaks order creation or payment ----
  const failBuyerEmail = 'always-fail@example.test';
  const failBuyerPassword = testPassword('FailBuyer');
  const failBuyer = await api('/auth/register', {
    method: 'POST',
    body: {
      name: 'Email Fail Buyer', email: failBuyerEmail,
      password: failBuyerPassword, confirmPassword: failBuyerPassword,
    },
  });
  assert(failBuyer.status === 201, `registration with a failing email returned ${failBuyer.status}: ${failBuyer.text}`);
  const failBuyerToken = failBuyer.body.token;
  const failBuyerId = String(failBuyer.body.user?._id || '');
  if (switchOn) {
    const verifiedFailBuyer = await api(`/admin/users/${failBuyerId}/verify-email`, {
      method: 'POST', token: adminToken,
    });
    assert(verifiedFailBuyer.status === 200, `admin verify fail-buyer returned ${verifiedFailBuyer.status}: ${verifiedFailBuyer.text}`);
  }

  const payOrder = await api('/orders', {
    method: 'POST',
    token: failBuyerToken,
    body: {
      restaurantId,
      items: [{ menuItem: itemId, quantity: 1, customizations: [{ name: 'Size', option: 'Large' }] }],
      deliveryAddress: '9 Email Fail Street, Lagos',
      paymentMethod: 'card',
    },
  });
  assert(payOrder.status === 201, `order with a failing email returned ${payOrder.status}: ${payOrder.text}`);
  const payOrderId = String(payOrder.body.order._id);
  const failedConfirmation = await waitForLog({
    type: 'order-confirmation', recipient: failBuyerEmail, status: 'failed',
  });
  assert(failedConfirmation, 'the failing order-confirmation email was not logged as failed');

  const initialized = await api('/payments/initialize', {
    method: 'POST', token: failBuyerToken, body: { orderId: payOrderId },
  });
  assert(initialized.status === 200 && initialized.body?.authorizationUrl,
    `payment initialize returned ${initialized.status}: ${initialized.text}`);

  const webhookPayload = {
    event: 'charge.success',
    data: {
      status: 'success',
      reference: initialized.body.reference,
      amount: Math.round(Number(payOrder.body.order.totalAmount) * 100),
      currency: 'NGN',
      metadata: { orderId: payOrderId, userId: failBuyerId },
    },
  };
  const webhookBody = JSON.stringify(webhookPayload);
  const signature = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(webhookBody).digest('hex');
  const webhook = await api('/payments/webhook', {
    method: 'POST',
    headers: { 'x-paystack-signature': signature, 'Content-Type': 'application/json' },
    // The test helper serializes objects with JSON.stringify, which matches
    // the bytes signed above.
    body: webhookPayload,
  });
  assert(webhook.status === 200 && /processed/i.test(webhook.body?.message || ''),
    `payment webhook returned ${webhook.status}: ${webhook.text}`);
  const paidOrder = await Order.findById(payOrderId);
  assert(paidOrder && paidOrder.isPaid === true && paidOrder.paymentStatus === 'paid',
    'the order was not marked paid after the webhook');

  const failedWelcome = await waitForLog({ type: 'welcome', recipient: failBuyerEmail, status: 'failed' });
  assert(failedWelcome, 'the failing welcome email was not logged as failed');
  check(true, 'order creation, payment initialize and confirmation succeed while email fails');

  // ---- 10. Email verification (switch OFF main server, switch ON second server) ----
  const emailVerificationMigration = require(path.join(backendRoot, 'src', 'migrations', '005-email-verification.js'));
  const offHealth = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  assert(offHealth.requireEmailVerification === switchOn,
    `main server switch should be ${switchOn} (got ${offHealth.requireEmailVerification})`);
  assert(Number.isInteger(offHealth.migrationsPending) && offHealth.migrationsPending === 0,
    `main /health migrationsPending should be 0 (got ${offHealth.migrationsPending})`);
  assert(typeof offHealth.migrationsLastRun === 'string', 'main /health migrationsLastRun is missing');

  const appliedMigrations = await api('/admin/migrations', { token: adminToken });
  assert(appliedMigrations.status === 200 && Array.isArray(appliedMigrations.body?.applied),
    `admin migrations endpoint returned ${appliedMigrations.status}: ${appliedMigrations.text}`);
  const migration005 = appliedMigrations.body.applied.find((entry) => entry.name === '005-email-verification.js');
  assert(migration005, '005-email-verification.js was not applied at boot');
  check(true, 'migrations auto-ran, /health reports 0 pending, and the admin endpoint lists 005',
    `005 matched=${migration005.result?.matched} modified=${migration005.result?.modified}`);
  check(true, `REQUIRE_EMAIL_VERIFICATION is reported on /health (main=${switchOn}, second=true)`);

  const verifiedPort = port + 1;
  const verifiedEnv = {
    ...env,
    PORT: String(verifiedPort),
    REQUIRE_EMAIL_VERIFICATION: 'true',
  };
  const verifiedChild = spawn(process.execPath, [path.join(backendRoot, 'src', 'server.js')], {
    cwd: backendRoot,
    env: verifiedEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let verifiedOutput = '';
  verifiedChild.stdout.on('data', (d) => { verifiedOutput += d.toString(); });
  verifiedChild.stderr.on('data', (d) => { verifiedOutput += d.toString(); });
  cleanupFns.push(() => { try { verifiedChild.kill('SIGKILL'); } catch {} });
  let verifiedHealthy = false;
  const verifiedDeadline = Date.now() + 60000;
  while (Date.now() < verifiedDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (verifiedChild.exitCode !== null) break;
    if (await httpStatus(verifiedPort, '/health') === 200) { verifiedHealthy = true; break; }
  }
  assert(verifiedHealthy, `second server did not become healthy: ${verifiedOutput.slice(-500)}`);
  const apiVerified = makeApi(verifiedPort);
  const onHealth = await (await fetch(`http://127.0.0.1:${verifiedPort}/health`)).json();
  assert(onHealth.requireEmailVerification === true, 'second server switch should be true');

  const migrationCustomerEmail = `migration-customer-${Date.now()}@example.test`;
  const migrationCustomer = await User.create({
    name: 'Migration Customer',
    email: migrationCustomerEmail,
    password: testPassword('MigrationCustomer'),
    role: 'customer',
  });
  cleanupFns.push(() => User.deleteOne({ _id: migrationCustomer._id }).catch(() => {}));
  const migrationFirst = await emailVerificationMigration.up(mongoose.connection.db);
  const migrationSecond = await emailVerificationMigration.up(mongoose.connection.db);
  const adminAfterMigration = await User.findOne({ email: adminEmail });
  const customerAfterMigration = await User.findById(migrationCustomer._id);
  assert(adminAfterMigration?.emailVerified === true, 'migration did not verify the admin account');
  assert(customerAfterMigration?.emailVerified === false, 'migration must not verify customers');
  const migrationSecondModified = migrationSecond.modified ?? migrationSecond.nModified ?? 0;
  assert(migrationSecondModified === 0, `migration is not idempotent: ${migrationSecondModified} modified`);
  check(true, 'email verification migration marks non-customer roles only and is idempotent',
    `modified=${migrationFirst.modified ?? migrationFirst.nModified ?? 0}`);

  // Concurrent runners must apply each migration once (lock + unique journal).
  const concurrencyDb = mongoose.connection.useDb('migrations_concurrency').db;
  await concurrencyDb.collection('migrations').deleteMany({});
  await concurrencyDb.collection('migration_locks').deleteMany({});
  await Promise.all([
    migrationRunner.runPendingMigrations({ db: concurrencyDb }),
    migrationRunner.runPendingMigrations({ db: concurrencyDb }),
  ]);
  const concurrentApplied = await concurrencyDb.collection('migrations').find({}).toArray();
  const concurrentNames = concurrentApplied.map((doc) => doc.name);
  const expectedMigrationNames = migrationRunner.listMigrationFiles().map((file) => file.name);
  assert(new Set(concurrentNames).size === expectedMigrationNames.length
    && concurrentNames.length === expectedMigrationNames.length,
    `concurrent migration journal is wrong (unique=${new Set(concurrentNames).size}, total=${concurrentNames.length}, expected=${expectedMigrationNames.length})`);
  check(true, 'two simultaneous migration runs apply each migration once', `applied=${concurrentNames.length}`);

  // A failing migration is logged and left pending; the boot wrapper resolves.
  const failureDb = mongoose.connection.useDb('migrations_failure').db;
  await failureDb.collection('migrations').deleteMany({});
  await failureDb.collection('migration_locks').deleteMany({});
  const failureResult = await migrationRunner.runPendingMigrationsAtBoot({
    db: failureDb,
    files: [{ name: '999-test-failing.js', up: async () => { throw new Error('intentional test failure'); } }],
    logger: { log() {}, warn() {}, error() {} },
  });
  assert(failureResult.failed === 1 && failureResult.pending === 1,
    `failing migration result was ${JSON.stringify(failureResult)}`);
  check(true, 'a failing migration is logged and the boot run does not throw');

  const verifyEmailAddr = `verify-${Date.now()}@example.test`;
  const verifyPassword = testPassword('Verify');
  const verifyReg = await apiVerified('/auth/register', {
    method: 'POST',
    body: {
      name: 'Verify User', email: verifyEmailAddr,
      password: verifyPassword, confirmPassword: verifyPassword,
    },
  });
  assert(verifyReg.status === 201, `verification registration returned ${verifyReg.status}: ${verifyReg.text}`);
  assert(verifyReg.body?.user?.emailVerified === false, 'new customer should start unverified');
  const verifyAccessToken = verifyReg.body.token;
  const verifyMail = await waitForEmail(emailCaptureFile,
    (mail) => mail.to === verifyEmailAddr && /verify/i.test(mail.subject || ''));
  assert(verifyMail, 'verification email was not captured');
  const verifyLinkMatch = String(verifyMail.html || '').match(/https?:\/\/[^"'\s]+\/verify-email\/([A-Za-z0-9_-]+)/);
  assert(verifyLinkMatch, 'verification email has no /verify-email/<token> link');
  assert(verifyLinkMatch[0].startsWith('http://localhost:3000/verify-email/'),
    `verification link is not on FRONTEND_URL: ${verifyLinkMatch[0]}`);
  const verificationToken = verifyLinkMatch[1];

  const verifyOrderPayload = {
    restaurantId,
    items: [{ menuItem: itemId, quantity: 1, customizations: [{ name: 'Size', option: 'Large' }] }],
    deliveryAddress: '1 Verify Street, Lagos',
    paymentMethod: 'cash',
  };
  const blockedOrder = await apiVerified('/orders', {
    method: 'POST', token: verifyAccessToken, body: verifyOrderPayload,
  });
  assert(blockedOrder.status === 403 && blockedOrder.body?.code === 'EMAIL_NOT_VERIFIED',
    `unverified order should be blocked, got ${blockedOrder.status}: ${blockedOrder.text}`);
  check(true, 'unverified customer is blocked from ordering with EMAIL_NOT_VERIFIED');

  const invalidToken = await apiVerified('/auth/verify-email', {
    method: 'POST', body: { token: 'a'.repeat(64) },
  });
  assert(invalidToken.status === 400, `invalid token returned ${invalidToken.status}`);
  const tamperedToken = await apiVerified('/auth/verify-email', {
    method: 'POST',
    body: { token: verificationToken.slice(0, -1) + (verificationToken.endsWith('a') ? 'b' : 'a') },
  });
  assert(tamperedToken.status === 400, `tampered token returned ${tamperedToken.status}`);

  const verified = await apiVerified('/auth/verify-email', {
    method: 'POST', body: { token: verificationToken },
  });
  assert(verified.status === 200, `verify returned ${verified.status}: ${verified.text}`);
  const allowedOrder = await apiVerified('/orders', {
    method: 'POST', token: verifyAccessToken, body: verifyOrderPayload,
  });
  assert(allowedOrder.status === 201, `verified order returned ${allowedOrder.status}: ${allowedOrder.text}`);
  const reusedToken = await apiVerified('/auth/verify-email', {
    method: 'POST', body: { token: verificationToken },
  });
  assert(reusedToken.status === 400, `reused token returned ${reusedToken.status}`);

  const expiredEmailAddr = `expired-${Date.now()}@example.test`;
  const expiredPassword = testPassword('Expired');
  const expiredReg = await apiVerified('/auth/register', {
    method: 'POST',
    body: {
      name: 'Expired Verify', email: expiredEmailAddr,
      password: expiredPassword, confirmPassword: expiredPassword,
    },
  });
  assert(expiredReg.status === 201, `expired registration returned ${expiredReg.status}`);
  const expiredMail = await waitForEmail(emailCaptureFile,
    (mail) => mail.to === expiredEmailAddr && /verify/i.test(mail.subject || ''));
  assert(expiredMail, 'expired verification email was not captured');
  const expiredTokenMatch = String(expiredMail.html).match(/\/verify-email\/([A-Za-z0-9_-]+)/);
  assert(expiredTokenMatch, 'expired verification email has no token');
  await User.updateOne({ email: expiredEmailAddr }, { $set: { emailVerificationExpires: new Date(Date.now() - 1000) } });
  const expiredVerify = await apiVerified('/auth/verify-email', {
    method: 'POST', body: { token: expiredTokenMatch[1] },
  });
  assert(expiredVerify.status === 400 && expiredVerify.body?.code === 'EMAIL_VERIFICATION_EXPIRED',
    `expired token returned ${expiredVerify.status}: ${expiredVerify.text}`);

  const reviewEmailAddr = `resend-${Date.now()}@example.test`;
  const reviewPassword = testPassword('Resend');
  const reviewReg = await apiVerified('/auth/register', {
    method: 'POST',
    body: {
      name: 'Resend Verify', email: reviewEmailAddr,
      password: reviewPassword, confirmPassword: reviewPassword,
    },
  });
  assert(reviewReg.status === 201, `resend registration returned ${reviewReg.status}`);
  const reviewAccess = reviewReg.body.token;
  const countVerificationMails = () => EmailLog.countDocuments({ type: 'email-verification', recipient: reviewEmailAddr });
  const waitForVerificationCount = async (expected, timeoutMs = 10000) => {
    const started = Date.now();
    let count = await countVerificationMails();
    while (count < expected && Date.now() - started < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      count = await countVerificationMails();
    }
    return count;
  };

  await User.updateOne({ email: reviewEmailAddr }, {
    $set: { emailVerificationLastSentAt: new Date(Date.now() - 61000) },
  });
  const resendBefore = await countVerificationMails();
  const resend1 = await apiVerified('/auth/resend-verification', { method: 'POST', token: reviewAccess });
  const resend2 = await apiVerified('/auth/resend-verification', { method: 'POST', token: reviewAccess });
  assert(resend1.status === 200 && resend2.status === 200, 'resend responses must be 200');
  assert(resend1.body?.message === resend2.body?.message, 'resend response shapes differ');
  const resendAfter = await waitForVerificationCount(resendBefore + 1);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const resendAfterCooldown = await countVerificationMails();
  assert(resendAfter === resendBefore + 1 && resendAfterCooldown === resendBefore + 1,
    `resend cooldown did not hold (before=${resendBefore}, after=${resendAfterCooldown})`);

  await User.updateOne({ email: reviewEmailAddr }, {
    $set: {
      emailVerificationLastSentAt: new Date(Date.now() - 61000),
      emailVerificationHourlyCount: 3,
      emailVerificationHourlyWindowStart: new Date(),
    },
  });
  const capBefore = await countVerificationMails();
  await apiVerified('/auth/resend-verification', { method: 'POST', token: reviewAccess });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const capAfter = await countVerificationMails();
  assert(capAfter === capBefore, `hourly cap did not hold (before=${capBefore}, after=${capAfter})`);
  check(true, 'resend cooldown and hourly cap hold with identical responses');

  const changedEmailAddr = `changed-${Date.now()}@example.test`;
  const changedProfile = await apiVerified('/auth/profile', {
    method: 'PUT', token: verifyAccessToken, body: { email: changedEmailAddr },
  });
  assert(changedProfile.status === 200 && changedProfile.body?.emailVerified === false,
    `email change did not reset verification: ${changedProfile.status} ${changedProfile.text}`);
  const changedMail = await waitForEmail(emailCaptureFile,
    (mail) => mail.to === changedEmailAddr && /verify/i.test(mail.subject || ''));
  assert(changedMail, 'email change did not send a verification link to the new address');
  check(true, 'verify unlocks ordering; reused, expired, invalid and tampered tokens are rejected; email change resets verification');

  const failedVerificationEmail = await waitForLog({
    type: 'email-verification', recipient: failBuyerEmail, status: 'failed',
  });
  assert(failedVerificationEmail, 'verification-email failure was not logged');
  check(true, 'verification-email failure never breaks registration');

  // ---- Public promo list: live codes only, and they validate ----
  const livePromoCode = `LIVE${String(Date.now()).slice(-6)}`;
  const expiredPromoCode = `DEAD${String(Date.now()).slice(-6)}`;
  await PromoCode.create({
    code: livePromoCode,
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 2000,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await PromoCode.create({
    code: expiredPromoCode,
    discountType: 'percentage',
    discountValue: 10,
    validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });
  cleanupFns.push(() => PromoCode.deleteMany({ code: { $in: [livePromoCode, expiredPromoCode] } }).catch(() => {}));

  const promoList = await api('/promo-codes');
  assert(promoList.status === 200 && Array.isArray(promoList.body),
    `public promo list returned ${promoList.status}: ${promoList.text}`);
  const listedPromoCodes = promoList.body.map((promo) => promo.code);
  assert(listedPromoCodes.includes(livePromoCode) && !listedPromoCodes.includes(expiredPromoCode),
    `public promo list is wrong: ${JSON.stringify(listedPromoCodes)}`);
  const liveValidation = await api('/promo-codes/validate', { method: 'POST', body: { code: livePromoCode } });
  assert(liveValidation.status === 200 && liveValidation.body?.valid === true,
    `live promo did not validate: ${liveValidation.status} ${liveValidation.text}`);
  const expiredValidation = await api('/promo-codes/validate', { method: 'POST', body: { code: expiredPromoCode } });
  assert(expiredValidation.body?.valid === false, 'an expired promo validated');
  check(true, 'public promo list returns live codes only and they validate', `live=${livePromoCode}`);

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
