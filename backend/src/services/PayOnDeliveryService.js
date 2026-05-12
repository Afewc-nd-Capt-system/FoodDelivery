const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const MenuItem = require('../models/MenuItem');

class PayOnDeliveryService {
  static async checkPODEligibility(order, user, restaurantOrVendor) {
    const checks = {
      userEligible: await this.checkUserEligibility(user),
      restaurantEligible: await this.checkRestaurantEligibility(restaurantOrVendor),
      orderAmountEligible: await this.checkOrderAmount(order, restaurantOrVendor),
      timeEligible: await this.checkTimeEligibility(restaurantOrVendor),
      productEligible: await this.checkProductEligibility(order, restaurantOrVendor),
      trustedCustomer: await this.checkTrustedCustomer(user, restaurantOrVendor)
    };

    return {
      allowed: Object.values(checks).every(v => v === true || v === null),
      checks,
      reason: this.getFailureReason(checks)
    };
  }

  static async checkUserEligibility(user) {
    return user.payOnDeliveryEnabled && !user.penaltyApplied;
  }

  static async checkRestaurantEligibility(restaurantOrVendor) {
    const config = restaurantOrVendor.payOnDeliveryConfig || { enabled: true };
    return config.enabled !== false;
  }

  static async checkOrderAmount(order, restaurantOrVendor) {
    const config = restaurantOrVendor.payOnDeliveryConfig || {};
    if (config.minOrderAmount && order.totalAmount < config.minOrderAmount) {
      return false;
    }
    if (config.maxOrderAmount && order.totalAmount > config.maxOrderAmount) {
      return false;
    }
    return true;
  }

  static async checkTimeEligibility(restaurantOrVendor) {
    const config = restaurantOrVendor.payOnDeliveryConfig || {};
    if (!config.allowedTimeRanges || config.allowedTimeRanges.length === 0) {
      return true;
    }
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const time = now.toTimeString().slice(0, 5); // 'HH:MM'
    
    const todayRange = config.allowedTimeRanges.find(r => r.day === day);
    if (!todayRange) return false;
    
    return time >= todayRange.startTime && time <= todayRange.endTime;
  }

  static async checkProductEligibility(order, restaurantOrVendor) {
    const config = restaurantOrVendor.payOnDeliveryConfig || {};
    if (!config.productLevelControl) return true;
    
    const menuItemIds = order.items.map(item => item.menuItem);
    
    // For restaurants, check menu items in the restaurant menu
    if (restaurantOrVendor.menu) {
      const menuItems = restaurantOrVendor.menu.filter(item => 
        menuItemIds.includes(item._id?.toString())
      );
      
      return menuItems.every(item => item.allowPayOnDelivery !== false);
    }
    
    return true;
  }

  static async checkTrustedCustomer(user, restaurantOrVendor) {
    const config = restaurantOrVendor.payOnDeliveryConfig || {};
    if (!config.trustedCustomerWhitelist || config.trustedCustomerWhitelist.length === 0) {
      return null; // Not applicable
    }
    return config.trustedCustomerWhitelist.includes(user._id);
  }

  static getFailureReason(checks) {
    if (!checks.userEligible) return 'USER_NOT_ELIGIBLE';
    if (!checks.restaurantEligible) return 'RESTAURANT_NOT_ELIGIBLE';
    if (!checks.orderAmountEligible) return 'ORDER_AMOUNT_INVALID';
    if (!checks.timeEligible) return 'TIME_RESTRICTED';
    if (!checks.productEligible) return 'PRODUCT_RESTRICTED';
    return null;
  }
}

module.exports = PayOnDeliveryService;
