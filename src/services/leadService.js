const pool = require('../config/database');
const { isValidEmail, isValidPhone, sanitizeInput } = require('../utils/auth');
const { addLeadToSheet } = require('./googleSheetsService');

// Create a new lead
const createLead = async (leadData) => {
  const { name, email, phone, course, college, year } = leadData;

  // Validation
  if (!name || !email || !phone || !course || !college || !year) {
    throw new Error('All fields are required');
  }

  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  if (!isValidPhone(phone)) {
    throw new Error('Invalid phone number');
  }

  // Sanitize inputs
  const sanitizedName = sanitizeInput(name);
  const sanitizedEmail = sanitizeInput(email.toLowerCase());
  const sanitizedPhone = sanitizeInput(phone);
  const sanitizedCourse = sanitizeInput(course);
  const sanitizedCollege = sanitizeInput(college);
  const sanitizedYear = sanitizeInput(year);

  try {
    // Insert into database
    const result = await pool.query(
      `INSERT INTO leads (name, email, phone, course, college, year, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'new', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [sanitizedName, sanitizedEmail, sanitizedPhone, sanitizedCourse, sanitizedCollege, sanitizedYear]
    );

    const lead = result.rows[0];

    // Add to Google Sheets asynchronously
    addLeadToSheet(lead).catch(err => console.error('Google Sheets sync error:', err));

    return lead;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Email already registered');
    }
    throw error;
  }
};

// Get all leads with pagination
const getLeads = async (skip = 0, limit = 10, filters = {}) => {
  try {
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    // Filter by status
    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    // Filter by course
    if (filters.course) {
      query += ` AND LOWER(course) LIKE LOWER($${params.length + 1})`;
      params.push(`%${filters.course}%`);
    }

    // Search by name or email
    if (filters.search) {
      query += ` AND (LOWER(name) LIKE LOWER($${params.length + 1}) OR LOWER(email) LIKE LOWER($${params.length + 1}))`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, skip);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Get lead count
const getLeadCount = async (filters = {}) => {
  try {
    let query = 'SELECT COUNT(*) as total FROM leads WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters.course) {
      query += ` AND LOWER(course) LIKE LOWER($${params.length + 1})`;
      params.push(`%${filters.course}%`);
    }

    if (filters.search) {
      query += ` AND (LOWER(name) LIKE LOWER($${params.length + 1}) OR LOWER(email) LIKE LOWER($${params.length + 1}))`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total, 10);
  } catch (error) {
    throw error;
  }
};

// Get lead by ID
const getLeadById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

// Update lead status
const updateLeadStatus = async (id, status) => {
  try {
    const result = await pool.query(
      `UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;`,
      [status, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

// Delete lead
const deleteLead = async (id) => {
  try {
    const result = await pool.query(
      'DELETE FROM leads WHERE id = $1 RETURNING id;',
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadCount,
  getLeadById,
  updateLeadStatus,
  deleteLead,
};
