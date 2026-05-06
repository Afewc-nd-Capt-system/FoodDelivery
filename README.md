# VibeChops - Food Delivery Platform

A full-stack food delivery platform with 7 feature phases + security hardening.

## Quick Start

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your values

npm run seed:subscription
npm run seed:delivery
npm run seed:admin
npm run seed:demo
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

## Default Credentials
- **Admin**: admin@fooddelivery.com / admin123!
- **Demo User**: demo@vibechops.com / Demo123!

## Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/api/health

## Environment Variables Required

### Server
- `NODE_ENV` (development/production)
- `PORT` (default: 5000)

### MongoDB
- `MONGODB_URI` (e.g., mongodb://localhost:27017/food-delivery)

### Redis (Optional - graceful fallback)
- `REDIS_URL` (e.g., redis://localhost:6379)

### JWT (Required - min 32 chars each)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

### Paystack
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_WEBHOOK_SECRET`

### Email (Optional)
- `EMAIL_SERVICE` (e.g., gmail)
- `EMAIL_USER`
- `EMAIL_PASS`

### Security
- `HCAPTCHA_SECRET` (optional)
- `DISABLE_RATE_LIMIT=true` (dev only)

### URLs
- `FRONTEND_URL` (e.g., http://localhost:3000)
- `API_URL` (e.g., http://localhost:5000)

## Seed Scripts
```bash
npm run seed:subscription  # Loyalty & subscription plans
npm run seed:delivery      # Delivery pricing config
npm run seed:admin        # Admin account
npm run seed:demo         # Sample data
npm run seed              # Original seed data
```

## Features Implemented

### Phase 1 - Retention & Loyalty
- Loyalty points system with admin config
- VibePass subscription tiers
- Referral system
- User wallet

### Phase 2 - Partner Tools
- Restaurant analytics dashboard
- Vendor demand forecasting
- Partner promotions

### Phase 3 - User Experience
- Order scheduling (48 hours)
- Group ordering
- One-tap reorder
- Cuisine/mood discovery

### Phase 4 - Platform Expansion
- Table reservations
- Catering requests
- Multi-branch support
- Intercity delivery

### Phase 5 - Trust & Safety
- Dispute & refund system
- Driver verification
- Hygiene ratings

### Phase 7 - Performance
- Redis caching
- Granular rate limiting
- Pagination

### Security Hardening
- JWT with 15min access / 7d refresh tokens
- MFA (TOTP) support
- Brute force protection
- Password breach checking (HaveIBeenPwned)
- Zod validation on all routes
- Audit logging

## Package Versions (Pinned)
```json
{
  "axios": "1.6.8",
  "bcryptjs": "2.4.3",
  "express": "4.18.2",
  "helmet": "7.1.0",
  "jsonwebtoken": "9.0.2",
  "mongoose": "8.0.0",
  "otplib": "12.0.1",
  "redis": "4.6.10",
  "socket.io": "4.8.3",
  "zod": "3.22.4"
}
```

## API v2 Endpoints
- `/api/v2/loyalty` - Points system
- `/api/v2/wallet` - User wallet
- `/api/v2/subscription` - VibePass
- `/api/v2/referral` - Referrals
- `/api/v2/recommendations` - AI recommendations
- `/api/v2/search` - Fuzzy search
- `/api/v2/delivery` - Dynamic fees
- `/api/v2/analytics` - Restaurant dashboard
- `/api/v2/scheduled-orders` - Order scheduling
- `/api/v2/group-orders` - Group ordering
- `/api/v2/reservations` - Table booking
- `/api/v2/catering` - Bulk orders
- `/api/v2/disputes` - Issue reporting