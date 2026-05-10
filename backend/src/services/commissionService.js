const Commission = require('../models/Commission');
const Order = require('../models/Order');

class CommissionService {
  calculateRestaurantCommission(orderTotal) {
    const commissionRate = 0.18;
    const commission = orderTotal * commissionRate;
    const net = orderTotal - commission;
    return {
      gross: orderTotal,
      commission,
      net,
      rate: '18%',
      commissionRate,
    };
  }

  calculateVendorCommission(orderTotal) {
    const commissionRate = 0.15;
    const commission = orderTotal * commissionRate;
    const net = orderTotal - commission;
    return {
      gross: orderTotal,
      commission,
      net,
      rate: '15%',
      commissionRate,
    };
  }

  calculateDeliveryCommission(deliveryFee) {
    // Delivery fee goes entirely to delivery company
    return {
      gross: deliveryFee,
      commission: 0,
      net: deliveryFee,
      rate: '0%',
      commissionRate: 0,
    };
  }

  async recordCommission(orderId, type, amounts) {
    const commission = new Commission({
      orderId,
      type,
      gross: amounts.gross,
      commissionRate: amounts.rate,
      commissionAmount: amounts.commission,
      netAmount: amounts.net,
      status: 'pending',
    });
    await commission.save();
    return commission;
  }

  async markCommissionPaid(commissionId) {
    const commission = await Commission.findByIdAndUpdate(
      commissionId,
      {
        status: 'paid',
        paidAt: new Date(),
      },
      { new: true }
    );
    return commission;
  }

  async getCommissionsByType(type, status = null) {
    const query = { type };
    if (status) {
      query.status = status;
    }
    return await Commission.find(query).populate('orderId').sort({ createdAt: -1 });
  }

  async getTotalEarningsByType(type) {
    const commissions = await Commission.find({ type, status: 'paid' });
    return commissions.reduce((total, c) => total + c.netAmount, 0);
  }

  async getPendingEarningsByType(type) {
    const commissions = await Commission.find({ type, status: 'pending' });
    return commissions.reduce((total, c) => total + c.netAmount, 0);
  }
}

module.exports = new CommissionService();
