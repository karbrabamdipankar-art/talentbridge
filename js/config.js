// ============================================================
//  TalentBridge — Configuration
//  File: js/config.js
//
//  ⚠️  IMPORTANT: After deploying your Google Apps Script,
//  paste your Web App URL below.
// ============================================================

window.TB_CONFIG = {

  // ── STEP 1: Paste your Apps Script Web App URL here ───────
  // It looks like:
  // https://script.google.com/macros/s/AKfycb.../exec
  scriptUrl: 'https://script.google.com/macros/s/AKfycbzuvgSzzNw8VDZRv_DRhfdu5iyqK-cTbKEuqeHLfp6HwuyVIT3XAsDGhVuyNYPxSgWbyw/exec',

  // ── App metadata ──────────────────────────────────────────
  appName:    'TalentBridge',
  version:    '1.0.0',

  // ── Auto-sync interval in milliseconds (default: 3 min) ───
  syncInterval: 3 * 60 * 1000,

  // ── Session timeout in minutes ────────────────────────────
  sessionTimeout: 60,

};
