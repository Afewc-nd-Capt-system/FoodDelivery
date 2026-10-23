const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const authMiddleware = require('../../middleware/auth');
const { validateDocumentMagic } = require('../../utils/upload');
const {
  storeDocument,
  decodeReference,
  signedCloudinaryUrl,
} = require('../../utils/documentStorage');
const router = express.Router();

// Verification documents are private. They are never under the public
// /uploads static root and are served only through the admin-only route below.
const documentsDir = path.join(__dirname, '../../../uploads/private/restaurant-docs');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, documentsDir),
  filename: (req, file, cb) => cb(null, uuidv4()),
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 2,
  },
});

// POST /api/v2/restaurants/upload-docs
router.post('/upload-docs', authMiddleware, upload.fields([
  { name: 'cacCertificate', maxCount: 1 },
  { name: 'governmentApproval', maxCount: 1 },
]), validateDocumentMagic, async (req, res) => {
  try {
    const { tinNumber, rcNumber } = req.body;

    if (!tinNumber || !rcNumber) {
      return res.status(400).json({ message: 'TIN and RC Number are required' });
    }

    if (!req.files || !req.files.cacCertificate) {
      return res.status(400).json({ message: 'CAC Certificate is required' });
    }

    const cacCertificate = req.files.cacCertificate[0];
    const governmentApproval = req.files.governmentApproval ? req.files.governmentApproval[0] : null;

    const cacStored = await storeDocument(cacCertificate);
    const governmentStored = governmentApproval
      ? await storeDocument(governmentApproval)
      : null;

    res.json({
      cacCertificate: {
        url: cacStored.url,
        uploadedAt: new Date(),
      },
      governmentApproval: governmentStored ? {
        url: governmentStored.url,
        uploadedAt: new Date(),
      } : null,
      tinNumber,
      rcNumber,
    });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

// GET /api/v2/restaurants/docs/:filename - admin-only verification document
router.get('/docs/:filename', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const cloudinaryRef = decodeReference(req.params.filename);
    if (cloudinaryRef) {
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.redirect(302, signedCloudinaryUrl(cloudinaryRef));
    }

    const filename = path.basename(req.params.filename);
    const filePath = path.join(documentsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
  } catch (error) {
    console.error('[DOCS] Unable to retrieve document:', error.message);
    res.status(500).json({ message: 'Unable to retrieve document' });
  }
});

module.exports = router;
