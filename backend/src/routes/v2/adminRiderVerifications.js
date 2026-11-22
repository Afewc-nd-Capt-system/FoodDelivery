const express = require('express');
const DeliveryPartner = require('../../models/DeliveryPartner');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');
const { sendEmail } = require('../../utils/email');
const templates = require('../../services/emailTemplates');

const router = express.Router();
router.use(authMiddleware, adminGuard);

// GET /api/v2/admin/rider-verifications?status=pending
router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const query = status === 'all' ? {} : { verificationStatus: status };
    const riders = await DeliveryPartner.find(query)
      .select('name email phone vehicleType vehicleNumber verificationStatus verificationDocuments verificationSubmittedAt verificationRejectionReason company')
      .sort({ verificationSubmittedAt: -1 })
      .limit(200);
    res.json({ success: true, data: riders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const rider = await DeliveryPartner.findById(req.params.id);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    rider.verificationStatus = 'approved';
    rider.verificationReviewedAt = new Date();
    rider.verificationRejectionReason = undefined;
    rider.verifiedBy = req.user.id;
    await rider.save();

    const approvedTemplate = templates.riderApproved({ name: rider.name });
    sendEmail({ to: rider.email, ...approvedTemplate, type: 'rider-approved' })
      .catch((err) => console.error('Rider approval email failed:', err.message));

    res.json({ success: true, data: { id: rider._id, status: rider.verificationStatus } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'A rejection reason is required' });

    const rider = await DeliveryPartner.findById(req.params.id);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    rider.verificationStatus = 'rejected';
    rider.verificationReviewedAt = new Date();
    rider.verificationRejectionReason = reason;
    rider.verifiedBy = req.user.id;
    if (rider.isOnline) rider.isOnline = false;
    await rider.save();

    const rejectedTemplate = templates.riderRejected({ name: rider.name, reason });
    sendEmail({ to: rider.email, ...rejectedTemplate, type: 'rider-rejected' })
      .catch((err) => console.error('Rider rejection email failed:', err.message));

    res.json({ success: true, data: { id: rider._id, status: rider.verificationStatus } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
