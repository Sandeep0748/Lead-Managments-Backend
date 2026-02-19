require('dotenv').config();

// Required environment variables
const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'ADMIN_EMAIL',
];

// Optional but recommended
const RECOMMENDED_ENV_VARS = [
  'GOOGLE_SHEETS_ID',
  'GOOGLE_SHEETS_API_KEY',
  'NODE_ENV',
  'PORT',
  'CLIENT_URL',
];

/**
 * Validate all required environment variables are set
 * @throws {Error} If required variables are missing
 */
const validateEnvironmentVariables = () => {
  const missing = [];
  
  REQUIRED_ENV_VARS.forEach(envVar => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file and ensure all required variables are set.`
    );
  }

  // Warn about recommended variables
  const missingRecommended = [];
  RECOMMENDED_ENV_VARS.forEach(envVar => {
    if (!process.env[envVar]) {
      missingRecommended.push(envVar);
    }
  });

  if (missingRecommended.length > 0) {
    console.warn(
      `⚠️  Missing recommended environment variables: ${missingRecommended.join(', ')}\n` +
      `Some features may not work correctly without these.`
    );
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn(
      '⚠️  JWT_SECRET is weak (< 32 characters). ' +
      'Please use a stronger secret key for production.'
    );
  }

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    console.warn(
      `⚠️  NODE_ENV value '${nodeEnv}' is not standard. ` +
      `Use one of: development, production, test`
    );
  }

  // Log validation success
  console.log('✓ All required environment variables are configured');
};

module.exports = {
  validateEnvironmentVariables,
  REQUIRED_ENV_VARS,
  RECOMMENDED_ENV_VARS,
};
