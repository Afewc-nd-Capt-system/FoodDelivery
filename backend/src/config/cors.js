'use strict';

const { getFrontendUrl, parseOrigins } = require('./frontend');

const LOCAL_DEVELOPMENT_ORIGIN = 'http://localhost:3000';

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function getAllowedOrigins() {
  const configured = parseOrigins(process.env.ALLOWED_ORIGINS);

  if (configured.length) return [...new Set(configured)];

  // Derive the browser origin from FRONTEND_URL when ALLOWED_ORIGINS is not
  // set. In production this also covers the intended custom domain instead of
  // a deployment-specific Vercel hostname.
  const frontend = normalizeOrigin(getFrontendUrl());
  if (frontend) return [frontend];

  if (process.env.NODE_ENV === 'production') return [];

  return [LOCAL_DEVELOPMENT_ORIGIN];
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
