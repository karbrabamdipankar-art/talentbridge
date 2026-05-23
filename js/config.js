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
  scriptUrl: 'https://script.google.com/macros/s/AKfycbw2VK6K8TWQRJfUVLD4DBcH4x7fDXLRZyoqFKV76PwcN6GENmDjsGEWsaQ8o6_j9V7WYA/exec',

  // ── App metadata ──────────────────────────────────────────
  appName:    'TalentBridge',
  version:    '1.0.0',

  // ── Auto-sync interval in milliseconds (default: 3 min) ───
  syncInterval: 3 * 60 * 1000,

  // ── Session timeout in minutes ────────────────────────────
  sessionTimeout: 60,

};
