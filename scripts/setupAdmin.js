require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/database');
const { hashPassword } = require('../src/utils/auth');

const setupAdmin = async () => {
  try {
    console.log('\n🔧 Setting up Admin User...\n');

    const email = process.env.ADMIN_EMAIL || 'admin@launchedglobal.in';
    const password = process.env.ADMIN_PASSWORD || 'Password123!';
    const name = 'Admin User';

    // Check if admin exists
    const checkAdmin = await pool.query(
      'SELECT * FROM admins WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (checkAdmin.rows.length > 0) {
      console.log(`✓ Admin user already exists: ${email}`);
      console.log('\n✓ Admin setup completed!');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO admins (email, password_hash, name, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, email, name;`,
      [email.toLowerCase(), hashedPassword, name]
    );

    const admin = result.rows[0];

    console.log('✓ Admin user created successfully!\n');
    console.log('📧 Admin Credentials:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   Save these credentials in a secure place!');
    console.log('   You can now login at: http://localhost:3000/login\n');

    console.log('✓ Admin setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Admin setup failed:', error.message);
    process.exit(1);
  }
};

setupAdmin();
