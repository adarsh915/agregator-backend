require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT || '8081', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Aggregator Database
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',

  // JWT
  // C-1 fix: the fallback 'change-this-secret-key' only works in dev.
  // In production this MUST be overridden by a strong random value from the env.
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key',
  jwtExpiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '86400', 10),

  // Backend URL
  backendBaseUrl: process.env.BACKEND_BASE_URL || 'http://127.0.0.1:8081',

  // CORS — comma-separated list of allowed frontend origins (C-3/C-4 fix)
  // L-2 fix: in production CORS_ALLOWED_ORIGINS must be explicitly set.
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
};

// L-2 fix: loud warning if running in production without explicit CORS or JWT config
if (env.nodeEnv === 'production') {
  if (!process.env.CORS_ALLOWED_ORIGINS) {
    console.warn('[SECURITY] CORS_ALLOWED_ORIGINS not set — defaulting to localhost. Set it explicitly in production!');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('[SECURITY] JWT_SECRET must be explicitly set in production. Refusing to start with a weak default.');
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error('[SECURITY] SUPABASE_SECRET_KEY is not set. Refusing to start without a database credential.');
  }
}

module.exports = { env };
