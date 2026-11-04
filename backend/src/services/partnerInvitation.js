'use strict';

const crypto = require('crypto');
const PartnerInvitation = require('../models/PartnerInvitation');
const { frontendUrl } = require('../config/frontend');

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function registerPathForType(type) {
  if (type === 'restaurant') return '/restaurant/register';
  if (type === 'vendor') return '/vendor/register';
  return '/delivery-company/register';
}

// Create a single-use invitation and return the raw token + the URL to email.
async function createInvitation({ type, email, applicationId, createdBy, ttlMs = DEFAULT_TTL_MS }) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const invitation = await PartnerInvitation.create({
    tokenHash: hashToken(rawToken),
    type,
    email: String(email).toLowerCase(),
    application: applicationId,
    expiresAt: new Date(Date.now() + ttlMs),
    createdBy,
  });
  const inviteUrl = `${frontendUrl(registerPathForType(type))}?invite=${rawToken}`;
  return { invitation, token: rawToken, inviteUrl };
}

// Verify a token without consuming it. Returns { invitation } or { error, status }.
async function verifyInvitation(rawToken, expectedType) {
  if (!rawToken || !String(rawToken).trim()) {
    return { error: 'An invitation token is required to register.', status: 401 };
  }
  const invitation = await PartnerInvitation.findOne({ tokenHash: hashToken(String(rawToken).trim()) });
  if (!invitation) {
    return { error: 'This invitation link is invalid.', status: 403 };
  }
  if (invitation.usedAt) {
    return { error: 'This invitation has already been used.', status: 403 };
  }
  if (invitation.expiresAt.getTime() <= Date.now()) {
    return { error: 'This invitation has expired. Please request a new one.', status: 403 };
  }
  if (expectedType && invitation.type !== expectedType) {
    return { error: `This invitation is not valid for ${expectedType} registration.`, status: 403 };
  }
  return { invitation };
}

// Atomically mark the invitation as used. Returns true only for the first caller.
async function consumeInvitation(invitationId, userId) {
  const result = await PartnerInvitation.findOneAndUpdate(
    { _id: invitationId, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date(), usedBy: userId } },
    { new: true }
  );
  return Boolean(result);
}

module.exports = { hashToken, createInvitation, verifyInvitation, consumeInvitation, registerPathForType, DEFAULT_TTL_MS };
