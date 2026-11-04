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
let ownRestaurantId = null;

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

  await requestStep('production seed routes are not mounted', async () => {
    const result = await api('/seed/init');
    assert(result.status === 404, `seed returned ${result.status}: ${result.text}`);
    return '404';
  });

  // ---- Registration API contract ----
  let registeredUserId = null;
  const registerEmail = `e2e-register-${Date.now()}@example.com`;
  const registerPassword = 'E2eStrong1!';

  await requestStep('register API: success returns a session (email is fire-and-forget)', async () => {
    const started = Date.now();
    const result = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'E2E Register',
        email: registerEmail,
        phone: '+2348012345678',
        password: registerPassword,
        confirmPassword: registerPassword,
        dietaryPreferences: ['Halal'],
      },
    });
    const elapsed = Date.now() - started;
    assert(result.status === 201, `register returned ${result.status}: ${result.text}`);
    assert(result.body?.token, 'register returned no token');
    assert(
      result.response.headers.get('access-control-allow-origin') === ORIGIN,
      'register 201 missing ACAO'
    );
    registeredUserId = result.body?.user?._id || result.body?.user?.id || null;
    // The welcome email is dispatched fire-and-forget (SMTP client has 10-15s
    // timeouts). Registration latency itself is dominated by bcrypt hashing,
    // so allow cold-start headroom; the warm call below is the tighter bound.
    assert(elapsed < 12000, `register took ${elapsed}ms — cold start or blocking work`);

    const warmStarted = Date.now();
    const warm = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'E2E Register Warm',
        email: `e2e-register-warm-${Date.now()}@example.com`,
        password: registerPassword,
        confirmPassword: registerPassword,
      },
    });
    const warmElapsed = Date.now() - warmStarted;
    assert(warm.status === 201, `warm register returned ${warm.status}: ${warm.text}`);
    assert(warmElapsed < 8000, `warm register took ${warmElapsed}ms — email is blocking the response`);
    const warmUserId = warm.body?.user?._id || warm.body?.user?.id;
    if (warmUserId) {
      await api(`/users/${warmUserId}`, { method: 'DELETE', token: tokens.admin });
    }
    return `201 in ${elapsed}ms (cold) / ${warmElapsed}ms (warm), user=${(registeredUserId || '').slice(-6)}`;
  });

  await requestStep('register API: duplicate email returns 409 with ACAO', async () => {
    const result = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Dup', email: registerEmail, password: registerPassword, confirmPassword: registerPassword },
    });
    assert(result.status === 409, `duplicate register returned ${result.status}: ${result.text}`);
    assert(/already exists/i.test(result.body?.message || ''), `unclear duplicate message: ${result.text}`);
    assert(
      result.response.headers.get('access-control-allow-origin') === ORIGIN,
      'duplicate 409 missing ACAO'
    );
    return '409 + clear message + ACAO';
  });

  await requestStep('register API: weak password and bad phone are rejected clearly', async () => {
    const weak = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Weak', email: `weak-${Date.now()}@example.com`, password: 'password', confirmPassword: 'password' },
    });
    assert(weak.status === 400, `weak password returned ${weak.status}`);
    assert(/password must/i.test(weak.body?.message || ''), `unclear weak-password error: ${weak.text}`);

    const badPhone = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Bad Phone',
        email: `phone-${Date.now()}@example.com`,
        phone: '12345',
        password: registerPassword,
        confirmPassword: registerPassword,
      },
    });
    assert(badPhone.status === 400, `bad phone returned ${badPhone.status}`);
    assert(/phone/i.test(badPhone.body?.message || ''), `unclear phone error: ${badPhone.text}`);
    return '400 weak password + 400 bad phone';
  });

  await requestStep('register API: limiter 429 carries CORS and a retry window', async () => {
    // Probe from the real client IP. Render's edge treats forged
    // X-Forwarded-For inconsistently across instances (split buckets), which
    // makes a spoofed probe flaky. This intentionally consumes the auth budget
    // for ~15 min; every auth-dependent check above already ran.
    const probeEmail = `limiter-register-${Date.now()}@example.com`;
    let saw429 = null;
    let probeUserId = null;
    for (let attempt = 0; attempt < 26; attempt += 1) {
      const result = await api('/auth/register', {
        method: 'POST',
        body: {
          name: 'Limiter Probe',
          email: probeEmail,
          password: registerPassword,
          confirmPassword: registerPassword,
        },
      });
      if (result.status === 201) {
        probeUserId = result.body?.user?._id || result.body?.user?.id || null;
      }
      if (result.status === 429) {
        saw429 = result;
        break;
      }
    }
    assert(saw429, 'register limiter never returned 429');
    assert(
      saw429.response.headers.get('access-control-allow-origin') === ORIGIN,
      'register 429 missing ACAO'
    );
    assert(/try again in \d+ minute/i.test(saw429.body?.message || ''), `429 lacks retry window: ${saw429.text}`);

    if (probeUserId) {
      await api(`/users/${probeUserId}`, { method: 'DELETE', token: tokens.admin });
    }
    return '429 + ACAO + retry minutes';
  });

  await requestStep('admin cleanup deletes the registered test account', async () => {
    assert(registeredUserId, 'no registered user id to clean up');
    const deleted = await api(`/users/${registeredUserId}`, {
      method: 'DELETE',
      token: tokens.admin,
    });
    assert(deleted.status === 200, `cleanup returned ${deleted.status}: ${deleted.text}`);
    assert(['deleted', 'deactivated'].includes(deleted.body?.mode), `unexpected cleanup mode: ${deleted.text}`);
    return `mode=${deleted.body.mode}`;
  });

  // ---- Paid plans cannot be activated without a verified Paystack payment ----
  await requestStep('paid plan activation without verified payment is rejected', async () => {
    const plans = await api('/subscriptions/plans?type=restaurant');
    assert(plans.status === 200, `plans returned ${plans.status}`);
    const paid = (plans.body?.plans || []).find((p) => Number(p.price) > 0);
    assert(paid, 'no paid restaurant plan found');
    assert(paid._id, 'paid plan has no id');

    const noRef = await api('/subscriptions/activate', {
      method: 'POST',
      token: tokens.restaurant,
      body: { planId: paid._id },
    });
    assert(noRef.status === 402, `activate without ref returned ${noRef.status}: ${noRef.text}`);

    const fakeRef = await api('/subscriptions/activate', {
      method: 'POST',
      token: tokens.restaurant,
      body: { planId: paid._id, paystackRef: 'test_ref' },
    });
    assert(fakeRef.status === 402, `activate with test_ref returned ${fakeRef.status}: ${fakeRef.text}`);

    const audit = await api('/subscriptions/admin/audit-activations', {
      method: 'POST',
      token: tokens.admin,
      body: {},
    });
    assert(audit.status === 200, `audit returned ${audit.status}: ${audit.text}`);
    const offenders = (audit.body?.offenders || []).map((o) => o.id).join(',') || 'none';
    return `402 no-ref, 402 test_ref, audit deactivated=${audit.body?.deactivated ?? '?'} ids=${offenders}`;
  });

  // ---- Invite-only partner registration ----
  await requestStep('partner registration without an invitation is rejected', async () => {
    const vendor = await api('/vendors/register', {
      method: 'POST',
      body: { businessName: 'No Invite Vendor', ownerName: 'X', email: `noinvite-${Date.now()}@example.com`, password: 'NoInvite1!', phone: '+2348012345678', location: { type: 'Point', coordinates: [3.4, 6.5] } },
    });
    assert([401, 403].includes(vendor.status), `vendor no-token returned ${vendor.status}: ${vendor.text}`);

    const restaurant = await api('/restaurants/register', {
      method: 'POST',
      body: { name: 'No Invite Restaurant', email: `noinvite-r-${Date.now()}@example.com`, password: 'NoInvite1!', phone: '+2348012345678', location: { type: 'Point', coordinates: [3.4, 6.5] } },
    });
    assert([401, 403].includes(restaurant.status), `restaurant no-token returned ${restaurant.status}: ${restaurant.text}`);

    const company = await api('/delivery-company/register', {
      method: 'POST',
      body: { companyName: 'No Invite Co', email: `noinvite-c-${Date.now()}@example.com`, password: 'NoInvite1!', phone: '+2348012345678' },
    });
    assert([401, 403].includes(company.status), `company no-token returned ${company.status}: ${company.text}`);
    return 'vendor/restaurant/company all 401/403';
  });

  const inviteEmail = `invite-e2e-${Date.now()}@example.com`;
  let vendorInviteToken = null;
  await requestStep('admin approves a /contact application and issues an invite', async () => {
    const contact = await api('/contact', {
      method: 'POST',
      body: {
        name: 'Invite E2E', email: inviteEmail, phone: '+2348012345678',
        type: 'vendor', businessName: 'Invite E2E Kitchen', city: 'Lagos', state: 'Lagos',
        message: 'e2e invitation test',
      },
    });
    assert(contact.status === 200, `contact returned ${contact.status}: ${contact.text}`);

    const listed = await api('/admin/applications?status=pending&limit=100', { token: tokens.admin });
    assert(listed.status === 200, `applications list returned ${listed.status}`);
    const application = (listed.body?.data || []).find((a) => a.email === inviteEmail);
    assert(application, 'application was not stored');

    const approved = await api(`/admin/applications/${application._id}/approve`, {
      method: 'POST',
      token: tokens.admin,
      body: {},
    });
    assert(approved.status === 200, `approve returned ${approved.status}: ${approved.text}`);
    assert(approved.body?.inviteUrl, 'approve returned no inviteUrl');
    const token = new URL(approved.body.inviteUrl).searchParams.get('invite');
    assert(token, 'invite URL has no token');
    vendorInviteToken = token;
    return `application=${application._id} invite issued`;
  });

  await requestStep('used and expired invitation tokens are rejected', async () => {
    // Expired: create a second application, approve with a 1s TTL, wait it out.
    const email = `invite-expired-${Date.now()}@example.com`;
    await api('/contact', {
      method: 'POST',
      body: { name: 'Expired E2E', email, phone: '+2348012345678', type: 'vendor', businessName: 'Expired E2E Kitchen', city: 'Lagos', state: 'Lagos' },
    });
    const listed = await api('/admin/applications?status=pending&limit=100', { token: tokens.admin });
    const application = (listed.body?.data || []).find((a) => a.email === email);
    assert(application, 'expired-test application was not stored');
    const approved = await api(`/admin/applications/${application._id}/approve`, {
      method: 'POST',
      token: tokens.admin,
      body: { expiresInSeconds: 1 },
    });
    assert(approved.status === 200, `expired approve returned ${approved.status}`);
    const expiredToken = new URL(approved.body.inviteUrl).searchParams.get('invite');
    await new Promise((r) => setTimeout(r, 1500));

    const expired = await api('/vendors/register', {
      method: 'POST',
      body: {
        businessName: 'Expired Vendor', ownerName: 'X', email,
        password: 'Expired1!', phone: '+2348012345678',
        location: { type: 'Point', coordinates: [3.4, 6.5] },
        invitationToken: expiredToken,
      },
    });
    assert(expired.status === 403, `expired token returned ${expired.status}: ${expired.text}`);
    assert(/expired/i.test(expired.body?.message || ''), `unclear expired message: ${expired.text}`);
    return 'expired token 403';
  });

  await requestStep('fresh invitation registers a vendor, then cannot be reused', async () => {
    const email = inviteEmail;
    const register = await api('/vendors/register', {
      method: 'POST',
      body: {
        businessName: 'E2E Invited Kitchen',
        ownerName: 'Invite E2E',
        email,
        password: 'Invited1!',
        phone: '+2348012345678',
        address: { street: '1 Test Road', city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
        cuisine: ['Nigerian'],
        cookingDays: ['Saturday'],
        location: { type: 'Point', coordinates: [3.4, 6.5] },
        invitationToken: vendorInviteToken,
      },
    });
    assert(register.status === 201, `invited register returned ${register.status}: ${register.text}`);
    assert(register.body?.token, 'invited register returned no session');

    const reuse = await api('/vendors/register', {
      method: 'POST',
      body: {
        businessName: 'E2E Invited Kitchen Again',
        ownerName: 'Invite E2E',
        email: `reuse-${Date.now()}@example.com`,
        password: 'Invited1!',
        phone: '+2348012345678',
        location: { type: 'Point', coordinates: [3.4, 6.5] },
        invitationToken: vendorInviteToken,
      },
    });
    assert(reuse.status === 403 || reuse.status === 409, `reused token returned ${reuse.status}: ${reuse.text}`);
    return '201 fresh, reuse rejected';
  });

  await requestStep('restaurant registration requires CAC/RC/TIN documents', async () => {
    // Issue a restaurant invitation.
    const email = `invite-restaurant-${Date.now()}@example.com`;
    await api('/contact', {
      method: 'POST',
      body: { name: 'Restaurant E2E', email, phone: '+2348012345678', type: 'restaurant', businessName: 'Docs Required Restaurant', city: 'Lagos', state: 'Lagos' },
    });
    const listed = await api('/admin/applications?status=pending&limit=100', { token: tokens.admin });
    const application = (listed.body?.data || []).find((a) => a.email === email);
    assert(application, 'restaurant application was not stored');
    const approved = await api(`/admin/applications/${application._id}/approve`, {
      method: 'POST', token: tokens.admin, body: {},
    });
    assert(approved.status === 200, `restaurant approve returned ${approved.status}`);
    const token = new URL(approved.body.inviteUrl).searchParams.get('invite');

    const noDocs = await api('/restaurants/register', {
      method: 'POST',
      body: {
        name: 'Docs Required Restaurant', email, password: 'Restaurant1!', phone: '+2348012345678',
        location: { type: 'Point', coordinates: [3.4, 6.5] }, invitationToken: token,
      },
    });
    assert(noDocs.status === 400, `restaurant without docs returned ${noDocs.status}: ${noDocs.text}`);

    const withDocs = await api('/restaurants/register', {
      method: 'POST',
      body: {
        name: 'Docs Required Restaurant', email, password: 'Restaurant1!', phone: '+2348012345678',
        location: { type: 'Point', coordinates: [3.4, 6.5] }, invitationToken: token,
        tinNumber: 'TIN-E2E-123', rcNumber: 'RC-E2E-123',
        documents: { cacCertificate: { url: '/api/v2/restaurants/docs/fake-cac.pdf' }, governmentApproval: null },
      },
    });
    assert(withDocs.status === 201, `restaurant with docs returned ${withDocs.status}: ${withDocs.text}`);
    assert(/pending_verification/i.test(JSON.stringify(withDocs.body?.restaurant || {})), 'restaurant is not pending verification');
    return '400 without docs, 201 pending with docs';
  });

  // ---- CORS: exact allowlist, allowed origins only ----
  const allowedMatrixOrigins = [
    ['E2E origin', ORIGIN],
    ['vibechops.com', 'https://vibechops.com'],
    ['www.vibechops.com', 'https://www.vibechops.com'],
  ];
  const deniedMatrixOrigins = [
    ['evil.vercel.app', 'https://evil.vercel.app'],
    ['vibechops.com.evil.com', 'https://vibechops.com.evil.com'],
    ['http://vibechops.com', 'http://vibechops.com'],
  ];

  await requestStep('CORS grants every allowed origin (GET + preflight)', async () => {
    for (const [label, origin] of allowedMatrixOrigins) {
      const plain = await api('/restaurants?limit=1', { headers: { Origin: origin } });
      assert(plain.status === 200, `${label} GET returned ${plain.status}`);
      assert(
        plain.response.headers.get('access-control-allow-origin') === origin,
        `${label} GET ACAO was ${(plain.response.headers.get('access-control-allow-origin') || '(missing)')}`
      );
      const pre = await fetch(`${API}/restaurants?limit=1`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
        },
      });
      assert(pre.status === 204, `${label} preflight returned ${pre.status}`);
      assert(
        pre.headers.get('access-control-allow-origin') === origin,
        `${label} preflight ACAO was ${(pre.headers.get('access-control-allow-origin') || '(missing)')}`
      );
    }
    return `${allowedMatrixOrigins.length} origins × GET+preflight`;
  });

  await requestStep('CORS denies bad origins and suffix spoofs (GET + preflight)', async () => {
    for (const [label, origin] of deniedMatrixOrigins) {
      const plain = await api('/restaurants?limit=1', { headers: { Origin: origin } });
      assert(plain.status === 200, `${label} GET unexpected status ${plain.status} (non-browser only rule)`);
      assert(
        !plain.response.headers.get('access-control-allow-origin'),
        `${label} GET was granted ACAO!`
      );
      const pre = await fetch(`${API}/restaurants?limit=1`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
        },
      });
      assert(pre.status === 403, `${label} preflight returned ${pre.status}, expected 403`);
      assert(
        !pre.headers.get('access-control-allow-origin'),
        `${label} preflight was granted ACAO!`
      );
    }
    return `${deniedMatrixOrigins.length} origins denied on GET+preflight`;
  });

  await requestStep('CORS headers survive error statuses (401/403/404/400-500) for allowed origin', async () => {
    const unauth = await api('/orders');
    assert(unauth.status === 401, `unauth orders returned ${unauth.status}`);
    assert(
      unauth.response.headers.get('access-control-allow-origin') === ORIGIN,
      '401 missing ACAO for allowed origin'
    );

    const forbidden = await api('/wallet/credit', {
      method: 'POST', token: tokens.customer, body: { amount: 1000 },
    });
    assert(forbidden.status === 403, `customer wallet credit returned ${forbidden.status}`);
    assert(
      forbidden.response.headers.get('access-control-allow-origin') === ORIGIN,
      '403 missing ACAO for allowed origin'
    );

    const notFound = await api('/route/that/does/not/exist');
    assert(notFound.status === 404, `unknown route returned ${notFound.status}`);
    assert(
      notFound.response.headers.get('access-control-allow-origin') === ORIGIN,
      '404 missing ACAO for allowed origin'
    );

    // Malformed JSON short-circuits body-parser; the error response must still
    // carry the CORS grant.
    const malformed = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: '{"email":',
    });
    assert([400, 500].includes(malformed.status), `malformed JSON returned ${malformed.status}`);
    assert(
      malformed.headers.get('access-control-allow-origin') === ORIGIN,
      `${malformed.status} missing ACAO for allowed origin`
    );
    return '401/403/404/400-500 all carry ACAO';
  });

  // ---- Tenant isolation: business A must not touch business B's data ----
  await requestStep('tenant: restaurant reads own analytics baseline', async () => {
    const me = await api('/analytics/me', { token: tokens.restaurant });
    assert(me.status === 200, `analytics/me returned ${me.status}: ${me.text}`);
    const id = me.body?.data?.restaurantId;
    assert(!!id, 'analytics/me returned no restaurantId');
    ownRestaurantId = String(id);
    return `restaurantId=${ownRestaurantId}`;
  });

  const notOwn = {};
  await requestStep('tenant: pick a foreign restaurant and vendor', async () => {
    const list = await api('/restaurants?limit=50');
    assert(list.status === 200, `restaurants list returned ${list.status}`);
    const foreign = (list.body?.restaurants || list.body?.data || list.body || [])
      .map((r) => ({ id: r._id || r.id, name: r.name }))
      .find((r) => r.id && String(r.id) !== String(ownRestaurantId));
    assert(!!foreign, 'no foreign restaurant found in public list');
    notOwn.restaurantId = String(foreign.id);
    notOwn.restaurantName = foreign.name;

    const vendors = await api('/vendors?limit=50');
    assert(vendors.status === 200, `vendors list returned ${vendors.status}`);
    const anyVendor = (vendors.body?.vendors || vendors.body?.data || vendors.body || [])[0];
    assert(anyVendor?._id || anyVendor?.id, 'no vendor found in public list');
    notOwn.vendorName = anyVendor.businessName || anyVendor.name;
    return `restaurant=${notOwn.restaurantName}`;
  });

  await requestStep('tenant: restaurant A denied analytics for B', async () => {
    for (const path of [
      `/analytics/dashboard?restaurantId=${notOwn.restaurantId}`,
      `/analytics/menu-performance?restaurantId=${notOwn.restaurantId}`,
      `/analytics/summary?restaurantId=${notOwn.restaurantId}`,
    ]) {
      const result = await api(path, { token: tokens.restaurant });
      assert(result.status === 403, `${path} returned ${result.status} (expected 403)`);
      assert(
        result.response.headers.get('access-control-allow-origin') === ORIGIN,
        `${path} missing ACAO`
      );
    }
    return 'dashboard/menu-performance/summary all 403';
  });

  await requestStep('tenant: restaurant A denied promotions for B', async () => {
    const read = await api(`/restaurant-promotions?restaurantId=${notOwn.restaurantId}`, {
      token: tokens.restaurant,
    });
    assert(read.status === 403, `promotions read returned ${read.status} (expected 403)`);

    const create = await api('/restaurant-promotions', {
      method: 'POST',
      token: tokens.restaurant,
      body: {
        restaurantId: notOwn.restaurantId,
        name: 'E2E Tenant Escape',
        discountType: 'percentage',
        discountValue: 10,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(create.status === 403, `promotions create returned ${create.status} (expected 403)`);

    const update = await api(`/restaurants/${notOwn.restaurantId}/pod-config`, {
      method: 'PUT',
      token: tokens.restaurant,
      body: { enabled: false },
    });
    assert(update.status === 403, `foreign pod-config returned ${update.status} (expected 403)`);
    return 'read/create/pod-config all 403';
  });

  await requestStep('tenant: restaurant A denied vendor forecast for B', async () => {
    const list = await api('/vendors?limit=50');
    const anyVendorId = String(
      (list.body?.vendors || list.body?.data || [])[0]?._id || ''
    );
    const result = await api(
      `/vendor-forecast/demand-forecast?vendorId=${anyVendorId}`,
      { token: tokens.restaurant }
    );
    assert(result.status === 403, `demand-forecast returned ${result.status} (expected 403)`);
    return `vendorId=${anyVendorId.slice(0, 8)}… 403`;
  });

  await requestStep('tenant: earnings ledger is per-restaurant', async () => {
    const earnings = await api('/earnings/restaurants/earnings', { token: tokens.restaurant });
    assert(earnings.status === 200, `earnings returned ${earnings.status}: ${earnings.text}`);
    const rows = earnings.body?.earnings || earnings.body?.data || [];
    const ownOrders = await api('/orders/restaurants/orders?limit=100', { token: tokens.restaurant });
    assert(ownOrders.status === 200, `restaurant orders returned ${ownOrders.status}`);
    const ownOrderIds = new Set((ownOrders.body?.data || ownOrders.body?.orders || []).map((o) => String(o._id)));
    const leaks = rows.filter((row) => !ownOrderIds.has(String(row.orderId)));
    assert(leaks.length === 0, `earnings leaked rows for other restaurants: ${leaks.length}`);
    return `${rows.length} row(s), all from own orders`;
  });

  // ---- Limiter XFF-rotation: per-email lockout must survive IP spoofing ----
  await requestStep('forged X-Forwarded-For does not bypass the per-account lockout', async () => {
    // Try a couple of fresh spoofed buckets: Render instances may keep the
    // real-IP bucket locked from earlier tests, which would otherwise look
    // like an immediate lockout.
    const email = `limiter-xff-${Date.now()}@example.com`;
    const attemptBucket = async (base) => {
      for (let attempt = 0; attempt < 14; attempt += 1) {
        // A DIFFERENT forged XFF entry per attempt: without email-global
        // counting each attempt would get a fresh per-(IP, email) bucket, and
        // the IP backstop would never trip either (still under 20 total).
        const forgeIp = `${base}.${(attempt * 7 + 3) % 250}`;
        const result = await api('/auth/login', {
          method: 'POST',
          headers: { 'X-Forwarded-For': forgeIp },
          body: { email, password: 'definitely-not-the-password' },
        });
        assert([401, 429].includes(result.status), `probe returned ${result.status}`);
        assert(
          result.response.headers.get('access-control-allow-origin') === ORIGIN,
          `attempt ${attempt} missing ACAO`
        );
        if (result.status === 429) {
          assert(
            /try again in \d+ minutes/i.test(result.body?.message || ''),
            `429 lacks retry window: ${result.text}`
          );
          return attempt;
        }
        // Give the async res.on('finish') accounting a beat to run.
        await new Promise((r) => setTimeout(r, 150));
      }
      return -1;
    };

    let first429At = await attemptBucket('198.18.10');
    if (first429At === 0) {
      // The bucket was already exhausted before the test started; retry with a
      // different spoofed range to get a clean signal.
      first429At = await attemptBucket('198.18.20');
    }
    assert(first429At !== -1, 'per-email lockout never tripped after 14 rotated-IP failures');
    return first429At === 0
      ? '429 immediately (bucket pre-locked) — rotating XFF did not bypass it'
      : `429 at rotated-IP attempt ${first429At + 1} (distinct XFF per attempt)`;
  });

  // Trigger the login limiter on a throwaway spoofed IP (trusted-proxy mode)
  // so the shared production IP budget is never consumed by the test itself.
  // The limiter allows 20 attempts on the same IP (skipSuccessfulRequests is on),
  // so push just past 22 failures to confirm the 429 + retry window + ACAO.
  await requestStep('login limiter 429 carries ACAO and the lockout message', async () => {
    const spoofIp = `203.0.113.${10 + (Date.now() % 200)}`;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const result = await api('/auth/login', {
        method: 'POST',
        headers: { 'X-Forwarded-For': spoofIp },
        body: { email: `limiter-e2e-${spoofIp}@example.com`, password: 'definitely-not-it' },
      });
      assert([401, 429].includes(result.status), `limiter probe returned ${result.status}`);
      assert(
        result.response.headers.get('access-control-allow-origin') === ORIGIN,
        `probe ${result.status} missing ACAO for allowed origin`
      );
      if (result.status === 429) {
        assert(
          /too many.*(attempts|login)/i.test(result.body?.message || ''),
          `429 message was: ${result.text}`
        );
        assert(
          /try again in \d+ minutes/i.test(result.body?.message || ''),
          `429 message lacks the retry window: ${result.text}`
        );
        return `429 after ${attempt + 1} failed attempts — ACAO + retry window OK`;
      }
    }
    throw new Error('login limiter did not trip after 24 failed attempts');
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
