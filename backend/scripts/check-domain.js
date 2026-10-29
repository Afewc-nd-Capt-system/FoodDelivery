'use strict';

/**
 * Domain readiness checks for a public frontend domain.
 *
 * Usage:
 *   npm run check:domain -- vibechops.com
 *   API_URL=https://vibechops.onrender.com npm run check:domain -- www.vibechops.com
 *
 * The script never mutates anything. It verifies:
 *   - HTTPS 200 on /, /login and /restaurants
 *   - www <-> apex redirect
 *   - CORS allowed for the domain and denied for an evil origin (preflight too)
 *   - Socket.IO polling handshake from the domain
 *   - no localhost/loopback hostnames in any served JS chunk
 */

// Intentionally do not load backend/.env: local development values such as
// API_URL=http://localhost:5000 must not override the production API target
// when checking a public domain. Pass API_URL/BASE_URL explicitly if needed.

const TIMEOUT_MS = Number(process.env.CHECK_DOMAIN_TIMEOUT_MS || 20000);
const EVIL_ORIGIN = 'https://evil.example';
const PAGE_PATHS = ['/', '/login', '/restaurants'];

let failures = 0;
let passes = 0;

function pass(message) {
  passes += 1;
  console.log(`PASS  ${message}`);
}

function fail(message) {
  failures += 1;
  console.log(`FAIL  ${message}`);
}

function info(message) {
  console.log(`INFO  ${message}`);
}

function normalizeHost(value) {
  return String(value || '').trim().toLowerCase().replace(/\.$/, '');
}

function parseDomain(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.pathname !== '/' || url.search || url.hash) return null;
  return url;
}

function stripApiSuffix(value) {
  return String(value || '').replace(/\/+$/, '').replace(/\/api$/i, '');
}

async function request(url, options = {}) {
  return fetch(url, {
    ...options,
    redirect: options.redirect || 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': 'VibeChops-Domain-Check/1.0',
      ...(options.headers || {}),
    },
  });
}

async function checkPages(frontendUrl) {
  for (const pagePath of PAGE_PATHS) {
    const url = new URL(pagePath, frontendUrl).toString();
    try {
      const res = await request(url);
      const final = new URL(res.url);
      if (res.status !== 200) {
        fail(`${url} returned ${res.status}, expected 200`);
      } else if (final.protocol !== 'https:') {
        fail(`${url} ended on non-HTTPS URL ${res.url}`);
      } else {
        pass(`${pagePath} is HTTPS 200 (${res.url})`);
      }
    } catch (error) {
      fail(`${url} request failed: ${error.message}`);
    }
  }
}

async function checkWwwRedirect(frontendUrl) {
  const host = normalizeHost(frontendUrl.hostname);
  const apex = host.replace(/^www\./, '');
  const wwwUrl = `https://www.${apex}/`;
  const apexUrl = `https://${apex}/`;

  try {
    const res = await request(wwwUrl, { redirect: 'manual' });
    const location = res.headers.get('location');
    if ([301, 302, 303, 307, 308].includes(res.status) && location) {
      const target = new URL(location, wwwUrl);
      if (normalizeHost(target.hostname) === normalizeHost(apex)) {
        pass(`www redirect: ${wwwUrl} -> ${target.toString()} (${res.status})`);
        return;
      }
      fail(`${wwwUrl} redirects to ${target.toString()}, expected ${apexUrl}`);
      return;
    }

    // Some deployments choose www as canonical and redirect the apex instead.
    const apexRes = await request(apexUrl, { redirect: 'manual' });
    const apexLocation = apexRes.headers.get('location');
    if ([301, 302, 303, 307, 308].includes(apexRes.status) && apexLocation) {
      const target = new URL(apexLocation, apexUrl);
      if (normalizeHost(target.hostname) === normalizeHost(`www.${apex}`)) {
        pass(`www redirect: ${apexUrl} -> ${target.toString()} (${apexRes.status})`);
        return;
      }
      fail(`${apexUrl} redirects to ${target.toString()}, expected https://www.${apex}/`);
      return;
    }

    fail(`${wwwUrl} returned ${res.status} without a redirect to ${apexUrl}`);
  } catch (error) {
    fail(`www redirect check failed: ${error.message}`);
  }
}

async function checkCors(frontendUrl) {
  const apiRoot = stripApiSuffix(
    process.env.API_URL || process.env.BASE_URL || 'https://vibechops.onrender.com'
  );
  const apiV2 = `${apiRoot}/api/v2`;
  const origin = frontendUrl.origin;

  // Preflight from the allowed domain.
  try {
    const res = await request(`${apiV2}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if ([200, 204].includes(res.status) && allowOrigin === origin) {
      pass(`CORS preflight allows ${origin} (${res.status})`);
    } else {
      fail(
        `CORS preflight for ${origin} returned ${res.status} with allow-origin ${allowOrigin || '(missing)'}`
      );
    }
  } catch (error) {
    fail(`CORS preflight for ${origin} failed: ${error.message}`);
  }

  // Preflight from an evil origin must be rejected or left without a grant.
  try {
    const res = await request(`${apiV2}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: EVIL_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (res.status === 403 || !allowOrigin || allowOrigin !== EVIL_ORIGIN) {
      pass(`CORS preflight denies ${EVIL_ORIGIN} (${res.status})`);
    } else {
      fail(`CORS preflight granted evil origin ${EVIL_ORIGIN}`);
    }
  } catch (error) {
    fail(`CORS evil-origin preflight failed: ${error.message}`);
  }

  // Actual cross-origin request from the allowed domain.
  try {
    const res = await request(`${apiV2}/restaurants?limit=1`, {
      headers: { Origin: origin },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (allowOrigin === origin) {
      pass(`CORS actual response allows ${origin} (${res.status})`);
    } else {
      fail(
        `CORS actual response for ${origin} returned ${res.status} with allow-origin ${allowOrigin || '(missing)'}`
      );
    }
  } catch (error) {
    fail(`CORS actual request for ${origin} failed: ${error.message}`);
  }

  // Actual cross-origin request from an evil origin must not be granted.
  try {
    const res = await request(`${apiV2}/restaurants?limit=1`, {
      headers: { Origin: EVIL_ORIGIN },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (!allowOrigin || allowOrigin !== EVIL_ORIGIN) {
      pass(`CORS actual response denies ${EVIL_ORIGIN} (${res.status})`);
    } else {
      fail(`CORS actual response granted evil origin ${EVIL_ORIGIN}`);
    }
  } catch (error) {
    fail(`CORS evil-origin actual request failed: ${error.message}`);
  }
}

async function checkSocket(frontendUrl) {
  const socketBase = stripApiSuffix(
    process.env.API_URL || process.env.BASE_URL || 'https://vibechops.onrender.com'
  );
  const origin = frontendUrl.origin;
  const url = `${socketBase}/socket.io/?EIO=4&transport=polling&t=${Date.now()}`;

  try {
    const res = await request(url, { headers: { Origin: origin } });
    const body = await res.text();
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (res.status === 200 && body.startsWith('0') && (!allowOrigin || allowOrigin === origin)) {
      pass(`Socket.IO handshake from ${origin} succeeded`);
    } else {
      fail(
        `Socket.IO handshake from ${origin} returned ${res.status} body=${body.slice(0, 40)} allow-origin=${allowOrigin || '(missing)'}`
      );
    }
  } catch (error) {
    fail(`Socket.IO handshake from ${origin} failed: ${error.message}`);
  }
}

function extractScriptSources(html, baseUrl) {
  const sources = new Set();
  const regex = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      sources.add(new URL(match[1], baseUrl).toString());
    } catch {
      // Ignore malformed script URLs; the HTML itself is still checked.
    }
  }
  return [...sources];
}

async function checkLocalhostChunks(frontendUrl) {
  const pageUrl = new URL('/', frontendUrl).toString();
  let html;
  try {
    const res = await request(pageUrl);
    html = await res.text();
    if (res.status !== 200) {
      fail(`could not inspect JS chunks: ${pageUrl} returned ${res.status}`);
      return;
    }
  } catch (error) {
    fail(`could not inspect JS chunks: ${error.message}`);
    return;
  }

  const scripts = extractScriptSources(html, frontendUrl);
  if (!scripts.length) {
    fail('no external JS chunks found on the landing page');
    return;
  }

  const loopbackPattern =
    /(?:(?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])|(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+)/gi;
  const offenders = [];

  for (const script of scripts) {
    try {
      const res = await request(script);
      const text = await res.text();
      const matches = text.match(loopbackPattern);
      if (matches) {
        offenders.push({ script, matches: [...new Set(matches)].slice(0, 5) });
      }
    } catch (error) {
      offenders.push({ script, matches: [`request failed: ${error.message}`] });
    }
  }

  if (offenders.length) {
    for (const offender of offenders) {
      fail(`loopback hostname in JS chunk ${offender.script}: ${offender.matches.join(', ')}`);
    }
  } else {
    pass(`no localhost/loopback hostnames in ${scripts.length} JS chunks`);
  }
}

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: npm run check:domain -- <domain>');
    console.error('Example: npm run check:domain -- vibechops.com');
    process.exit(2);
  }

  const frontendUrl = parseDomain(raw);
  if (!frontendUrl) {
    console.error(`Invalid domain "${raw}". Provide an HTTPS host such as vibechops.com.`);
    process.exit(2);
  }

  console.log(`Domain check target: ${frontendUrl.origin}`);
  console.log(
    `API target: ${stripApiSuffix(
      process.env.API_URL || process.env.BASE_URL || 'https://vibechops.onrender.com'
    )}`
  );

  await checkPages(frontendUrl);
  await checkWwwRedirect(frontendUrl);
  await checkCors(frontendUrl);
  await checkSocket(frontendUrl);
  await checkLocalhostChunks(frontendUrl);

  console.log(`\nDomain check: ${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(`Domain check crashed: ${error.message}`);
  process.exit(1);
});
