# Security Implementation Guide

## ✅ Security Features Implemented

### 1. HTTPS/TLS
**Status:** Code ready, requires infrastructure setup

**For Development:**
```bash
# Generate self-signed certificate (for testing only)
openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365
```

**For Production (Recommended):**
- Use nginx as reverse proxy with Let's Encrypt certificates
- Or use services like Vercel, Netlify, AWS, etc. that provide automatic HTTPS

**nginx configuration example:**
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

### 2. XSS Protection
**Status:** ✅ Implemented

- **Helmet.js** configured with Content Security Policy (CSP)
- **Input sanitization** middleware (`middleware/sanitize.js`)
- **XSS filters** remove `<script>` tags, `javascript:` protocols, and inline event handlers
- **express-validator** used for input validation on all routes

**Files:**
- `backend/src/middle ware/helmet.js` (configuration in server.js)
- `backend/src/middle ware/sanitize.js` (XSS protection middleware)
- `backend/src/routes/auth.js` (uses sanitize middleware)

### 3. JWT Security
**Status:** ✅ Implemented

- **Strong secret** stored in `.env` (update JWT_SECRET for production)
- **Token expiration** set to 7 days
- **Token blacklisting** implemented for secure logout
- **Token verification** on all protected routes

**Environment variable:**
```bash
JWT_SECRET=your-super-secure-secret-key-at-least-32-characters-long
```

**Files:**
- `backend/src/routes/auth.js` (token generation)
- `backend/src/middle ware/auth.js` (token verification + blacklist check)
- `backend/src/utils/tokenBlacklist.js` (token invalidation)

### 4. Rate Limiting
**Status:** ✅ Enhanced

- **General API:** 100 requests per 15 minutes
- **Auth routes (register/login):** 10 requests per 15 minutes
- **Brute-force protection:** 5 failed login attempts per IP+email combination

**Files:**
- `backend/src/middle ware/security.js` (basic rate limiting)
- `backend/src/middle ware/bruteForce.js` (brute-force protection)

### 5. CORS Protection
**Status:** ✅ Enhanced

- **Strict origin validation** - only whitelisted origins allowed
- **Credentials support** enabled for cookies/auth headers
- **Methods restricted** to GET, POST, PUT, DELETE

**Configuration in server.js:**
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
```

### 6. Security Headers (Helmet.js)
**Status:** ✅ Implemented

Configured headers:
- **Content-Security-Policy:** Restricts resource loading
- **Strict-Transport-Security:** Forces HTTPS (HSTS)
- **X-Frame-Options:** Prevents clickjacking (DENY)
- **X-Content-Type-Options:** Prevents MIME sniffing (nosniff)
- **Referrer-Policy:** Controls referrer information
- **X-XSS-Protection:** Additional XSS filter
- **Cross-Origin-Opener-Policy:** Isolates browsing context

### 7. Secure Logout (Token Blacklisting)
**Status:** ✅ Implemented

- **Token blacklist** stores invalidated tokens until they expire
- **Logout endpoint** `/api/auth/logout` adds token to blacklist
- **Auth middleware** checks blacklist on every request

**Usage:**
```javascript
// Frontend logout
const logout = async () => {
  await fetch('/api/auth/logout', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  localStorage.removeItem('token');
  // Redirect to login
};
```

### 8. Max Login Attempts (Brute-Force Protection)
**Status:** ✅ Implemented

- **5 failed attempts** per IP+email combination
- **15-minute lockout** after exceeding limit
- **Automatic cleanup** of old attempts every 5 minutes
- **Tracks failed attempts** using in-memory Map

**Response when locked out:**
```json
{
  "message": "Too many failed login attempts. Please try again in 12 minutes.",
  "code": "BRUTE_FORCE_LOCKOUT"
}
```

## 🔒 Environment Variables (backend/.env)

```bash
# Security
JWT_SECRET=your-super-secure-secret-at-least-32-chars
PORT=5000
MONGODB_URI=mongodb://localhost:27017/food-delivery

# CORS
FRONTEND_URL=https://yourdomain.com

# Payments
PAYSTACK_SECRET_KEY=sk_live_your_key_here

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🛡️ Frontend Security

### Token Storage
- Tokens stored in `localStorage` (consider `httpOnly` cookies for production)
- Token automatically removed on logout
- AuthContext handles token state

### HTTPS
- Ensure frontend is served over HTTPS in production
- Update `NEXT_PUBLIC_API_URL` to use `https://`

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## ⚠️ Security Checklist for Production

- [ ] Update JWT_SECRET to a strong, random value (32+ chars)
- [ ] Set up HTTPS with valid SSL certificates
- [ ] Configure CORS origins to only allow your domains
- [ ] Set `helmet` CSP to restrict to your domains only
- [ ] Use `httpOnly`, `secure` cookies instead of localStorage (recommended)
- [ ] Enable MongoDB authentication
- [ ] Set up firewall rules (only allow necessary ports)
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting at nginx/cloud level too
- [ ] Set up monitoring and alerting for suspicious activity
- [ ] Regularly update dependencies (`npm audit fix`)

## 📊 Dependencies Added

```bash
npm install --save helmet cors express-rate-limit express-validator jsonwebtoken
```

## 🔍 Security Testing

Test your security headers:
```bash
# Install security tester
npm install -g testcafe

# Test CORS
curl -H "Origin: http://evil.com" -H "Access-Control-Request-Method: POST" -X OPTIONS http://localhost:5000/api/auth/login -v

# Test rate limiting
for i in {1..20}; do curl -X POST http://localhost:5000/api/auth/login; done
```

## 📞 Report Security Issues

If you discover a security vulnerability, please email: security@yourdomain.com
