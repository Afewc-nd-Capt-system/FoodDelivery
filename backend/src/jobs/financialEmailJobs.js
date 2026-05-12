const { Queue, Worker } = require('bullmq')
const nodemailer = require('nodemailer')

function getRedisConnection() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  try {
    const parsed = new URL(url.replace('rediss://', 'https://').replace('redis://', 'http://'))
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username || 'default',
      tls: url.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  } catch (err) {
    console.warn('Redis URL parse failed, using defaults')
    return { host: 'localhost', port: 6379, maxRetriesPerRequest: null }
  }
}

const connection = getRedisConnection()

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
})

let emailQueue = null
let emailWorker = null

async function initializeEmailQueue() {
  try {
    emailQueue = new Queue('financial-emails', { connection })

    emailWorker = new Worker('financial-emails', async (job) => {
      const { type, to, subject, html } = job.data

      try {
        await transporter.sendMail({
          from: `"VibeChops" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html,
        })
        console.log(`Email sent: ${type} to ${to}`)
      } catch (err) {
        console.error(`Email failed: ${err.message}`)
        throw err
      }
    }, {
      connection,
      concurrency: 5,
    })

    emailWorker.on('failed', (job, err) => {
      console.warn(`Email job ${job?.id} failed: ${err.message}`)
    })

    console.log('Email queue ready')
    return emailQueue

  } catch (err) {
    console.warn('Email queue initialization failed, emails will be sent directly:', err.message)
    return null
  }
}

async function addEmailJob(type, to, subject, html, options = {}) {
  if (emailQueue) {
    await emailQueue.add(type, { type, to, subject, html }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      ...options
    })
  } else {
    try {
      await transporter.sendMail({
        from: `"VibeChops" <${process.env.EMAIL_USER}>`,
        to, subject, html
      })
    } catch (err) {
      console.warn('Direct email send failed:', err.message)
    }
  }
}

async function sendWeeklyEarningsSummary(recipientEmail, data) {
  const html = `
    <h2>Your VibeChops Earnings This Week</h2>
    <p>Orders: ${data.ordersCount}</p>
    <p>Gross: ₦${data.gross?.toLocaleString()}</p>
    <p>Commission: ₦${data.commission?.toLocaleString()}</p>
    <p>Net Earnings: ₦${data.net?.toLocaleString()}</p>
    <a href="${process.env.FRONTEND_URL}/restaurant/dashboard">View Dashboard</a>
  `
  await addEmailJob('weekly-earnings', recipientEmail,
    'Your VibeChops Earnings This Week', html)
}

async function sendSubscriptionRenewalReminder(recipientEmail, data) {
  const html = `
    <h2>Your ${data.planName} subscription renews in 7 days</h2>
    <p>Renewal Date: ${data.renewalDate}</p>
    <p>Amount: ₦${data.amount?.toLocaleString()}</p>
    <a href="${process.env.FRONTEND_URL}/restaurant/subscription">Manage Subscription</a>
  `
  await addEmailJob('subscription-reminder', recipientEmail,
    `Your VibeChops subscription renews in 7 days`, html)
}

async function sendPayoutProcessed(recipientEmail, data) {
  const html = `
    <h2>Your payout of ₦${data.amount?.toLocaleString()} has been processed</h2>
    <p>Bank: ${data.bankName}</p>
    <p>Account: ${data.accountNumber}</p>
    <p>Expected arrival: 1-3 business days</p>
  `
  await addEmailJob('payout-processed', recipientEmail,
    `Your payout has been processed`, html)
}

async function sendAdCampaignLive(recipientEmail, data) {
  const html = `
    <h2>Your ad campaign is now live!</h2>
    <p>Placement: ${data.placement}</p>
    <p>Duration: ${data.startDate} - ${data.endDate}</p>
    <p>Budget: ₦${data.budget?.toLocaleString()}</p>
  `
  await addEmailJob('ad-campaign-live', recipientEmail,
    'Your ad campaign is now live!', html)
}

async function sendAdBudgetWarning(recipientEmail, data) {
  const html = `
    <h2>Your ad campaign budget is almost used up</h2>
    <p>Remaining: ₦${data.remaining?.toLocaleString()}</p>
    <a href="${process.env.FRONTEND_URL}/restaurant/dashboard">Top Up Budget</a>
  `
  await addEmailJob('ad-budget-warning', recipientEmail,
    'Your ad campaign budget is almost used up', html)
}

module.exports = {
  initializeEmailQueue,
  sendWeeklyEarningsSummary,
  sendSubscriptionRenewalReminder,
  sendPayoutProcessed,
  sendAdCampaignLive,
  sendAdBudgetWarning,
  addEmailJob,
}
