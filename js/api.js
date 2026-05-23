// ============================================================
//  TalentBridge — Frontend API Layer  v2.0
//  File: js/api.js
//
//  CRITICAL: ALL requests use POST with Content-Type: text/plain
//  ─────────────────────────────────────────────────────────────
//  Apps Script GET responses do NOT include CORS headers when
//  called cross-origin (e.g. from github.io). The browser
//  blocks them with "No Access-Control-Allow-Origin header".
//
//  POST with Content-Type: text/plain is a "simple request"
//  under CORS rules — no preflight OPTIONS is sent, and Apps
//  Script returns the response directly without CORS issues.
//
//  Rule: ZERO fetch() calls use method:'GET' in this file.
// ============================================================

const API = (() => {

  const TIMEOUT_MS = 25000; // 25 s — Apps Script cold starts can be slow

  // ── Get the Script URL from config ────────────────────────
  function scriptUrl() {
    const u = window.TB_CONFIG && window.TB_CONFIG.scriptUrl;
    if (!u || u.trim() === '' || u === 'YOUR_APPS_SCRIPT_URL_HERE') {
      throw new Error(
        'Apps Script URL not configured.\n' +
        'Open js/config.js and replace YOUR_APPS_SCRIPT_URL_HERE ' +
        'with your deployed Web App URL.'
      );
    }
    return u.trim();
  }

  // ── Core POST — every request goes through here ───────────
  // Using POST + text/plain avoids CORS preflight entirely.
  // Apps Script's doPost() receives e.postData.contents as the body.
  async function call(payload) {
    const url = scriptUrl();

    // Attach session credentials to every request
    const session = (typeof Session !== 'undefined') ? Session.get() : null;
    if (session) {
      payload.requesterId   = payload.requesterId   || session.employeeId;
      payload.requesterRole = payload.requesterRole || session.role;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(
          'Request timed out after ' + (TIMEOUT_MS / 1000) + 's. ' +
          'Apps Script may be cold-starting — please wait and try again.'
        ));
      }, TIMEOUT_MS);

      fetch(url, {
        method:   'POST',
        redirect: 'follow',
        // text/plain = "simple request" → no CORS preflight → works cross-origin
        headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
        body:     JSON.stringify(payload),
      })
      .then(res => {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status + ' from Apps Script');
        return res.text();
      })
      .then(text => {
        try {
          resolve(JSON.parse(text));
        } catch(e) {
          reject(new Error(
            'Server returned invalid JSON. Raw response: ' + text.slice(0, 200)
          ));
        }
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // ── PUBLIC API ────────────────────────────────────────────
  // All operations — reads AND writes — go via call() → POST

  const Auth = {
    login: (username, password) =>
      call({ action: 'login', username, password }),

    changeAdminPassword: (currentPassword, newPassword) =>
      call({ action: 'changeAdminPassword', currentPassword, newPassword }),
  };

  // ping: lightest possible call to verify the URL is alive
  const ping = () => call({ action: 'ping' });

  const Sync = {
    all: () => call({ action: 'syncAll' }),
  };

  const Employees = {
    list:   ()     => call({ action: 'getEmployees' }),
    create: (data) => call({ action: 'createEmployee',  ...data }),
    update: (data) => call({ action: 'updateEmployee',  ...data }),
    delete: (id)   => call({ action: 'deleteEmployee',  id }),
  };

  const Companies = {
    list:   ()     => call({ action: 'getCompanies' }),
    create: (data) => call({ action: 'createCompany',   ...data }),
    update: (data) => call({ action: 'updateCompany',   ...data }),
    delete: (id)   => call({ action: 'deleteCompany',   id }),
  };

  const Candidates = {
    list:           ()     => call({ action: 'getCandidates' }),
    create:         (data) => call({ action: 'createCandidate',  ...data }),
    update:         (data) => call({ action: 'updateCandidate',  ...data }),
    delete:         (id)   => call({ action: 'deleteCandidate',  id }),
    updateTracking: (data) => call({ action: 'updateTracking',   ...data }),
  };

  const Interviews = {
    list:   ()     => call({ action: 'getInterviews' }),
    create: (data) => call({ action: 'createInterview', ...data }),
    update: (data) => call({ action: 'updateInterview', ...data }),
    delete: (id)   => call({ action: 'deleteInterview', id }),
  };

  const Settings = {
    get:    ()     => call({ action: 'getSettings' }),
    update: (data) => call({ action: 'updateSettings',  ...data }),
  };

  const Logs = {
    get: () => call({ action: 'getLogs' }),
  };

  return {
    Auth, ping, Sync,
    Employees, Companies, Candidates,
    Interviews, Settings, Logs,
  };

})();
