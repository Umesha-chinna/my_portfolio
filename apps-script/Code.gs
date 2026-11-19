/**
 * Contact-form receiver for the portfolio site.
 *
 * Create this as a CONTAINER-BOUND script (open your Google Sheet ->
 * Extensions -> Apps Script) so it only ever touches that one spreadsheet.
 *
 * @OnlyCurrentDoc
 * The tag above limits the OAuth scope to this spreadsheet only
 * (https://www.googleapis.com/auth/spreadsheets.currentonly).
 */

var SHEET_NAME = 'Messages';
var HEADERS = ['Timestamp', 'Name', 'Email', 'Subject', 'Message'];
var MAX = { name: 100, email: 150, subject: 150, message: 2000 };
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 10000) return out_('error', 'Invalid request');

    var d = JSON.parse(raw);
    var name = clean_(d.name, MAX.name);
    var email = clean_(d.email, MAX.email);
    var subject = clean_(d.subject, MAX.subject);
    var message = clean_(d.message, MAX.message);

    // Server-side validation (never trust the browser)
    if (name.length < 2 || subject.length < 3 || message.length < 10 || !EMAIL_RE.test(email)) {
      return out_('error', 'Validation failed');
    }

    var sheet = getSheet_();
    sheet.appendRow([new Date(), neutralize_(name), neutralize_(email), neutralize_(subject), neutralize_(message)]);

    return out_('success', 'Saved');
  } catch (err) {
    console.error(err);
    return out_('error', 'Server error');
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Visiting the /exec URL in a browser just shows a status line, never any data.
function doGet() {
  return out_('ok', 'Contact endpoint is running. Submit via POST.');
}

/** Run this ONCE from the editor: creates headers and triggers the authorization prompt. */
function setup() {
  var sheet = getSheet_();
  Logger.log('Ready. Sheet "%s" has headers: %s', sheet.getName(), HEADERS.join(', '));
}

/** Optional: run from the editor to test an append without the website. */
function testAppend() {
  getSheet_().appendRow([new Date(), 'Test User', 'test@example.com', 'Test subject', 'This is a test message from the editor.']);
}

/* ---------- helpers ---------- */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().substring(0, max);
}

// Stop spreadsheet formula injection (=, +, -, @ at the start of a cell)
function neutralize_(s) {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function out_(result, message) {
  return ContentService.createTextOutput(JSON.stringify({ result: result, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
