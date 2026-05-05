# VibeChops - Food Delivery Platform

## Mission
"Discover, Explore and Eat what you love"

## Current Status (May 5, 2026)

### ✅ COMPLETED FEATURES

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
- Admin: admin@fooddelivery.com / admin123!
- Regular user: Register via UI

### Environment Variables

**Backend .env:**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/food-delivery
JWT_SECRET=super-secret-jwt-key-food-delivery-app-2026-change-in-production
PAYSTACK_SECRET_KEY=sk_live_...
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

**Frontend .env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### GitHub
- Repo: https://github.com/Afewc-nd-Capt-system/FoodDelivery
- Pushed up to commit: 2376cd3

### 🔧 TODO (Next Session)

1. Seed database with vendors (npm run seed)
2. Test vendor pre-order flow
3. Test promo codes in cart
4. Add more test data
5. Fix any bugs found during testing

### 🚀 HOW TO CONTINUE

**Just say "continue" in C:\food-delivery-app and I'll:**
1. Check if servers are running
2. Verify everything works
3. Pick up where we left off

### 💾 SESSION END: May 5, 2026