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

connectRedis().then(() => console.log('Redis initialization complete'));

const app = express();
const server = http.createServer(app);
const jwt = require('jsonwebtoken');
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user?.id} connected via Socket.io`);
  socket.join(`user-${socket.user.id}`);
});

app.set('io', io);

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

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Food Delivery API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
