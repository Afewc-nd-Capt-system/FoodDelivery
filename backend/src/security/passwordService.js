const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const BCRYPT_ROUNDS = 12;
const PASSWORD_HISTORY_LIMIT = 5;

class PasswordService {
  async hashPassword(password) {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  async checkPwnedPassword(password) {
    try {
      const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1Hash.substring(0, 5);
      const suffix = sha1Hash.substring(5);

      const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' }
      });

      const hashes = response.data.split('\n');
      for (const line of hashes) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          return { pwned: true, count: parseInt(count.trim()) };
        }
      }
      return { pwned: false, count: 0 };
    } catch (err) {
      console.error('HaveIBeenPwned check failed:', err.message);
      return { pwned: false, count: 0 };
    }
  }

  async isPasswordInHistory(password, history) {
    for (const oldHash of history) {
      if (await this.verifyPassword(password, oldHash)) {
        return true;
      }
    }
    return false;
  }

  async addToHistory(password, history = []) {
    const hash = await this.hashPassword(password);
    const newHistory = [hash, ...history].slice(0, PASSWORD_HISTORY_LIMIT);
    return newHistory;
  }

  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) errors.push('Minimum 8 characters required');
    if (!hasUppercase) errors.push('Must contain uppercase letter');
    if (!hasLowercase) errors.push('Must contain lowercase letter');
    if (!hasNumber) errors.push('Must contain a number');
    if (!hasSpecial) errors.push('Must contain special character (!@#$%^&*)');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async validatePassword(password, history = []) {
    const strength = this.validatePasswordStrength(password);
    if (!strength.valid) {
      return { valid: false, reason: strength.errors[0], checkPwned: false };
    }

    const pwned = await this.checkPwnedPassword(password);
    if (pwned.pwned) {
      return { valid: false, reason: 'Password found in data breach. Choose a different password.', checkPwned: true, pwnedCount: pwned.count };
    }

    const inHistory = await this.isPasswordInHistory(password, history);
    if (inHistory) {
      return { valid: false, reason: 'Password was used previously. Choose a different password.', checkPwned: false };
    }

    return { valid: true, checkPwned: false };
  }
}

module.exports = new PasswordService();