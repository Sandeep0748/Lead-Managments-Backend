const { 
  createLead,
  getLeads,
  getLeadCount,
  getLeadById,
  updateLeadStatus,
  deleteLead
} = require('../services/leadService');
const { updateLeadStatusInSheet, syncAllLeadsToSheet } = require('../services/googleSheetsService');

// Submit lead form
const submitLead = async (req, res) => {
  try {
    const { name, email, phone, course, college, year } = req.body;

    const lead = await createLead({
      name,
      email,
      phone,
      course,
      college,
      year,
    });

    res.status(201).json({
      message: 'Lead submitted successfully',
      lead,
    });
  } catch (error) {
    console.error('Submit lead error:', error);
    
    if (error.message.includes('already registered')) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to submit lead' });
  }
};

// Get all leads (admin)
const getAllLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {
      status: req.query.status,
      course: req.query.course,
      search: req.query.search,
    };

    const leads = await getLeads(skip, limit, filters);
    const total = await getLeadCount(filters);

    res.json({
      data: leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

// Get single lead
const getLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await getLeadById(id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
};

// Update lead status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'contacted', 'qualified', 'lost'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const lead = await getLeadById(id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updatedLead = await updateLeadStatus(id, status);

    // Update Google Sheets asynchronously if sheet_row_id exists
    // Don't wait for this to complete - status is updated in DB regardless
    if (lead.sheet_row_id) {
      updateLeadStatusInSheet(lead.sheet_row_id, status)
        .then(syncResult => {
          if (syncResult.success) {
            console.log(`✓ Lead ${id} status updated in Google Sheets`);
          } else {
            console.warn(`⚠️ Google Sheets status update failed for lead ${id}: ${syncResult.error}`);
          }
        })
        .catch(err => {
          console.error(`❌ Google Sheets status update error for lead ${id}:`, err.message);
        });
    } else {
      console.log(`ℹ️ Lead ${id} not synced to Google Sheets yet, skipping sheet update`);
    }

    res.json({
      message: 'Lead status updated',
      lead: updatedLead,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// Delete lead
const removeLead = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteLead(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
};

// Sync unsynced leads to Google Sheets (admin utility)
const syncToGoogleSheets = async (req, res) => {
  try {
    console.log('📊 Admin triggered Google Sheets sync');
    const syncResult = await syncAllLeadsToSheet();

    res.json({
      message: syncResult.message || 'Sync completed',
      ...syncResult,
    });
  } catch (error) {
    console.error('Sync to Google Sheets error:', error);
    res.status(500).json({ 
      error: 'Failed to sync leads to Google Sheets',
      message: error.message 
    });
  }
};

module.exports = {
  submitLead,
  getAllLeads,
  getLead,
  updateStatus,
  removeLead,
  syncToGoogleSheets,
};
