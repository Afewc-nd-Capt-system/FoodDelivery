const DeliveryConfig = require('../models/DeliveryConfig');
const Restaurant = require('../models/Restaurant');

class DeliveryService {
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  getCurrentSurgeMultiplier() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;

    let multiplier = 1;

    if (day === 0 || day === 6) {
      multiplier = 1.2;
    }

    const config = DeliveryConfig.findOne({ isActive: true });
    if (config?.surgePricing?.enabled) {
      for (const peak of config.surgePricing.peakHours) {
        if (timeStr >= peak.start && timeStr <= peak.end) {
          multiplier = Math.max(multiplier, peak.multiplier);
        }
      }
    }

    return multiplier;
  }

  async calculateDeliveryFee(restaurantId, userLat, userLng, orderValue = 0) {
    let config = await DeliveryConfig.findOne({ isActive: true });

    if (!config) {
      config = await DeliveryConfig.create({
        baseDeliveryFee: 40,
        perKmFee: 10,
        freeDeliveryThreshold: 2000,
        maxDeliveryRadius: 15,
        isActive: true
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    let distance = 0;
    if (restaurant.locationCoords && userLat && userLng) {
      distance = this.haversineDistance(
        restaurant.locationCoords.lat,
        restaurant.locationCoords.lng,
        userLat,
        userLng
      );
    }

    if (distance > config.maxDeliveryRadius) {
      return {
        available: false,
        reason: `Delivery not available beyond ${config.maxDeliveryRadius}km`,
        distance: Math.round(distance),
        maxRadius: config.maxDeliveryRadius
      };
    }

    const surgeMultiplier = this.getCurrentSurgeMultiplier();

    let deliveryFee = config.baseDeliveryFee + (distance * config.perKmFee);
    deliveryFee = deliveryFee * surgeMultiplier;

    deliveryFee = Math.round(deliveryFee);

    let freeDelivery = false;
    if (orderValue >= config.freeDeliveryThreshold) {
      freeDelivery = true;
      deliveryFee = 0;
    }

    return {
      available: true,
      distance: Math.round(distance * 10) / 10,
      deliveryFee,
      surgeMultiplier,
      isFree: freeDelivery,
      freeThreshold: config.freeDeliveryThreshold,
      baseFee: config.baseDeliveryFee,
      perKmFee: config.perKmFee,
      breakdown: {
        baseFee: config.baseDeliveryFee,
        distanceFee: Math.round(distance * config.perKmFee),
        surgeAdjustment: Math.round(deliveryFee - (config.baseDeliveryFee + distance * config.perKmFee))
      }
    };
  }

  async calculateVendorDeliveryFee(vendorId, userLat, userLng) {
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    let distance = 0;
    if (vendor.locationCoords && userLat && userLng) {
      distance = this.haversineDistance(
        vendor.locationCoords.lat,
        vendor.locationCoords.lng,
        userLat,
        userLng
      );
    }

    const baseFee = 50;
    const deliveryFee = Math.round(baseFee + (distance * 15));

    return {
      distance: Math.round(distance * 10) / 10,
      deliveryFee,
      estimatedTime: vendor.preparationTime || 60
    };
  }
}

module.exports = new DeliveryService();