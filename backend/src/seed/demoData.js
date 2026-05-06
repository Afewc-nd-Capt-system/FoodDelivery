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
        password: await bcrypt.hash('Demo123!', 12),
        phone: '+2348012345678',
        address: { street: '123 Demo Street', city: 'Lagos', state: 'Lagos', zipCode: '10001' },
        role: 'user'
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
        address: '123 Pizza Street, Lagos',
        location: { city: 'Lagos', area: 'Victoria Island' },
        isOpen: true,
        locationCoords: { lat: 6.4281, lng: 3.4219 },
        menu: [
          { name: 'Margherita Pizza', description: 'Classic tomato and mozzarella', price: 2500, category: 'Pizza', isAvailable: true },
          { name: 'Pepperoni Pizza', description: 'Loaded with pepperoni', price: 2800, category: 'Pizza', isAvailable: true },
          { name: 'Spaghetti Carbonara', description: 'Creamy egg and bacon pasta', price: 2200, category: 'Pasta', isAvailable: true },
          { name: 'Caesar Salad', description: 'Fresh romaine with croutons', price: 1500, category: 'Salads', isAvailable: true, dietaryTags: ['vegetarian'] }
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
        address: '456 Curry Lane, Lagos',
        location: { city: 'Lagos', area: 'Ikoyi' },
        isOpen: true,
        locationCoords: { lat: 6.4500, lng: 3.4000 },
        menu: [
          { name: 'Butter Chicken', description: 'Creamy tomato curry', price: 2500, category: 'Curry', isAvailable: true, spicyLevel: 2 },
          { name: 'Chicken Tikka Masala', description: 'Spiced grilled chicken', price: 2300, category: 'Curry', isAvailable: true, spicyLevel: 3 },
          { name: 'Vegetable Biryani', description: 'Fragrant rice with spices', price: 1800, category: 'Rice', isAvailable: true, dietaryTags: ['vegan', 'halal'] },
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
        address: '789 Sushi Ave, Lagos',
        location: { city: 'Lagos', area: 'Lekki' },
        isOpen: true,
        locationCoords: { lat: 6.4100, lng: 3.4500 },
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
        address: '15 Home Cook Lane',
        location: { city: 'Lagos', area: 'Agege' },
        cookingDays: ['monday', 'wednesday', 'saturday'],
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
        address: '20 Wellness Road',
        location: { city: 'Lagos', area: 'Ikeja' },
        cookingDays: ['tuesday', 'thursday', 'friday'],
        isActive: true
      }
    ];

    for (const vendorData of vendors) {
      const existing = await Vendor.findOne({ name: vendorData.name });
      if (!existing) {
        await Vendor.create(vendorData);
        console.log(`Created vendor: ${vendorData.name}`);
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
    console.log('Admin: admin@fooddelivery.com / admin123!');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDemoData();