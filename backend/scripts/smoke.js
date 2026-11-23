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
const { execSync } = require('child_process');
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
const HOMEPAGE_SHOT_DIR = process.env.HOMEPAGE_SCREENSHOT_DIR
  || path.join(__dirname, 'artifacts', 'homepage');

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

async function newPage(browser, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({
    viewport,
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

// Render the hero once without glyphs (glass backgrounds stay) and measure the
// photo brightness around the text plus the real text-background contrast.
async function measureHeroBackground(page, browser) {
  const geo = await page.evaluate(() => {
    const box = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    return {
      hero: box('[data-testid="guest-hero"]'),
      stats: box('[data-testid="hero-stats"]'),
      badge: box('[data-testid="guest-hero"] .guest-hero-glass'),
      headline: box('[data-testid="hero-headline"]'),
      subtitle: box('[data-testid="hero-subtitle"]'),
      location: box('[data-testid="guest-hero"] .guest-hero-location'),
      search: box('[data-testid="hero-search"]'),
      chips: box('[data-testid="guest-hero"] .guest-hero-chips'),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  if (!geo.hero || !geo.stats) throw new Error('hero geometry missing');

  const clip = {
    x: 0,
    y: Math.max(0, geo.hero.y),
    width: geo.viewport.width,
    height: Math.max(1, Math.round(geo.stats.y - geo.hero.y)),
  };
  const relative = (box) => (box
    ? { x: box.x - clip.x, y: box.y - clip.y, w: box.w, h: box.h }
    : null);
  const rects = {
    badge: relative(geo.badge),
    headline: relative(geo.headline),
    subtitle: relative(geo.subtitle),
    location: relative(geo.location),
    search: relative(geo.search),
    chips: relative(geo.chips),
  };

  await page.evaluate(() => {
    if (document.getElementById('smoke-hero-background')) return;
    const style = document.createElement('style');
    style.id = 'smoke-hero-background';
    style.textContent = `
      [data-testid="guest-hero"] h1,
      [data-testid="guest-hero"] h1 span,
      [data-testid="guest-hero"] p,
      [data-testid="guest-hero"] span,
      [data-testid="guest-hero"] input,
      [data-testid="guest-hero"] button,
      [data-testid="guest-hero"] .guest-hero-glass {
        color: transparent !important;
        -webkit-text-fill-color: transparent !important;
        text-shadow: none !important;
        background-image: none !important;
      }
      [data-testid="guest-hero"] input::placeholder { color: transparent !important; }
      [data-testid="guest-hero"] svg { opacity: 0 !important; }
    `;
    document.head.appendChild(style);
  });
  await page.waitForTimeout(150);
  const shot = await page.screenshot({ clip, fullPage: true });
  await page.evaluate(() => document.getElementById('smoke-hero-background')?.remove());

  const context = await browser.newContext();
  const analyzer = await context.newPage();
  try {
    return await analyzer.evaluate(async ({ dataUrl, rects: boxes }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const W = canvas.width;
      const H = canvas.height;
      const linear = (value) => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      const luminance = (r, g, b) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
      const inside = (x, y, rect, pad = 0) => rect
        && x >= rect.x - pad && x < rect.x + rect.w + pad
        && y >= rect.y - pad && y < rect.y + rect.h + pad;

      const region = (rect) => {
        if (!rect) return null;
        const lums = [];
        let brightnessSum = 0;
        let count = 0;
        const x0 = Math.max(0, Math.floor(rect.x));
        const y0 = Math.max(0, Math.floor(rect.y));
        const x1 = Math.min(W, Math.ceil(rect.x + rect.w));
        const y1 = Math.min(H, Math.ceil(rect.y + rect.h));
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const i = (y * W + x) * 4;
            lums.push(luminance(data[i], data[i + 1], data[i + 2]));
            brightnessSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            count += 1;
          }
        }
        lums.sort((a, b) => a - b);
        const meanLum = lums.reduce((sum, value) => sum + value, 0) / Math.max(1, lums.length);
        const p95Lum = lums[Math.min(lums.length - 1, Math.floor(lums.length * 0.95))] || 0;
        return {
          meanBrightness: Math.round(brightnessSum / Math.max(1, count)),
          meanContrast: Math.round((1.05 / (meanLum + 0.05)) * 10) / 10,
          p95Contrast: Math.round((1.05 / (p95Lum + 0.05)) * 10) / 10,
        };
      };

      const exclusions = Object.values(boxes).filter(Boolean);
      const outsideValues = [];
      for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
          if (exclusions.some((rect) => inside(x, y, rect, 8))) continue;
          const i = (y * W + x) * 4;
          outsideValues.push((data[i] + data[i + 1] + data[i + 2]) / 3);
        }
      }
      outsideValues.sort((a, b) => a - b);
      const outsideAvg = outsideValues.reduce((sum, value) => sum + value, 0) / Math.max(1, outsideValues.length);
      const outsideMedian = outsideValues[Math.floor(outsideValues.length / 2)] || 0;
      const outsideP95 = outsideValues[Math.min(outsideValues.length - 1, Math.floor(outsideValues.length * 0.95))] || 0;
      return {
        size: { width: W, height: H },
        outside: {
          averageBrightness: Math.round(outsideAvg),
          medianBrightness: Math.round(outsideMedian),
          p95Brightness: Math.round(outsideP95),
          pixels: outsideValues.length,
        },
        headline: region(boxes.headline),
        subtitle: region(boxes.subtitle),
        location: region(boxes.location),
        chips: region(boxes.chips),
      };
    }, { dataUrl: `data:image/png;base64,${shot.toString('base64')}`, rects });
  } finally {
    await context.close().catch(() => {});
  }
}

(async () => {
  console.log(`Smoke target: ${BASE}`);
  console.log(`Direct API:   ${API_V2}`);

  let expectedCommit = process.env.EXPECTED_FRONTEND_COMMIT || '';
  if (!expectedCommit) {
    try {
      expectedCommit = execSync('git rev-parse HEAD', {
        cwd: path.join(__dirname, '..', '..'),
        encoding: 'utf8',
      }).trim();
    } catch {}
  }

  const launchOptions = { headless: true };
  if (fs.existsSync(CHROME_PATH)) launchOptions.executablePath = CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  const sessions = {};

  // ---- Frontend build version must be the latest main commit ----
  {
    const { context, page } = await newPage(browser);
    try {
      const versionRes = await fetch(`${BASE}/version.json`, { signal: AbortSignal.timeout(20000) });
      const version = await versionRes.json().catch(() => ({}));
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      const meta = await page.locator('meta[name="build-commit"]').getAttribute('content').catch(() => null);
      check(
        'frontend serves the latest main commit',
        Boolean(expectedCommit) && version.commit === expectedCommit && meta === expectedCommit,
        `expected=${String(expectedCommit).slice(0, 8)} version=${String(version.commit).slice(0, 8)} meta=${String(meta).slice(0, 8)}`
      );
    } catch (error) {
      check('frontend serves the latest main commit', false, error.message);
    } finally {
      await context.close().catch(() => {});
    }
  }

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

  // ---- Forgot-password link must be reachable from every login page ----
  {
    const { context, page } = await newPage(browser);
    try {
      const loginPages = [
        ['customer', '/login'],
        ['admin', '/admin/login'],
        ['vendor', '/vendor-login'],
        ['restaurant', '/restaurant-login'],
        ['rider', '/rider-login'],
        ['delivery company', '/delivery-company-login'],
      ];
      for (const [label, pathname] of loginPages) {
        try {
          const res = await gotoPage(page, BASE + pathname);
          await page.waitForSelector('[data-testid="forgot-password-link"]', { state: 'visible', timeout: 20000 });
          const href = await page.locator('[data-testid="forgot-password-link"]').first().getAttribute('href');
          check(`forgot-password link on ${label} login`, res && res.status() === 200 && href === '/forgot-password', `href=${href}`);
        } catch (error) {
          check(`forgot-password link on ${label} login`, false, error.message);
        }
      }
    } finally {
      await context.close().catch(() => {});
    }
  }

  // ---- Switch-aware rehearsal: with enforcement on, the seeded demo customer
  // must be verified through the admin support action before the cart flow.
  let requireEmailVerification = false;
  try {
    const health = await (await fetch(`${API_ORIGIN}/health`, { signal: AbortSignal.timeout(20000) })).json();
    requireEmailVerification = health.requireEmailVerification === true;
  } catch {}
  if (requireEmailVerification && sessions.customer && sessions.admin) {
    try {
      const customerId = await sessions.customer.page.evaluate(() => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          return user.id || user._id;
        } catch {
          return null;
        }
      });
      const adminToken = await sessions.admin.page.evaluate(() => localStorage.getItem('token'));
      const res = await fetch(`${API_V2}/admin/users/${customerId}/verify-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, Origin: BASE },
      });
      check('switch-on: demo customer marked verified via admin', res.ok, `status=${res.status}`);
    } catch (error) {
      check('switch-on: demo customer marked verified via admin', false, error.message);
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
          await page.waitForTimeout(1000);
          await addButton.click({ force: true, timeout: 20000 });
          await page.waitForTimeout(2500);
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

  // ---- Customer orders page: real orders with chosen options ----
  if (sessions.customer) {
    try {
      const res = await gotoPage(sessions.customer.page, BASE + '/orders');
      // The orders list is client-fetched; give a cold Render API room to
      // answer before judging the page.
      await sessions.customer.page
        .waitForFunction(
          () => /No orders yet|Order #|₦/.test(document.body.innerText) || /failed to fetch/i.test(document.body.innerText),
          { timeout: 25000 }
        )
        .catch(() => {});
      const text = await bodyText(sessions.customer.page);
      const mockVisible = /Spice Garden|Burger Barn|Dragon Palace/.test(text);
      const ok = res && res.status() === 200 && !mockVisible
        && (/No orders yet/.test(text) || /₦/.test(text));
      check('customer orders page is live data', ok, `chars=${text.length}`);
    } catch (error) {
      check('customer orders page is live data', false, error.message);
    }
  }

  // ---- Round 2: synthetic 429 should surface the retry window in the UI ----
  try {
    const { page } = await newPage(browser);
    await page.route('**/auth/login', (route) => route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': BASE,
        'access-control-allow-credentials': 'true',
      },
      body: JSON.stringify({ success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }),
    }));
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('input[type=password]', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2000);

    // The inputs are server-painted before React hydrates; until hydration an
    // early fill is silently discarded and submit trips client-side validation.
    // Retry the whole interaction until the request actually leaves.
    let fourTwentyNineText = '';
    for (let attempt = 0; attempt < 3 && !/try again in \d+ minutes/i.test(fourTwentyNineText); attempt += 1) {
      await page.fill('input[type=email]', 'smoke-429@example.com');
      await page.fill('input[type=password]', 'not-the-password');
      await page.locator('button').first().click();
      for (let i = 0; i < 16; i += 1) {
        await page.waitForTimeout(500);
        fourTwentyNineText = await bodyText(page);
        if (/try again in \d+ minutes/i.test(fourTwentyNineText)) break;
        if (/enter email and password/i.test(fourTwentyNineText)) break;
      }
    }
    check('UI surfaces 429 lockout message', /try again in \d+ minutes/i.test(fourTwentyNineText),
      fourTwentyNineText.replace(/\s+/g, ' ').slice(0, 120));
    await page.context().close().catch(() => {});
  } catch (error) {
    check('UI surfaces 429 lockout message', false, error.message);
  }

  // ---- Round 2: fixed pages must not render cancelled mock markers ----
  // ---- Guest homepage: honest copy/promos, responsive hero, images, proof ----
  {
    const { context, page } = await newPage(browser, { width: 390, height: 844 });
    const recorded = new Set();
    const record = (name, ok, detail) => { recorded.add(name); check(name, ok, detail); };
    const screenshotSizes = [
      { name: 'phone', width: 390, height: 844, vertical: true },
      { name: 'phone-412', width: 412, height: 915, vertical: true },
      { name: 'tablet', width: 768, height: 1024, vertical: true },
      { name: 'tablet-landscape', width: 1024, height: 768, vertical: false },
      { name: 'desktop', width: 1440, height: 900, vertical: true },
      { name: 'wide', width: 1920, height: 1080, vertical: true },
    ];
    const extraSizes = [
      { name: 'phone-360', width: 360, height: 800, vertical: true },
      { name: 'phone-desktop-site', width: 980, height: 800, vertical: true },
    ];
    try {
      const res = await gotoPage(page, BASE + '/');
      await page.waitForSelector('[data-testid="hero-headline"]', { timeout: 30000 });
      await page.waitForTimeout(1200);
      const text = await bodyText(page);
      const fake = /50K\+?|50,000|Happy Customers|Average delivery time|#1 Food Delivery|VIBES20|Free Delivery[^\n]{0,40}above/i.test(text)
        || /failed to fetch|something went wrong/i.test(text);
      record('homepage shows no fake stats or hardcoded promo codes',
        res && res.status() === 200 && !fake,
        `chars=${text.length}${fake ? ' fake-marker found' : ''}`);

      // Any code rendered in a homepage banner must pass the public validation
      // endpoint; a rejected code fails the smoke.
      const shownPromos = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-promo-code]'))
          .map((el) => el.getAttribute('data-promo-code'))
          .filter(Boolean)
      );
      let promosValid = true;
      let promoDetail = 'no promo banners shown';
      if (shownPromos.length) {
        const details = [];
        for (const code of shownPromos) {
          const response = await fetch(`${API_V2}/promo-codes/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Origin: BASE },
            body: JSON.stringify({ code }),
          });
          const body = await response.json().catch(() => ({}));
          const ok = response.ok && body.valid === true;
          if (!ok) promosValid = false;
          details.push(`${code}=${ok ? 'valid' : (body.message || `status ${response.status}`)}`);
        }
        promoDetail = details.join(', ');
      }
      record('every homepage promo code is accepted by promo validation', promosValid, promoDetail);

      fs.mkdirSync(HOMEPAGE_SHOT_DIR, { recursive: true });
      const sweep = [...screenshotSizes, ...extraSizes];
      const sweepFailures = [];
      const measurements = [];

      for (const viewport of sweep) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(400);
        const isScreenshot = screenshotSizes.some((item) => item.name === viewport.name);
        const layout = await page.evaluate(({ requireVerticalFit }) => {
          const out = { missing: [], outside: [], covered: [], overflow: 0 };
          const selectors = {
            headline: '[data-testid="hero-headline"]',
            subtitle: '[data-testid="hero-subtitle"]',
            search: '[data-testid="hero-search"]',
            stats: '[data-testid="hero-stats"]',
          };
          for (const [name, selector] of Object.entries(selectors)) {
            const el = document.querySelector(selector);
            if (!el) { out.missing.push(name); continue; }
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) out.missing.push(`${name}:zero-size`);
            if (r.left < -1 || r.right > window.innerWidth + 1) {
              out.outside.push(`${name}[l=${Math.round(r.left)} r=${Math.round(r.right)}]`);
            }
            // Every size must fit horizontally; the 1024x768 screenshot is
            // allowed to scroll vertically (nothing is clipped).
            if (requireVerticalFit && (r.top < -1 || r.bottom > window.innerHeight + 1)) {
              out.outside.push(`${name}[t=${Math.round(r.top)} b=${Math.round(r.bottom)}]`);
            }
            const x = Math.round(r.left + r.width / 2);
            const y = Math.round(r.top + r.height / 2);
            if (x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight) {
              const hit = document.elementFromPoint(x, y);
              if (!hit || !(hit === el || el.contains(hit))) {
                out.covered.push(`${name}<-${hit ? `${hit.tagName}.${String(hit.className || '').slice(0, 30)}` : 'none'}`);
              }
            }
          }
          out.overflow = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
          out.inner = { width: window.innerWidth, height: window.innerHeight };
          return out;
        }, { requireVerticalFit: viewport.vertical });
        const ok = !layout.missing.length && !layout.outside.length
          && !layout.covered.length && layout.overflow <= 1;

        if (isScreenshot) {
          record(`homepage ${viewport.name} hero fits the viewport and is not covered`, ok, JSON.stringify(layout));
          await page.screenshot({
            path: path.join(HOMEPAGE_SHOT_DIR, `homepage-${viewport.name}-${viewport.width}x${viewport.height}.png`),
          });
          const measured = await measureHeroBackground(page, browser);
          measurements.push({ name: viewport.name, width: viewport.width, height: viewport.height, ...measured });
          const headlineContrast = measured.headline?.p95Contrast || 0;
          const subtitleContrast = measured.subtitle?.p95Contrast || 0;
          record(`homepage ${viewport.name} text contrast meets AA`,
            headlineContrast >= 3 && subtitleContrast >= 4.5,
            `headline=${headlineContrast}:1 (large, need 3) subtitle=${subtitleContrast}:1 (need 4.5)`);
          if (viewport.name === 'phone') {
            const photoOk = measured.outside.averageBrightness >= 30
              && measured.outside.medianBrightness >= 20
              && measured.outside.p95Brightness >= 70;
            record('homepage phone photo is clearly visible', photoOk,
              `avgBrightness=${measured.outside.averageBrightness}/255 median=${measured.outside.medianBrightness}/255 p95=${measured.outside.p95Brightness}/255 outside-text pixels=${measured.outside.pixels}`);
            const locationContrast = measured.location?.p95Contrast || 0;
            const chipsContrast = measured.chips?.p95Contrast || 0;
            const glassContrast = Math.min(locationContrast, chipsContrast);
            record('homepage phone glass cards keep text readable', glassContrast >= 4.5,
              `location=${locationContrast}:1 chips=${chipsContrast}:1 (need 4.5 each)`);
          }
        } else if (!ok) {
          sweepFailures.push(`${viewport.name}[${viewport.width}x${viewport.height}] ${JSON.stringify(layout)}`);
        }

        if (viewport.name === 'phone' || viewport.name === 'desktop') {
          const broken = await page.evaluate(async () => {
            document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
            for (let y = 0; y < document.body.scrollHeight; y += 700) {
              window.scrollTo(0, y);
              await new Promise((resolve) => setTimeout(resolve, 120));
            }
            window.scrollTo(0, 0);
            await Promise.all(Array.from(document.images).map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
                setTimeout(resolve, 5000);
              });
            }));
            await new Promise((resolve) => setTimeout(resolve, 800));
            return Array.from(document.images)
              .filter((img) => img.complete && img.naturalWidth === 0)
              .map((img) => `${img.currentSrc || img.src} (alt=${img.alt || ''})`);
          });
          record(`homepage has no broken images at ${viewport.name}`, broken.length === 0,
            broken.slice(0, 5).join(' | ') || 'all images loaded');
        }
      }

      record('homepage hero fits 360 and desktop-site widths', sweepFailures.length === 0,
        sweepFailures.join(' | ') || 'all extra widths clean');
      console.log(`Homepage screenshots: ${HOMEPAGE_SHOT_DIR}`);
      console.log('Homepage measurements:', JSON.stringify(measurements));
    } catch (error) {
      const homepageChecks = [
        'homepage shows no fake stats or hardcoded promo codes',
        'every homepage promo code is accepted by promo validation',
        ...screenshotSizes.map((viewport) => `homepage ${viewport.name} hero fits the viewport and is not covered`),
        ...screenshotSizes.map((viewport) => `homepage ${viewport.name} text contrast meets AA`),
        'homepage phone photo is clearly visible',
        'homepage phone glass cards keep text readable',
        'homepage has no broken images at phone',
        'homepage has no broken images at desktop',
        'homepage hero fits 360 and desktop-site widths',
      ];
      homepageChecks
        .filter((name) => !recorded.has(name))
        .forEach((name) => check(name, false, error.message));
    } finally {
      await context.close().catch(() => {});
    }
  }

  try {
    const { page } = await newPage(browser);
    const res = await gotoPage(page, BASE + '/vibepass');
    const text = await bodyText(page);
    const ok = res && res.status() === 200 && /VibePass/i.test(text) && !/BEST VALUE|Early access to new features|Save up to \d+% today/i.test(text);
    check('vibepass page has no hardcoded plan prices', ok, `chars=${text.length}`);
  } catch (error) {
    check('vibepass page has no hardcoded plan prices', false, error.message);
  }

  const sweep = [
    ['vendor dashboard', sessions.vendor, BASE + '/vendor-dashboard', /₦52,000|Battery 85%|Signal Strong|\+12%|\+8%/],
    ['rider dashboard', sessions.rider, BASE + '/rider-dashboard', /Battery 85%|Signal Strong/],
    ['delivery company dashboard', sessions.delivery, BASE + '/delivery-company-dashboard', /Butter Chicken|₦2,500|50K\+/],
    ['restaurant dashboard', sessions.restaurant, BASE + '/restaurant-dashboard', /873 Fernando|Mock Order|₦52,000/],
  ];
  for (const [label, session, url, mockRe] of sweep) {
    if (!session) {
      check(`${label} mock sweep (skipped)`, true, 'no session — login missing credentials');
      continue;
    }
    try {
      const res = await gotoPage(session.page, url);
      const text = await bodyText(session.page);
      const mock = mockRe.test(text);
      const bad = /failed to fetch|something went wrong/i.test(text);
      check(`${label} renders live data (no mock markers)`, res && res.status() === 200 && !mock && !bad,
        `chars=${text.length}${mock ? ' mock-marker found' : ''}`);
    } catch (error) {
      check(`${label} renders live data (no mock markers)`, false, error.message);
    }
  }

  // ---- Round 3: customer session lifecycle through the UI (no reload between
  // login and the homepage). This is the regression suite for the bug where
  // /login and /register wrote localStorage but never updated AuthContext, so
  // the navbar kept showing Sign In / Sign Up after a successful sign-in.
  let newUserId = null;
  let cleanupContext = null;
  try {
    const { context, page } = await newPage(browser);
    cleanupContext = context;

    const runId = Date.now();
    const email = `smoke-register-${runId}@example.com`;
    // Generated per run so the repo never carries a hardcoded credential.
    const password = `Smoke${Math.random().toString(36).slice(2)}A1!`;
    const originalName = 'Smoke Session';
    const editedName = 'Session Updated';

    const firstNameOf = (value) => String(value || '').trim().split(/\s+/)[0] || '';
    const waitForNavbarUser = async (timeout = 45000) => {
      await page.waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="navbar-user-name"]');
          return !!(el && el.textContent && el.textContent.trim());
        },
        { timeout }
      );
      return (await page.getByTestId('navbar-user-name').first().innerText()).trim();
    };
    const waitForGuestNav = async (timeout = 45000) => {
      await page.waitForFunction(
        () => !!document.querySelector('[data-testid="navbar-signin"]'),
        { timeout }
      );
    };

    await page.goto(BASE + '/register', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('input[type=password]', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1500);

    let registered = false;
    for (let attempt = 0; attempt < 3 && !registered; attempt += 1) {
      await page.fill('input[placeholder="John Doe"]', originalName);
      await page.fill('input[type=email]', email);
      await page.fill('input[placeholder="+234 800 000 0000"]', '+2348012345678');
      const pwds = page.locator('input[type=password]');
      await pwds.nth(0).fill(password);
      await pwds.nth(1).fill(password);
      const checkbox = page.locator('input[type=checkbox]').first();
      if (!(await checkbox.isChecked())) await checkbox.check();
      await page.locator('button', { hasText: 'Create Account' }).first().click();

      for (let i = 0; i < 60; i += 1) {
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => ({
          token: !!localStorage.getItem('token'),
          user: localStorage.getItem('user'),
        })).catch(() => ({ token: false, user: null }));
        if (state.token) { registered = true; break; }
        const text = await bodyText(page);
        if (/too many attempts|already exists|valid|required|must/i.test(text)) break;
      }
    }
    check('register a new customer through the UI', registered, registered ? email : 'no token issued');

    if (registered) {
      const me = await page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}'));
      newUserId = me?.id || me?._id || null;

      await page.waitForURL((url) => url.pathname === '/', { timeout: 30000 }).catch(() => {});
      const navAfterRegister = await waitForNavbarUser().catch(() => '');
      const avatarText = await page.getByTestId('navbar-avatar').first().innerText().catch(() => '');
      const guestLinks = await page.locator('[data-testid="navbar-signin"]').count();
      const greeting = await page.getByTestId('homepage-greeting').first().innerText().catch(() => '');
      check(
        'navbar shows the first name and avatar immediately after register (no refresh)',
        navAfterRegister === firstNameOf(originalName) && /\bSS\b/.test(avatarText) && guestLinks === 0,
        `name=${navAfterRegister} avatar=${avatarText.replace(/\s+/g, ' ')} guestLinks=${guestLinks}`
      );
      check(
        'homepage switches to the logged-in view after register',
        /Good (morning|afternoon|evening), Smoke/.test(greeting),
        greeting.replace(/\s+/g, ' ').slice(0, 80)
      );

      // Unverified customer: banner + resend button/cooldown.
      const bannerCount = await page.locator('[data-testid="email-verification-banner"]').count();
      check('unverified customer sees the email verification banner', bannerCount === 1, `banner=${bannerCount}`);
      if (bannerCount === 1) {
        await page.getByTestId('resend-verification').click();
        await page.waitForFunction(
          () => /Resend in \d+s/.test(document.querySelector('[data-testid="resend-verification"]')?.textContent || ''),
          { timeout: 30000 }
        ).catch(() => {});
        const resendText = await page.getByTestId('resend-verification').innerText().catch(() => '');
        check('banner Resend starts the cooldown', /Resend in \d+s/.test(resendText), resendText.replace(/\s+/g, ' '));
      } else {
        check('banner Resend starts the cooldown', false, 'banner missing');
      }

      // Hard refresh: the session must survive because it lives in storage and
      // AuthContext restores it before rendering the guest navbar.
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      const navAfterRefresh = await waitForNavbarUser().catch(() => '');
      check('hard refresh keeps the customer signed in', navAfterRefresh === firstNameOf(originalName), `name=${navAfterRefresh}`);

      // Admin support action: Mark verified on the throwaway account, then the
      // banner must disappear for the customer.
      if (newUserId && sessions.admin) {
        try {
          const adminPage = sessions.admin.page;
          await gotoPage(adminPage, BASE + '/users');
          const markButton = adminPage.getByTestId(`admin-mark-verified-${newUserId}`);
          await markButton.waitFor({ state: 'visible', timeout: 30000 });
          await markButton.click();
          await adminPage.waitForSelector('[data-testid="admin-users-message"]', { timeout: 20000 });
          // The customer app reads verification state from /auth/profile on
          // load, so reload the customer page after the support action.
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
          await waitForNavbarUser().catch(() => '');
          await page.waitForFunction(
            () => !document.querySelector('[data-testid="email-verification-banner"]'),
            { timeout: 20000 }
          ).catch(() => {});
          const bannerAfter = await page.locator('[data-testid="email-verification-banner"]').count();
          check('admin Mark verified clears the customer banner', bannerAfter === 0, `banner=${bannerAfter}`);
        } catch (error) {
          check('admin Mark verified clears the customer banner', false, error.message);
        }
      } else {
        check('admin Mark verified clears the customer banner', false, 'missing user id or admin session');
      }

      // Open the avatar menu and use the real Profile page.
      await page.getByTestId('navbar-avatar').first().click();
      await page.waitForSelector('[data-testid="navbar-user-menu"]', { state: 'visible', timeout: 10000 });
      const menuText = await page.getByTestId('navbar-user-menu').innerText();
      check(
        'avatar menu exposes the account links',
        /My Orders/.test(menuText) && /Wallet/.test(menuText) && /Loyalty/.test(menuText)
          && /Referrals/.test(menuText) && /Favorites/.test(menuText) && /Profile/.test(menuText) && /Sign Out/.test(menuText),
        menuText.replace(/\s+/g, ' ').slice(0, 140)
      );

      await page.getByTestId('navbar-menu-profile').click();
      await page.waitForURL(/\/profile$/, { timeout: 20000 });
      await page.waitForSelector('[data-testid="profile-name"]', { state: 'visible', timeout: 30000 });
      const loadedName = await page.getByTestId('profile-name').inputValue().catch(() => '');
      const profileText = await bodyText(page);
      check(
        'Profile page loads real account data',
        loadedName === originalName && profileText.includes(email),
        `name=${loadedName} emailVisible=${profileText.includes(email)}`
      );

      // Edit the name and save it through the API; the navbar must update too.
      await page.getByTestId('profile-name').fill(editedName);
      await page.getByTestId('profile-save').click();
      await page.waitForFunction(
        () => /Profile updated successfully/i.test(document.body.innerText),
        { timeout: 30000 }
      ).catch(() => {});
      const navAfterSave = await waitForNavbarUser().catch(() => '');
      check('editing and saving the name updates the navbar', navAfterSave === firstNameOf(editedName), `name=${navAfterSave}`);

      // Sign out from the avatar menu.
      await page.getByTestId('navbar-avatar').first().click();
      await page.getByTestId('navbar-signout').click();
      await waitForGuestNav().catch(() => {});
      const signInVisible = await page.locator('[data-testid="navbar-signin"]').count();
      const signUpVisible = await page.locator('[data-testid="navbar-signup"]').count();
      const avatarGone = await page.locator('[data-testid="navbar-avatar"]').count();
      check(
        'sign out returns the navbar to Sign In / Sign Up',
        signInVisible === 1 && signUpVisible === 1 && avatarGone === 0,
        `signin=${signInVisible} signup=${signUpVisible} avatar=${avatarGone}`
      );

      // Sign in again and confirm the navbar shows the user.
      await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('input[type=password]', { state: 'visible', timeout: 30000 });
      await page.waitForTimeout(1200);
      await page.fill('input[type=email]', email);
      await page.fill('input[type=password]', password);
      await page.locator('button', { hasText: /Sign In/i }).first().click();
      const navAfterLogin = await waitForNavbarUser().catch(() => '');
      check('sign in again restores the customer navbar', navAfterLogin === firstNameOf(editedName), `name=${navAfterLogin}`);

      // ?next= must return to the requested page after login.
      await page.goto(BASE + '/login?next=%2Forders', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('input[type=password]', { state: 'visible', timeout: 30000 });
      await page.waitForTimeout(1200);
      await page.fill('input[type=email]', email);
      await page.fill('input[type=password]', password);
      await page.locator('button', { hasText: /Sign In/i }).first().click();
      await page.waitForURL(/\/orders$/, { timeout: 30000 }).catch(() => {});
      const landedPath = await page.evaluate(() => location.pathname).catch(() => 'unknown');
      check('login from a ?next= link returns to that page', landedPath === '/orders', `path=${landedPath}`);

      await page.waitForFunction(
        () => /No orders yet|Order #|₦/.test(document.body.innerText),
        { timeout: 25000 }
      ).catch(() => {});
      const ordersText = await bodyText(page);
      check('new customer sees My Orders', /No orders yet|Order #|₦/.test(ordersText), `chars=${ordersText.length}`);
    } else {
      check('hard refresh keeps the customer signed in', false, 'registration did not complete');
      check('avatar menu exposes the account links', false, 'registration did not complete');
      check('Profile page loads real account data', false, 'registration did not complete');
      check('editing and saving the name updates the navbar', false, 'registration did not complete');
      check('sign out returns the navbar to Sign In / Sign Up', false, 'registration did not complete');
      check('sign in again restores the customer navbar', false, 'registration did not complete');
      check('login from a ?next= link returns to that page', false, 'registration did not complete');
      check('new customer sees My Orders', false, 'registration did not complete');
    }
  } catch (error) {
    check('customer session lifecycle', false, error.message);
  } finally {
    // Always delete the throwaway account, even when a check above failed.
    if (newUserId && sessions.admin) {
      try {
        const adminToken = await sessions.admin.page.evaluate(() => localStorage.getItem('token'));
        const cleanup = await fetch(`${API_V2}/users/${newUserId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}`, Origin: BASE },
        });
        check('admin cleanup deletes the session test account', cleanup.ok, `status=${cleanup.status}`);
      } catch (error) {
        check('admin cleanup deletes the session test account', false, error.message);
      }
    } else if (newUserId) {
      check('admin cleanup deletes the session test account', false, 'missing admin session');
    } else {
      check('admin cleanup deletes the session test account', true, 'no account was created');
    }
    if (cleanupContext) await cleanupContext.close().catch(() => {});
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
