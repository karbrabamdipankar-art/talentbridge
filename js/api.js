// ============================================================
//  TalentBridge — Frontend API Layer
//  File: js/api.js
//
//  KEY DESIGN DECISIONS:
//  1. syncAll()  uses GET  (no body needed, most cache-friendly)
//  2. All writes use POST with Content-Type: text/plain
//     (avoids CORS preflight that Apps Script can't handle)
//  3. Every fetch follows redirects (Apps Script URLs redirect
//     to the actual execution endpoint)
//  4. 20-second timeout (Apps Script cold starts can be slow)
// ============================================================

const API = (() => {

  const TIMEOUT_MS = 20000; // 20 s — Apps Script can cold-start slowly

  function scriptUrl() {
    const u = window.TB_CONFIG && window.TB_CONFIG.scriptUrl;
    if (!u || u === 'YOUR_APPS_SCRIPT_URL_HERE') {
      throw new Error('Apps Script URL not set. Open js/config.js and paste your Web App URL.');
    }
    return u;
  }

  // ── Race a fetch against a timeout ────────────────────────
  function fetchWithTimeout(url, options) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(
        'Request timed out after ' + (TIMEOUT_MS/1000) + 's. ' +
        'Apps Script may be cold-starting — please try again.'
      )), TIMEOUT_MS);

      fetch(url, options)
        .then(res => { clearTimeout(timer); resolve(res); })
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  // ── GET request (read-only, no body) ──────────────────────
  async function get(action, params) {
    const base = scriptUrl();
    const qs   = new URLSearchParams({ action });
    if (params) Object.entries(params).forEach(([k,v]) => qs.set(k, v));
    const url  = base + (base.includes('?') ? '&' : '?') + qs.toString();

    const res = await fetchWithTimeout(url, {
      method:   'GET',
      redirect: 'follow',   // IMPORTANT: Apps Script redirects once
    });
    if (!res.ok) throw new Error('Server error ' + res.status);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch(e) { throw new Error('Bad JSON from server: ' + text.slice(0, 120)); }
  }

  // ── POST request (writes + login) ─────────────────────────
  // Content-Type MUST be text/plain — anything else triggers a
  // CORS preflight OPTIONS request that Apps Script rejects.
  async function post(payload) {
    const url = scriptUrl();

    // Attach session info
    const session = (typeof Session !== 'undefined') ? Session.get() : null;
    if (session) {
      payload.requesterId   = session.employeeId;
      payload.requesterRole = session.role;
    }

    const res = await fetchWithTimeout(url, {
      method:   'POST',
      redirect: 'follow',
      headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
      body:     JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Server error ' + res.status);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch(e) { throw new Error('Bad JSON from server: ' + text.slice(0, 120)); }
  }

  // ── PUBLIC API ────────────────────────────────────────────

  const Auth = {
    // Login goes via POST (contains password)
    login:               (username, password) =>
                           post({ action: 'login', username, password }),
    changeAdminPassword: (currentPassword, newPassword) =>
                           post({ action: 'changeAdminPassword', currentPassword, newPassword }),
  };

  const Sync = {
    // syncAll via GET — no sensitive data in the URL, and GET
    // is more reliable across networks / proxies
    all: () => get('syncAll'),
  };

  const Employees = {
    list:   ()     => get('getEmployees'),
    create: (data) => post({ action: 'createEmployee',  ...data }),
    update: (data) => post({ action: 'updateEmployee',  ...data }),
    delete: (id)   => post({ action: 'deleteEmployee',  id }),
  };

  const Companies = {
    list:   ()     => get('getCompanies'),
    create: (data) => post({ action: 'createCompany',   ...data }),
    update: (data) => post({ action: 'updateCompany',   ...data }),
    delete: (id)   => post({ action: 'deleteCompany',   id }),
  };

  const Candidates = {
    list:           ()     => get('getCandidates'),
    create:         (data) => post({ action: 'createCandidate',  ...data }),
    update:         (data) => post({ action: 'updateCandidate',  ...data }),
    delete:         (id)   => post({ action: 'deleteCandidate',  id }),
    updateTracking: (data) => post({ action: 'updateTracking',   ...data }),
  };

  const Interviews = {
    list:   ()     => get('getInterviews'),
    create: (data) => post({ action: 'createInterview', ...data }),
    update: (data) => post({ action: 'updateInterview', ...data }),
    delete: (id)   => post({ action: 'deleteInterview', id }),
  };

  const Settings = {
    get:    ()     => get('getSettings'),
    update: (data) => post({ action: 'updateSettings',  ...data }),
  };

  const Logs = {
    get: () => get('getLogs'),
  };

  // ── PING (used by startup to test connectivity fast) ──────
  const ping = () => get('ping');

  return { Auth, Sync, Employees, Companies, Candidates,
           Interviews, Settings, Logs, ping };

})();
