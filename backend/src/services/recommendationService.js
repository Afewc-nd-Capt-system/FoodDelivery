const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const UserPreference = require('../models/UserPreference');
const User = require('../models/User');

class RecommendationService {
  async getRecommendations(userId, location = null, limit = 10) {
    const recommendations = {
      personalized: [],
      trending: [],
      timeBased: [],
      locationBased: []
    };

    const userOrders = await Order.find({ user: userId, status: { $in: ['delivered', 'completed'] } })
      .populate('restaurant')
      .sort({ createdAt: -1 })
      .limit(50);

    const restaurantIds = userOrders.map(o => o.restaurant?._id).filter(Boolean);
    const cuisinePreferences = {};
    const categoryPreferences = {};

    userOrders.forEach(order => {
      if (order.restaurant?.cuisine) {
        order.restaurant.cuisine.forEach(c => {
          cuisinePreferences[c] = (cuisinePreferences[c] || 0) + 1;
        });
      }
    });

    const topCuisines = Object.entries(cuisinePreferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);

    if (restaurantIds.length > 0) {
      const similarRestaurants = await Restaurant.find({
        _id: { $nin: restaurantIds },
        isOpen: true,
        cuisine: { $in: topCuisines },
        'menu.isAvailable': true
      }).limit(5);
      recommendations.personalized = similarRestaurants;
    }

    const trendingRestaurants = await Restaurant.find({
      isOpen: true,
      'menu.isAvailable': true,
      rating: { $gte: 4 }
    }).sort({ rating: -1, reviewCount: -1 }).limit(5);
    recommendations.trending = trendingRestaurants;

    const hour = new Date().getHours();
    let timeCategory = 'lunch';
    if (hour >= 18 && hour <= 22) timeCategory = 'dinner';
    else if (hour >= 22 || hour <= 5) timeCategory = 'lateNight';
    else if (hour >= 5 && hour <= 11) timeCategory = 'breakfast';

    const categoryKeywords = {
      breakfast: ['breakfast', 'pancakes', 'eggs', 'toast', 'cereal', 'coffee'],
      lunch: ['salad', 'sandwich', 'wrap', 'soup', 'rice', 'bowl'],
      dinner: ['dinner', 'pasta', 'bbq', 'grill', 'curry', 'biryani'],
      lateNight: ['noodles', 'pizza', 'burger', 'snacks', 'wings']
    };

    const timeBasedRestaurants = await Restaurant.find({
      isOpen: true,
      'menu.isAvailable': true,
      $or: [
        { cuisine: { $regex: categoryKeywords[timeCategory]?.join('|') || '', $options: 'i' } },
        { 'menu.name': { $regex: categoryKeywords[timeCategory]?.join('|') || '', $options: 'i' } }
      ]
    }).limit(5);
    recommendations.timeBased = timeBasedRestaurants;

    if (location?.area || location?.city) {
      const locationQuery = {};
      if (location.area) query['location.area'] = { $regex: location.area, $options: 'i' };
      if (location.city) query['location.city'] = { $regex: location.city, $options: 'i' };

      const nearbyRestaurants = await Restaurant.find({
        isOpen: true,
        'menu.isAvailable': true,
        $or: [
          { 'location.area': { $regex: location.area || '', $options: 'i' } },
          { 'location.city': { $regex: location.city || '', $options: 'i' } }
        ]
      }).limit(5);
      recommendations.locationBased = nearbyRestaurants;
    }

    const allRecommendations = [
      ...recommendations.personalized,
      ...recommendations.trending,
      ...recommendations.timeBased,
      ...recommendations.locationBased
    ];

    const unique = [...new Map(allRecommendations.map(r => [r._id.toString(), r])).values()];
    return unique.slice(0, limit);
  }

  async getDishRecommendations(userId, limit = 10) {
    const userOrders = await Order.find({
      user: userId,
      status: { $in: ['delivered', 'completed'] }
    }).sort({ createdAt: -1 }).limit(30);

    const orderedItems = {};
    userOrders.forEach(order => {
      order.items.forEach(item => {
        orderedItems[item.name] = (orderedItems[item.name] || 0) + 1;
      });
    });

    const topItemNames = Object.entries(orderedItems)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const matchingDishes = await Restaurant.find({
      isOpen: true,
      'menu.isAvailable': true,
      'menu.name': { $in: topItemNames }
    }).select('menu').limit(20);

    const dishes = [];
    matchingDishes.forEach(r => {
      r.menu.forEach(item => {
        if (item.isAvailable && topItemNames.some(n => item.name.toLowerCase().includes(n.toLowerCase()))) {
          dishes.push({ ...item.toObject(), restaurantId: r._id, restaurantName: r.name });
        }
      });
    });

    return dishes.slice(0, limit);
  }

  async updateUserPreference(userId, orderData) {
    let preference = await UserPreference.findOne({ user: userId });

    if (!preference) {
      preference = new UserPreference({ user: userId });
    }

    const user = await User.findById(userId);
    if (user?.address) {
      preference.locationArea = user.address.city || user.address.state;
      preference.locationCity = user.address.city;
    }

    if (orderData.restaurant) {
      const restaurant = await Restaurant.findById(orderData.restaurant);
      if (restaurant?.cuisine) {
        restaurant.cuisine.forEach(c => {
          if (!preference.favoriteCuisines.includes(c)) {
            preference.favoriteCuisines.push(c);
          }
        });
      }
    }

    preference.totalOrders += 1;
    preference.lastOrderDate = new Date();
    preference.avgOrderValue = ((preference.avgOrderValue * (preference.totalOrders - 1)) + orderData.totalAmount) / preference.totalOrders;

    await preference.save();
    return preference;
  }

  async getTrendingItems(limit = 10) {
    const recentOrders = await Order.find({
      status: { $in: ['delivered', 'completed'] },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).limit(100);

    const itemCounts = {};
    recentOrders.forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });

    const sortedItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, orderCount: count }));

    return sortedItems;
  }
}

module.exports = new RecommendationService();