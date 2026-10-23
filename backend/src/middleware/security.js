const crypto = require('crypto');
const helmet = require('helmet');
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_SERVICE: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  API_URL: z.string().url().optional(),
  REDIS_URL: z.string().min(1).optional(),
  HCAPTCHA_SECRET: z.string().optional(),
  HIBP_API_KEY: z.string().optional(),
  SEED_KEY: z.string().min(1).optional(),
  SEED_CLEAR_TOKEN: z.string().min(1).optional(),
  ENABLE_SEED: z.enum(['true', 'false']).default('false'),
  DISABLE_RATE_LIMIT: z.enum(['true', 'false']).default('false'),
  DISABLE_MFA: z.enum(['true', 'false']).default('false'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.string().default('5242880'),
  DEBUG: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

// Hashes of credentials that have appeared in this repository's history or
// documentation. Keeping only hashes here prevents the denylist itself from
// re-exposing those credentials.
const KNOWN_DEFAULT_HASHES = new Set([
  '70fc034b210dcf070d77e786028b693423b5b93f55938c040b1740a4dc889338',
  'd68202774a93943f7a043d3a4b7d6e2ce1232747ddcddad7eb42fa07f590fd90',
  '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121',
  '588c55f3ce2b8569b153c5abbf13f9f74308b88a20017cc699b835cc93195d16',
]);
const KNOWN_DEFAULT_SECRETS = new Set([
  'your-super-secret-jwt-key-min-32-chars-change-in-production',
  'your-super-secret-refresh-key-min-32-chars-change-in-production',
  'sk_test_your_key_here',
  'sk_live_...',
  'sk_test_...',
  'changeme',
  'your-secret-key',
  'secret'
]);

function isKnownDefault(value) {
  if (!value) return true;
  if (KNOWN_DEFAULT_SECRETS.has(value)) return true;
  const digest = crypto.createHash('sha256').update(value).digest('hex');
  return KNOWN_DEFAULT_HASHES.has(digest);
}

function validateEnvironment() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment validation failed:');
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    const required = [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'PAYSTACK_SECRET_KEY',
    ];
    const failures = [];

    for (const key of required) {
      const value = String(process.env[key] || '').trim();
      if (!value || isKnownDefault(value)) {
        failures.push(`${key} is missing or uses a known default`);
      }
    }

    const mongoUri = String(process.env.MONGODB_URI || '');
    if (mongoUri && !/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
      failures.push('MONGODB_URI is not a MongoDB connection string');
    }
    if (/(?:localhost|127\.0\.0\.1)/i.test(mongoUri)) {
      failures.push('MONGODB_URI must not point at localhost in production');
    }

    const paystackKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (paystackKey && !/^sk_(test|live)_[A-Za-z0-9]+$/.test(paystackKey)) {
      failures.push('PAYSTACK_SECRET_KEY is not a valid Paystack secret key');
    }

    if (process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET
      && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
      failures.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }

    if (failures.length) {
      console.error('Production environment validation failed:');
      failures.forEach((failure) => console.error(`  - ${failure}`));
      console.error('Refusing to start. Set the required values in the deployment environment.');
      process.exit(1);
    }
  }

  console.log('[SECURITY] Environment variables validated');
}

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.paystack.co", "https://www.google.com/recaptcha", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.paystack.co", "https://api.pwnedpasswords.com", "http://ip-api.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

const corsOptions = (req, callback) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  const origin = req.header('Origin');
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (!isAllowed) {
    return callback(new Error('CORS policy: Origin not allowed'));
  }

  callback(null, {
    origin: allowedOrigins.includes(origin) ? origin : false,
    credentials: true,
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Paystack-Signature']
  });
};

const sanitizationOptions = {
  replace: ''
};

module.exports = { validateEnvironment, securityHeaders, corsOptions, sanitizationOptions };