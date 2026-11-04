const express = require('express');
const PartnerApplication = require('../../models/PartnerApplication');
const PartnerInvitation = require('../../models/PartnerInvitation');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');
const { createInvitation } = require('../../services/partnerInvitation');
const { sendEmail } = require('../../utils/email');
const { frontendUrl } = require('../../config/frontend');

const router = express.Router();
router.use(authMiddleware, adminGuard);

const TYPE_LABEL = {
  restaurant: 'Restaurant',
  vendor: 'Vendor',
  delivery: 'Delivery company',
};

// GET /api/v2/admin/applications?status=pending
router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [applications, total] = await Promise.all([
      PartnerApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(100, parseInt(limit, 10))),
      PartnerApplication.countDocuments(query),
    ]);
    res.json({ success: true, data: applications, pagination: { total, page: Number(page) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v2/admin/applications/:id/approve
// Creates a single-use 7-day invitation, emails the applicant, and returns the
// link to the admin as well (so it can be re-sent manually).
router.post('/:id/approve', async (req, res) => {
  try {
    const application = await PartnerApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (application.status === 'approved') {
      return res.status(409).json({ success: false, message: 'Application already approved' });
    }
    if (!['restaurant', 'vendor', 'delivery'].includes(application.type)) {
      return res.status(400).json({ success: false, message: 'This application type does not use self-registration invitations' });
    }

    const ttlMs = Number(req.body?.expiresInSeconds) > 0
      ? Number(req.body.expiresInSeconds) * 1000
      : undefined;
    const { invitation, inviteUrl } = await createInvitation({
      type: application.type,
      email: application.email,
      applicationId: application._id,
      createdBy: req.user.id,
      ...(ttlMs ? { ttlMs } : {}),
    });

    application.status = 'approved';
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    await application.save();

    sendEmail({
      to: application.email,
      subject: `You're approved to join VibeChops as a ${TYPE_LABEL[application.type]}`,
      html: `
        <h2>Your application is approved 🎉</h2>
        <p>Hi ${application.name},</p>
        <p>Your application for <b>${application.businessName}</b> has been approved.</p>
        <p>Use this single-use registration link (expires in 7 days):</p>
        <p><a href="${inviteUrl}" style="background:#E8621A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Complete Registration</a></p>
        <p>If the button does not work, copy this link:<br/>${inviteUrl}</p>
        <p>The link can only be used once. If it expires, contact support for a new one.</p>
      `,
    }).catch((err) => console.error('Invitation email failed:', err.message));

    res.json({
      success: true,
      application,
      inviteUrl,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v2/admin/applications/:id/reject { reason }
router.post('/:id/reject', async (req, res) => {
  try {
    const application = await PartnerApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    application.status = 'rejected';
    application.rejectionReason = String(req.body?.reason || '').trim() || 'Application not approved';
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    await application.save();

    sendEmail({
      to: application.email,
      subject: 'Update on your VibeChops partner application',
      html: `
        <h2>Application update</h2>
        <p>Hi ${application.name},</p>
        <p>Unfortunately we can't approve your application for <b>${application.businessName}</b> at this time.</p>
        <p><b>Reason:</b> ${application.rejectionReason}</p>
        <p>You are welcome to apply again once the issue is resolved.</p>
        <p><a href="${frontendUrl('/contact')}">Re-apply</a></p>
      `,
    }).catch((err) => console.error('Rejection email failed:', err.message));

    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v2/admin/applications/invitations — recent invitations + status
router.get('/invitations', async (req, res) => {
  try {
    const invitations = await PartnerInvitation.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .select('type email expiresAt usedAt createdAt');
    res.json({ success: true, data: invitations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
