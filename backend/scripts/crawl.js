'use strict';

/**
 * Production crawl: visits every reachable page per role and reports
 *   - dead controls (button/link with no navigation, request or visible change)
 *   - 4xx/5xx requests
 *   - console errors
 *   - broken images
 *   - "coming soon" / mock / lorem text
 *
 * Usage: BASE_URL=https://vibechops.com npm run test:crawl [-- --strict]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.e2e') });
const { chromium } = require('playwright-core');
const { authenticator } = require('otplib');

const BASE = (process.env.BASE_URL || 'https://vibechops.com').replace(/\/+$/, '');
const API = (process.env.CRAWL_API_URL || 'https://vibechops.onrender.com/api/v2').replace(/\/+$/, '');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const STRICT = process.argv.includes('--strict');
const MAX_PAGES_PER_ROLE = Number(process.env.CRAWL_MAX_PAGES || 45);
const MAX_CONTROLS_PER_PAGE = Number(process.env.CRAWL_MAX_CONTROLS || 35);

const MOCK_TEXT = /coming soon|lorem ipsum|test_ref|Spice Garden|Burger Barn|Dragon Palace|Battery 85%|Signal Strong|Happy Customers|200\+ restaurants|50K\+/i;
const DESTRUCTIVE = /delete|remove|cancel|logout|sign out|suspend|approve|reject|pay|place order|deactivate|block|unfriend|refund|top up|subscribe|checkout/i;

const accounts = {
  admin: ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'],
  customer: ['E2E_CUSTOMER_EMAIL', 'E2E_CUSTOMER_PASSWORD'],
  vendor: ['E2E_VENDOR_EMAIL', 'E2E_VENDOR_PASSWORD'],
  restaurant: ['E2E_RESTAURANT_EMAIL', 'E2E_RESTAURANT_PASSWORD'],
  rider: ['E2E_RIDER_EMAIL', 'E2E_RIDER_PASSWORD'],
  delivery: ['E2E_DELIVERY_EMAIL', 'E2E_DELIVERY_PASSWORD'],
};

const SEEDS = {
  guest: ['/', '/restaurants', '/vendors', '/vibepass', '/contact', '/login', '/register', '/forgot-password'],
  customer: ['/', '/restaurants', '/orders', '/profile', '/wallet', '/loyalty', '/favorites', '/disputes', '/scheduled-orders', '/reservations', '/catering', '/referral', '/cart', '/vibepass'],
  vendor: ['/vendor-dashboard', '/forecast', '/pod-settings', '/vendor/subscription'],
  restaurant: ['/restaurant-dashboard', '/pod-config', '/restaurant/subscription', '/promotions'],
  rider: ['/rider-dashboard', '/verification', '/earnings', '/history'],
  delivery: ['/delivery-company-dashboard', '/riders'],
  admin: ['/admin/dashboard', '/admin/restaurants', '/admin/companies', '/admin/revenue', '/users'],
};

async function apiLogin(role) {
  const [emailKey, passKey] = accounts[role];
  const email = process.env[emailKey];
  const password = process.env[passKey];
  if (!email || !password) return null;
  let body = await (await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })).json();
  if (body.mfaRequired) {
    const code = authenticator.generate(String(process.env.E2E_ADMIN_TOTP_SECRET || '').replace(/\s+/g, '').toUpperCase());
    body = await (await fetch(`${API}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfaToken: body.mfaToken, code }),
    })).json();
  }
  if (!body.token) throw new Error(`crawl login failed for ${role}: ${JSON.stringify(body).slice(0, 120)}`);
  return { token: body.token, user: body.user };
}

async function runRole(browser, role) {
  const session = role === 'guest' ? null : await apiLogin(role);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (session) {
    await context.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userRole', user.role);
    }, session);
  }
  const page = await context.newPage();

  const issues = [];
  let currentPage = '';
  let requests = [];
  let allRequests = [];
  let popupOpened = false;
  context.on('page', () => { popupOpened = true; });
  page.on('request', (req) => {
    allRequests.push(`${req.method()} ${req.url()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && res.url().startsWith(BASE.replace('https://', 'https://'))) {
      requests.push(`${res.status()} ${res.request().method()} ${res.url().replace(BASE, '')}`);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      issues.push({ page: currentPage, type: 'console', detail: msg.text().slice(0, 160) });
    }
  });

  const visited = new Set();
  const queue = [...(SEEDS[role] || [])].map((p) => BASE + p);
  const pagesSeen = [];

  while (queue.length && visited.size < MAX_PAGES_PER_ROLE) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    currentPage = url.replace(BASE, '') || '/';
    requests = [];

    let ok = true;
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (res && res.status() >= 400) {
        issues.push({ page: currentPage, type: `page ${res.status()}`, detail: '' });
        ok = false;
      }
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2200);
    } catch (error) {
      issues.push({ page: currentPage, type: 'navigation', detail: error.message.slice(0, 120) });
      continue;
    }
    pagesSeen.push(currentPage);

    for (const req of requests.slice(0, 8)) {
      issues.push({ page: currentPage, type: 'network', detail: req });
    }

    try {
      const text = await page.evaluate(() => document.body.innerText);
      if (MOCK_TEXT.test(text)) {
        const match = text.match(MOCK_TEXT);
        issues.push({ page: currentPage, type: 'mock/placeholder text', detail: match?.[0] || '' });
      }

      const broken = await page.evaluate(() =>
        Array.from(document.images)
          .filter((img) => img.complete && img.naturalWidth === 0 && img.getAttribute('src'))
          .slice(0, 5)
          .map((img) => img.getAttribute('src').slice(0, 100))
      );
      for (const src of broken) {
        issues.push({ page: currentPage, type: 'broken image', detail: src });
      }

      // Collect internal links for BFS (do not visit the same page twice).
      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map((a) => a.getAttribute('href'))
          .filter((href) => href && href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api'))
      );
      for (const href of links) {
        const clean = href.split('#')[0].split('?')[0];
        if (!clean || clean === '/') continue;
        const next = BASE + clean;
        if (!visited.has(next) && queue.length + visited.size < MAX_PAGES_PER_ROLE) queue.push(next);
      }

      // Dead controls: visible buttons without href that produce no navigation,
      // no request and no visible text change.
      const controls = await page.evaluate((max) => {
        return Array.from(document.querySelectorAll('button, [role="button"]'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
              && !el.disabled && el.getAttribute('aria-disabled') !== 'true';
          })
          .slice(0, max)
          .map((el, i) => ({ idx: i, type: el.getAttribute('type') || '', label: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40) }));
      }, MAX_CONTROLS_PER_PAGE);

      for (const control of controls) {
        if (!control.label || DESTRUCTIVE.test(control.label)) continue;
        if (control.type === 'submit') continue; // native form validation is not a dead control
        if (/show password|hide password|show password confirmation|hide password confirmation/i.test(control.label)) continue;
        // "Back" depends on history, "Overview" is already the active tab, and
        // "Export" downloads a file - none produce an in-page text change.
        if (/^(back|overview|export)$/i.test(control.label)) continue;
        if (/^(copy code|copy link)$/i.test(control.label)) continue; // clipboard-only
        const beforeUrl = page.url();
        const beforeText = (await page.evaluate(() => document.body.innerText)).slice(0, 5000);
        const beforeDom = await page.evaluate(() => document.body.innerHTML.length);
        const beforeValues = await page.evaluate(() =>
          Array.from(document.querySelectorAll('input, textarea, select')).map((el) => el.value).join('|'));
        const beforeReqCount = allRequests.length;
        popupOpened = false;
        let clicked = false;
        try {
          await page.evaluate((idx) => {
            const els = Array.from(document.querySelectorAll('button, [role="button"]'))
              .filter((el) => {
                const r = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
                  && !el.disabled && el.getAttribute('aria-disabled') !== 'true';
              });
            const el = els[idx];
            if (el) el.click();
          }, control.idx);
          clicked = true;
        } catch { /* element detached */ }

        let changed = false;
        let navigated = false;
        let madeRequest = false;
        for (let wait = 0; wait < 4; wait += 1) {
          await page.waitForTimeout(350);
          navigated = page.url() !== beforeUrl;
          madeRequest = allRequests.length > beforeReqCount;
          const afterText = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 5000);
          const afterDom = await page.evaluate(() => document.body.innerHTML.length).catch(() => beforeDom);
          const afterValues = await page.evaluate(() =>
            Array.from(document.querySelectorAll('input, textarea, select')).map((el) => el.value).join('|')).catch(() => beforeValues);
          // Class/style toggles (filters, tabs, selection chips) change the DOM
          // even when the visible text stays identical; amount chips only set an
          // input value.
          changed = afterText !== beforeText || afterDom !== beforeDom || afterValues !== beforeValues;
          if (navigated || madeRequest || changed || popupOpened) break;
        }
        if (clicked && !changed && !navigated && !madeRequest && !popupOpened) {
          issues.push({ page: currentPage, type: 'dead control', detail: control.label });
        }
        // Stop after a navigation: the remaining control indices belong to the
        // previous DOM and would produce false positives.
        if (navigated) break;
      }
    } catch (error) {
      issues.push({ page: currentPage, type: 'crawl error', detail: error.message.slice(0, 120) });
    }
  }

  await context.close();
  return { role, pages: pagesSeen, issues };
}

(async () => {
  console.log(`Crawl target: ${BASE}`);
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const results = [];
  for (const role of Object.keys(SEEDS)) {
    process.stdout.write(`crawling ${role}â€¦ `);
    try {
      const result = await runRole(browser, role);
      results.push(result);
      console.log(`${result.pages.length} pages, ${result.issues.length} issue(s)`);
    } catch (error) {
      console.log(`FAILED: ${error.message}`);
      results.push({ role, pages: [], issues: [{ type: 'role failed', detail: error.message }] });
    }
  }
  await browser.close();

  console.log('\nBy page:');
  for (const result of results) {
    const byPage = new Map();
    for (const issue of result.issues) {
      const key = issue.page || '(role)';
      if (!byPage.has(key)) byPage.set(key, []);
      byPage.get(key).push(issue);
    }
    for (const [pageName, list] of byPage) {
      console.log(`\n[${result.role}] ${pageName}`);
      for (const issue of list.slice(0, 12)) {
        console.log(`  - ${issue.type}${issue.detail ? `: ${issue.detail}` : ''}`);
      }
    }
  }

  const totalPages = results.reduce((sum, r) => sum + r.pages.length, 0);
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const dead = results.reduce((sum, r) => sum + r.issues.filter((i) => i.type === 'dead control').length, 0);
  console.log(`\nCRAWL pages=${totalPages} issues=${totalIssues} deadControls=${dead}`);
  if (STRICT && totalIssues > 0) process.exit(1);
})().catch((error) => {
  console.error('CRAWL failed:', error.message);
  process.exit(1);
});

