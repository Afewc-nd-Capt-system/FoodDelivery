const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');

class MFAService {
  constructor() {
    authenticator.options = { window: 1 };
  }

  generateSecret(user) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'VibeChops', secret);
    return { secret, otpauth };
  }

  async generateQRCode(otpauth) {
    return await QRCode.toDataURL(otpauth);
  }

  verifyToken(secret, token) {
    return authenticator.verify({ token, secret });
  }

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomInt(10000000, 99999999).toString();
      const hashed = crypto.createHash('sha256').update(code).digest('hex');
      codes.push({ code, hashed, used: false });
    }
    return codes;
  }

  verifyBackupCode(codes, inputCode) {
    for (const codeObj of codes) {
      if (!codeObj.used) {
        const hashed = crypto.createHash('sha256').update(inputCode).digest('hex');
        if (hashed === codeObj.hashed) {
          codeObj.used = true;
          return true;
        }
      }
    }
    return false;
  }

  hashBackupCodes(codes) {
    return codes.map(c => ({
      hashed: crypto.createHash('sha256').update(c).digest('hex'),
      used: false
    }));
  }
}

module.exports = new MFAService();