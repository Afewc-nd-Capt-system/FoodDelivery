'use strict';

/**
 * Production smoke test for the customer and operations UI.
 *
 * Usage:
 *   BASE_URL=https://vibechops.com npm run test:smoke
 *
 * Optional:
 *   SMOKE_API_URL  direct API root (defaults to the Render API)
 *   SMOKE_BYPASS   Vercel protection bypass token, only for protected previews
 *   CHROME_PATH    Chrome/Chromium executable (defaults to the Windows Chrome path)
 *
 * The test deliberately asserts that the deployed frontend talks to the direct
 * Render API, not the same-origin /api proxy. That catches a bad
 * NEXT_PUBLIC_API_URL before launch.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const dotenv = require('dotenv');
const { authenticator } = require('otplib');

dotenv.config({ path: path.join(__dirname, '..', '.env.e2e') });

const BASE = (process.env.BASE_URL || process.env.SMOKE_BASE || 'https://vibechops.com').replace(/\/+$/, '');
const API_V2 = (
  process.env.SMOKE_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'https://vibechops.onrender.com/api/v2'
).replace(/\/+$/, '').replace(/\/v2$/, '') + '/v2';
const API_ORIGIN = new URL(API_V2).origin;
const BYPASS = (process.env.SMOKE_BYPASS || '').trim();
const CHROME_PATH = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail).slice(0, 400) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${String(detail).slice(0, 300)}` : ''}`);
}

const roles = [
  ['admin', 'admin', '/admin/login', process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD],
  ['customer', 'customer', '/login', process.env.E2E_CUSTOMER_EMAIL, process.env.E2E_CUSTOMER_PASSWORD],
  ['vendor', 'vendor', '/vendor-login', process.env.E2E_VENDOR_EMAIL, process.env.E2E_VENDOR_PASSWORD],
  ['restaurant', 'restaurant', '/restaurant-login', process.env.E2E_RESTAURANT_EMAIL, process.env.E2E_RESTAURANT_PASSWORD],
  ['rider', 'delivery_rider', '/rider-login', process.env.E2E_RIDER_EMAIL, process.env.E2E_RIDER_PASSWORD],
  ['delivery', 'delivery_company', '/delivery-company-login', process.env.E2E_DELIVERY_EMAIL, process.env.E2E_DELIVERY_PASSWORD],
];

const consoleErrors = [];
const failedRequests = [];
const apiRequests = [];

async function newPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: BYPASS
      ? {
        'x-vercel-protection-bypass': BYPASS,
        'x-vercel-set-bypass-cookie': 'true',
      }
      : {},
  });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
  });
  page.on('request', (req) => {
    const url = req.url();
    if (/\/api\/v2\//.test(url)) apiRequests.push(url);
  });
  return { context, page };
}

async function login(page, loginPath, email, password) {
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt') {
      const secret = (process.env.E2E_ADMIN_TOTP_SECRET || '').replace(/\s+/g, '').toUpperCase();
      await dialog.accept(authenticator.generate(secret));
    } else {
      await dialog.accept();
    }
  });

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const res = await page.goto(BASE + loginPath, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!res || res.status() >= 400) throw new Error(`login page status ${res && res.status()}`);
    await page.waitForTimeout(1200);
    await page.fill('input[type=email]', email);
    await page.fill('input[type=password]', password);
    await page.click('button');

    let state = null;
    // Render can take several seconds to answer a cold login request. Poll for
    // up to 60s per attempt instead of failing while the button still says
    // "Signing in...".
    for (let i = 0; i < 120; i += 1) {
      await page.waitForTimeout(500);
      state = await page
        .evaluate(() => ({
          url: location.pathname,
          token: !!localStorage.getItem('token'),
          role: localStorage.getItem('userRole'),
          text: document.body.innerText.slice(0, 400),
        }))
        .catch(() => null);
      if (state && (state.token || /failed|invalid|incorrect|error/i.test(state.text))) break;
    }
    if (state && state.token) return state;
    if (attempt === 2) return state || { url: 'unknown', token: false, role: null, text: 'evaluation failed' };
  }
}

function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

// Navigate and let the app settle, but never fail a page check solely because
// a long-lived request (polling, sockets, analytics) keeps networkidle open.
async function gotoPage(page, url, timeout = 60000) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  return response;
}

async function fetchRestaurants() {
  const response = await fetch(`${API_V2}/restaurants?limit=50`, {
    headers: { Origin: BASE },
  });
  if (!response.ok) throw new Error(`restaurants API returned ${response.status}`);
  const body = await response.json();
  return body.restaurants || body.data || body;
}

(async () => {
  console.log(`Smoke target: ${BASE}`);
  console.log(`Direct API:   ${API_V2}`);

  const launchOptions = { headless: true };
  if (fs.existsSync(CHROME_PATH)) launchOptions.executablePath = CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  const sessions = {};

  // ---- Six logins ----
  for (const [role, expectedRole, loginPath, email, password] of roles) {
    if (!email || !password) {
      check(`login ${role}`, false, 'missing credentials');
      continue;
    }
    const { context, page } = await newPage(browser);
    try {
      const state = await login(page, loginPath, email, password);
      const ok = state.token && state.role === expectedRole;
      check(`login ${role}`, ok, `path=${state.url} role=${state.role} token=${state.token}`);
      if (!ok) check(`login ${role} body`, false, state.text.replace(/\s+/g, ' '));
      sessions[role] = { context, page };
    } catch (error) {
      check(`login ${role}`, false, error.message);
      await context.close();
    }
  }

  // ---- Admin tabs ----
  if (sessions.admin) {
    const { page } = sessions.admin;
    const tabs = [
      ['/admin/dashboard', 'Dashboard'],
      ['/admin/restaurants', 'Restaurants'],
      ['/admin/companies', 'Companies'],
      ['/admin/revenue', 'Revenue'],
      ['/users', 'Users'],
    ];
    for (const [pathname, label] of tabs) {
      try {
        const res = await gotoPage(page, BASE + pathname);
        const text = await bodyText(page);
        const bad = /failed to fetch|something went wrong|unauthorized|access denied/i.test(text);
        check(`admin tab ${label} (${pathname})`, res && res.status() === 200 && !bad, `status=${res && res.status()} chars=${text.length}`);
      } catch (error) {
        check(`admin tab ${label} (${pathname})`, false, error.message);
      }
    }
  }

  // ---- Restaurants list, required-option modal, add to cart ----
  let cartItem = null;
  if (sessions.customer) {
    const { page } = sessions.customer;
    try {
      const res = await gotoPage(page, BASE + '/restaurants');
      const text = await bodyText(page);
      check('restaurants list loads', res && res.status() === 200 && text.length > 200, `status=${res && res.status()} chars=${text.length}`);

      const restaurants = await fetchRestaurants();
      check('restaurants API returns data', Array.isArray(restaurants) && restaurants.length > 0, `count=${Array.isArray(restaurants) ? restaurants.length : 0}`);

      const withRequiredOptions = (Array.isArray(restaurants) ? restaurants : [])
        .map((restaurant) => ({
          restaurant,
          item: (restaurant.menu || []).find(
            (menuItem) => (menuItem.customizationOptions || []).some(
              (group) => group.required && (group.options || []).length
            )
          ),
        }))
        .find((entry) => entry.item);

      check('restaurant with required option exists', !!withRequiredOptions,
        withRequiredOptions ? `${withRequiredOptions.restaurant.name} / ${withRequiredOptions.item.name}` : 'none');

      if (withRequiredOptions) {
        const { restaurant, item } = withRequiredOptions;
        const detail = await gotoPage(page, `${BASE}/restaurant/${restaurant._id}`);
        const detailText = await bodyText(page);
        const bad = /something went wrong|restaurant not found/i.test(detailText);
        check('restaurant menu page loads', detail && detail.status() === 200 && !bad && detailText.length > 200,
          `name=${restaurant.name} chars=${detailText.length}`);

        await page.getByText(item.name, { exact: true }).first().click();
        await page.waitForTimeout(1500);
        const modalText = await bodyText(page);
        check('menu item modal opens', /Add to Cart|Special Instructions|Quantity/i.test(modalText), `item=${item.name}`);

        const requiredGroups = (item.customizationOptions || []).filter(
          (group) => group.required && (group.options || []).length
        );
        for (const group of requiredGroups) {
          const option = group.options[0];
          const radio = page.locator(`input[type=radio][name="${group.name}"]`).first();
          if (await radio.count()) {
            await radio.evaluate((element) => element.click());
          } else {
            await page.getByText(option.name, { exact: true }).last().click();
          }
          await page.waitForTimeout(400);
        }
        check('required menu options selected', requiredGroups.length > 0,
          requiredGroups.map((group) => group.name).join(', '));

        const selectedOption = requiredGroups[0]?.options[0]?.name || '';
        const addButton = page.locator('button', { hasText: 'Add to Cart' }).first();
        check('menu modal has Add to Cart', (await addButton.count()) > 0, `item=${item.name}`);
        if (await addButton.count()) {
          await addButton.click();
          await page.waitForTimeout(1800);
        }

        const afterAdd = await bodyText(page);
        check('customized item added to cart', afterAdd.includes(item.name) && /Checkout|View Cart|in cart/i.test(afterAdd),
          `item=${item.name}`);
        cartItem = { name: item.name, option: selectedOption };

        const checkoutButton = page.locator('button', { hasText: /Checkout\s*→/i }).first();
        const viewCartButton = page.locator('button', { hasText: /View Cart/i }).first();
        if (await checkoutButton.count()) {
          await checkoutButton.click();
        } else if (await viewCartButton.count()) {
          await viewCartButton.click();
        }
        await page.waitForURL(/\/cart/, { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }
    } catch (error) {
      check('restaurants/menu flow', false, error.message);
    }
  }

  // ---- Cart with required option, then Paystack redirect ----
  if (sessions.customer) {
    const { page } = sessions.customer;
    let authorizationUrl = null;
    try {
      await page.route('**/payments/initialize', async (route) => {
        const response = await route.fetch();
        try {
          const json = await response.json();
          authorizationUrl = json.authorizationUrl || json.data?.authorizationUrl || null;
        } catch {}
        await route.fulfill({ response });
      });
      await page.route('https://checkout.paystack.com/**', (route) => route.abort());

      const res = page.url().includes('/cart')
        ? { status: () => 200 }
        : await gotoPage(page, BASE + '/cart');
      const text = await bodyText(page);
      const hasItem = !cartItem || (text.includes(cartItem.name) && (!cartItem.option || text.includes(cartItem.option)));
      check('cart page loads customized item', res && res.status() === 200 && text.length > 200 && hasItem,
        `item=${cartItem ? cartItem.name : 'unknown'} option=${cartItem ? cartItem.option : ''}`);

      const payButton = page.locator('button', { hasText: /Pay with Paystack/i }).first();
      const payCount = await payButton.count();
      check('Paystack pay button present', payCount > 0, `count=${payCount}`);
      if (payCount > 0) {
        await payButton.click();
        for (let i = 0; i < 30 && !authorizationUrl; i += 1) await page.waitForTimeout(500);
        check('cart initializes Paystack payment', !!authorizationUrl, authorizationUrl || 'no authorizationUrl returned');
        check('cart redirects to Paystack', /paystack/i.test(page.url()) || !!authorizationUrl, page.url());
      }
    } catch (error) {
      check('cart -> Paystack', false, error.message);
    }
  }

  // ---- Dashboards ----
  if (sessions.rider) {
    const { page } = sessions.rider;
    try {
      const res = await page.goto(BASE + '/rider-dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(6000);
      const text = await bodyText(page);
      const bad = /failed to fetch|something went wrong/i.test(text);
      check('rider dashboard', res && res.status() === 200 && !bad && text.length > 200, `chars=${text.length}`);
    } catch (error) {
      check('rider dashboard', false, error.message);
    }
  }

  if (sessions.vendor) {
    const { page } = sessions.vendor;
    try {
      const res = await gotoPage(page, BASE + '/vendor-dashboard');
      const text = await bodyText(page);
      const bad = /failed to fetch|something went wrong/i.test(text);
      check('vendor dashboard', res && res.status() === 200 && !bad && text.length > 200, `chars=${text.length}`);
    } catch (error) {
      check('vendor dashboard', false, error.message);
    }
  }

  if (sessions.restaurant) {
    const { page } = sessions.restaurant;
    try {
      const res = await gotoPage(page, BASE + '/restaurant-dashboard');
      const text = await bodyText(page);
      const bad = /failed to fetch|something went wrong/i.test(text);
      check('restaurant dashboard', res && res.status() === 200 && !bad && text.length > 200, `chars=${text.length}`);
    } catch (error) {
      check('restaurant dashboard', false, error.message);
    }
  }

  // ---- Deployment contract: direct Render API, never the same-origin proxy ----
  const directApiRequests = apiRequests.filter((url) => url.startsWith(API_ORIGIN));
  const proxyApiRequests = apiRequests.filter((url) => url.startsWith(BASE) && /\/api\/v2\//.test(url));
  check('frontend calls direct Render API', directApiRequests.length > 0,
    `${directApiRequests.length} direct request(s) to ${API_ORIGIN}`);
  check('frontend does not use /api proxy', proxyApiRequests.length === 0,
    proxyApiRequests.slice(0, 3).join(' | '));

  for (const session of Object.values(sessions)) {
    await session.context.close().catch(() => {});
  }
  await browser.close();

  const passed = results.filter((result) => result.ok).length;
  console.log(`\nSMOKE ${passed}/${results.length} checks passed`);
  if (consoleErrors.length) {
    console.log(`\nConsole errors (${consoleErrors.length}):`);
    console.log([...new Set(consoleErrors)].slice(0, 10).join('\n'));
  }
  if (failedRequests.length) {
    console.log(`\nFailed requests (${failedRequests.length}):`);
    console.log([...new Set(failedRequests)].slice(0, 10).join('\n'));
  }
  fs.writeFileSync(
    path.join(__dirname, 'smoke-report.json'),
    JSON.stringify({ base: BASE, api: API_V2, results, consoleErrors, failedRequests }, null, 2)
  );
  process.exit(passed === results.length ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
