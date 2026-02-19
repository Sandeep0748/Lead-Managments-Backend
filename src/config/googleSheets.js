const { google } = require('googleapis');
require('dotenv').config();

let sheetsClient = null;

// Initialize Google Sheets API
const initializeGoogleSheets = async () => {
  try {
    // Check if Google Sheets API credentials are configured
    if (!process.env.GOOGLE_SHEETS_ID) {
      console.warn('⚠️ GOOGLE_SHEETS_ID not configured - Google Sheets sync disabled');
      return false;
    }

    if (process.env.GOOGLE_PRIVATE_KEY_PATH) {
      try {
        const keyFile = require(process.env.GOOGLE_PRIVATE_KEY_PATH);
        const auth = new google.auth.GoogleAuth({
          keyFile: process.env.GOOGLE_PRIVATE_KEY_PATH,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        sheetsClient = google.sheets({
          version: 'v4',
          auth: auth,
        });
        
        console.log('✓ Google Sheets API initialized with service account');
        return true;
      } catch (err) {
        console.warn('⚠️ Service account file not found, falling back to API key:', err.message);
        
        if (!process.env.GOOGLE_SHEETS_API_KEY) {
          console.warn('⚠️ GOOGLE_SHEETS_API_KEY also not configured');
          return false;
        }
      }
    }

    if (process.env.GOOGLE_SHEETS_API_KEY) {
      sheetsClient = google.sheets({
        version: 'v4',
        key: process.env.GOOGLE_SHEETS_API_KEY,
      });
      console.log('✓ Google Sheets API initialized with API Key');
      return true;
    } else {
      console.warn('⚠️ No Google Sheets API credentials found');
      return false;
    }
  } catch (error) {
    console.error('⚠️ Error initializing Google Sheets:', error.message);
    return false;
  }
};

const getGoogleSheetsClient = () => {
  if (!sheetsClient) {
    throw new Error('Google Sheets client not initialized. Check your API credentials.');
  }
  return sheetsClient;
};

const isGoogleSheetsConfigured = () => {
  return sheetsClient !== null;
};

module.exports = {
  initializeGoogleSheets,
  getGoogleSheetsClient,
  isGoogleSheetsConfigured,
};
