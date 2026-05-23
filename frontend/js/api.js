// ============================================================
//  TalentBridge — Frontend API Layer
//  File: js/api.js
//  All communication with Google Apps Script goes through here
// ============================================================

const API = (() => {

  // ── CONFIG ────────────────────────────────────────────────
  // Replace this URL after you deploy your Apps Script as a Web App
  const SCRIPT_URL = window.TB_CONFIG?.scriptUrl || 'YOUR_APPS_SCRIPT_URL_HERE';
  const TIMEOUT_MS = 15000;

  // ── CORE FETCH ────────────────────────────────────────────
  async function get(action, params = {}) {
    const url = new URL(SCRIPT_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res  = await fetch(url.toString(), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
      throw e;
    }
  }

  async function post(payload) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      // Inject auth info into every request
      const session = Session.get();
      if (session) {
        payload.requesterId  = session.employeeId;
        payload.requesterRole = session.role;
      }
      const res = await fetch(SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' }, // Apps Script needs text/plain for CORS
        body:    JSON.stringify(payload),
        signal:  ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
      throw e;
    }
  }

  // ── AUTH ──────────────────────────────────────────────────
  const Auth = {
    login: (username, password) => post({ action: 'login', username, password }),
    changeAdminPassword: (currentPassword, newPassword) =>
      post({ action: 'changeAdminPassword', currentPassword, newPassword }),
  };

  // ── SYNC ──────────────────────────────────────────────────
  const Sync = {
    all: () => get('syncAll'),
  };

  // ── EMPLOYEES ─────────────────────────────────────────────
  const Employees = {
    list:   ()     => get('getEmployees'),
    create: (data) => post({ action: 'createEmployee', ...data }),
    update: (data) => post({ action: 'updateEmployee', ...data }),
    delete: (id)   => post({ action: 'deleteEmployee', id }),
  };

  // ── COMPANIES ─────────────────────────────────────────────
  const Companies = {
    list:   ()     => get('getCompanies'),
    create: (data) => post({ action: 'createCompany', ...data }),
    update: (data) => post({ action: 'updateCompany', ...data }),
    delete: (id)   => post({ action: 'deleteCompany', id }),
  };

  // ── CANDIDATES ────────────────────────────────────────────
  const Candidates = {
    list:    ()     => get('getCandidates'),
    create:  (data) => post({ action: 'createCandidate', ...data }),
    update:  (data) => post({ action: 'updateCandidate', ...data }),
    delete:  (id)   => post({ action: 'deleteCandidate', id }),
    updateTracking: (data) => post({ action: 'updateTracking', ...data }),
  };

  // ── INTERVIEWS ────────────────────────────────────────────
  const Interviews = {
    list:   ()     => get('getInterviews'),
    create: (data) => post({ action: 'createInterview', ...data }),
    update: (data) => post({ action: 'updateInterview', ...data }),
    delete: (id)   => post({ action: 'deleteInterview', id }),
  };

  // ── SETTINGS ──────────────────────────────────────────────
  const Settings = {
    get:    ()     => get('getSettings'),
    update: (data) => post({ action: 'updateSettings', ...data }),
  };

  // ── LOGS ──────────────────────────────────────────────────
  const Logs = {
    get: () => get('getLogs'),
  };

  return { Auth, Sync, Employees, Companies, Candidates, Interviews, Settings, Logs };
})();
