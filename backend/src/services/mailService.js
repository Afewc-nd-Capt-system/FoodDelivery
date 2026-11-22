'use strict';

const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

const DEFAULT_FROM = '"VibeChops" <no-reply@vibechops.com>';
const RESEND_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
const PROVIDER_TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = Number(process.env.EMAIL_MAX_ATTEMPTS || 3);
const RETRY_BASE_MS = Number(process.env.EMAIL_RETRY_BASE_MS || 2000);

class MailError extends Error {
  constructor(message, { transient = false, errorClass = 'provider_error' } = {}) {
    super(message);
    this.name = 'MailError';
    this.transient = transient;
    this.errorClass = errorClass;
  }
}

function normalizeProvider(value) {
  const explicit = String(value || '').trim().toLowerCase();
  if (['resend', 'smtp', 'mock'].includes(explicit)) return explicit;
  return process.env.RESEND_API_KEY ? 'resend' : 'smtp';
}

function providerName() {
  return normalizeProvider(process.env.EMAIL_PROVIDER);
}

function isConfigured() {
  const provider = providerName();
  if (provider === 'mock') return true;
  if (provider === 'resend') return Boolean(process.env.RESEND_API_KEY);
  if (provider === 'smtp') return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  return false;
}

function fromAddress() {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

function defaultReplyTo() {
  return process.env.EMAIL_REPLY_TO || undefined;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock provider (tests) ────────────────────────────────────────────────
let mockRetryFailures = 0;

function mockSend(payload) {
  const failTo = process.env.EMAIL_MOCK_FAIL_TO;
  const failType = process.env.EMAIL_MOCK_FAIL_TYPE;
  const failTimes = Number(process.env.EMAIL_MOCK_FAIL_TIMES || 0);
  const alwaysFailTo = Boolean(failTo && payload.to === failTo);
  const failForRetry = Boolean(failType && payload.type === failType && mockRetryFailures < failTimes);
  if (alwaysFailTo || failForRetry) {
    if (failForRetry) mockRetryFailures += 1;
    throw new MailError('Mock provider transient failure', {
      transient: true,
      errorClass: 'mock_transient',
    });
  }

  const captureFile = process.env.EMAIL_CAPTURE_FILE;
  if (captureFile) {
    const record = {
      type: payload.type,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo || null,
      at: new Date().toISOString(),
    };
    fs.appendFileSync(captureFile, `${JSON.stringify(record)}\n`, 'utf8');
  }
  return { id: `mock_${crypto.randomBytes(8).toString('hex')}` };
}

// ── Resend provider (HTTPS) ──────────────────────────────────────────────
async function resendSend(payload) {
  if (!process.env.RESEND_API_KEY) {
    throw new MailError('RESEND_API_KEY is not set', { transient: false, errorClass: 'config' });
  }

  const body = {
    from: fromAddress(),
    to: [payload.to],
    subject: payload.subject,
    html: payload.html || undefined,
    text: payload.text || undefined,
  };
  if (payload.replyTo) body.reply_to = payload.replyTo;

  let response;
  try {
    response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw new MailError(timedOut ? 'Resend request timed out' : error.message, {
      transient: true,
      errorClass: timedOut ? 'timeout' : 'network',
    });
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const transient = response.status === 429 || response.status >= 500;
    throw new MailError(result?.message || `Resend returned ${response.status}`, {
      transient,
      errorClass: response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'server_error' : 'rejected',
    });
  }
  return { id: result?.id || null };
}

// ── SMTP provider (only when selected) ───────────────────────────────────
let smtpTransport = null;

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  const port = Number(process.env.EMAIL_PORT || 587);
  const base = process.env.EMAIL_SERVICE
    ? { service: process.env.EMAIL_SERVICE }
    : { host: process.env.EMAIL_HOST || 'smtp.gmail.com', port, secure: port === 465 };
  smtpTransport = nodemailer.createTransport({
    ...base,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: PROVIDER_TIMEOUT_MS,
    greetingTimeout: PROVIDER_TIMEOUT_MS,
    socketTimeout: PROVIDER_TIMEOUT_MS,
  });
  return smtpTransport;
}

async function smtpSend(payload) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new MailError('SMTP credentials are not set', { transient: false, errorClass: 'config' });
  }
  try {
    const info = await getSmtpTransport().sendMail({
      from: fromAddress(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html || undefined,
      text: payload.text || undefined,
      replyTo: payload.replyTo || defaultReplyTo(),
    });
    return { id: info?.messageId || null };
  } catch (error) {
    const code = String(error?.code || '');
    const timedOut = ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EAI_AGAIN', 'EDNS'].includes(code)
      || /timeout|timed out|connection/i.test(error?.message || '');
    if (timedOut) console.error('[mail] SMTP appears blocked on this host');
    const transient = timedOut || (Number(error?.responseCode) >= 400 && Number(error?.responseCode) < 500);
    throw new MailError(error?.message || 'SMTP send failed', {
      transient,
      errorClass: timedOut ? 'smtp_timeout' : 'smtp_error',
    });
  }
}

async function sendViaProvider(payload) {
  const provider = providerName();
  if (!isConfigured()) {
    throw new MailError(`Email provider "${provider}" is not configured`, {
      transient: false,
      errorClass: 'config',
    });
  }
  if (provider === 'mock') return mockSend(payload);
  if (provider === 'resend') return resendSend(payload);
  if (provider === 'smtp') return smtpSend(payload);
  throw new MailError(`Unknown EMAIL_PROVIDER "${provider}"`, { transient: false, errorClass: 'config' });
}

// ── EmailLog + delivery ──────────────────────────────────────────────────
async function createLog(type, recipient) {
  try {
    return await EmailLog.create({ type, recipient, status: 'queued' });
  } catch (error) {
    console.error('[mail] could not create EmailLog:', error.message);
    return null;
  }
}

async function saveLog(log, changes) {
  if (!log) return;
  Object.assign(log, changes);
  try { await log.save(); } catch (error) { console.error('[mail] could not update EmailLog:', error.message); }
}

async function deliverWithRetry(log, payload, { maxAttempts = MAX_ATTEMPTS, baseMs = RETRY_BASE_MS } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await saveLog(log, { status: 'sending', provider: providerName(), attempts: attempt });
    try {
      const result = await sendViaProvider(payload);
      await saveLog(log, {
        status: 'sent',
        providerMessageId: result?.id || undefined,
        errorClass: undefined,
      });
      return { log, error: null };
    } catch (error) {
      lastError = error;
      if (error?.transient !== true || attempt === maxAttempts) break;
      await sleep(baseMs * Math.pow(2, attempt - 1));
    }
  }
  await saveLog(log, { status: 'failed', errorClass: lastError?.errorClass || 'provider_error' });
  return { log, error: lastError };
}

/**
 * Queue an email and return immediately. Never blocks on SMTP/HTTP and never
 * throws a provider failure at the caller. Every call creates an EmailLog.
 */
async function queueEmail({ type = 'general', to, subject, html, text, replyTo }) {
  if (!to || !subject || (!html && !text)) {
    console.error('[mail] refused to send an email without recipient, subject or body');
    return null;
  }
  const log = await createLog(type, to);
  const payload = {
    type,
    to,
    subject,
    html: html || null,
    text: text || null,
    replyTo: replyTo || defaultReplyTo() || null,
  };

  try {
    // Lazy require avoids a module-load cycle with the BullMQ worker.
    const jobs = require('../jobs/financialEmailJobs');
    if (typeof jobs.isQueueReady === 'function' && jobs.isQueueReady()) {
      // A queue whose Redis connection is down can leave `add` pending forever.
      // Give it a short window, then fall back to a direct send so mail is not
      // silently stranded.
      const queued = await Promise.race([
        jobs.addEmailJob(payload, log?._id).then(() => true).catch(() => false),
        new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
      ]);
      if (queued) return log;
      console.error('[mail] queue did not acknowledge the job; sending directly');
    }
  } catch (error) {
    console.error('[mail] queue unavailable, sending directly:', error.message);
  }

  void deliverWithRetry(log, payload);
  return log;
}

/** Await delivery (admin diagnostics). Returns { log, error } and never throws. */
async function sendNow({ type = 'test', to, subject, html, text, replyTo }) {
  const log = await createLog(type, to);
  const payload = {
    type,
    to,
    subject,
    html: html || null,
    text: text || null,
    replyTo: replyTo || defaultReplyTo() || null,
  };
  return deliverWithRetry(log, payload);
}

/** Called by the BullMQ worker. Throws on failure so the queue retries. */
async function deliverForJob(log, payload, { attempt = 1, maxAttempts = MAX_ATTEMPTS } = {}) {
  await saveLog(log, { status: 'sending', provider: providerName(), attempts: attempt });
  try {
    const result = await sendViaProvider(payload);
    await saveLog(log, {
      status: 'sent',
      providerMessageId: result?.id || undefined,
      errorClass: undefined,
    });
    return { log, error: null };
  } catch (error) {
    await saveLog(log, {
      status: attempt >= maxAttempts ? 'failed' : 'queued',
      errorClass: error?.errorClass || 'provider_error',
    });
    throw error;
  }
}

module.exports = {
  MailError,
  providerName,
  isConfigured,
  queueEmail,
  sendNow,
  deliverForJob,
  sendViaProvider,
  MAX_ATTEMPTS,
};
