const Queue = require('bull');
const Redis = require('ioredis');
const nodemailer = require('nodemailer');

// Create email queue with error handling
let emailQueue;

(async () => {
  try {
    if (process.env.REDIS_HOST || process.env.REDIS_URL) {
      const redisUrl = process.env.REDIS_URL ||
        (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : '')

      const isUpstash = redisUrl.includes('upstash.io')

      const redisConnection = isUpstash ? new Redis(redisUrl, {
        tls: { rejectUnauthorized: false },
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true,
      }) : new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true,
      })

      emailQueue = new Queue('financial-emails', {
        createClient: (type) => {
          switch (type) {
            case 'client':
              return redisConnection
            case 'subscriber':
              return redisConnection.duplicate()
            case 'bclient':
              return redisConnection.duplicate()
            default:
              return redisConnection
          }
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      emailQueue.on('error', (err) => {
        console.error('Bull queue error (continuing without queue):', err.message);
      });

      if (typeof emailQueue.waitUntilReady === 'function') {
        await emailQueue.waitUntilReady();
      }
      console.log('Email queue ready');
    } else {
      throw new Error('Redis not configured');
    }
  } catch (error) {
    console.warn('Email queue not available, continuing without it:', error.message);

    emailQueue = {
      add: async (name, data, options = {}) => {
        console.log(`Processing email job directly: ${name}`);
        try {
          await processJobDirectly(name, data);
          return { id: Date.now(), data: { name, data } };
        } catch (err) {
          console.error(`Failed to process job ${name}:`, err);
          throw err;
        }
      },
      process: () => {},
      close: async () => {},
      on: () => {},
      waitUntilReady: () => Promise.resolve(),
    };
  }
})();

// Process jobs directly when queue is not available
async function processJobDirectly(name, data) {
  switch (name) {
    case 'weekly-earnings-summary':
      const { userEmail, restaurantName, ordersCount, gross, commission, netEarnings, pendingPayout } = data;
      const weeklyHtml = `
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
      await sendEmail(userEmail, 'Your VibeChops Earnings This Week', weeklyHtml);
      break;
    
    case 'subscription-renewal-reminder':
      const { userEmail: subEmail, planName: renewalPlanName, renewalDate, amount: renewalAmount } = data;
      const renewalHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E8621A;">Subscription Renewal Reminder</h2>
          <p>Your VibeChops <strong>${renewalPlanName}</strong> subscription renews in 7 days.</p>
          <ul>
            <li>Renewal date: ${new Date(renewalDate).toLocaleDateString()}</li>
            <li>Amount: ₦${renewalAmount.toLocaleString()}</li>
          </ul>
          <p>
            <a href="${process.env.FRONTEND_URL}/subscription" style="background: #E8621A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Manage Subscription
            </a>
          </p>
        </div>
      `;
      await sendEmail(subEmail, `Your VibeChops ${renewalPlanName} subscription renews in 7 days`, renewalHtml);
      break;
    
    case 'payout-processed':
      const { userEmail: payoutEmail, amount: payoutAmount, bankDetails } = data;
      const payoutHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16A34A;">Payout Processed Successfully</h2>
          <p>Your payout of <strong>₦${payoutAmount.toLocaleString()}</strong> has been processed.</p>
          <p>Bank details: ${bankDetails}</p>
          <p>Expected arrival: Within 24-48 hours</p>
        </div>
      `;
      await sendEmail(payoutEmail, `Your payout of ₦${payoutAmount.toLocaleString()} has been processed`, payoutHtml);
      break;
    
    case 'ad-campaign-live':
      const { userEmail: adEmail, placement, startDate, budget } = data;
      const adHtml = `
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
      await sendEmail(adEmail, 'Your ad campaign is now live!', adHtml);
      break;
    
    case 'ad-budget-warning':
      const { userEmail: budgetEmail, remainingBudget } = data;
      const budgetHtml = `
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
      await sendEmail(budgetEmail, 'Your ad campaign budget is almost used up', budgetHtml);
      break;
    
    case 'subscription-usage-alert':
      const { userEmail: usageEmail, planName: usagePlanName } = data;
      const usageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E8621A;">You're Not Using Your ${usagePlanName} Benefits!</h2>
          <p>We noticed you're not using all the features included in your ${usagePlanName} plan.</p>
          <p>Make sure to take advantage of your promotions, analytics, and priority listing features to maximize your visibility.</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #E8621A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Dashboard
            </a>
          </p>
        </div>
      `;
      await sendEmail(usageEmail, `You're not using your ${usagePlanName} benefits!`, usageHtml);
      break;
    
    default:
      console.log(`Unknown job type: ${name}`);
  }
}

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
