const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Never let a slow/unreachable SMTP provider hold an HTTP request open.
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
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

// Send delivery verification code to customer
async function sendDeliveryNotification({ to, orderNumber, verificationCode, restaurantName }) {
  try {
    const subject = `Delivery Verification Code - Order #${orderNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E8621A;">Your Rider Has Arrived! 🛵</h2>
        <p>Your order from <strong>${restaurantName}</strong> is at your door.</p>
        <p style="font-size: 14px; color: #555;">Please provide the following verification code to your rider to confirm delivery:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background: #FFF1E8; padding: 20px 40px; border-radius: 12px; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #E8621A;">
            ${verificationCode}
          </div>
        </div>
        <p style="font-size: 12px; color: #999;">If you did not order food, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #999;">VibeChops - Discover, Explore and Eat what you love</p>
      </div>
    `;
    await transporter.sendMail({ from: transporter.options.auth?.user, to, subject, html });
  } catch (error) {
    console.error('Failed to send delivery notification email:', error.message);
  }
}

module.exports = { sendOrderConfirmation, sendOrderStatusUpdate, sendDeliveryNotification };
