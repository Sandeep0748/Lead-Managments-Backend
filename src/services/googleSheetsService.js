const pool = require('../config/database');
const { getGoogleSheetsClient, isGoogleSheetsConfigured } = require('../config/googleSheets');
require('dotenv').config();

// Add lead to Google Sheets
const addLeadToSheet = async (leadData) => {
  try {
    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      console.warn('Google Sheets not configured, skipping sync');
      return { success: false, error: 'Google Sheets not configured' };
    }

    if (!process.env.GOOGLE_SHEETS_ID) {
      console.warn('GOOGLE_SHEETS_ID not set');
      return { success: false, error: 'Sheet ID not configured' };
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
      console.error('No updated range returned from Google Sheets');
      return { success: false, error: 'No row ID returned' };
    }

    const rowMatch = updatedRange.match(/Sheet1!A(\d+):J(\d+)/);
    const sheetRowId = rowMatch ? parseInt(rowMatch[1]) : null;

    // Update lead with sheet_row_id
    if (sheetRowId) {
      await pool.query(
        'UPDATE leads SET sheet_row_id = $1 WHERE id = $2',
        [sheetRowId, leadData.id]
      );
      console.log(`✓ Lead ${leadData.id} synced to Google Sheet row ${sheetRowId}`);
    }

    return { success: true, sheetRowId };
  } catch (error) {
    console.error('Error adding lead to Google Sheets:', {
      message: error.message,
      code: error.code,
      leadId: leadData.id,
    });
    // Log error but don't fail the main operation
    return { success: false, error: error.message };
  }
};

// Update lead status in Google Sheets
const updateLeadStatusInSheet = async (sheetRowId, status) => {
  try {
    if (!sheetRowId) {
      console.warn('No sheet row ID for status update');
      return { success: false, error: 'No sheet row ID' };
    }

    if (!isGoogleSheetsConfigured()) {
      console.warn('Google Sheets not configured, skipping status update');
      return { success: false, error: 'Google Sheets not configured' };
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

    console.log(`✓ Sheet row ${sheetRowId} status updated to: ${status}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating lead status in Google Sheets:', {
      message: error.message,
      sheetRowId,
      status,
    });
    return { success: false, error: error.message };
  }
};

// Sync all leads from database to Google Sheets
const syncAllLeadsToSheet = async () => {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn('Google Sheets not configured, skipping sync');
      return { success: false, error: 'Google Sheets not configured' };
    }

    const result = await pool.query(
      'SELECT * FROM leads WHERE sheet_row_id IS NULL LIMIT 100'
    );

    const leads = result.rows;
    let synced = 0;
    let failed = 0;
    
    for (const lead of leads) {
      const syncResult = await addLeadToSheet(lead);
      if (syncResult.success) {
        synced++;
      } else {
        failed++;
      }
    }

    console.log(`✓ Sync completed: ${synced} synced, ${failed} failed`);
    return { success: true, synced, failed };
  } catch (error) {
    console.error('Error syncing leads to Google Sheets:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  addLeadToSheet,
  updateLeadStatusInSheet,
  syncAllLeadsToSheet,
};
