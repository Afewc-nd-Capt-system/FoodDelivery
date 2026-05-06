# VibeChops Security Documentation

## Security Features Implemented

### 1. JWT Hardening
- **Access tokens**: 15-minute expiry
- **Refresh tokens**: 7-day expiry with rotation
- **Token blacklist**: In-memory blacklist for logged-out tokens
- **Family tracking**: Detects reused (stolen) refresh tokens

### 2. Multi-Factor Authentication (MFA)
- TOTP-based 2FA using `otplib`
- Google Authenticator compatible
- 8 backup codes (single-use, hashed)

### 3. Brute Force Protection
- Per-IP and per-account tracking
- 5 failed attempts = 15-minute lockout
- CAPTCHA required after 3 attempts

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
- Whitelist only
- Credentials only for whitelisted origins
- Allowed methods: GET, POST, PUT, PATCH, DELETE

### 8. Paystack Webhook Security
- HMAC-SHA512 signature verification
- Idempotency: 24h Redis cache for event IDs
- Raw event logging to audit collection

### 9. Audit Logging
- All security-sensitive events logged
- IP, userAgent, location tracking
- Separate collection for compliance

## Environment Variables

```env
NODE_ENV=production
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
PAYSTACK_SECRET_KEY=<live key>
PAYSTACK_WEBHOOK_SECRET=<webhook signing key>
FRONTEND_URL=https://your-domain.com
REDIS_URL=redis://localhost:6379
HCAPTCHA_SECRET=<for CAPTCHA>
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