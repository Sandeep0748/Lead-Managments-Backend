const express = require('express');
const { login, createAdmin } = require('../controllers/authController');
const { loginLimiter } = require('../utils/rateLimiter');
const { verifyAuth, verifyAdmin } = require('../middleware/auth');
const { validateLogin, validateAdminRegistration, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Public: Login route with rate limiting and validation
router.post('/login', loginLimiter, validateLogin, handleValidationErrors, login);

// Protected: Create admin (requires admin authentication - only first admin setup should bypass this)
router.post('/register', verifyAuth, verifyAdmin, validateAdminRegistration, handleValidationErrors, createAdmin);

module.exports = router;
