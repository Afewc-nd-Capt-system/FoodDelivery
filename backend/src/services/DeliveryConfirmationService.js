const Order = require('../models/Order');
const DeliveryPartner = require('../models/DeliveryPartner');
const User = require('../models/User');
const CustomerTrustService = require('./CustomerTrustService');

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

    // Note: Email/SMS notification would be implemented here
    // await this.notifyCustomer(order, customerCode);

    return { order, customerCode };
  }

  static async notifyCustomer(order, verificationCode) {
    const user = await User.findById(order.user);
    if (!user || !user.email) return;

    // Email notification would be implemented here
    // await EmailService.sendDeliveryNotification({
    //   to: user.email,
    //   orderNumber: order._id,
    //   verificationCode,
    //   restaurantName: order.restaurantName
    // });

    // SMS notification would be implemented here
    // if (user.phone) {
    //   await SMSService.sendDeliveryNotification({
    //     to: user.phone,
    //     verificationCode,
    //     orderNumber: order._id
    //   });
    // }
  }

  static async customerConfirmDelivery(orderId, verificationCode, partnerId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    if (order.deliveryPartner?.toString() !== partnerId) {
      throw new Error('Not authorized for this order');
    }

    if (!order.deliveryConfirmation.riderConfirmed) {
      throw new Error('Rider has not confirmed arrival yet');
    }

    if (order.deliveryConfirmation.customerVerificationCode !== verificationCode) {
      throw new Error('Invalid verification code');
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

    order.status = 'delivered';
    order.deliveredAt = new Date();
    
    await order.save();

    // Update partner stats
    await DeliveryPartner.findByIdAndUpdate(partnerId, {
      currentOrder: null,
      $inc: { earnings: 30, totalDeliveries: 1 }
    });

    // Update customer trust metrics
    await CustomerTrustService.updateTrustMetrics(order.user, 'successful_delivery', {
      paymentMethod: order.paymentMethod
    });

    return order;
  }

  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = DeliveryConfirmationService;
