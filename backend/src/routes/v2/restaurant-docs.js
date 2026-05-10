const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const authMiddleware = require('../../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/restaurant-docs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
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
]), async (req, res) => {
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

    const cacUrl = `/uploads/restaurant-docs/${cacCertificate.filename}`;
    const governmentUrl = governmentApproval ? `/uploads/restaurant-docs/${governmentApproval.filename}` : null;

    res.json({
      cacCertificate: {
        url: cacUrl,
        uploadedAt: new Date(),
      },
      governmentApproval: governmentUrl ? {
        url: governmentUrl,
        uploadedAt: new Date(),
      } : null,
      tinNumber,
      rcNumber,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
