const { body, validationResult } = require('express-validator');

// Validation middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation error',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Lead submission validation rules
const validateLeadSubmission = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[0-9\s\-\+\(\)]{10,}$/)
    .withMessage('Phone must be at least 10 digits'),
  
  body('course')
    .trim()
    .notEmpty()
    .withMessage('Course is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Course must be between 2 and 255 characters'),
  
  body('college')
    .trim()
    .notEmpty()
    .withMessage('College is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('College must be between 2 and 255 characters'),
  
  body('year')
    .trim()
    .notEmpty()
    .withMessage('Year is required')
    .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'])
    .withMessage('Invalid year selection'),
];

// Login validation rules
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1 })
    .withMessage('Invalid password'),
];

// Admin registration validation rules
const validateAdminRegistration = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain at least one special character (!@#$%^&*)'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
];

// Status update validation
const validateStatusUpdate = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['new', 'contacted', 'qualified', 'lost'])
    .withMessage('Invalid status. Must be one of: new, contacted, qualified, lost'),
];

module.exports = {
  handleValidationErrors,
  validateLeadSubmission,
  validateLogin,
  validateAdminRegistration,
  validateStatusUpdate,
};
