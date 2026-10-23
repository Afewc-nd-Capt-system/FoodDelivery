const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');
const DeliveryCompany = require('../models/DeliveryCompany');
const LoyaltyConfig = require('../models/LoyaltyConfig');
const LoyaltyPoints = require('../models/LoyaltyPoints');
const Commission = require('../models/Commission');
const commissionService = require('./commissionService');

async function awardLoyalty(order) {
  const existing = await LoyaltyPoints.findOne({
    user: order.user,
    order: order._id,
    type: 'earned',
  });
  if (existing) return existing;

  const config = await LoyaltyConfig.findOne({ isActive: true });
  const rate = config?.pointsEarnRate ?? 1;
  const points = Math.floor(Number(order.totalAmount || 0) * Number(rate));

  if (!(points > 0)) return null;

  const record = await LoyaltyPoints.create({
    user: order.user,
    points,
    type: 'earned',
    description: `Loyalty points for order ${order._id}`,
    order: order._id,
  });

  await User.findByIdAndUpdate(order.user, { $inc: { loyaltyPoints: points } });
  order.loyaltyPointsEarned = (order.loyaltyPointsEarned || 0) + points;
  await order.save();

  return record;
}

async function ensureCommission(order, type, amounts) {
  const existing = await Commission.findOne({ orderId: order._id, type });
  if (existing) return existing;
  return commissionService.recordCommission(order._id, type, amounts);
}

/**
 * Finalize a delivered order exactly once: status, loyalty, commission ledger,
 * and rider/company delivery counters. Both the customer verification flow and
 * the legacy OTP confirm-delivery endpoint use this service.
 */
async function completeOrder(order, { partnerId } = {}) {
  const wasCompleted = order.status === 'completed';

  if (!wasCompleted) {
    order.status = 'completed';
    order.deliveredAt = order.deliveredAt || new Date();
    await order.save();
  }

  await awardLoyalty(order);

  if (order.restaurant) {
    await ensureCommission(
      order,
      'restaurant',
      commissionService.calculateRestaurantCommission(order.totalAmount)
    );
  }
  if (order.vendor) {
    await ensureCommission(
      order,
      'vendor',
      commissionService.calculateVendorCommission(order.totalAmount)
    );
  }
  if (order.deliveryFee) {
    await ensureCommission(
      order,
      'delivery',
      commissionService.calculateDeliveryCommission(order.deliveryFee)
    );
  }

  if (!wasCompleted && partnerId) {
    const partner = await DeliveryPartner.findById(partnerId);
    if (partner) {
      const riderEarning = Math.round(Number(order.deliveryFee || 0) * 0.8) || 30;
      await DeliveryPartner.findByIdAndUpdate(partnerId, {
        currentOrder: null,
        $inc: { earnings: riderEarning, totalDeliveries: 1 },
      });
    }
  }

  if (!wasCompleted && order.deliveryCompany) {
    await DeliveryCompany.findByIdAndUpdate(order.deliveryCompany, {
      $inc: { totalDeliveries: 1 },
    });
  }

  return order;
}

module.exports = { completeOrder };
