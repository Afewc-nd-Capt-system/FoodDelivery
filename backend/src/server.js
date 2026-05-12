require('dotenv').config();
const { validateEnvironment } = require('./middleware/security');
validateEnvironment();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const { Server } = require('socket.io');
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { blacklistMiddleware } = require('./utils/tokenBlacklist');
const { xssProtection } = require('./middleware/sanitize');
const { connectRedis } = require('./middleware/redis');
const setupSocketIO = require('./socket');
const { initializeEmailQueue } = require('./jobs/financialEmailJobs');

connectRedis().then(() => console.log('Redis initialization complete'));

initializeEmailQueue().then(() => {
  console.log('Background jobs ready')
}).catch(err => {
  console.warn('Background jobs unavailable:', err.message)
})

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://vibe-chops.vercel.app',
      'https://vibechops.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketIO(io);

app.set('io', io);

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://vibe-chops.vercel.app',
    'https://vibechops.vercel.app',
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Seed-Key'],
};

app.use(morgan('combined'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.paystack.co"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssProtection);
app.use('/api/', apiLimiter);
app.use(blacklistMiddleware);
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery', {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority',
})
.then(() => console.log('MongoDB connected ✅'))
.catch(err => {
  console.error('MongoDB connection error:', err.message)
})

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected, attempting reconnect...')
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery')
  }, 5000)
})

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err.message)
})

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/promo-codes', require('./routes/promoCodes'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/uploads', authMiddleware, require('./routes/uploads'));
app.use('/api/delivery-company', require('./routes/delivery-company'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/users', require('./routes/users'));

app.use('/api/v2/loyalty', require('./routes/v2/loyalty'));
app.use('/api/v2/wallet', require('./routes/v2/wallet'));
app.use('/api/v2/subscription', require('./routes/v2/subscription'));
app.use('/api/v2/referral', require('./routes/v2/referral'));
app.use('/api/v2/admin/loyalty', authMiddleware, require('./routes/v2/admin-loyalty'));
app.use('/api/v2/recommendations', require('./routes/v2/recommendations'));
app.use('/api/v2/search', require('./routes/v2/search'));
app.use('/api/v2/delivery', require('./routes/v2/delivery'));
app.use('/api/v2/analytics', require('./routes/v2/restaurantAnalytics'));
app.use('/api/v2/restaurant-promotions', require('./routes/v2/restaurantPromotions'));
app.use('/api/v2/vendor-forecast', require('./routes/v2/vendorForecast'));
app.use('/api/v2/admin/promotions', authMiddleware, require('./routes/v2/admin-promotions'));
app.use('/api/v2/scheduled-orders', require('./routes/v2/scheduledOrders'));
app.use('/api/v2/group-orders', require('./routes/v2/groupOrders'));
app.use('/api/v2/reorder', authMiddleware, require('./routes/v2/reorder'));
app.use('/api/v2/reservations', require('./routes/v2/reservations'));
app.use('/api/v2/catering', authMiddleware, require('./routes/v2/catering'));
app.use('/api/v2/disputes', authMiddleware, require('./routes/v2/disputes'));
app.use('/api/v2/admin/disputes', authMiddleware, require('./routes/v2/admin-disputes'));
app.use('/api/v2/orders', authMiddleware, require('./routes/v2/orders'));
app.use('/api/v2/delivery/orders', authMiddleware, require('./routes/v2/delivery-orders'));
app.use('/api/v2/riders', authMiddleware, require('./routes/v2/riders'));
app.use('/api/v2/earnings', authMiddleware, require('./routes/v2/earnings'));
app.use('/api/v2/admin/approvals', authMiddleware, require('./routes/v2/admin-approvals'));
app.use('/api/v2/admin/revenue', authMiddleware, require('./routes/v2/admin-revenue'));
app.use('/api/v2/restaurants', require('./routes/v2/restaurant-docs'));
app.use('/api/v2/subscriptions', authMiddleware, require('./routes/v2/business-subscriptions'));
app.use('/api/v2/ads', require('./routes/v2/ads'));
app.use('/api/seed', require('./routes/seed'));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'Food Delivery API is healthy',
    timestamp: Date.now(),
    env: process.env.NODE_ENV,
    port: process.env.PORT || 5000,
    database: 'connected', // We could add actual DB check here
  };
  
  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = error;
    res.status(503).json(healthCheck);
  }
});

// Legacy health check endpoint
app.get('/api/health', (req, res) => {
  res.redirect('/health');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
