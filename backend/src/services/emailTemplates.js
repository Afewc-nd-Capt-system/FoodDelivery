'use strict';

const { frontendUrl } = require('../config/frontend');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shortId(value) {
  return String(value || '').slice(-8).toUpperCase();
}

function layout({ heading, body, ctaLabel, ctaUrl, footnote }) {
  const cta = ctaLabel && ctaUrl
    ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#E8621A;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;">${escapeHtml(ctaLabel)}</a>`
    : '';
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:Arial,Helvetica,sans-serif;color:#1C1C1E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #F0EAE0;">
        <tr><td style="background:#E8621A;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:800;">VibeChops</td></tr>
        <tr><td style="padding:28px 24px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1C1C1E;">${escapeHtml(heading)}</h1>
          <div style="font-size:15px;line-height:1.65;color:#3A3A3C;">${body}</div>
          ${cta ? `<div style="margin:24px 0;">${cta}</div>` : ''}
          ${footnote ? `<p style="font-size:12px;color:#8E8E93;margin:24px 0 0;">${footnote}</p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 24px;background:#FFF8F0;color:#8E8E93;font-size:12px;">VibeChops · Discover, explore and eat what you love</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcome({ name }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: 'Welcome to VibeChops!',
    html: layout({
      heading: 'Welcome to VibeChops',
      body: `<p>Hi ${safeName},</p><p>Your account is ready. Discover great Nigerian food, order in a few taps, and track it to your door.</p>`,
      ctaLabel: 'Browse restaurants',
      ctaUrl: frontendUrl('/restaurants'),
      footnote: 'If you did not create this account, you can ignore this email.',
    }),
    text: `Hi ${name || 'there'},\n\nWelcome to VibeChops. Your account is ready.\nBrowse restaurants: ${frontendUrl('/restaurants')}\n\nIf you did not create this account, you can ignore this email.`,
  };
}

function passwordReset({ name, resetUrl }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: 'Reset your VibeChops password',
    html: layout({
      heading: 'Reset your password',
      body: `<p>Hi ${safeName},</p><p>We received a request to reset your VibeChops password. This link expires in 1 hour and can only be used once.</p><p>If you did not request this, no action is needed.</p>`,
      ctaLabel: 'Reset password',
      ctaUrl: resetUrl,
      footnote: 'If the button does not work, copy and paste the link from this email into your browser.',
    }),
    text: `Hi ${name || 'there'},\n\nReset your VibeChops password (expires in 1 hour, single use):\n${resetUrl}\n\nIf you did not request this, no action is needed.`,
  };
}

function partnerApplicationReceived({ name, typeLabel, businessName, city, state }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: 'We received your VibeChops partner application',
    html: layout({
      heading: 'Application received',
      body: `<p>Hi ${safeName},</p><p>Thank you for applying to be a <b>${escapeHtml(typeLabel)}</b> partner with VibeChops.</p><p>We received your application for <b>${escapeHtml(businessName)}</b> in ${escapeHtml(city || '')}${city && state ? ', ' : ''}${escapeHtml(state || '')}.</p><p>Our team reviews applications within 24-48 hours. If approved, you will receive a single-use registration link that expires in 7 days.</p>`,
      ctaLabel: 'Visit VibeChops',
      ctaUrl: frontendUrl('/'),
    }),
    text: `Hi ${name || 'there'},\n\nThank you for applying to be a ${typeLabel} partner with VibeChops.\nWe received your application for ${businessName} in ${city || ''}${city && state ? ', ' : ''}${state || ''}.\n\nIf approved, you will receive a single-use registration link that expires in 7 days.\n${frontendUrl('/')}`,
  };
}

function partnerApplicationAdmin({ name, typeLabel, businessName, email, phone, city, state, message, applicationId }) {
  return {
    subject: `New partner application: ${typeLabel} - ${businessName}`,
    html: layout({
      heading: 'New partner application',
      body: `<p><b>Type:</b> ${escapeHtml(typeLabel)}<br/>
        <b>Business:</b> ${escapeHtml(businessName)}<br/>
        <b>Name:</b> ${escapeHtml(name)}<br/>
        <b>Email:</b> ${escapeHtml(email)}<br/>
        <b>Phone:</b> ${escapeHtml(phone)}<br/>
        <b>Location:</b> ${escapeHtml(city || '')}, ${escapeHtml(state || '')}<br/>
        <b>Message:</b> ${escapeHtml(message || 'N/A')}</p>
        <p>Application ID: ${escapeHtml(applicationId)}</p>`,
      ctaLabel: 'Review in the admin dashboard',
      ctaUrl: frontendUrl('/admin/dashboard'),
    }),
    text: `New ${typeLabel} partner application\nBusiness: ${businessName}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nLocation: ${city || ''}, ${state || ''}\nMessage: ${message || 'N/A'}\nApplication ID: ${applicationId}\n${frontendUrl('/admin/dashboard')}`,
  };
}

function partnerApproved({ name, typeLabel, businessName, inviteUrl }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: `You're approved to join VibeChops as a ${typeLabel}`,
    html: layout({
      heading: 'Your application is approved',
      body: `<p>Hi ${safeName},</p><p>Your application for <b>${escapeHtml(businessName)}</b> has been approved.</p><p>Use this single-use registration link. It expires in 7 days.</p>`,
      ctaLabel: 'Complete registration',
      ctaUrl: inviteUrl,
      footnote: 'The link can only be used once. If it expires, contact support for a new one.',
    }),
    text: `Hi ${name || 'there'},\n\nYour application for ${businessName} has been approved.\nComplete registration (single use, expires in 7 days):\n${inviteUrl}\n\nIf it expires, contact support for a new one.`,
  };
}

function partnerRejected({ name, businessName, reason }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: 'Update on your VibeChops partner application',
    html: layout({
      heading: 'Application update',
      body: `<p>Hi ${safeName},</p><p>Unfortunately we can't approve your application for <b>${escapeHtml(businessName)}</b> at this time.</p><p><b>Reason:</b> ${escapeHtml(reason)}</p><p>You are welcome to apply again once the issue is resolved.</p>`,
      ctaLabel: 'Re-apply',
      ctaUrl: frontendUrl('/contact'),
    }),
    text: `Hi ${name || 'there'},\n\nUnfortunately we can't approve your application for ${businessName} at this time.\nReason: ${reason}\n\nYou are welcome to apply again once the issue is resolved: ${frontendUrl('/contact')}`,
  };
}

function vendorApproved({ name }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: 'Your VibeChops vendor application is approved',
    html: layout({
      heading: 'Congratulations!',
      body: `<p>Hi ${safeName},</p><p>Your vendor application has been approved. You can now sign in to manage your kitchen, menu and orders.</p>`,
      ctaLabel: 'Open vendor dashboard',
      ctaUrl: frontendUrl('/vendor-login'),
    }),
    text: `Hi ${name || 'there'},\n\nYour VibeChops vendor application has been approved.\nSign in: ${frontendUrl('/vendor-login')}`,
  };
}

function vendorRejected({ name, reason }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: 'Update on your VibeChops vendor application',
    html: layout({
      heading: 'Application update',
      body: `<p>Hi ${safeName},</p><p>Your vendor application was not approved at this time.</p><p><b>Reason:</b> ${escapeHtml(reason || 'Application not approved')}</p><p>You can contact support or apply again once the issue is resolved.</p>`,
      ctaLabel: 'Contact support',
      ctaUrl: frontendUrl('/contact'),
    }),
    text: `Hi ${name || 'there'},\n\nYour vendor application was not approved at this time.\nReason: ${reason || 'Application not approved'}\nContact support: ${frontendUrl('/contact')}`,
  };
}

function riderApproved({ name }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: 'Your VibeChops rider verification is approved',
    html: layout({
      heading: 'You are approved',
      body: `<p>Hi ${safeName},</p><p>Your rider verification is approved. You can now go online and accept deliveries.</p>`,
      ctaLabel: 'Open rider dashboard',
      ctaUrl: frontendUrl('/rider-login'),
    }),
    text: `Hi ${name || 'there'},\n\nYour rider verification is approved.\nOpen the rider dashboard: ${frontendUrl('/rider-login')}`,
  };
}

function riderRejected({ name, reason }) {
  const safeName = escapeHtml(name || 'there');
  return {
    subject: 'Update on your VibeChops rider verification',
    html: layout({
      heading: 'Verification not approved',
      body: `<p>Hi ${safeName},</p><p><b>Reason:</b> ${escapeHtml(reason || 'Documents could not be verified')}</p><p>Please re-upload valid documents from the verification page.</p>`,
      ctaLabel: 'Open rider dashboard',
      ctaUrl: frontendUrl('/rider-login'),
    }),
    text: `Hi ${name || 'there'},\n\nYour rider verification was not approved.\nReason: ${reason || 'Documents could not be verified'}\nRe-upload valid documents from the rider dashboard: ${frontendUrl('/rider-login')}`,
  };
}

function deliveryOtp({ orderNumber, verificationCode, restaurantName }) {
  return {
    subject: `Delivery verification code for order #${shortId(orderNumber)}`,
    html: layout({
      heading: 'Your rider has arrived',
      body: `<p>Your order from <b>${escapeHtml(restaurantName || 'VibeChops')}</b> is at your door.</p><p>Give this code to your rider to confirm delivery:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#E8621A;margin:20px 0;">${escapeHtml(verificationCode)}</p>`,
      footnote: 'If you did not order food, please ignore this email.',
    }),
    text: `Your order from ${restaurantName || 'VibeChops'} is at your door.\nGive this code to your rider to confirm delivery: ${verificationCode}\n\nIf you did not order food, please ignore this email.`,
  };
}

function orderConfirmation({ order }) {
  const items = (order.items || []).map((item) => {
    const options = (item.customizations || []).map((c) => c.option).filter(Boolean).join(', ');
    return `${item.quantity}x ${item.name}${options ? ` (${options})` : ''}`;
  });
  const total = Number(order.totalAmount || 0).toLocaleString();
  return {
    subject: `Order confirmed - #${shortId(order._id)}`,
    html: layout({
      heading: 'Order confirmed',
      body: `<p>Your order #${escapeHtml(shortId(order._id))} has been confirmed.</p><p><b>Restaurant:</b> ${escapeHtml(order.restaurantName || 'VibeChops')}<br/><b>Total:</b> ₦${escapeHtml(total)}<br/><b>Delivery to:</b> ${escapeHtml(order.deliveryAddress || '')}</p><p>${items.map(escapeHtml).join('<br/>')}</p>`,
      ctaLabel: 'Track your order',
      ctaUrl: frontendUrl('/orders'),
    }),
    text: `Your order #${shortId(order._id)} has been confirmed.\nRestaurant: ${order.restaurantName || 'VibeChops'}\nTotal: ₦${total}\nDelivery to: ${order.deliveryAddress || ''}\n${items.join('\n')}\n\nTrack: ${frontendUrl('/orders')}`,
  };
}

function orderStatus({ order, status }) {
  const labels = {
    confirmed: 'Your order has been confirmed and is being prepared.',
    preparing: 'Your order is now being prepared in the kitchen.',
    ready: 'Your order is ready and waiting for a rider.',
    'out-for-delivery': 'Your order is out for delivery!',
    delivered: 'Your order has been delivered. Enjoy your meal!',
    cancelled: 'Your order has been cancelled.',
  };
  const label = labels[status] || `Your order is now ${status}.`;
  return {
    subject: `Order update - ${status}`,
    html: layout({
      heading: 'Order update',
      body: `<p>Your order #${escapeHtml(shortId(order._id))} is now <b>${escapeHtml(status)}</b>.</p><p>${escapeHtml(label)}</p><p><b>Restaurant:</b> ${escapeHtml(order.restaurantName || 'VibeChops')}</p>`,
      ctaLabel: 'View order',
      ctaUrl: frontendUrl('/orders'),
    }),
    text: `Your order #${shortId(order._id)} is now ${status}.\n${label}\nRestaurant: ${order.restaurantName || 'VibeChops'}\n${frontendUrl('/orders')}`,
  };
}

function financialWeeklyEarnings({ data }) {
  return {
    subject: 'Your VibeChops earnings this week',
    html: layout({
      heading: 'Your weekly earnings',
      body: `<p>Orders: ${escapeHtml(data.ordersCount)}<br/>Gross: ₦${escapeHtml(Number(data.gross || 0).toLocaleString())}<br/>Commission: ₦${escapeHtml(Number(data.commission || 0).toLocaleString())}<br/>Net earnings: ₦${escapeHtml(Number(data.net || 0).toLocaleString())}</p>`,
      ctaLabel: 'View dashboard',
      ctaUrl: frontendUrl('/restaurant/dashboard'),
    }),
    text: `Your VibeChops earnings this week\nOrders: ${data.ordersCount}\nGross: ₦${Number(data.gross || 0).toLocaleString()}\nCommission: ₦${Number(data.commission || 0).toLocaleString()}\nNet earnings: ₦${Number(data.net || 0).toLocaleString()}\n${frontendUrl('/restaurant/dashboard')}`,
  };
}

function financialSubscriptionReminder({ data }) {
  return {
    subject: 'Your VibeChops subscription renews in 7 days',
    html: layout({
      heading: `Your ${escapeHtml(data.planName)} plan renews soon`,
      body: `<p>Renewal date: ${escapeHtml(data.renewalDate)}<br/>Amount: ₦${escapeHtml(Number(data.amount || 0).toLocaleString())}</p>`,
      ctaLabel: 'Manage subscription',
      ctaUrl: frontendUrl('/restaurant/subscription'),
    }),
    text: `Your ${data.planName} subscription renews in 7 days.\nRenewal date: ${data.renewalDate}\nAmount: ₦${Number(data.amount || 0).toLocaleString()}\n${frontendUrl('/restaurant/subscription')}`,
  };
}

function financialPayoutProcessed({ data }) {
  return {
    subject: 'Your payout has been processed',
    html: layout({
      heading: 'Payout processed',
      body: `<p>Your payout of ₦${escapeHtml(Number(data.amount || 0).toLocaleString())} has been processed.</p><p>Bank: ${escapeHtml(data.bankName)}<br/>Account: ${escapeHtml(data.accountNumber)}<br/>Expected arrival: 1-3 business days</p>`,
    }),
    text: `Your payout of ₦${Number(data.amount || 0).toLocaleString()} has been processed.\nBank: ${data.bankName}\nAccount: ${data.accountNumber}\nExpected arrival: 1-3 business days`,
  };
}

function financialAdCampaignLive({ data }) {
  return {
    subject: 'Your ad campaign is now live',
    html: layout({
      heading: 'Your ad campaign is live',
      body: `<p>Placement: ${escapeHtml(data.placement)}<br/>Duration: ${escapeHtml(data.startDate)} - ${escapeHtml(data.endDate)}<br/>Budget: ₦${escapeHtml(Number(data.budget || 0).toLocaleString())}</p>`,
    }),
    text: `Your ad campaign is live.\nPlacement: ${data.placement}\nDuration: ${data.startDate} - ${data.endDate}\nBudget: ₦${Number(data.budget || 0).toLocaleString()}`,
  };
}

function financialAdBudgetWarning({ data }) {
  return {
    subject: 'Your ad campaign budget is almost used up',
    html: layout({
      heading: 'Budget almost used up',
      body: `<p>Remaining budget: ₦${escapeHtml(Number(data.remaining || 0).toLocaleString())}</p>`,
      ctaLabel: 'Top up budget',
      ctaUrl: frontendUrl('/restaurant/dashboard'),
    }),
    text: `Your ad campaign budget is almost used up.\nRemaining: ₦${Number(data.remaining || 0).toLocaleString()}\n${frontendUrl('/restaurant/dashboard')}`,
  };
}

function testEmail() {
  return {
    subject: 'VibeChops test email',
    html: layout({
      heading: 'Test email',
      body: `<p>This is a test email from the VibeChops transactional mail service.</p><p>If you received it, outbound transactional email is working.</p>`,
      ctaLabel: 'Open VibeChops',
      ctaUrl: frontendUrl('/'),
    }),
    text: `This is a test email from the VibeChops transactional mail service.\nIf you received it, outbound transactional email is working.\n${frontendUrl('/')}`,
  };
}

module.exports = {
  escapeHtml,
  welcome,
  passwordReset,
  partnerApplicationReceived,
  partnerApplicationAdmin,
  partnerApproved,
  partnerRejected,
  vendorApproved,
  vendorRejected,
  riderApproved,
  riderRejected,
  deliveryOtp,
  orderConfirmation,
  orderStatus,
  financialWeeklyEarnings,
  financialSubscriptionReminder,
  financialPayoutProcessed,
  financialAdCampaignLive,
  financialAdBudgetWarning,
  testEmail,
};
