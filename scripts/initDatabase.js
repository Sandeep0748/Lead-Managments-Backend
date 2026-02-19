require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/database');

// Initialize database schema
const initDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Create leads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        course VARCHAR(255) NOT NULL,
        college VARCHAR(255) NOT NULL,
        year VARCHAR(10) NOT NULL,
        status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),
        sheet_row_id INTEGER,
        reminder_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✓ Leads table created (if not exists)');

    // Create index on email
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    `);

    console.log('✓ Email index created (if not exists)');

    // Create index on status
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    `);

    console.log('✓ Status index created (if not exists)');

    // Create index on created_at (needed for Apps Script daily query)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
    `);

    console.log('✓ Created_at index created (if not exists)');

    // Create index on reminder_sent (for filtering)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_reminder_sent ON leads(reminder_sent);
    `);

    console.log('✓ Reminder_sent index created (if not exists)');

    // Create composite index for Apps Script query (status + created_at)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC);
    `);

    console.log('✓ Composite index (status + created_at) created (if not exists)');

    // Create admin users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    console.log('✓ Admins table created (if not exists)');

    // Create logs table for tracking API calls
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        lead_id INTEGER,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✓ Logs table created (if not exists)');

    console.log('\n✓ Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
};

initDatabase();
