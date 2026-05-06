const Order = require('../models/Order');
const RestaurantAnalytics = require('../models/RestaurantAnalytics');
const Restaurant = require('../models/Restaurant');

class AnalyticsService {
  async calculateRestaurantAnalytics(restaurantId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [monthlyOrders, weeklyOrders, dailyOrders, allTimeOrders] = await Promise.all([
      Order.find({
        restaurant: restaurantId,
        status: { $in: ['delivered', 'completed'] },
        createdAt: { $gte: thirtyDaysAgo }
      }),
      Order.find({
        restaurant: restaurantId,
        status: { $in: ['delivered', 'completed'] },
        createdAt: { $gte: sevenDaysAgo }
      }),
      Order.find({
        restaurant: restaurantId,
        createdAt: { $gte: startOfDay }
      }),
      Order.find({
        restaurant: restaurantId,
        status: { $in: ['delivered', 'completed'] }
      })
    ]);

    const calculateRevenue = (orders) => orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const calculateAvgOrderValue = (orders) => orders.length > 0 ? calculateRevenue(orders) / orders.length : 0;
    const countCancelled = (orders) => orders.filter(o => o.status === 'cancelled').length;

    const hourlyData = {};
    monthlyOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      if (!hourlyData[hour]) hourlyData[hour] = { count: 0, revenue: 0 };
      hourlyData[hour].count += 1;
      hourlyData[hour].revenue += order.totalAmount;
    });

    const hourlyStats = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      orderCount: data.count,
      revenue: data.revenue
    })).sort((a, b) => a.hour - b.hour);

    const menuItemData = {};
    monthlyOrders.forEach(order => {
      order.items.forEach(item => {
        if (!menuItemData[item.name]) {
          menuItemData[item.name] = {
            name: item.name,
            menuItemId: item.menuItem || item.name,
            orderCount: 0,
            revenue: 0,
            ratingSum: 0,
            ratingCount: 0
          };
        }
        menuItemData[item.name].orderCount += item.quantity;
        menuItemData[item.name].revenue += item.price * item.quantity;
      });
    });

    const menuItemAnalytics = Object.values(menuItemData)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const customerIds = new Set();
    const returningCustomers = new Set();
    allTimeOrders.forEach(order => {
      if (customerIds.has(order.user.toString())) {
        returningCustomers.add(order.user.toString());
      }
      customerIds.add(order.user.toString());
    });

    const returnRate = customerIds.size > 0 ? (returningCustomers.size / customerIds.size) * 100 : 0;

    let analytics = await RestaurantAnalytics.findOne({ restaurant: restaurantId });
    if (!analytics) {
      analytics = new RestaurantAnalytics({ restaurant: restaurantId });
    }

    analytics.monthlyRevenue = calculateRevenue(monthlyOrders);
    analytics.weeklyRevenue = calculateRevenue(weeklyOrders);
    analytics.totalRevenue = calculateRevenue(allTimeOrders);
    analytics.totalOrders = allTimeOrders.length;
    analytics.avgOrderValue = calculateAvgOrderValue(allTimeOrders);
    analytics.customerReturnRate = returnRate;
    analytics.cancelledOrderRate = allTimeOrders.length > 0 ? (countCancelled(allTimeOrders) / allTimeOrders.length) * 100 : 0;
    analytics.hourlyStats = hourlyStats;
    analytics.menuItemAnalytics = menuItemAnalytics;
    analytics.lastUpdated = new Date();

    await analytics.save();
    return analytics;
  }

  async getDashboardData(restaurantId, period = 'week') {
    const analytics = await this.calculateRestaurantAnalytics(restaurantId);

    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const orders = await Order.find({
      restaurant: restaurantId,
      createdAt: { $gte: startDate },
      status: { $in: ['delivered', 'completed'] }
    });

    const dailyData = {};
    orders.forEach(order => {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { revenue: 0, orderCount: 0 };
      }
      dailyData[dateKey].revenue += order.totalAmount;
      dailyData[dateKey].orderCount += 1;
    });

    const chartData = Object.entries(dailyData)
      .map(([date, data]) => ({ date, revenue: data.revenue, orderCount: data.orderCount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      summary: {
        revenue: period === 'week' ? analytics.weeklyRevenue : analytics.monthlyRevenue,
        totalOrders: orders.length,
        avgOrderValue: orders.length > 0 ? orders.reduce((s, o) => s + o.totalAmount, 0) / orders.length : 0,
        returnRate: analytics.customerReturnRate,
        cancelledRate: analytics.cancelledOrderRate
      },
      chartData,
      topItems: analytics.menuItemAnalytics.slice(0, 10),
      peakHours: analytics.hourlyStats
        .filter(h => h.orderCount > 0)
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5)
    };
  }

  async getMenuItemPerformance(restaurantId) {
    const analytics = await this.calculateRestaurantAnalytics(restaurantId);
    return analytics.menuItemAnalytics.map(item => ({
      ...item,
      revenuePercent: analytics.totalRevenue > 0 ? (item.revenue / analytics.totalRevenue) * 100 : 0
    }));
  }
}

module.exports = new AnalyticsService();