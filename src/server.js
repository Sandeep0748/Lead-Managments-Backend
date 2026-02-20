const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const pool = require('./config/database');
const { initializeGoogleSheets } = require('./config/googleSheets');
const { errorHandler } = require('./middleware/auth');
const { hashPassword } = require('./utils/auth');

const leadRoutes = require('./routes/leads');
const authRoutes = require('./routes/auth');

const app = express();

/* ==============================
   SECURITY MIDDLEWARE
============================== */
app.use(helmet());

/* ==============================
   CORS CONFIGURATION
============================== */

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://lead-managments-frontend.vercel.app' // ⚠️ change if needed
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

/* ==============================
   BODY PARSER
============================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==============================
   ROUTES
============================== */
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

/* ==============================
   AUTO ADMIN SETUP
============================== */

const setupAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.log('⚠️ Admin credentials not provided');
      return;
    }

    const checkAdmin = await pool.query(
      'SELECT * FROM admins WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (checkAdmin.rows.length > 0) {
      console.log('✓ Admin already exists');
      return;
    }

    const hashedPassword = await hashPassword(password);

    await pool.query(
      `INSERT INTO admins (email, password_hash, name, is_active)
       VALUES ($1, $2, $3, true)`,
      [email.toLowerCase(), hashedPassword, 'Admin']
    );

    console.log('✓ Admin created automatically');
  } catch (err) {
    console.error('Admin setup error:', err.message);
  }
};

/* ==============================
   ERROR HANDLER
============================== */
app.use(errorHandler);

/* ==============================
   START SERVER
============================== */

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected');

    await initializeGoogleSheets();

    await setupAdmin(); // 👈 IMPORTANT

    app.listen(PORT, () => {
      console.log(`\n✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;