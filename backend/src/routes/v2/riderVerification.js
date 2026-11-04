const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const DeliveryPartner = require('../../models/DeliveryPartner');
const { validateDocumentMagic } = require('../../utils/upload');

const router = express.Router();

// Rider verification documents are private: stored outside the public static
// root and only served through the authenticated routes below.
const documentsDir = path.join(__dirname, '../../../uploads/private/rider-docs');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, documentsDir),
    filename: (req, file, cb) => cb(null, uuidv4()),
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Only PDF, JPEG and PNG are allowed.'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
});

// Resolve the rider record for either a rider User token or a partner token.
async function resolveRider(req) {
  if (req.user.role === 'delivery') return DeliveryPartner.findById(req.user.id);
  return DeliveryPartner.findOne({ email: req.user.email });
}

function publicStatus(rider) {
  return {
    status: rider.verificationStatus || 'unverified',
    rejectionReason: rider.verificationRejectionReason || null,
    submittedAt: rider.verificationSubmittedAt || null,
    reviewedAt: rider.verificationReviewedAt || null,
    documents: {
      idDocument: rider.verificationDocuments?.idDocument?.url || null,
      vehicleDocument: rider.verificationDocuments?.vehicleDocument?.url || null,
    },
  };
}

// GET /api/v2/riders/verification
router.get('/verification', async (req, res) => {
  try {
    const rider = await resolveRider(req);
    if (!rider) return res.status(404).json({ message: 'Rider not found' });
    res.json({ success: true, data: publicStatus(rider) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/v2/riders/verification/documents (multipart)
router.post('/verification/documents', upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'vehicleDocument', maxCount: 1 },
]), validateDocumentMagic, async (req, res) => {
  try {
    const rider = await resolveRider(req);
    if (!rider) return res.status(404).json({ message: 'Rider not found' });
    if (rider.verificationStatus === 'approved') {
      return res.status(409).json({ message: 'Your verification is already approved' });
    }

    const idFile = req.files?.idDocument?.[0];
    const vehicleFile = req.files?.vehicleDocument?.[0];
    if (!idFile || !vehicleFile) {
      return res.status(400).json({ message: 'Both an ID document and a vehicle document are required' });
    }

    rider.verificationDocuments = {
      idDocument: { url: `/api/v2/riders/verification/docs/${idFile.filename}`, uploadedAt: new Date() },
      vehicleDocument: { url: `/api/v2/riders/verification/docs/${vehicleFile.filename}`, uploadedAt: new Date() },
    };
    rider.verificationStatus = 'pending';
    rider.verificationSubmittedAt = new Date();
    rider.verificationReviewedAt = undefined;
    rider.verificationRejectionReason = undefined;
    await rider.save();

    const io = req.app.get('io');
    if (io) {
      io.of('/tracking').to('admin').emit('rider_verification_submitted', { riderId: rider._id });
    }

    res.status(201).json({ success: true, data: publicStatus(rider) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/v2/riders/verification/docs/:filename — rider (own) or admin only
router.get('/verification/docs/:filename', async (req, res) => {
  try {
    const safe = path.basename(req.params.filename);
    const fullPath = path.join(documentsDir, safe);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      const rider = await resolveRider(req);
      const owns = rider && Object.values(rider.verificationDocuments || {}).some(
        (doc) => doc?.url && doc.url.endsWith(`/${safe}`)
      );
      if (!owns) return res.status(403).json({ message: 'Not authorized' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(fullPath);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
