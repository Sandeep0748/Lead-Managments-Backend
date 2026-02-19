const pool = require('../config/database');
const { getGoogleSheetsClient, isGoogleSheetsConfigured } = require('../config/googleSheets');
require('dotenv').config();

// Check if lead is already synced to Google Sheets
const isLeadSynced = async (leadId) => {
  try {
    const result = await pool.query(
      'SELECT sheet_row_id FROM leads WHERE id = $1',
      [leadId]
    );
    const lead = result.rows[0];
    return lead && lead.sheet_row_id !== null;
  } catch (error) {
    console.error('Error checking lead sync status:', {
      message: error.message,
      leadId,
    });
    return false;
  }
};

// Add lead to Google Sheets with duplicate prevention
const addLeadToSheet = async (leadData) => {
  try {
    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      console.warn('⚠️ Google Sheets not configured, skipping sync');
      return { success: false, error: 'Google Sheets not configured' };
    }

    if (!process.env.GOOGLE_SHEETS_ID) {
      console.warn('⚠️ GOOGLE_SHEETS_ID not set');
      return { success: false, error: 'Sheet ID not configured' };
    }

    // Prevent duplicate: Check if lead is already synced
    const alreadySynced = await isLeadSynced(leadData.id);
    if (alreadySynced) {
      console.log(`ℹ️ Lead ${leadData.id} already synced to Google Sheets, skipping duplicate`);
      return { success: false, error: 'Lead already synced' };
    }

    const sheets = getGoogleSheetsClient();
    
    const values = [
      [
        leadData.id,
        leadData.name,
        leadData.email,
        leadData.phone,
        leadData.course,
        leadData.college,
        leadData.year,
        leadData.status,
        new Date(leadData.created_at).toISOString(),
        'No',
      ],
    ];

    const resource = {
      values,
    };

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:J',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource,
    });

    // Extract the row number from the result
    const updatedRange = result.data.updates?.updatedRange;
    if (!updatedRange) {
      console.error('❌ No updated range returned from Google Sheets');
      return { success: false, error: 'No row ID returned' };
    }

    const rowMatch = updatedRange.match(/Sheet1!A(\d+):J(\d+)/);
    const sheetRowId = rowMatch ? parseInt(rowMatch[1]) : null;

    // Update lead with sheet_row_id to prevent future duplicates
    if (sheetRowId) {
      await pool.query(
        'UPDATE leads SET sheet_row_id = $1 WHERE id = $2',
        [sheetRowId, leadData.id]
      );
      console.log(`✓ Lead ${leadData.id} synced to Google Sheet row ${sheetRowId}`);
    }

    return { success: true, sheetRowId };
  } catch (error) {
    console.error('❌ Error adding lead to Google Sheets:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      leadId: leadData.id,
      stack: error.stack,
    });
    // Log error but don't fail the main operation
    return { success: false, error: error.message };
  }
};

// Update lead status in Google Sheets
const updateLeadStatusInSheet = async (sheetRowId, status) => {
  try {
    if (!sheetRowId) {
      console.warn('⚠️ No sheet row ID provided for status update');
      return { success: false, error: 'No sheet row ID' };
    }

    if (!isGoogleSheetsConfigured()) {
      console.warn('⚠️ Google Sheets not configured, skipping status update');
      return { success: false, error: 'Google Sheets not configured' };
    }

    // Validate status before updating
    const validStatuses = ['new', 'contacted', 'qualified', 'lost'];
    if (!validStatuses.includes(status)) {
      console.warn('⚠️ Invalid status provided:', status);
      return { success: false, error: 'Invalid status value' };
    }

    const sheets = getGoogleSheetsClient();
    const range = `Sheet1!H${sheetRowId}`;
    
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[status]],
      },
    });

    if (!result.data.updatedCells || result.data.updatedCells === 0) {
      console.warn('⚠️ No cells updated in Google Sheets');
      return { success: false, error: 'No cells updated' };
    }

    console.log(`✓ Sheet row ${sheetRowId} status updated to: ${status}`);
    return { success: true, updatedCells: result.data.updatedCells };
  } catch (error) {
    console.error('❌ Error updating lead status in Google Sheets:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      sheetRowId,
      status,
      stack: error.stack,
    });
    // Don't fail the main operation: status update succeeded in DB
    return { success: false, error: error.message };
  }
};

// Sync all unsynced leads from database to Google Sheets
const syncAllLeadsToSheet = async () => {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn('⚠️ Google Sheets not configured, skipping sync');
      return { success: false, error: 'Google Sheets not configured', synced: 0, failed: 0 };
    }

    console.log('🔄 Starting sync of unsynced leads to Google Sheets...');

    const result = await pool.query(
      'SELECT * FROM leads WHERE sheet_row_id IS NULL LIMIT 100 ORDER BY created_at ASC'
    );

    const leads = result.rows;

    if (leads.length === 0) {
      console.log('ℹ️ No unsynced leads found');
      return { success: true, synced: 0, failed: 0, message: 'No unsynced leads' };
    }

    console.log(`Found ${leads.length} unsynced leads to sync`);

    let synced = 0;
    let failed = 0;
    const failedLeads = [];
    
    for (const lead of leads) {
      try {
        const syncResult = await addLeadToSheet(lead);
        if (syncResult.success) {
          synced++;
          console.log(`✓ Synced lead ${lead.id}`);
        } else {
          // Skip duplicates (error: 'Lead already synced')
          if (syncResult.error !== 'Lead already synced') {
            failed++;
            failedLeads.push({ id: lead.id, error: syncResult.error });
          }
        }
      } catch (error) {
        failed++;
        failedLeads.push({ id: lead.id, error: error.message });
        console.error(`❌ Failed to sync lead ${lead.id}:`, error.message);
      }
    }

    const summary = `✓ Sync completed: ${synced} synced, ${failed} failed`;
    console.log(summary);

    if (failedLeads.length > 0) {
      console.warn('⚠️ Failed leads details:', failedLeads);
    }

    return { 
      success: true, 
      synced, 
      failed, 
      message: summary,
      failedLeads: failedLeads.length > 0 ? failedLeads : undefined
    };
  } catch (error) {
    console.error('❌ Error syncing leads to Google Sheets:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return { success: false, error: error.message, synced: 0, failed: 0 };
  }
};

module.exports = {
  isLeadSynced,
  addLeadToSheet,
  updateLeadStatusInSheet,
  syncAllLeadsToSheet,
};
