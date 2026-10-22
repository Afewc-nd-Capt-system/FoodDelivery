// Single source of truth for backend URLs.
// NEXT_PUBLIC_API_URL is expected to point at the API root (e.g. http://localhost:5000/api).
const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'https://vibechops.onrender.com/api').replace(/\/+$/, '');

export const API_BASE = rawBase;

export const API_V2 = rawBase.endsWith('/v2') ? rawBase : `${rawBase}/v2`;

// Socket.io connects to the server root, not the /api path.
export const SOCKET_URL =
  (process.env.NEXT_PUBLIC_SOCKET_URL || rawBase.replace(/\/api(\/v2)?$/, '')).replace(/\/+$/, '');
