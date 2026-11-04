'use strict';

const tokens = require('../security/tokenService');

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // access token: 15 minutes
  });
};

function publicUser(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    mfaEnabled: Boolean(user.mfaEnabled),
  };
}

// Issue an access/refresh pair and set the httpOnly cookie. Shared by every
// registration endpoint so all roles get a usable session on success.
async function sessionResponse(res, user) {
  const issued = await tokens.issueTokens(user);
  setTokenCookie(res, issued.accessToken);
  return {
    token: issued.accessToken,
    accessToken: issued.accessToken,
    refreshToken: issued.refreshToken,
    user: publicUser(user),
  };
}

module.exports = { setTokenCookie, publicUser, sessionResponse };
