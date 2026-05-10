const User = require('../models/User');

class CustomerTrustService {
  static async updateTrustMetrics(userId, eventType, orderData) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const metrics = user.trustMetrics || {
      successfulDeliveries: 0,
      failedDeliveries: 0,
      prepaidOrdersCompleted: 0,
      refundCount: 0,
      disputeCount: 0,
      reliabilityScore: 100,
      lastUpdated: new Date()
    };

    switch (eventType) {
      case 'successful_delivery':
        metrics.successfulDeliveries += 1;
        if (orderData.paymentMethod !== 'cash' && orderData.paymentMethod !== 'pay_on_delivery') {
          metrics.prepaidOrdersCompleted += 1;
        }
        break;
      case 'failed_delivery':
        metrics.failedDeliveries += 1;
        break;
      case 'refund_issued':
        metrics.refundCount += 1;
        break;
      case 'dispute_opened':
        metrics.disputeCount += 1;
        break;
      case 'dispute_resolved':
        metrics.disputeCount = Math.max(0, metrics.disputeCount - 1);
        break;
      case 'cancellation':
        // Cancellations are tracked separately in consecutiveCancellations and totalCancellations
        break;
    }

    // Calculate reliability score
    metrics.reliabilityScore = this.calculateReliabilityScore(metrics);
    metrics.lastUpdated = new Date();

    user.trustMetrics = metrics;
    await user.save();

    // Check if penalty needs to be applied or lifted
    await this.checkPenaltyStatus(user);

    return metrics;
  }

  static calculateReliabilityScore(metrics) {
    const totalOrders = metrics.successfulDeliveries + metrics.failedDeliveries;
    if (totalOrders === 0) return 100;

    const successRate = metrics.successfulDeliveries / totalOrders;
    const penaltyFactor = (metrics.refundCount * 5) + (metrics.disputeCount * 10);
    const baseScore = successRate * 100;
    
    return Math.max(0, Math.min(100, baseScore - penaltyFactor));
  }

  static async checkPenaltyStatus(user) {
    const metrics = user.trustMetrics || {
      successfulDeliveries: 0,
      failedDeliveries: 0,
      prepaidOrdersCompleted: 0,
      refundCount: 0,
      disputeCount: 0,
      reliabilityScore: 100,
      lastUpdated: new Date()
    };
    
    // Apply POD penalty
    if (user.consecutiveCancellations >= 2 || user.totalCancellations >= 5) {
      if (!user.payOnDeliveryEnabled) return; // Already disabled
      
      user.payOnDeliveryEnabled = false;
      user.penaltyApplied = true;
      user.ordersSincePenalty = 0;
      
      user.penaltyHistory.push({
        type: 'pod_disabled',
        reason: `${user.consecutiveCancellations} consecutive cancellations, ${user.totalCancellations} total`,
        appliedAt: new Date()
      });
    }

    // Re-enable POD after 5 prepaid orders
    if (user.penaltyApplied && metrics.prepaidOrdersCompleted >= 5) {
      user.payOnDeliveryEnabled = true;
      user.penaltyApplied = false;
      user.ordersSincePenalty = 0;
      user.consecutiveCancellations = 0;
      
      const lastPenalty = user.penaltyHistory.find(p => p.type === 'pod_disabled' && !p.liftedAt);
      if (lastPenalty) {
        lastPenalty.liftedAt = new Date();
      }
    }

    await user.save();
  }

  static async getTrustProfile(userId) {
    const user = await User.findById(userId).select('trustMetrics penaltyHistory payOnDeliveryEnabled consecutiveCancellations totalCancellations');
    if (!user) throw new Error('User not found');

    const metrics = user.trustMetrics || {
      successfulDeliveries: 0,
      failedDeliveries: 0,
      prepaidOrdersCompleted: 0,
      refundCount: 0,
      disputeCount: 0,
      reliabilityScore: 100,
      lastUpdated: new Date()
    };

    return {
      reliabilityScore: metrics.reliabilityScore,
      payOnDeliveryEligible: user.payOnDeliveryEnabled,
      consecutiveCancellations: user.consecutiveCancellations,
      totalCancellations: user.totalCancellations,
      successfulDeliveries: metrics.successfulDeliveries,
      failedDeliveries: metrics.failedDeliveries,
      prepaidOrdersCompleted: metrics.prepaidOrdersCompleted,
      refundCount: metrics.refundCount,
      disputeCount: metrics.disputeCount,
      penaltyHistory: user.penaltyHistory,
      canReenablePOD: user.penaltyApplied && metrics.prepaidOrdersCompleted >= 5,
      prepaidOrdersNeeded: user.penaltyApplied ? Math.max(0, 5 - metrics.prepaidOrdersCompleted) : 0
    };
  }
}

module.exports = CustomerTrustService;
