const express = require('express');
const { submitLead, getAllLeads, getLead, updateStatus, removeLead } = require('../controllers/leadController');
const { verifyAuth, verifyAdmin } = require('../middleware/auth');
const { leadSubmissionLimiter, apiLimiter } = require('../utils/rateLimiter');
const { validateLeadSubmission, validateStatusUpdate, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Public: Submit lead with validation and rate limiting
router.post('/submit', leadSubmissionLimiter, validateLeadSubmission, handleValidationErrors, submitLead);

// Protected routes (admin only)
router.get('/all', apiLimiter, verifyAuth, verifyAdmin, getAllLeads);
router.get('/:id', apiLimiter, verifyAuth, verifyAdmin, getLead);
router.patch('/:id/status', apiLimiter, verifyAuth, verifyAdmin, validateStatusUpdate, handleValidationErrors, updateStatus);
router.delete('/:id', apiLimiter, verifyAuth, verifyAdmin, removeLead);

module.exports = router;
