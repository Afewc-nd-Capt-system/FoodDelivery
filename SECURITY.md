# VibeChops Security Documentation

## Dependency and Runtime Baseline

- Frontend: Next.js **15.5.28** (App Router). Node engine: **>=20** (production
  Vercel project runs Node 24.x; backend `engines.node` is `>=20`).
- `npm audit` after the upgrade reports **no Next.js advisories**. The four
  remaining advisories are **build-time only** (`postcss` dependency tree):
  **2 high + 2 moderate**. They are not shipped to the browser runtime and are
  tracked until a compatible `postcss` release removes them.
- Production smoke: `cd backend && BASE_URL=https://vibechops.com npm run test:smoke`.
  The smoke test asserts the deployed frontend calls the direct Render API
  (`NEXT_PUBLIC_API_URL`), not the same-origin `/api` proxy.
- Production E2E: `cd backend && npm run test:e2e` (targets Render; includes the
  cart/options contract checks).

## Security Features Implemented

### 1. JWT Hardening
- **Access tokens**: 15-minute expiry (`type: access`, issuer `vibechops`)
- **Refresh tokens**: 7-day expiry with rotation
- `POST /api/v2/auth/refresh` rotates the refresh token in a Redis-backed
  family; `/auth/refresh-token` is kept as an alias for older mobile builds.
- Reusing an already-rotated refresh token revokes the whole family. A
  successful logout revokes the family and blacklists the current access token.
- For now the refresh token is returned in the JSON body and stored in
  localStorage by the web app (`refreshToken`); mobile stores it in
  SecureStore. Move it to an httpOnly `SameSite` cookie once the custom domain
  makes the API and frontend same-site.
- If Redis is temporarily unavailable, a per-process in-memory store keeps
  rotation working; Redis remains the shared production store.

### 2. Multi-Factor Authentication (MFA)
- TOTP-based 2FA using `otplib`; Google Authenticator compatible.
- If `mfaEnabled`, login returns `{ mfaRequired: true, mfaToken }` and no
  session. `POST /auth/mfa/verify` accepts a TOTP or a single-use backup code
  and then issues the token pair.
- 8 backup codes are shown once, stored as SHA-256 hashes, and consumed on use.
- Admin enrollment is in **Admin Dashboard → Profile → Security**: QR code,
  verify, then one-time backup codes. Admins who have enrolled are challenged
  at every password login.

### 2a. MFA in the production E2E
- `backend/scripts/e2e-prod.js` works with MFA both off and on. When the admin
  login returns `{ mfaRequired: true, mfaToken }`, it reads
  `E2E_ADMIN_TOTP_SECRET` from the untracked `backend/.env.e2e`, generates the
  current TOTP with `otplib`, and calls `POST /auth/mfa/verify` before storing
  the returned access and refresh tokens. The MFA-off path is unchanged.
- To obtain the base32 secret at enrollment, authenticate as the E2E admin and
  call `POST /api/v2/auth/mfa/setup`. The response includes
  `{ secret, otpauth, qrCode }`; the `secret` value is the base32 seed and is
  shown only during setup. Copy it once into `backend/.env.e2e` as
  `E2E_ADMIN_TOTP_SECRET=<base32-secret>`, then complete
  `POST /api/v2/auth/mfa/enable` with a current code.
- `E2E_ADMIN_TOTP_SECRET` must never be committed, printed, pasted into chat,
  or added to `.env.example`. It is equivalent to a password: anyone holding it
  can satisfy the admin MFA challenge. Treat `backend/.env.e2e` as a secret
  file and restrict its permissions.
- If MFA is enabled and the variable is absent, the E2E fails explicitly
  instead of silently skipping the admin checks. Rotating the TOTP secret
  requires disabling and re-enrolling admin MFA. Prefer a dedicated E2E admin
  over the human administrator account.

### 2b. Password Reset and Social Login
- `POST /auth/forgot-password` always returns the same `200` JSON response and
  normalizes response timing whether or not the account exists.
- The reset link is built from `FRONTEND_URL` as
  `/reset-password?token=...`; only the SHA-256 hash is stored, the token is
  single-use, and it expires after one hour.
- `/auth/social-login` returns `501` until `GOOGLE_CLIENT_ID` and the
  `google-auth-library` verifier are configured. When enabled it verifies the
  Google ID token (audience, issuer, `email_verified`) and never trusts an
  email/social id from the request body. It does not auto-link a Google
  identity to an existing password account.

### 3. Brute Force Protection
- Per-IP and per-account tracking
- 5 failed attempts = 15-minute lockout; Redis-backed with an in-memory
  per-process fallback
- The general auth limiter also caps repeated attempts; successful logins do
  not consume the per-account failure budget

### 4. Password Security
- Bcrypt cost factor 12
- HaveIBeenPwned API check (k-anonymity)
- Last 5 passwords cannot be reused

### 5. Input Validation
- Zod schema validation on all endpoints
- Strict mode (no unknown fields)
- String sanitization (trim, XSS prevention)

### 6. Security Headers
- CSP: Strict policy (self, Paystack, reCAPTCHA)
- HSTS: 1 year with preload
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

### 7. CORS Hardening
- Exact allowlist from `ALLOWED_ORIGINS` (comma-separated); no suffix matching
- If `ALLOWED_ORIGINS` is unset, the first `FRONTEND_URL` origin is used
- `http://localhost:3000` is added only outside production
- Credentials only for whitelisted origins; `Vary: Origin` is set
- Requests without an Origin (mobile/server-to-server) are allowed without
  reflecting an origin; disallowed browser origins receive no CORS grant and
  disallowed preflights return 403
- To add the custom domain, set:
  `ALLOWED_ORIGINS=https://vibechops.com,https://www.vibechops.com`

### 8. Paystack Webhook Security
- HMAC-SHA512 over the **raw request body** using `PAYSTACK_SECRET_KEY`
  (the account secret; there is no separate webhook secret).
- `crypto.timingSafeEqual` comparison; missing/invalid signatures return 401.
- Amount and currency are checked against the order before confirmation.
- Idempotency: event/reference processing prevents duplicate confirmation.
- Raw event logging to the audit collection.

### 8a. Uploads and Verification Documents
- Multer writes random UUID filenames and the API validates the actual file
  bytes with `file-type`; a claimed MIME type or filename is never trusted.
  Only JPEG/PNG are accepted for images; verification documents also allow PDF.
- Verification documents are stored privately. When
  `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`
  are all set, `src/utils/documentStorage.js` uploads them with Cloudinary
  `type=private` and deletes the local staging copy.
- Admin retrieval is still `GET /api/v2/restaurants/docs/:token`; Cloudinary
  references are decoded server-side and redirected to a signed
  `private_download_url` that expires after five minutes. Anonymous and
  non-admin callers are rejected before the reference is resolved. Responses
  use `Cache-Control: private, no-store`.
- If all three Cloudinary variables are unset, uploads fall back to
  `uploads/private/restaurant-docs` and are served by the same admin-only
  route. Production startup logs a loud warning when this fallback is active.
- The legacy public `/uploads/restaurant-docs/*` path is explicitly blocked
  with 404, including files left over from before this change.
- Uploads are capped at 5 MB. The existing magic-byte validation runs before
  either the Cloudinary upload or local persistence. Treat all uploaded
  content as untrusted and keep the private document path behind
  authorization.
- Cloudinary is the durable production option. The Render starter disk is
  ephemeral, so local fallback is for development and short-lived demos only.

### 8b. Rate Limiting and Error Handling
- Production ignores `DISABLE_RATE_LIMIT=true` (and `DISABLE_MFA=true` prints a
  warning); the switch is honored only outside production.
- `trust proxy` is set to exactly one hop for Render so limiters key on the
  real client IP.
- Brute-force accounting uses Redis when ready and a per-process in-memory
  fallback when Redis is unavailable. It does not fail open.
- Unhandled errors in production return a generic message plus a random
  `errorId`; stack traces and upstream details stay in server logs.
- `/api/v2/seed/*` is mounted only when `ENABLE_SEED=true` **and**
  `NODE_ENV!==production`; production returns 404. Use `npm run seed:prod` for
  a deliberate local seed against `MONGODB_URI`.

### 9. Audit Logging
- All security-sensitive events logged
- IP, userAgent, location tracking
- Separate collection for compliance

### 9a. Dependency Audit Status
- Backend: `npm audit` reports **0 vulnerabilities** after removing the
  dev-only `nodemon` chain and updating `axios`, `nodemailer`, `morgan`,
  `uuid`, `file-type`, `google-auth-library` and the `qs` override.
- Frontend: `npm audit` still reports advisories in the pinned Next.js 14 /
  Tailwind 3 toolchain (including a Next.js critical advisory). The required
  fixes are the Next 16 + Tailwind 4 major upgrades. Until that scheduled
  upgrade: the Next image optimizer is disabled (`images.unoptimized: true`),
  Server Action bodies are capped at 1 MB, and the app does not use
  attacker-controlled rewrite destinations. Treat the framework upgrade as a
  tracked engineering task, not a completed fix.

## Test Accounts

- Development seed data creates `admin@vibechops.ng`, `demo@vibechops.ng`,
  `vendor@vibechops.ng`, `restaurant@vibechops.ng`, `rider@vibechops.ng`, and
  `delivery@vibechops.ng`. These are demonstration accounts and **must be
  deleted or have their passwords rotated before real launch**.
- Run `npm run accounts:rotate` from `backend/` with `MONGODB_URI` set. It
  rotates every seeded account it finds, hashes through the normal User
  pre-save hook, and prints each new password once. Store those values in the
  password manager used by the operator; they are not written to the repo.
- Do not run the rotation immediately before a production regression unless
  `backend/.env.e2e` (untracked) is updated with the new test credentials.

## Secret Handling

- No production secret is stored in this repository. `render.yaml` marks every
  secret with `sync: false`; values are entered in the Render dashboard.
- Generate independent random values with
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
  Do not reuse a JWT secret as a refresh secret or as the seed key.
- The server refuses to start in production when `MONGODB_URI`, `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, or `PAYSTACK_SECRET_KEY` is missing or is a known
  default. `REDIS_URL` is required for refresh-token rotation and rate-limit
  state; configure it in Render before relying on those features.
- Run `npm run security:secrets` before committing. The optional pre-commit
  hook is installed with `git config core.hooksPath .githooks`.
- Git history is intentionally not rewritten. Any credential that was ever
  committed must be treated as compromised and rotated in the provider
  dashboard.

## Domain Readiness

Browser-facing links are derived from `FRONTEND_URL`, falling back to the first
entry in `ALLOWED_ORIGINS`. This covers password-reset emails, Paystack
`callback_url` values (orders, wallet and subscriptions), referral/group-order
share links, vendor/restaurant email links, the CSP `connectSrc`, and the
frontend metadata base/canonical URL. No Vercel or Render hostname is baked into
those link paths. The API client's `NEXT_PUBLIC_API_URL` and the `apiBase`
Render fallback are intentionally unchanged; the Next rewrite target can be
overridden with `API_PROXY_TARGET`.

Run the readiness suite from `backend/`:

```bash
npm run check:domain -- vibechops.com
# Optional: point at a different API
API_URL=https://vibechops.onrender.com npm run check:domain -- www.vibechops.com
```

The command exits non-zero on any failure and checks:

- HTTPS `200` on `/`, `/login` and `/restaurants`.
- `www` redirects to the apex domain (or the reverse, if www is canonical).
- CORS preflight and actual responses allow the domain and deny an evil origin.
- A Socket.IO polling handshake succeeds from the domain.
- No `localhost`, `127.0.0.1`, `0.0.0.0` or `[::1]` hostnames appear in any
  served JS chunk.

Production E2E uses `E2E_ORIGIN` from the untracked `backend/.env.e2e`; it must
be an origin only (no path) and must use HTTPS outside localhost. Set it to the
domain under test before running `npm run test:e2e`.

### Render environment changes (list only)

Do not apply these until DNS and the frontend deployment are ready:

| Variable | New value |
|---|---|
| `FRONTEND_URL` | `https://vibechops.com` |
| `ALLOWED_ORIGINS` | `https://vibechops.com,https://www.vibechops.com` |

Keep `API_URL`/the API hostname unchanged. On the frontend host (Vercel or
otherwise), set `NEXT_PUBLIC_SITE_URL=https://vibechops.com`; optionally set
`API_PROXY_TARGET` if the API hostname changes. `E2E_ORIGIN` belongs only in the
untracked `backend/.env.e2e`.

## Environment Variables

```env
NODE_ENV=production
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
PAYSTACK_SECRET_KEY=<live key; also used for webhook HMAC>
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com
REDIS_URL=rediss://...
GOOGLE_CLIENT_ID=<optional; social login stays 501 without it>
HCAPTCHA_SECRET=<for CAPTCHA>
# Optional private-storage adapter values (see Uploads below)
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
CLOUDINARY_URL=
```

## Security Testing

```bash
# Run security audit
npm run security-audit

# Test endpoints with curl
# Test JWT expiry
curl -H "Authorization: Bearer <expired_token>" http://localhost:5000/api/auth/profile

# Test brute force lockout
for i in {1..6}; do curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'; done
```

## Compliance Notes
- PCI-DSS: Card handling via Paystack (tokenization only)
- Data retention: Audit logs 90 days
- Password policy: 8+ chars, uppercase, lowercase, number, special