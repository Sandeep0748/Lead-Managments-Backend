/**
 * Google Apps Script for Lead Management
 * 
 * Attach this script to your Google Sheet and set up a trigger:
 * 1. Open the Google Sheet
 * 2. Extensions > Apps Script
 * 3. Copy this code
 * 4. Set up trigger: Triggers > Create new trigger
 *    - Function: sendReminderEmails
 *    - Event type: Time-driven
 *    - Frequency: Day
 *    - Time: 9 AM to 10 AM (or your preferred time)
 */

// Configuration
const CONFIG = {
  ADMIN_EMAIL: 'admin@launchedglobal.in',
  SHEET_ID: 'Sheet1',
  REMINDER_COLUMN: 10, // Column J - Reminder Sent
  STATUS_COLUMN: 8,    // Column H - Status
  DATE_COLUMN: 9,      // Column I - Created At
  NAME_COLUMN: 2,      // Column B - Name
  EMAIL_COLUMN: 3,     // Column C - Email
  ID_COLUMN: 1,        // Column A - Lead ID
};

/**
 * Main function to send reminder emails
 * This runs daily at 9 AM
 */
function sendReminderEmails() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let remindersSent = 0;
    let errors = [];

    // Start from row 2 (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[CONFIG.STATUS_COLUMN - 1];
      const createdAtStr = row[CONFIG.DATE_COLUMN - 1];
      const reminderSent = row[CONFIG.REMINDER_COLUMN - 1];
      
      // Skip if already sent or status is not 'new'
      if (reminderSent === 'Yes' || status !== 'new') {
        continue;
      }

      try {
        const createdAt = new Date(createdAtStr);
        
        // Check if lead was created more than 24 hours ago
        if (createdAt < twentyFourHoursAgo) {
          const nameCell = row[CONFIG.NAME_COLUMN - 1];
          const emailCell = row[CONFIG.EMAIL_COLUMN - 1];
          
          if (emailCell) {
            // Send email
            sendReminderEmail(
              emailCell,
              nameCell,
              CONFIG.ADMIN_EMAIL
            );
            
            // Mark as reminder sent
            sheet.getRange(i + 1, CONFIG.REMINDER_COLUMN).setValue('Yes');
            sheet.getRange(i + 1, CONFIG.REMINDER_COLUMN).setBackground('#d4edda');
            
            remindersSent++;
          }
        }
      } catch (rowError) {
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    // Log the results
    logAction('Reminder Emails Sent', {
      count: remindersSent,
      errors: errors,
      timestamp: now.toISOString(),
    });

  } catch (error) {
    logAction('Error in sendReminderEmails', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Send reminder email to lead
 * @param {string} leadEmail - Lead's email address
 * @param {string} leadName - Lead's name
 * @param {string} adminEmail - Admin email for CC
 */
function sendReminderEmail(leadEmail, leadName, adminEmail) {
  const subject = 'Reminder: Complete Your Course Enrollment';
  
  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Welcome to LaunchedGlobal!</h2>
          
          <p>Hi <strong>${leadName}</strong>,</p>
          
          <p>We noticed that you started your enrollment process but haven't completed it yet. 
             We'd love to have you on board!</p>
          
          <h3 style="color: #764ba2;">Why Choose LaunchedGlobal?</h3>
          <ul>
            <li>Industry-expert instructors</li>
            <li>Hands-on projects and real-world experience</li>
            <li>Career support and job placement assistance</li>
            <li>Flexible learning schedules</li>
            <li>Affordable pricing with certification</li>
          </ul>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Visit our website: <a href="https://launchedglobal.in">launchedglobal.in</a></li>
            <li>Complete your enrollment by clicking "Enroll Now"</li>
            <li>Our team will reach out with course details</li>
          </ol>
          
          <p>If you have any questions or need assistance, feel free to reach out to us at 
             <a href="mailto:${adminEmail}">${adminEmail}</a></p>
          
          <p>Best regards,<br>
             <strong>LaunchedGlobal Team</strong></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            This is an automated reminder. If you have already enrolled, please ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const options = {
    htmlBody: htmlBody,
    cc: adminEmail,
    name: 'LaunchedGlobal',
    replyTo: adminEmail,
  };

  try {
    GmailApp.sendEmail(leadEmail, subject, '', options);
    Logger.log(`Email sent to ${leadEmail}`);
  } catch (error) {
    Logger.log(`Failed to send email to ${leadEmail}: ${error.message}`);
    throw error;
  }
}

/**
 * Log actions to a separate sheet for tracking
 * @param {string} action - The action performed
 * @param {object} details - Additional details
 */
function logAction(action, details) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = spreadsheet.getSheetByName('Logs');
    
    // Create log sheet if it doesn't exist
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet('Logs');
      logSheet.appendRow(['Timestamp', 'Action', 'Details']);
    }
    
    const timestamp = new Date().toISOString();
    const detailsStr = JSON.stringify(details);
    
    logSheet.appendRow([timestamp, action, detailsStr]);
  } catch (error) {
    Logger.log(`Failed to log action: ${error.message}`);
  }
}

/**
 * Test function - run this manually to test email sending
 * Open Apps Script editor, and click "Run" next to this function
 */
function testReminderEmail() {
  const testEmail = 'admin@launchedglobal.in'; // Change to test email
  const testName = 'Test User';
  
  try {
    sendReminderEmail(testEmail, testName, CONFIG.ADMIN_EMAIL);
    Logger.log('Test email sent successfully!');
  } catch (error) {
    Logger.log(`Test failed: ${error.message}`);
  }
}

/**
 * Manual trigger to sync data from backend
 * This function can be called from backend to sync new data
 */
function onSubmitLead(leadData) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Append new lead to sheet
    sheet.appendRow([
      leadData.id,
      leadData.name,
      leadData.email,
      leadData.phone,
      leadData.course,
      leadData.college,
      leadData.year,
      leadData.status || 'new',
      new Date(leadData.created_at).toISOString(),
      'No', // Reminder Sent
    ]);
    
    logAction('Lead Added', leadData);
  } catch (error) {
    logAction('Error Adding Lead', { error: error.message });
  }
}

/**
 * Column headers explanation:
 * A: Lead ID
 * B: Name
 * C: Email
 * D: Phone
 * E: Course
 * F: College
 * G: Year
 * H: Status (new/contacted/qualified/lost)
 * I: Created At
 * J: Reminder Sent (Yes/No)
 */
