const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
// file-type v21+ is ESM-only; keep this CommonJS module working via a dynamic
// import that is resolved once per process.
const fileTypeModule = import('file-type');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, crypto.randomUUID()),
});

const fileFilter = (req, file, cb) => {
  // This is an early client-claimed check only. validateImageMagic() inspects
  // the actual bytes and rewrites the random filename with the detected type.
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and PDF are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
});

function safeUnlink(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* best effort */ }
}

function validateMagicBytes(allowedMimes) {
  return async (req, res, next) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
      for (const value of Object.values(req.files)) {
        if (Array.isArray(value)) files.push(...value);
        else if (value) files.push(value);
      }
    }
    if (files.length === 0) return next();

    for (const file of files) {
      let detected;
      try {
        const { fileTypeFromFile } = await fileTypeModule;
        detected = await fileTypeFromFile(file.path);
      } catch {
        detected = null;
      }
      if (!detected || !allowedMimes.has(detected.mime)) {
        files.forEach((entry) => safeUnlink(entry.path));
        return res.status(400).json({
          message: 'File contents do not match an allowed JPEG, PNG or PDF file',
        });
      }

      const newName = `${crypto.randomUUID()}.${detected.ext}`;
      const newPath = path.join(path.dirname(file.path), newName);
      try {
        fs.renameSync(file.path, newPath);
      } catch {
        files.forEach((entry) => safeUnlink(entry.path));
        return res.status(400).json({ message: 'Uploaded file could not be stored' });
      }
      file.filename = newName;
      file.path = newPath;
      file.mimetype = detected.mime;
    }

    next();
  };
}

const validateImageMagic = validateMagicBytes(new Set(['image/jpeg', 'image/png']));
const validateDocumentMagic = validateMagicBytes(new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]));

module.exports = upload;
module.exports.validateImageMagic = validateImageMagic;
module.exports.validateDocumentMagic = validateDocumentMagic;
module.exports.safeUnlink = safeUnlink;
