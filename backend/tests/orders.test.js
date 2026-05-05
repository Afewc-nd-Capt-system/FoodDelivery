const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');

describe('Order Routes', () => {
  let token;
  let userId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await mongoose.connection.collection('users').deleteMany({});
    await mongoose.connection.collection('orders').deleteMany({});
    await mongoose.connection.collection('restaurants').deleteMany({});

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

    token = res.body.token;
    userId = res.body.user._id;
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant: new mongoose.Types.ObjectId(),
          restaurantName: 'Test Restaurant',
          items: [{ menuItem: 'item1', name: 'Test Item', price: 10, quantity: 2 }],
          totalAmount: 25,
          deliveryAddress: '123 Test St',
          paymentMethod: 'card',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('order');
      expect(res.body.order.totalAmount).toBe(25);
    });

    it('should reject order without authentication', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          restaurant: new mongoose.Types.ObjectId(),
          restaurantName: 'Test Restaurant',
          items: [{ menuItem: 'item1', name: 'Test Item', price: 10, quantity: 2 }],
          totalAmount: 25,
          deliveryAddress: '123 Test St',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/orders', () => {
    it('should get user orders', async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant: new mongoose.Types.ObjectId(),
          restaurantName: 'Test Restaurant',
          items: [{ menuItem: 'item1', name: 'Test Item', price: 10, quantity: 2 }],
          totalAmount: 25,
          deliveryAddress: '123 Test St',
          paymentMethod: 'card',
        });

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.orders || res.body)).toBe(true);
    });
  });
});
