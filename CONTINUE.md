# VibeChops - Food Delivery Platform

## Mission
"Discover, Explore and Eat what you love"

## Current Status (May 5, 2026)

---

## Launch Handover (Pre-launch fixes)

- **Frontend:** Next.js **15.5.28**. **Node engine:** `>=20` (Vercel runs
  Node 24.x; backend and root `engines.node` are `>=20`).
- **Security advisories:** all Next.js advisories cleared. Four remaining
  **build-time postcss** advisories (2 high + 2 moderate) are documented in
  `SECURITY.md`; they do not affect the browser runtime.
- **Cart/options contract:** the client sends
  `customizations: [{ name, option }]`; the server also accepts the legacy
  `selectedOptions` object. The server validates required/min/max/single rules
  against the restaurant or vendor menu in MongoDB, prices every delta from the
  DB (client prices are ignored), and persists the chosen options on each order
  line.
- **Order views:** customer tracking, customer orders, restaurant dashboard
  orders tab, and rider incoming orders show the chosen options.
- **Legacy route:** `/restaurants/[id]` redirects to `/restaurant/[id]`.
- **Tests:**
  - `cd backend && npm run test:e2e` — production E2E, including options
    contract cases (a)–(e).
  - `cd backend && BASE_URL=https://vibechops.com npm run test:smoke` —
    six logins, admin tabs, restaurants/menu modal with a required option,
    add to cart, Paystack redirect, and rider/vendor/restaurant dashboards.
  - `SMOKE_API_URL` can override the direct API root; `SMOKE_BYPASS` is only
    for protected previews.

### Production verification (Nov 1, 2026)

- Backend (Render): `https://vibechops.onrender.com` — `main` at `b005195`.
- Frontend (Vercel): deployment `dpl_HEjmYfTagYXUkV4q6jvHBjMa65uP`
  (`food-delivery-1qikh7y1s-dawudtus-projects.vercel.app`), aliased to
  `https://food-delivery-app-ten-beta.vercel.app`.
- CORS: first-party origins (`vibechops.com`, `www.vibechops.com`, and the
  stable Vercel aliases) are built into `src/config/cors.js`, so a missing or
  stale Render `ALLOWED_ORIGINS` no longer blocks the browser.
- E2E: `41/41` checks passed (Cloudinary upload skipped — keys not set).
- Smoke: `28/28` checks passed against the alias; the browser called the Render
  API directly and made no same-origin `/api` requests.
- Admin revenue and restaurant/vendor subscription pages now use
  `lib/apiBase.ts` instead of relative `/api` paths.
- Still human-only: point `vibechops.com` / `www.vibechops.com` DNS at the
  Vercel project, and set real Paystack + Cloudinary credentials for live
  payments/uploads.

---

## PHASE 1: RETENTION & LOYALTY (✅ COMPLETED)

### New Backend Models
- `src/models/LoyaltyConfig.js` - Admin config for points system
- `src/models/LoyaltyPoints.js` - Points history tracking
- `src/models/Wallet.js` - User wallet
- `src/models/WalletTransaction.js` - Wallet transaction history
- `src/models/Subscription.js` - VibePass subscriptions
- `src/models/SubscriptionPlan.js` - Subscription plan definitions
- `src/models/Referral.js` - Referral tracking

### New Backend Routes (API v2)
- `GET /api/v2/loyalty/config` - Get loyalty settings
- `GET /api/v2/loyalty/balance` - Get user points
- `GET /api/v2/loyalty/history` - Get points history
- `POST /api/v2/loyalty/redeem` - Redeem points for discount
- `POST /api/v2/loyalty/calculate-redeemable` - Calculate max redeemable
- `POST /api/v2/loyalty/award-points` - Award points on order delivery
- `GET /api/v2/wallet` - Get wallet balance
- `GET /api/v2/wallet/transactions` - Get transaction history
- `POST /api/v2/wallet/topup` - Top up wallet via Paystack
- `POST /api/v2/wallet/topup/verify` - Verify top-up payment
- `POST /api/v2/wallet/deduct` - Deduct from wallet
- `POST /api/v2/wallet/credit` - Credit to wallet
- `GET /api/v2/subscription/plans` - Get VibePass plans
- `GET /api/v2/subscription/my-subscription` - Get user's subscription
- `POST /api/v2/subscription/subscribe` - Subscribe to plan
- `POST /api/v2/subscription/verify-subscription` - Verify payment
- `POST /api/v2/subscription/cancel` - Cancel subscription
- `GET /api/v2/subscription/check-free-delivery` - Check free delivery eligibility
- `POST /api/v2/subscription/use-free-delivery` - Use free delivery
- `GET /api/v2/referral/my-code` - Get user's referral code
- `POST /api/v2/referral/validate-code` - Validate referral code
- `POST /api/v2/referral/track-signup` - Track referral signup
- `POST /api/v2/referral/complete-first-order` - Complete referral on first order
- `GET /api/v2/referral/my-referrals` - Get user's referrals
- `GET /api/v2/referral/my-rewards` - Get referral rewards
- `GET /api/v2/admin/loyalty/loyalty-config` - Admin get loyalty config
- `PUT /api/v2/admin/loyalty/loyalty-config` - Admin update loyalty config
- `GET/POST/PUT /api/v2/admin/loyalty/subscription-plans` - Admin manage plans

### Schema Changes
- **User model**: Added `loyaltyPoints`, `referralCode`, `referredBy`, `isVibePassMember`, `dietaryPreferences`, `deletedAt`
- **Order model**: Added `walletAmountUsed`, `loyaltyDiscount`, `loyaltyPointsRedeemed`, `loyaltyPointsEarned`, `referralDiscountApplied`, `isVibePassFreeDelivery`, `deletedAt`

### New Frontend Pages
- `/wallet` - Wallet top-up and transaction history
- `/loyalty` - Points balance and redemption
- `/referral` - Referral code and tracking
- `/vibepass` - Subscription plans and management
- `/admin/loyalty` - Admin loyalty configuration

### Updated Frontend Pages
- `/profile` - Added wallet, loyalty, referral links and dietary preferences
- `/orders/checkout` - Added wallet payment, loyalty points redemption, VibePass free delivery

### Setup Required
```bash
cd C:\food-delivery-app\backend
npm run seed:subscription  # Creates loyalty config and subscription plans
npm run seed:delivery  # Creates delivery pricing config
```

---

## PHASE 6: INTELLIGENCE LAYER (✅ COMPLETED)

### New Backend Models & Services
- `src/models/DeliveryConfig.js` - Delivery pricing configuration
- `src/models/UserPreference.js` - User preference tracking
- `src/services/recommendationService.js` - Personalized recommendations algorithm
- `src/services/deliveryService.js` - Dynamic delivery fee calculation (Haversine)

### New Backend Routes
- `GET /api/v2/recommendations` - Personalized recommendations
- `GET /api/v2/recommendations/dishes` - Dish recommendations
- `GET /api/v2/recommendations/trending` - Trending items
- `POST /api/v2/recommendations/track-order` - Track order for recommendations
- `GET /api/v2/search` - Full-text search with fuzzy matching, filters
- `GET /api/v2/search/suggestions` - Search suggestions
- `GET /api/v2/delivery/calculate` - Calculate delivery fee
- `GET /api/v2/delivery/config` - Get delivery configuration

### Schema Changes
- **Restaurant model**: Added `dietaryTags`, `spicyLevel`, `allergens` to menu items; added `dietaryOptions`, `cuisineTags`, `deletedAt`

### New Frontend Pages
- `/search` - Advanced search with filters (cuisine, price, rating, dietary, delivery time)

### Updated Frontend Pages
- `/` (homepage) - Added mood/cuisine discovery, dietary filters, personalized recommendations, trending items

### Algorithm Features
- **Recommendations**: Past orders + cuisine preferences + time-based + location-based + trending
- **Search**: Fuzzy matching with scoring, supports filters
- **Delivery Fee**: Haversine distance calculation, surge pricing (peak hours/weekend), free delivery threshold

---

## PHASE 2: RESTAURANT & VENDOR PARTNER TOOLS (✅ COMPLETED)

### New Backend Models
- `src/models/RestaurantAnalytics.js` - Daily/menu/hourly analytics tracking
- `src/models/RestaurantPromotion.js` - Partner-created promotions

### New Backend Services
- `src/services/analyticsService.js` - Revenue, top items, peak hours, return rate calculations
- `src/services/vendorForecastService.js` - Demand forecasting per cooking day

### New Backend Routes
- `GET /api/v2/analytics/dashboard` - Restaurant dashboard data
- `GET /api/v2/analytics/menu-performance` - Menu item performance insights
- `GET /api/v2/analytics/summary` - Revenue & order summary
- `GET/POST/PUT/DELETE /api/v2/restaurant-promotions` - Partner promotion management
- `GET /api/v2/vendor-forecast/demand-forecast` - Vendor demand forecasting
- `GET/PUT /api/v2/admin/promotions` - Admin promotion approval

### New Frontend Pages
- `/restaurant/dashboard` - Restaurant analytics dashboard (revenue, orders, top items, peak hours)
- `/restaurant/promotions` - Create and manage own promotions
- `/vendor/forecast` - Demand forecasting for vendors
- `/admin/promotions` - Admin approval/rejection of partner promotions

---

## PHASE 3: USER EXPERIENCE UPGRADES (✅ COMPLETED)

### New Backend Models
- `src/models/ScheduledOrder.js` - Orders scheduled up to 48 hours ahead
- `src/models/GroupOrder.js` - Shared cart with Socket.io sync

### New Backend Services/Routes
- `/api/v2/scheduled-orders` - Create/list/cancel scheduled orders
- `/api/v2/group-orders` - Create/join/close/checkout group orders
- `/api/v2/reorder` - One-tap reorder from history

### New Frontend Pages
- `/scheduled-orders` - View and manage scheduled orders
- `/group/[code]` - Join and contribute to group order
- Updated `/orders` - One-tap reorder button

---

## PHASE 4: PLATFORM EXPANSION (✅ COMPLETED)

### New Backend Models
- `src/models/TableReservation.js` - Table booking with confirmation codes
- `src/models/CateringRequest.js` - Bulk order requests with quotes

### Updated Restaurant Model
- Added: `supportsTableReservations`, `reservationSettings`, `isChain`, `parentRestaurant`, `branchCode`, `intercityDelivery`, `acceptsCatering`

### New Backend Routes
- `/api/v2/reservations` - Create/list restaurant reservations
- `/api/v2/catering` - Submit/track catering requests

### New Frontend Pages
- `/reservations` - View table reservations
- `/catering` - View catering requests
- Updated restaurant detail - Table reservation & catering options

---

## PHASE 5: TRUST & SAFETY (✅ COMPLETED)

### New Backend Models
- `src/models/Dispute.js` - Order disputes with photo evidence
- `src/models/DriverVerification.js` - Driver ID/vehicle verification
- `src/models/HygieneRating.js` - Restaurant hygiene scores

### New Backend Routes
- `/api/v2/disputes` - Submit/view disputes
- `/api/v2/admin/disputes` - Admin resolve with refunds

### New Frontend Pages
- `/disputes` - Submit and track order disputes

---

## PHASE 7: PERFORMANCE & SCALE (✅ COMPLETED)

### New Middleware
- `src/middleware/redis.js` - Redis caching with fallback
- `src/middleware/routeLimits.js` - Granular rate limits (search, auth, order)

### Features
- Route-specific rate limiting (auth: 5/min, search: 30/min, order: 10/min)
- Redis caching infrastructure ready
- Cursor-based pagination on all list endpoints

---

## TO ENABLE ALL FEATURES

```bash
cd C:\food-delivery-app\backend
npm run seed:subscription
npm run seed:delivery
npm run dev
```

---

### ✅ PREVIOUSLY COMPLETED FEATURES

**1. Backend (Express.js + MongoDB)**
- JWT authentication with bcryptjs
- User registration/login with validation
- Forgot/reset password with email
- Social login (Google/Facebook) routes
- Restaurant CRUD with filters
- Vendor pre-order system (new!)
- Order management with status tracking
- Cart persistence in MongoDB
- Delivery Partner app routes
- Promo codes/discounts system
- Menu item customization (toppings/extras)
- Photo gallery fields for restaurants
- Location-based search
- Admin routes for all management
- Security: helmet, cors, rate limiting, XSS protection
- Real-time order tracking (Socket.io)
- Email notifications (nodemailer)

**2. Frontend (Next.js 14 + TypeScript + Tailwind)**
- Home page with hero, cuisine categories, restaurants & vendors
- Restaurant listing with filters, search, location
- Restaurant detail with menu, customization modal, reviews
- Vendors listing with cooking schedule display
- Vendor detail with pre-order system
- Cart page with promo code input
- Checkout page with address and payment
- Order listing with status timeline
- Order detail page with real-time updates
- User profile page with edit
- Forgot password & reset password pages
- Favorites page
- Delivery partner login & dashboard
- Admin dashboard with stats
- Admin promo codes management
- Navbar with favorites link, delivery partner link

**3. Branding**
- Renamed from "FlavorDash" to "VibeChops"
- Motto: "Discover, Explore and Eat what you love"

### 📋 SETUP REQUIRED

```bash
# Start servers:
cd C:\food-delivery-app
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- MongoDB: mongodb://localhost:27017/food-delivery

### Credentials
- Admin: set `SEED_ADMIN_PASSWORD` locally; no credentials are committed.
- Regular user: Register via UI

### Environment Variables

**Backend .env:**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/food-delivery
JWT_SECRET=<set in Render dashboard>
JWT_REFRESH_SECRET=<set in Render dashboard>
PAYSTACK_SECRET_KEY=<set in Render dashboard>
EMAIL_SERVICE=gmail
EMAIL_USER=<set in Render dashboard>
EMAIL_PASS=<set in Render dashboard>
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

**Frontend .env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### GitHub
- Repo: https://github.com/Afewc-nd-Capt-system/FoodDelivery
- Pushed up to commit: 8f21b05

### 🔧 TODO (Next Session)

1. ~~Seed database with subscription plans (`npm run seed:subscription`)~~ ✅ Done via `/api/v2/seed/init`
2. Test loyalty points earning and redemption
3. Test wallet top-up and payment flow
4. Test VibePass subscription flow
5. Test referral system

### ✅ THIS SESSION (May 12, 2026)

**Bugs Fixed:**
- `authMiddleware` missing `await` on `isBlacklisted()` — broke all authenticated requests
- Auth login/register did not return `token` in JSON body (only httpOnly cookie)
- Loyalty route had no root `GET /` handler
- Referral route had no root `GET /` handler
- No `/api/v2/subscriptions` plural path alias
- No `DISABLE_RATE_LIMIT` env var support in rate limiters, brute force, and token blacklist middleware

**Seed:**
- Added VibePass plan seeding (Basic + Premium) to `GET /api/v2/seed/init` using `SubscriptionPlan` model

**Frontend:**
- Hero image: replaced `<Image>` with `<img>`, opacity 0.35 → 0.85, visible on all breakpoints, proper positioning

**Bugs Fixed:**
- Seed scripts had double password hashing (pre-hashed in script, then re-hashed by User model `pre('save')` hook) — caused login to fail with "Invalid email or password" for both admin & demo users
- `demoData.js`: Fixed `role: 'user'` → `'customer'` (enum mismatch after role extension)
- `demoData.js`: Fixed restaurant/vendor `location` format (plain object → GeoJSON `{type: 'Point', coordinates: [lng, lat]}`)
- `demoData.js`: Fixed restaurant/vendor `address` format (string → object), added `verificationStatus: 'approved'`
- `demoData.js`: Fixed vendor lookup query (`{ name: ... }` → `{ businessName: ... }`)
- `PayOnDeliveryService.checkPODEligibility()`: `allowed` returned `false` when `trustedCustomer` check was `null` (not applicable). Fixed: `v === true` → `v === true || v === null`
- The old admin password failed User model validation (no uppercase letter) and was replaced with a compliant value.

**New Routes Added:**
- `POST /api/v2/delivery/orders/:id/confirm-arrival` — Rider confirms arrival, generates customer verification code (uses `DeliveryConfirmationService`)
- `POST /api/v2/delivery/orders/:id/confirm-customer` — Customer provides verification code to complete delivery
- `POST /api/v2/delivery/orders/:id/resend-code` — Resend verification code (customer or rider)
- `POST /api/v2/orders/check-pod-eligibility` — Added to v2/orders.js (was in orphaned non-v2 orders.js)
- `PUT /api/v2/vendors/:id/pod-config` — Vendor POD configuration update
- `POST /api/v2/vendors/:id/trusted-customers` — Vendor trusted customer whitelist management

**Seed Scripts Created:**
- `backend/src/seed/permissions.js` — Seeds 21 system permissions (accessible via `npm run seed:permissions`)
- Added `"seed:permissions"` script to package.json

**Test Results (localhost:5000):**
| Endpoint | Status | Result |
|----------|--------|--------|
| POST /auth/register | 201 | User created with token |
| POST /auth/login (demo) | 200 | Token + user (Demo Customer) |
| POST /auth/login (admin) | 200 | Token + user (VibeChops Admin) |
| GET /auth/profile | 200 | Full profile |
| GET /restaurants?city=Lagos | 200 | 3 restaurants |
| GET /restaurants?city=Maiduguri | 200 | 1 restaurant |
| GET /wallet | 200 | Balance: 0 NGN |
| GET /loyalty | 200 | Points: 0, config loaded |
| GET /loyalty/balance | 200 | Points: 0 |
| GET /loyalty/config | 200 | Full active config |
| GET /subscriptions/plans | 200 | 2 plans (Basic ₦0, Premium ₦2,500) |
| GET /referral | 200 | Referral code + stats |
| GET /orders/check-pod-eligibility | 200 | allowed: true, all checks pass |
| GET /permissions | 200 | 21 permissions seeded |
| POST /delivery-company/register | 201 | Company registered successfully |
| GET /users/:id/trust-profile | 200 | Full trust profile with metrics |
| GET /wallet | 200 | Balance: 0 NGN |

### 🚀 HOW TO CONTINUE

**Just say "continue" in C:\food-delivery-app and I'll:**
1. Check if servers are running
2. Verify everything works
3. Pick up where we left off

### 🔧 TODO (Next Session)
1. Test delivery confirmation flow (confirm-arrival → confirm-customer)
2. Test wallet top-up and payment flow
3. Test VibePass subscription flow
4. Test referral system
5. Create migration scripts (`backend/src/migrations/`)
6. Add frontend trust profile link in customer navbar (already exists at `/trust-profile`)
7. Add rider earnings page full implementation at `(delivery)/earnings/page.tsx`

### ✅ THIS SESSION (June 10, 2026)

**Missing Pages Fixed:**
- Created `frontend/src/app/admin/restaurants/page.tsx` — Admin restaurant management with search, status/verification badges
- Created `frontend/src/app/admin/companies/page.tsx` — Admin delivery company management with rider/delivery stats

**Audit Results:**
- Restaurant POD config page at `(restaurant)/pod-config/page.tsx` — already existed ✅
- Vendor POD settings at `(vendor)/pod-settings/page.tsx` — already existed ✅
- Customer trust profile at `(main)/trust-profile/page.tsx` — already existed ✅
- Delivery company dashboard — all 6 tabs render content ✅
- Broken navbar links: `/admin/restaurants` and `/admin/companies` now resolved

**Build:** ✅ Compiled successfully (Next.js 14.2.35)
**Deployment:** Pushed to Vercel production at `https://food-delivery-cu7nicc02-dawudtus-projects.vercel.app`
**Commit:** `8f21b05` — `feat: admin restaurants and companies management pages`

### 💾 SESSION END: June 10, 2026

---

### ✅ SESSION (October 22, 2026) — Verification & Fix Pass

**Environment**
- MongoDB running locally; backend started on `:5000`; frontend build passes (`next build`, 65 routes).
- Demo/admin passwords in the DB did not match the documented credentials. Both were reset through the `User` model at the time; the exposed values must not be used again.

**Bugs fixed**
- **Wallet privilege escalation**: `POST /api/v2/wallet/credit` let any logged-in user credit their own wallet arbitrarily. Now admin-only, and supports `userId` for support credits. Top-up verification now rejects references belonging to another user and already-processed references.
- **Delivery lifecycle routes unreachable**: the router was mounted at `/api/v2/delivery/orders` while its paths already start with `/orders` (double prefix). Mounted at `/api/v2/delivery` instead; documented endpoints now resolve.
- **Rider auth/role mismatch**: web riders log in as `User` (`delivery_rider`) but orders store a `DeliveryPartner` id. Added email-based partner resolution in `delivery-orders.js` and `riders.js`; `deliveryRiderGuard` now accepts `delivery` and `delivery_rider`.
- **Rider legacy API unmounted**: `routes/delivery.js` (login, register, available/current orders, earnings) was dead code. Mounted at `/api/v2/delivery`.
- **Order status enum out of sync**: statuses used in code (`accepted`, `ready`, `awaiting_pickup`, `assigned`, `picked_up`, `out_for_delivery`, `completed`, ...) were rejected by validation. Enum widened.
- **Delivery confirmation type mismatch**: `customerConfirmDelivery` compared an ObjectId to a string, so every valid code failed with "Not authorized". Fixed.
- **Referral rewards invisible**: `/referral/my-rewards` used string ids in aggregation `$match` (never matches ObjectId). Fixed, and `rewardValue` is now recorded when a referral completes.
- **Redis spam**: BullMQ email queue retried forever when `REDIS_URL` was unset. Email queue is now skipped with a single log line.
- **Frontend API layer**: `lib/api.ts` called `/api/v2/v2/...` for ~66 helpers (profile/checkout/search silently fell back to zeros), sent no bearer token, and hard-coded the Render host. It now reads `NEXT_PUBLIC_API_URL`, appends `/v2` once, and sends `Authorization`. Same for `lib/apiClient.ts`, `AuthContext`, and all six login pages. Added `lib/apiBase.ts` as the single source of truth.
- **Wallet page**: read the raw response instead of `{ data }` and never loaded the balance; now loads wallet + transactions with auth.
- **Rider earnings page**: replaced mock data with `/v2/riders/earnings` + `/v2/riders/deliveries/completed`, added CSV export and a working back link. Fixed `riders.js` queries (partner resolution, delivered status, `company` field).
- **Navbar**: added the missing `/trust-profile` link.

**Migrations**
- Added `backend/src/migrations/` with an idempotent runner (journal in `migrations` collection) and three migrations: `deletedAt` backfill, `referralCode` backfill, legacy `out_for_delivery` normalisation.
- Commands: `npm run migrate`, `npm run migrate:list`.

**Test rider**
- `npm run seed:rider` creates demo fleet `VibeChops Demo Fleet` + rider `rider@vibechops.com`; the password comes from `SEED_RIDER_PASSWORD` and `SEED_COMPANY_PASSWORD` (login via `POST /api/v2/auth/login`).

**Verified end-to-end on localhost**
| Flow | Result |
|---|---|
| Rider login → available orders | 200 |
| `confirm-arrival` (rider) | 200, 6-digit code stored |
| `confirm-customer` (customer, correct code) | 200, order `delivered`, cash marked paid |
| `confirm-customer` (wrong code) | 400 "Invalid verification code" |
| `resend-code` after confirmation | 400 "Delivery already confirmed" |
| Wallet credit as customer | 403 |
| Wallet credit as admin → deduct → transactions | 200 / 200 / 200 |
| Referral validate-code (valid/invalid) | 200 / 404 |
| Referral track-signup → complete-first-order | 200 / 200, referrer +100 points |
| `my-rewards` | totalReferrals 1, points 100 |
| Rider earnings / completed deliveries | 200 |

**Still blocked**
- Paystack flows (wallet top-up, VibePass subscribe) return `Invalid key`: `PAYSTACK_SECRET_KEY` in `backend/.env` is a placeholder `sk_test_...`. Replace with a real test key from the Paystack dashboard to finish TODO 2 and 3.
- `DeliveryCompany.owner` does not exist on the model, but `delivery-orders.js` authorizes via `DeliveryCompany.findOne({ owner })`; company-scoped accept/assign/decline therefore cannot succeed. Needs a design decision (add `owner` + set it on registration, or use a `company` claim in the JWT).

**Remaining known gaps**
- Many frontend pages still hard-code `https://vibechops.onrender.com/api` (restaurants, admin dashboards, vendor/restaurant dashboards, checkout POD, favorites, reservations, group create, tracking, sockets). They work in production but ignore local env; migrate them to `lib/apiBase.ts`.
- Customer `/orders` page is still mock data; checkout wallet/loyalty calls now hit the right URLs but UI flows need a browser pass.
- Rider self-registration (`routes/delivery.js /register`) does not set the now-required company fields.
