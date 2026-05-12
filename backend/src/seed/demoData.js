require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');

const seedDemoData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');
    console.log('Connected to MongoDB');

    // Create demo user
    let user = await User.findOne({ email: 'demo@vibechops.com' });
    if (!user) {
      user = new User({
        name: 'Demo User',
        email: 'demo@vibechops.com',
        password: 'Demo123!',
        phone: '+2348012345678',
        address: { street: '123 Demo Street', city: 'Lagos', state: 'Lagos', zipCode: '10001' },
        role: 'customer'
      });
      await user.save();
      console.log('Demo user created');
    }

    // Create restaurants
    const restaurants = [
      {
        name: 'Bella Italia',
        description: 'Authentic Italian cuisine with fresh ingredients',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        cuisine: ['Italian', 'Pizza', 'Pasta'],
        rating: 4.5,
        reviewCount: 120,
        deliveryTime: '30-40 mins',
        priceForTwo: 1500,
        priceRange: '$$',
        address: { street: '123 Pizza Street', area: 'Victoria Island', city: 'Lagos', state: 'Lagos' },
        location: { type: 'Point', coordinates: [3.4219, 6.4281] },
        isOpen: true,
        verificationStatus: 'approved',
        menu: [
          { name: 'Margherita Pizza', description: 'Classic tomato and mozzarella', price: 2500, category: 'Pizza', isAvailable: true },
          { name: 'Pepperoni Pizza', description: 'Loaded with pepperoni', price: 2800, category: 'Pizza', isAvailable: true },
          { name: 'Spaghetti Carbonara', description: 'Creamy egg and bacon pasta', price: 2200, category: 'Pasta', isAvailable: true },
          { name: 'Caesar Salad', description: 'Fresh romaine with croutons', price: 1500, category: 'Salads', isAvailable: true }
        ]
      },
      {
        name: 'Spice Garden',
        description: 'Traditional Indian curries and tandoori specialties',
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
        cuisine: ['Indian', 'Curry', 'Tandoor'],
        rating: 4.7,
        reviewCount: 85,
        deliveryTime: '35-45 mins',
        priceForTwo: 2000,
        priceRange: '$$',
        address: { street: '456 Curry Lane', area: 'Ikoyi', city: 'Lagos', state: 'Lagos' },
        location: { type: 'Point', coordinates: [3.4000, 6.4500] },
        isOpen: true,
        verificationStatus: 'approved',
        menu: [
          { name: 'Butter Chicken', description: 'Creamy tomato curry', price: 2500, category: 'Curry', isAvailable: true },
          { name: 'Chicken Tikka Masala', description: 'Spiced grilled chicken', price: 2300, category: 'Curry', isAvailable: true },
          { name: 'Vegetable Biryani', description: 'Fragrant rice with spices', price: 1800, category: 'Rice', isAvailable: true },
          { name: 'Garlic Naan', description: 'Soft bread with garlic', price: 500, category: 'Bread', isAvailable: true }
        ]
      },
      {
        name: 'Sushi Master',
        description: 'Fresh Japanese sushi and sashimi',
        image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=400',
        cuisine: ['Japanese', 'Sushi', 'Asian'],
        rating: 4.8,
        reviewCount: 60,
        deliveryTime: '25-35 mins',
        priceForTwo: 3000,
        priceRange: '$$$',
        address: { street: '789 Sushi Ave', area: 'Lekki', city: 'Lagos', state: 'Lagos' },
        location: { type: 'Point', coordinates: [3.4500, 6.4100] },
        isOpen: true,
        verificationStatus: 'approved',
        menu: [
          { name: 'California Roll', description: 'Crab, avocado, cucumber', price: 2500, category: 'Sushi', isAvailable: true },
          { name: 'Salmon Sashimi', description: '6 pieces fresh salmon', price: 3000, category: 'Sashimi', isAvailable: true },
          { name: 'Dragon Roll', description: 'Eel and avocado topped', price: 3200, category: 'Sushi', isAvailable: true },
          { name: 'Miso Soup', description: 'Traditional soup', price: 800, category: 'Soup', isAvailable: true }
        ]
      }
    ];

    for (const restaurantData of restaurants) {
      const existing = await Restaurant.findOne({ name: restaurantData.name });
      if (!existing) {
        await Restaurant.create(restaurantData);
        console.log(`Created restaurant: ${restaurantData.name}`);
      }
    }

    // Create vendors
    const vendors = [
      {
        businessName: "Grandma's Kitchen",
        ownerName: 'Mama Joy',
        email: 'grandma@vendors.com',
        phone: '+2348011111111',
        description: 'Home-cooked traditional meals',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
        cuisine: ['Nigerian'],
        rating: 4.6,
        deliveryTime: '45-60 mins',
        priceRange: '$',
        address: { street: '15 Home Cook Lane', area: 'Agege', city: 'Lagos', state: 'Lagos' },
        location: { type: 'Point', coordinates: [3.3167, 6.6333] },
        cookingDays: ['monday', 'wednesday', 'saturday'],
        verificationStatus: 'approved',
        isActive: true
      },
      {
        businessName: 'Healthy Bites',
        ownerName: 'Chef Fresh',
        email: 'healthy@vendors.com',
        phone: '+2348012222222',
        description: 'Organic and diet-friendly meals',
        image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
        cuisine: ['Health Food', 'Vegan'],
        rating: 4.4,
        deliveryTime: '40-50 mins',
        priceRange: '$$',
        address: { street: '20 Wellness Road', area: 'Ikeja', city: 'Lagos', state: 'Lagos' },
        location: { type: 'Point', coordinates: [3.3500, 6.5833] },
        cookingDays: ['tuesday', 'thursday', 'friday'],
        verificationStatus: 'approved',
        isActive: true
      }
    ];

    for (const vendorData of vendors) {
      const existing = await Vendor.findOne({ businessName: vendorData.businessName });
      if (!existing) {
        await Vendor.create(vendorData);
        console.log(`Created vendor: ${vendorData.businessName}`);
      }
    }

    // Create a completed order
    const restaurant = await Restaurant.findOne({ name: 'Bella Italia' });
    if (restaurant) {
      const existingOrder = await Order.findOne({ user: user._id, restaurant: restaurant._id });
      if (!existingOrder) {
        const order = new Order({
          user: user._id,
          restaurant: restaurant._id,
          restaurantName: restaurant.name,
          items: [
            { menuItem: '1', name: 'Margherita Pizza', price: 2500, quantity: 1 },
            { menuItem: '2', name: 'Caesar Salad', price: 1500, quantity: 1 }
          ],
          totalAmount: 4000,
          deliveryAddress: '123 Demo Street, Lagos',
          status: 'delivered',
          paymentMethod: 'card',
          deliveryFee: 40,
          isPaid: true,
          paymentStatus: 'paid',
          loyaltyPointsEarned: 40
        });
        await order.save();
        console.log('Demo order created');
      }
    }

    console.log('\n=== Demo Data Seed Complete ===');
    console.log('Demo User: demo@vibechops.com / Demo123!');
    console.log('Admin: admin@fooddelivery.com / Admin123!');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDemoData();