'use strict';

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');
const EmailLog = require('../../models/EmailLog');
const mailService = require('../../services/mailService');
const templates = require('../../services/emailTemplates');

const router = express.Router();
router.use(authMiddleware, adminGuard);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/v2/admin/email/test { to }
router.post('/test', async (req, res) => {
  try {
    const to = String(req.body?.to || '').trim();
    if (!EMAIL_RE.test(to)) {
      return res.status(400).json({ success: false, message: 'A valid recipient email is required' });
    }

    const template = templates.testEmail();
    const { log, error } = await mailService.sendNow({ type: 'test', to, ...template });
    if (!log || log.status !== 'sent') {
      return res.status(502).json({
        success: false,
        message: 'Test email could not be delivered',
        provider: mailService.providerName(),
        errorClass: error?.errorClass || log?.errorClass || 'provider_error',
      });
    }

    res.json({
      success: true,
      provider: log.provider || mailService.providerName(),
      messageId: log.providerMessageId || null,
      logId: log._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v2/admin/email/failures?limit=20
router.get('/failures', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const failures = await EmailLog.find({ status: 'failed' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('type recipient status provider providerMessageId errorClass attempts createdAt updatedAt')
      .lean();
    res.json({ success: true, data: failures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
