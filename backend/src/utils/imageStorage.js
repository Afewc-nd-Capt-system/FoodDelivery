'use strict';

const cloudinary = require('cloudinary').v2;
const { safeUnlink } = require('./upload');

const CONFIGURED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET
);

if (CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const FOLDER = process.env.CLOUDINARY_MENU_FOLDER || 'vibechops/menu';

// Menu/cover images are public assets. When Cloudinary is configured we upload
// the file and return its CDN URL; otherwise the caller must supply an image
// URL (stored as-is).
async function storeImage(file) {
  if (!CONFIGURED || !file) {
    if (file) safeUnlink(file.path);
    return null;
  }
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: FOLDER,
      resource_type: 'image',
      overwrite: false,
      unique_filename: true,
    });
    safeUnlink(file.path);
    return result.secure_url;
  } catch (error) {
    safeUnlink(file.path);
    const wrapped = new Error('Image upload failed');
    wrapped.status = 502;
    throw wrapped;
  }
}

module.exports = { CONFIGURED, storeImage };
