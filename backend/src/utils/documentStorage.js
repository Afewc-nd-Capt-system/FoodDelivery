'use strict';

const cloudinary = require('cloudinary').v2;
const { safeUnlink } = require('./upload');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_DOCUMENT_FOLDER || 'vibechops/verification';
const CONFIGURED = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

if (CONFIGURED) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
} else if (process.env.NODE_ENV === 'production') {
  console.warn(
    '[STORAGE] CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are not fully set. ' +
    'Verification documents are falling back to ephemeral local disk. ' +
    'Configure all three before relying on document retention.'
  );
}

function encodeReference(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeReference(token) {
  try {
    const value = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (!value || typeof value !== 'object') return null;
    if (value.provider === 'cloudinary') {
      if (typeof value.publicId !== 'string' || !value.publicId) return null;
      if (!['image', 'raw', 'video'].includes(value.resourceType)) return null;
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

async function storeDocument(file) {
  if (!CONFIGURED) {
    // Multer already wrote the file into the private local directory.
    return {
      provider: 'local',
      reference: file.filename,
      url: `/api/v2/restaurants/docs/${encodeURIComponent(file.filename)}`,
    };
  }

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'auto',
      type: 'private',
      folder: FOLDER,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    });
    safeUnlink(file.path);
    const ref = {
      provider: 'cloudinary',
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
    };
    return {
      provider: 'cloudinary',
      reference: encodeReference(ref),
      url: `/api/v2/restaurants/docs/${encodeReference(ref)}`,
    };
  } catch (error) {
    safeUnlink(file.path);
    const wrapped = new Error('Verification document storage failed');
    wrapped.status = 502;
    wrapped.cause = error;
    throw wrapped;
  }
}

function signedCloudinaryUrl(reference, expiresSeconds = 300) {
  // private_download_url carries an explicit expires_at. A plain signed
  // delivery URL for type=private is signature-protected but non-expiring.
  return cloudinary.utils.private_download_url(
    reference.publicId,
    reference.format || '',
    {
      resource_type: reference.resourceType,
      type: 'private',
      expires_at: Math.floor(Date.now() / 1000) + expiresSeconds,
    }
  );
}

module.exports = {
  CONFIGURED,
  storeDocument,
  decodeReference,
  signedCloudinaryUrl,
};
