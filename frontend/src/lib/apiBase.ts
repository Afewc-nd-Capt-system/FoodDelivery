// Single source of truth for backend URLs.
// NEXT_PUBLIC_API_URL is expected to point at the API root (e.g. http://localhost:5000/api).
const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'https://vibechops.onrender.com/api').replace(/\/+$/, '');

// Accept either .../api or .../api/v2 from the environment and expose a stable
// root. API_BASE never includes /v2 so callers that append /v2 stay correct.
const apiRoot = rawBase.replace(/\/v2$/, '');

export const API_BASE = apiRoot;

export const API_V2 = `${apiRoot}/v2`;

// Socket.io connects to the server root, not the /api path.
export const SOCKET_URL =
  (process.env.NEXT_PUBLIC_SOCKET_URL || apiRoot.replace(/\/api$/, '')).replace(/\/+$/, '');
