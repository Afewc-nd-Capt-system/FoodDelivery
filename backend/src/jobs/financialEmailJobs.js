'use strict';

const { Queue, Worker } = require('bullmq');
const mailService = require('../services/mailService');
const templates = require('../services/emailTemplates');
const EmailLog = require('../models/EmailLog');

function getRedisConnection() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    const parsed = new URL(url.replace('rediss://', 'https://').replace('redis://', 'http://'));
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username || 'default',
      tls: url.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  } catch (err) {
    console.warn('Redis URL parse failed, using defaults');
    return { host: 'localhost', port: 6379, maxRetriesPerRequest: null };
  }
}

const connection = getRedisConnection();

let emailQueue = null;
let emailWorker = null;

async function initializeEmailQueue() {
  if (!process.env.REDIS_URL) {
    console.log('Email queue disabled (REDIS_URL not configured)');
    return null;
  }

  try {
    emailQueue = new Queue('financial-emails', { connection });

    emailWorker = new Worker('financial-emails', async (job) => {
      const { logId, ...payload } = job.data;
      const log = logId ? await EmailLog.findById(logId) : null;
      await mailService.deliverForJob(log, payload, {
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts || 3,
      });
    }, {
      connection,
      concurrency: 5,
    });

    emailWorker.on('failed', (job, err) => {
      console.warn(`Email job ${job?.id} failed: ${err.message}`);
    });

    console.log('Email queue ready');
    return emailQueue;
  } catch (err) {
    console.warn('Email queue initialization failed, emails will be sent directly:', err.message);
    return null;
  }
}

function isQueueReady() {
  return Boolean(emailQueue);
}

async function addEmailJob(payload, logId) {
  if (!emailQueue) throw new Error('Email queue is not ready');
  await emailQueue.add(payload.type || 'email', {
    ...payload,
    logId: logId ? String(logId) : undefined,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

async function sendWeeklyEarningsSummary(recipientEmail, data) {
  const template = templates.financialWeeklyEarnings({ data });
  return mailService.queueEmail({ type: 'weekly-earnings', to: recipientEmail, ...template });
}

async function sendSubscriptionRenewalReminder(recipientEmail, data) {
  const template = templates.financialSubscriptionReminder({ data });
  return mailService.queueEmail({ type: 'subscription-reminder', to: recipientEmail, ...template });
}

async function sendPayoutProcessed(recipientEmail, data) {
  const template = templates.financialPayoutProcessed({ data });
  return mailService.queueEmail({ type: 'payout-processed', to: recipientEmail, ...template });
}

async function sendAdCampaignLive(recipientEmail, data) {
  const template = templates.financialAdCampaignLive({ data });
  return mailService.queueEmail({ type: 'ad-campaign-live', to: recipientEmail, ...template });
}

async function sendAdBudgetWarning(recipientEmail, data) {
  const template = templates.financialAdBudgetWarning({ data });
  return mailService.queueEmail({ type: 'ad-budget-warning', to: recipientEmail, ...template });
}

module.exports = {
  initializeEmailQueue,
  isQueueReady,
  addEmailJob,
  sendWeeklyEarningsSummary,
  sendSubscriptionRenewalReminder,
  sendPayoutProcessed,
  sendAdCampaignLive,
  sendAdBudgetWarning,
};
