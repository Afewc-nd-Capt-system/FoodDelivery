const Order = require('../models/Order');
const User = require('../models/User');
const CustomerTrustService = require('./CustomerTrustService');
const OrderCompletionService = require('./OrderCompletionService');
const { sendDeliveryNotification } = require('../utils/email');

class DeliveryConfirmationService {
  static async riderConfirmArrival(orderId, partnerId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    
    if (order.deliveryPartner?.toString() !== partnerId) {
      throw new Error('Not authorized for this order');
    }

    // Generate customer verification code
    const customerCode = this.generateVerificationCode();
    
    order.deliveryConfirmation.riderConfirmed = true;
    order.deliveryConfirmation.riderConfirmedAt = new Date();
    order.deliveryConfirmation.customerVerificationCode = customerCode;
    
    await order.save();

    // Notify the customer without holding the rider's request open. The code is
    // already persisted on the order; delivery must not depend on SMTP.
    this.notifyCustomer(order, customerCode).catch((error) => {
      console.error('[delivery] verification email failed:', error.message);
    });

    return { order, customerCode };
  }

  static async notifyCustomer(order, verificationCode) {
    const user = await User.findById(order.user);
    if (!user || !user.email) return;

    await sendDeliveryNotification({
      to: user.email,
      orderNumber: order._id,
      verificationCode,
      restaurantName: order.restaurantName
    });
  }

  static async customerConfirmDelivery(orderId, verificationCode, partnerId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    // partnerId may be an ObjectId (from the order) or a string (from a token)
    if (!partnerId || order.deliveryPartner?.toString() !== partnerId.toString()) {
      throw new Error('Not authorized for this order');
    }

    if (!order.deliveryConfirmation.riderConfirmed) {
      throw new Error('Rider has not confirmed arrival yet');
    }

    if (order.deliveryConfirmation.customerVerificationCode !== verificationCode) {
      throw new Error('Invalid verification code');
    }

    if (order.deliveryConfirmation.customerConfirmed) {
      return order;
    }

    order.deliveryConfirmation.customerConfirmed = true;
    order.deliveryConfirmation.customerConfirmedAt = new Date();

    // If Pay on Delivery, collect payment here
    if (order.paymentMethod === 'cash' || order.paymentMethod === 'pay_on_delivery') {
      order.deliveryConfirmation.paymentCollected = true;
      order.deliveryConfirmation.paymentCollectedAt = new Date();
      order.paymentStatus = 'paid';
      order.isPaid = true;
    }

    await order.save();

    // Completion owns loyalty, the 18% restaurant commission, delivery
    // commission, and rider/company earnings so every completion path agrees.
    const completed = await OrderCompletionService.completeOrder(order, { partnerId });

    // Update customer trust metrics once per order.
    await CustomerTrustService.updateTrustMetrics(order.user, 'successful_delivery', {
      paymentMethod: order.paymentMethod
    });

    return completed;
  }

  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = DeliveryConfirmationService;
