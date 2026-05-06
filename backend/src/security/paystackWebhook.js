const crypto = require('crypto');
const axios = require('axios');

class PaystackWebhookSecurity {
  constructor() {
    this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    this.processedEvents = new Map();
    this.eventTTL = 24 * 60 * 60 * 1000;
  }

  verifySignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('[SECURITY] No webhook secret configured - skipping signature verification');
      return true;
    }

    const hmac = crypto.createHmac('sha512', this.webhookSecret);
    const digest = hmac.update(payload).digest('hex');

    if (digest !== signature) {
      console.error('[SECURITY] Invalid webhook signature');
      return false;
    }
    return true;
  }

  isEventProcessed(eventId) {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(eventId) {
    this.processedEvents.set(eventId, Date.now());
    setTimeout(() => {
      this.processedEvents.delete(eventId);
    }, this.eventTTL);
  }

  async handleWebhook(req, res, handler) {
    const signature = req.headers['x-paystack-signature'];

    if (!signature) {
      return res.status(401).json({ success: false, message: 'Missing signature', code: 'MISSING_SIGNATURE' });
    }

    const rawBody = JSON.stringify(req.body);
    if (!this.verifySignature(rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid signature', code: 'INVALID_SIGNATURE' });
    }

    const event = req.body.event;
    const eventId = `${event}-${req.body.id}`;

    if (this.isEventProcessed(eventId)) {
      console.log(`[SECURITY] Duplicate webhook event: ${eventId}`);
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }

    try {
      const result = await handler(req.body);

      this.markEventProcessed(eventId);

      await this.logWebhook(req.body, 'success', result);

      res.status(200).json({ success: true });
    } catch (err) {
      await this.logWebhook(req.body, 'failed', { error: err.message });
      throw err;
    }
  }

  async logWebhook(event, status, result) {
    console.log(`[WEBHOOK] ${event.event} - ${status}`, result);
  }
}

module.exports = new PaystackWebhookSecurity();