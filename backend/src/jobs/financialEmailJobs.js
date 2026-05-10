const Queue = require('bull');
const nodemailer = require('nodemailer');

// Create email queue
const emailQueue = new Queue('financial-emails', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Helper: Send email
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'VibeChops <noreply@vibechops.com>',
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
}

// Job: Weekly earnings summary (every Monday 8am)
emailQueue.process('weekly-earnings-summary', async (job) => {
  const { userEmail, restaurantName, ordersCount, gross, commission, netEarnings, pendingPayout } = job.data;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #E8621A;">Your VibeChops Earnings This Week</h2>
      <p>Hello ${restaurantName},</p>
      <p>Here's your weekly earnings summary:</p>
      <ul>
        <li>Orders completed: ${ordersCount}</li>
        <li>Gross revenue: ₦${gross.toLocaleString()}</li>
        <li>Commission deducted: ₦${commission.toLocaleString()}</li>
        <li>Net earnings: ₦${netEarnings.toLocaleString()}</li>
        <li>Pending payout balance: ₦${pendingPayout.toLocaleString()}</li>
      </ul>
      <p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #E8621A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Dashboard
        </a>
      </p>
    </div>
  `;

  await sendEmail(userEmail, 'Your VibeChops Earnings This Week', html);
});

// Job: Subscription renewal reminder (7 days before expiry)
emailQueue.process('subscription-renewal-reminder', async (job) => {
  const { userEmail, planName, renewalDate, amount } = job.data;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #E8621A;">Subscription Renewal Reminder</h2>
      <p>Your VibeChops <strong>${planName}</strong> subscription renews in 7 days.</p>
      <ul>
        <li>Renewal date: ${new Date(renewalDate).toLocaleDateString()}</li>
        <li>Amount: ₦${amount.toLocaleString()}</li>
      </ul>
      <p>
        <a href="${process.env.FRONTEND_URL}/subscription" style="background: #E8621A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Manage Subscription
        </a>
      </p>
    </div>
  `;

  await sendEmail(userEmail, `Your VibeChops ${planName} subscription renews in 7 days`, html);
});

// Job: Payout processed notification
emailQueue.process('payout-processed', async (job) => {
  const { userEmail, amount, bankDetails } = job.data;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16A34A;">Payout Processed Successfully</h2>
      <p>Your payout of <strong>₦${amount.toLocaleString()}</strong> has been processed.</p>
      <p>Bank details: ${bankDetails}</p>
      <p>Expected arrival: Within 24-48 hours</p>
    </div>
  `;

  await sendEmail(userEmail, `Your payout of ₦${amount.toLocaleString()} has been processed`, html);
});

// Job: Ad campaign going live
emailQueue.process('ad-campaign-live', async (job) => {
  const { userEmail, placement, startDate, budget } = job.data;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #E8621A;">Your Ad Campaign is Now Live!</h2>
      <p>Your ad campaign is now active:</p>
      <ul>
        <li>Placement: ${placement}</li>
        <li>Start date: ${new Date(startDate).toLocaleDateString()}</li>
        <li>Budget: ₦${budget.toLocaleString()}</li>
      </ul>
      <p>
        <a href="${process.env.FRONTEND_URL}/dashboard/advertise" style="background: #E8621A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Analytics
        </a>
      </p>
    </div>
  `;

  await sendEmail(userEmail, 'Your ad campaign is now live!', html);
});

// Job: Ad budget 80% exhausted
emailQueue.process('ad-budget-warning', async (job) => {
  const { userEmail, remainingBudget } = job.data;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #F59E0B;">Ad Budget Almost Used Up</h2>
      <p>Your ad campaign budget is almost used up.</p>
      <p>Remaining budget: ₦${remainingBudget.toLocaleString()}</p>
      <p>
        <a href="${process.env.FRONTEND_URL}/dashboard/advertise" style="background: #E8621A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Top Up Budget
        </a>
      </p>
    </div>
  `;

  await sendEmail(userEmail, 'Your ad campaign budget is almost used up', html);
});

// Job: Low subscription usage alert
emailQueue.process('subscription-usage-alert', async (job) => {
  const { userEmail, planName } = job.data;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #E8621A;">You're Not Using Your ${planName} Benefits!</h2>
      <p>We noticed you're not using all the features included in your ${planName} plan.</p>
      <p>Make sure to take advantage of your promotions, analytics, and priority listing features to maximize your visibility.</p>
      <p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #E8621A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Dashboard
        </a>
      </p>
    </div>
  `;

  await sendEmail(userEmail, `You're not using your ${planName} benefits!`, html);
});

module.exports = {
  emailQueue,
  sendEmail,
};
