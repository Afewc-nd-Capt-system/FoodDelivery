'use strict';

// Single source of truth for browser-facing links (emails, password resets,
// payment callbacks, referral and share URLs).
//
// Resolution order:
//   1. FRONTEND_URL
//   2. the first entry in ALLOWED_ORIGINS
//   3. http://localhost:3000 outside production
//
// Production must set FRONTEND_URL (or ALLOWED_ORIGINS) explicitly. There is no
// baked-in Vercel or Render hostname so a custom domain such as
// https://vibechops.com only requires an environment change.

const LOCAL_DEVELOPMENT_URL = 'http://localhost:3000';
// Last-resort production fallback. This is the intended public domain, not a
// deployment-specific Vercel/Render hostname, and it keeps generated links from
// ever pointing at localhost if an operator forgets to set FRONTEND_URL.
const PRODUCTION_FALLBACK_URL = 'https://vibechops.com';

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map(normalizeUrl)
    .filter(Boolean);
}

function getFrontendUrl() {
  const explicit = normalizeUrl(process.env.FRONTEND_URL);
  if (explicit) return explicit;

  const allowed = parseOrigins(process.env.ALLOWED_ORIGINS);
  if (allowed.length) return allowed[0];

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[config] FRONTEND_URL and ALLOWED_ORIGINS are unset; using %s for generated links',
      PRODUCTION_FALLBACK_URL
    );
    return PRODUCTION_FALLBACK_URL;
  }

  return LOCAL_DEVELOPMENT_URL;
}

function frontendUrl(pathname = '') {
  const base = getFrontendUrl();
  if (!pathname) return base;
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

module.exports = {
  LOCAL_DEVELOPMENT_URL,
  normalizeUrl,
  parseOrigins,
  getFrontendUrl,
  frontendUrl,
};
