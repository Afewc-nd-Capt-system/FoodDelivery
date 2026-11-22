const express = require('express');
const PartnerApplication = require('../../models/PartnerApplication');
const PartnerInvitation = require('../../models/PartnerInvitation');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');
const { createInvitation } = require('../../services/partnerInvitation');
const { sendEmail } = require('../../utils/email');
const templates = require('../../services/emailTemplates');

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

    const approvedTemplate = templates.partnerApproved({
      name: application.name,
      typeLabel: TYPE_LABEL[application.type],
      businessName: application.businessName,
      inviteUrl,
    });
    sendEmail({ to: application.email, ...approvedTemplate, type: 'partner-approved' })
      .catch((err) => console.error('Invitation email failed:', err.message));

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

    const rejectedTemplate = templates.partnerRejected({
      name: application.name,
      businessName: application.businessName,
      reason: application.rejectionReason,
    });
    sendEmail({ to: application.email, ...rejectedTemplate, type: 'partner-rejected' })
      .catch((err) => console.error('Rejection email failed:', err.message));

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

// DELETE /api/v2/admin/applications/:id — remove a test/duplicate application
// and any invitation it issued (used by the production e2e cleanup).
router.delete('/:id', async (req, res) => {
  try {
    const application = await PartnerApplication.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    await PartnerInvitation.deleteMany({ application: application._id }).catch(() => {});
    res.json({ success: true, deleted: String(application._id) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
