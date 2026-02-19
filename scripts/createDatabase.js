require('dotenv').config();
const { Pool } = require('pg');

const createDatabase = async () => {
  // For Neon PostgreSQL, database is already created
  // This script is kept for backward compatibility
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined in .env file');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Testing connection to database...');
    
    // Test connection
    const result = await pool.query('SELECT 1');
    console.log('✓ Database connection successful');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    process.exit(1);
  }
};

createDatabase();
