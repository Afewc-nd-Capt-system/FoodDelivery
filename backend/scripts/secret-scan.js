#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

const rules = [
  {
    name: 'Paystack secret key',
    pattern: /sk_(?:live|test)_[A-Za-z0-9]{16,}/g,
  },
  {
    name: 'MongoDB URI with credentials',
    pattern: /mongodb(?:\+srv)?:\/\/[^:\s/]+:[^@\s/]+@/g,
  },
  {
    name: 'JWT secret assignment',
    pattern: /JWT(?:_REFRESH)?_SECRET\s*=\s*["']?[A-Za-z0-9_+/.=!@#$%^&*-]{32,}/g,
  },
  {
    name: 'Seed key assignment',
    pattern: /SEED_KEY\s*=\s*(?!process\.env)["']?[A-Za-z0-9_+/.=!@#$%^&*-]{16,}/g,
  },
  {
    name: 'Private key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: 'AWS access key',
    pattern: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name: 'Hardcoded password',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"'\s]{8,}["']/g,
  },
];

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

const findings = [];
for (const relative of trackedFiles()) {
  if (relative.startsWith('backend/tests/')) continue;
  const absolute = path.join(root, relative);
  let text;
  try {
    text = fs.readFileSync(absolute, 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\0')) continue;

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${relative}:${line}: ${rule.name}`);
    }
  }
}

if (findings.length) {
  console.error('Secret scan failed. Remove or load these values from the environment:');
  for (const finding of findings) console.error(`  - ${finding}`);
  process.exit(1);
}

console.log('Secret scan passed: no credential patterns found in tracked files.');
