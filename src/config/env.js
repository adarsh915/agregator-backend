require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT || '8081', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Aggregator Database
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key',
  jwtExpiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '86400', 10),
  
  // Backend URL
  backendBaseUrl: process.env.BACKEND_BASE_URL || 'http://127.0.0.1:8081'
};

module.exports = { env };
