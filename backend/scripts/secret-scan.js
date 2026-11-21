#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const allowlistPath = path.join(__dirname, 'secret-scan-allowlist.json');

// An allowlist is only for deliberately fake test fixtures. Real credentials
// must never be added here; the history search in the task notes is the
// evidence that these values were never live credentials.
let allowlist = [];
try {
  allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  if (!Array.isArray(allowlist)) allowlist = [];
} catch {
  allowlist = [];
}

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

function lineTextAt(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? text.length : end);
}

function previousLineText(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  if (start === 0) return '';
  const previousEnd = start - 1;
  const previousStart = text.lastIndexOf('\n', previousEnd - 1) + 1;
  return text.slice(previousStart, previousEnd);
}

function isAllowed(relative, ruleName, matchText, lineText, previousLine) {
  // Inline escape hatch: add `// secret-scan:allow <reason>` to the finding's
  // line (or the line above it).
  if (/secret-scan:allow/i.test(lineText) || /secret-scan:allow/i.test(previousLine || '')) {
    return true;
  }

  return allowlist.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    if (!entry.file && !entry.rule && !entry.match) return false;
    if (entry.file && entry.file !== relative) return false;
    if (entry.rule && entry.rule !== ruleName) return false;
    if (entry.match && !matchText.includes(entry.match)) return false;
    return true;
  });
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
      const lineText = lineTextAt(text, match.index);
      const previousLine = previousLineText(text, match.index);
      if (isAllowed(relative, rule.name, match[0], lineText, previousLine)) continue;
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
