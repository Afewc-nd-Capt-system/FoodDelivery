'use strict';

const { getFrontendUrl, parseOrigins } = require('./frontend');

const LOCAL_DEVELOPMENT_ORIGIN = 'http://localhost:3000';

// First-party browser origins that must keep working even when the Render
// dashboard allowlist is missing or stale. These are exact hostnames only; no
// suffix or wildcard matching is performed. Keeping the public domain and the
// stable Vercel production aliases here prevents a broken/misconfigured
// ALLOWED_ORIGINS value from taking the whole frontend offline.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://vibechops.com',
  'https://www.vibechops.com',
  'https://food-delivery-app-ten-beta.vercel.app',
  'https://food-delivery-app-dawudtus-projects.vercel.app',
];

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function getAllowedOrigins() {
  const configured = parseOrigins(process.env.ALLOWED_ORIGINS);

  // Derive the browser origin from FRONTEND_URL as well, so an operator who
  // only sets FRONTEND_URL still gets a working credentialed CORS grant.
  const frontend = normalizeOrigin(getFrontendUrl());

  const origins = [...DEFAULT_ALLOWED_ORIGINS, ...configured];
  if (frontend) origins.push(frontend);

  if (process.env.NODE_ENV !== 'production') {
    origins.push(LOCAL_DEVELOPMENT_ORIGIN);
  }

  return [...new Set(origins.filter(Boolean))];
}

function isAllowedOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return getAllowedOrigins().includes(normalized);
}

const corsOptions = {
  origin(origin, callback) {
    // No Origin is a non-browser request. Do not reflect anything; the request
    // is still allowed to reach the API, but no CORS grant is emitted.
    callback(null, origin ? isAllowedOrigin(origin) : false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Seed-Key',
    'X-Paystack-Signature',
    'X-Confirmation-Token',
    'Accept',
    'Origin',
  ],
  optionsSuccessStatus: 204,
};

const socketCorsOptions = {
  origin(origin, callback) {
    callback(null, origin ? isAllowedOrigin(origin) : false);
  },
  credentials: true,
  methods: ['GET', 'POST'],
};

function corsGuard(req, res, next) {
  const origin = req.header('Origin');
  res.setHeader('Vary', 'Origin');

  if (origin && !isAllowedOrigin(origin)) {
    if (req.method === 'OPTIONS') {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    // CORS is a browser boundary. Do not grant the disallowed origin; the
    // browser will block the response. Server-to-server callers do not send
    // Origin and remain unaffected.
  }

  next();
}

module.exports = {
  getAllowedOrigins,
  isAllowedOrigin,
  corsOptions,
  socketCorsOptions,
  corsGuard,
};
