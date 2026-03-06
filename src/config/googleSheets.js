const { google } = require("googleapis");
require("dotenv").config();

let sheetsClient = null;

// Initialize Google Sheets API
const initializeGoogleSheets = async () => {
  try {

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEETS_ID) {
      console.warn("⚠️ Google Sheets credentials missing");
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({
      version: "v4",
      auth,
    });

    console.log("✓ Google Sheets API initialized");

    return true;

  } catch (error) {

    console.error("❌ Google Sheets initialization error:", error.message);

    return false;

  }
};

const getGoogleSheetsClient = () => {
  if (!sheetsClient) {
    throw new Error("Google Sheets client not initialized");
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