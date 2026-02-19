const pool = require('../config/database');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

// Admin login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get admin from database
    const result = await pool.query(
      'SELECT * FROM admins WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    );

    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: 'admin',
    });

    // Update last login
    await pool.query('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [admin.id]);

    res.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Create admin - PROTECTED ENDPOINT (only for initial setup, requires admin auth)
const createAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength (min 8 chars, at least 1 uppercase, 1 number)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    // Validate name
    if (name && name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    const hashedPassword = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO admins (email, password_hash, name, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, email, name;`,
      [email.toLowerCase(), hashedPassword, name ? name.trim() : email]
    );

    const admin = result.rows[0];

    res.status(201).json({
      message: 'Admin created successfully',
      admin,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Admin email already exists' });
    }
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

module.exports = {
  login,
  createAdmin,
};
