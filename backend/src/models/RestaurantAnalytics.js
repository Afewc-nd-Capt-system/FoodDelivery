const mongoose = require('mongoose');

const dailyAnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  revenue: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  avgOrderValue: { type: Number, default: 0 },
  cancelledOrders: { type: Number, default: 0 },
  newCustomers: { type: Number, default: 0 },
  returningCustomers: { type: Number, default: 0 },
});

const menuItemAnalyticsSchema = new mongoose.Schema({
  menuItemId: String,
  name: String,
  orderCount: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
});

const hourlyStatsSchema = new mongoose.Schema({
  hour: Number,
  orderCount: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
});

const restaurantAnalyticsSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    unique: true
  },
  dailyAnalytics: [dailyAnalyticsSchema],
  menuItemAnalytics: [menuItemAnalyticsSchema],
  hourlyStats: [hourlyStatsSchema],
  weeklyRevenue: { type: Number, default: 0 },
  monthlyRevenue: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  avgOrderValue: { type: Number, default: 0 },
  customerReturnRate: { type: Number, default: 0 },
  cancelledOrderRate: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

restaurantAnalyticsSchema.index({ restaurant: 1 });
restaurantAnalyticsSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('RestaurantAnalytics', restaurantAnalyticsSchema);