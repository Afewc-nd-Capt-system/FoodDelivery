'use strict';

const mailService = require('../services/mailService');
const templates = require('../services/emailTemplates');

// Compatibility facade over the single mail service. All callers route here.
async function sendEmail({ to, subject, html, text, type = 'general', replyTo }) {
  return mailService.queueEmail({ type, to, subject, html, text, replyTo });
}

async function sendWelcomeEmail(to, name) {
  const template = templates.welcome({ name });
  return sendEmail({ to, ...template, type: 'welcome' });
}

async function sendPasswordResetEmail(to, resetUrl, name) {
  const template = templates.passwordReset({ name, resetUrl });
  return sendEmail({ to, ...template, type: 'password-reset' });
}

async function sendOrderConfirmation(to, order) {
  const template = templates.orderConfirmation({ order });
  return sendEmail({ to, ...template, type: 'order-confirmation' });
}

async function sendOrderStatusUpdate(to, order) {
  const template = templates.orderStatus({ order, status: order.status });
  return sendEmail({ to, ...template, type: 'order-status' });
}

async function sendDeliveryNotification({ to, orderNumber, verificationCode, restaurantName }) {
  const template = templates.deliveryOtp({ orderNumber, verificationCode, restaurantName });
  return sendEmail({ to, ...template, type: 'delivery-otp' });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendDeliveryNotification,
};
