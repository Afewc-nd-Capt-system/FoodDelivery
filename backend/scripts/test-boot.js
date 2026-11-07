'use strict';

/**
 * Production boot test (npm run test:boot)
 *
 * 1. Copies the backend into a clean temp folder and runs `npm ci --omit=dev`
 *    so devDependencies are skipped (catches packages imported by app code but
 *    missing from "dependencies").
 * 2. Boots `node src/server.js` with NODE_ENV=production plus local in-memory
 *    Mongo (mongodb-memory-server) and an unreachable Redis URL (the limiter
 *    must fall back, never fail open), using the test-only
 *    ALLOW_LOCALHOST_SERVICES override for the local URLs.
 * 3. Requires a 200 from /health within 20 seconds and that round-2 routes
 *    are mounted (401 without auth on /api/v2/admin/applications).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const http = require('http');

const backendRoot = path.join(__dirname, '..');
const results = [];
const check = (ok, line) => {
  results.push(!!ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${line}`);
};
const cleanupFns = [];
const cleanup = () => { while (cleanupFns.length) { try { cleanupFns.pop()(); } catch {} } };

function httpStatus(port, pathname) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: pathname, timeout: 2000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
  });
}

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'boot-test-'));
  cleanupFns.push(() => { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} });

  // ---- 1. Clean production install ----
  const workdir = path.join(temp, 'backend');
  fs.cpSync(backendRoot, workdir, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}node_modules${path.sep}`) && !src.includes(`${path.sep}uploads${path.sep}`),
  });

  // Resolve the real npm (never a temp-folder relative shim).
  const npmCmd = process.platform === 'win32'
    ? execSync('where npm.cmd').toString().trim().split('\n')[0].trim()
    : execSync('which npm').toString().trim();

  try {
    console.log('[boot-test] npm ci --omit=dev in clean folder…');
    execSync(`"${npmCmd}" ci --omit=dev --no-audit --no-fund`, {
      cwd: workdir,
      stdio: 'inherit',
      timeout: 15 * 60 * 1000,
      env: { ...process.env, NODE_ENV: 'production' },
    });
    check(true, 'npm ci --omit=dev completed');
  } catch (error) {
    check(false, 'npm ci --omit=dev failed: ' + String(error.stdout || error.message).slice(0, 300));
    process.exit(1);
  }

  // ---- 2. In-memory services ----
  let mongodUri = '';
  try {
    const { MongoMemoryServer } = require(path.join(backendRoot, 'node_modules', 'mongodb-memory-server'));
    const mongod = await MongoMemoryServer.create();
    mongodUri = mongod.getUri('vibechops');
    cleanupFns.push(() => { try { mongod.stop(); } catch {} });
    check(true, 'mongodb-memory-server running');
  } catch (error) {
    check(false, 'mongodb-memory-server failed to start: ' + error.message.slice(0, 200));
    process.exit(1);
  }

  // ---- 3. Boot production server ----
  const port = 3900 + (Date.now() % 500);
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    MONGODB_URI: mongodUri,
    // Production-like Redis URL that is not reachable: the limiter must fall
    // back to memory instead of failing open or locking everything out.
    REDIS_URL: 'redis://127.0.0.1:2/0',
    ALLOW_LOCALHOST_SERVICES: 'true',
    JWT_SECRET: 'boot-test-secret-0123456789abcdef0123456789abcdef',
    JWT_REFRESH_SECRET: 'boot-test-refresh-0123456789abcdef0123456789ab',
    PAYSTACK_SECRET_KEY: 'sk_test_boot0000000000000000000000',
    FRONTEND_URL: 'https://boot-test.example',
    API_URL: 'https://boot-test.example',
    DISABLE_RATE_LIMIT: 'false',
  };

  const child = spawn(process.execPath, [path.join(workdir, 'src', 'server.js')], {
    cwd: workdir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.stderr.on('data', (d) => { out += d.toString(); });
  cleanupFns.push(() => { try { child.kill('SIGKILL'); } catch {} });

  const deadline = Date.now() + 20000;
  let healthOk = false;
  let round2Mounted = false;
  let bootFailed = false;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 400));
    if (child.exitCode !== null || child.signalCode) { bootFailed = true; break; }
    const health = await httpStatus(port, '/health');
    if (health === 200) {
      healthOk = true;
      round2Mounted = (await httpStatus(port, '/api/v2/admin/applications')) === 401;
      break;
    }
  }

  check(healthOk, `/health 200 within 20s (last output tail: ${out.split('\n').slice(-3).join(' | ').slice(0, 300)})`);
  check(!bootFailed, 'server did not exit with status 1');
  if (out.includes('Cannot find module')) {
    check(false, 'missing module detected — ' + (out.split('\n').find((l) => l.includes('Cannot find module')) || '').trim());
  }
  check(round2Mounted, 'round-2 routes mounted (/api/v2/admin/applications → 401 unauthenticated)');

  cleanup();
  const passed = results.filter(Boolean).length;
  console.log(`\nTEST:BOOT ${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((error) => {
  console.error('boot test crashed:', error.message);
  cleanup();
  process.exit(1);
});
