const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOrderConfirmation = async (to, order) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Order Confirmation - Food Delivery',
    html: `
      <h1>Order Confirmed!</h1>
      <p>Your order #${order._id.toString().slice(-8).toUpperCase()} has been confirmed.</p>
      <p><strong>Restaurant:</strong> ${order.restaurantName}</p>
      <p><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
      <p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>
      <p>Thank you for choosing Food Delivery!</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent to', to);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

const sendOrderStatusUpdate = async (to, order) => {
  const statusMessages = {
    'confirmed': 'Your order has been confirmed and is being prepared.',
    'preparing': 'Your order is now being prepared in the kitchen.',
    'out-for-delivery': 'Your order is out for delivery!',
    'delivered': 'Your order has been delivered. Enjoy your meal!',
    'cancelled': 'Your order has been cancelled.',
  };

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Order Update - ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`,
    html: `
      <h1>Order Status Update</h1>
      <p>Your order #${order._id.toString().slice(-8).toUpperCase()} is now <strong>${order.status}</strong>.</p>
      <p>${statusMessages[order.status] || ''}</p>
      <p><strong>Restaurant:</strong> ${order.restaurantName}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Status update email sent to', to);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

module.exports = { sendOrderConfirmation, sendOrderStatusUpdate };
