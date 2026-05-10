const jwt = require('jsonwebtoken');

function setupSocketIO(io) {
  // Authentication middleware for all namespaces
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

  // /orders namespace
  const ordersNamespace = io.of('/orders');
  ordersNamespace.on('connection', (socket) => {
    console.log(`User ${socket.user?.id} connected to /orders`);

    // Join room based on role
    socket.on('join_room', ({ role, id }) => {
      const roomName = `${role}_${id}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.id} disconnected from /orders`);
    });
  });

  // /tracking namespace
  const trackingNamespace = io.of('/tracking');
  trackingNamespace.on('connection', (socket) => {
    console.log(`User ${socket.user?.id} connected to /tracking`);

    // Rider updates location
    socket.on('rider_update_location', ({ riderId, lat, lng, orderId }) => {
      // Emit to customer watching this order
      trackingNamespace.to(`order_${orderId}`).emit('rider_location', {
        lat,
        lng,
        riderId,
        timestamp: new Date(),
      });

      // Store rider location in Redis
      storeRiderLocation(riderId, { lat, lng, orderId });
    });

    // Customer watches order for tracking
    socket.on('watch_order', ({ orderId, customerId }) => {
      socket.join(`order_${orderId}`);
      console.log(`Customer ${customerId} watching order ${orderId}`);
    });

    // Rider availability change
    socket.on('availability_change', ({ riderId, isOnline, companyId }) => {
      trackingNamespace.to(`delivery_company_${companyId}`).emit('rider_availability', {
        riderId,
        isOnline,
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.id} disconnected from /tracking`);
    });
  });

  return io;
}

// Helper: Store rider location in Redis
async function storeRiderLocation(riderId, locationData) {
  const redis = require('redis');
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  try {
    await client.connect();
    await client.setEx(`rider_location_${riderId}`, 300, JSON.stringify(locationData)); // 5 minutes TTL
    await client.disconnect();
  } catch (error) {
    console.error('Redis error storing rider location:', error);
  }
}

module.exports = setupSocketIO;
