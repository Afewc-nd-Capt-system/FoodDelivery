const Order = require('../models/Order');
const Vendor = require('../models/Vendor');

class VendorForecastService {
  async getDemandForecast(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const pastOrders = await Order.find({
      vendor: vendorId,
      status: { $in: ['delivered', 'completed', 'confirmed'] },
      createdAt: { $gte: fourWeeksAgo }
    });

    const ordersByDay = {};
    const cookingDays = vendor.cookingDays || [];

    pastOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dayName = orderDate.toLocaleDateString('en-US', { weekday: 'long' });

      if (!ordersByDay[dayName]) {
        ordersByDay[dayName] = { count: 0, revenue: 0 };
      }
      ordersByDay[dayName].count += 1;
      ordersByDay[dayName].revenue += order.totalAmount || 0;
    });

    const forecast = cookingDays.map(day => {
      const historical = ordersByDay[day] || { count: 0, revenue: 0 };
      const avgOrders = Math.round((historical.count / 4) * 10) / 10;

      return {
        day,
        historicalOrders: historical.count,
        historicalRevenue: historical.revenue,
        forecastedOrders: avgOrders,
        estimatedRevenue: Math.round(avgOrders * (vendor.avgOrderValue || 300)),
        confidence: this.getConfidenceLevel(historical.count)
      };
    });

    const nextCookingDay = this.getNextCookingDay(cookingDays);
    const todayForecast = forecast.find(f => f.day === nextCookingDay);

    return {
      cookingDays: forecast,
      nextCookingDay,
      nextDayForecast: todayForecast || null,
      totalHistoricalOrders: pastOrders.length,
      avgOrdersPerDay: pastOrders.length / 4
    };
  }

  getNextCookingDay(cookingDays) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    const todayIndex = days.indexOf(today);
    for (let i = 0; i < 7; i++) {
      const checkIndex = (todayIndex + i) % 7;
      if (cookingDays.includes(days[checkIndex])) {
        return days[checkIndex];
      }
    }
    return cookingDays[0] || days[todayIndex];
  }

  getConfidenceLevel(orderCount) {
    if (orderCount >= 10) return 'high';
    if (orderCount >= 5) return 'medium';
    return 'low';
  }
}

module.exports = new VendorForecastService();