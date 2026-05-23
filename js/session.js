// ============================================================
//  TalentBridge — Session & Auth Manager
//  File: js/session.js
// ============================================================

const Session = (() => {
  const KEY     = 'tb_session';
  const TIMEOUT = 60; // minutes, overridden by settings

  function get() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      // Check expiry
      if (Date.now() > s.expiresAt) {
        clear();
        return null;
      }
      return s;
    } catch { return null; }
  }

  function set(userData, timeoutMinutes) {
    const mins = timeoutMinutes || TIMEOUT;
    const s = {
      ...userData,
      loginAt:   Date.now(),
      expiresAt: Date.now() + mins * 60 * 1000,
    };
    sessionStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }

  function clear() {
    sessionStorage.removeItem(KEY);
  }

  function refresh() {
    const s = get();
    if (!s) return null;
    const mins = (Store.get('settings')?.sessionTimeoutMinutes) || TIMEOUT;
    s.expiresAt = Date.now() + mins * 60 * 1000;
    sessionStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }

  function isAdmin() {
    const s = get();
    return s && s.role === 'admin';
  }

  function isAuthenticated() {
    return !!get();
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = 'index';
      return false;
    }
    Session.refresh();
    return true;
  }

  function requireAdmin() {
    if (!isAdmin()) {
      UI.toast('Access denied — Admins only', 'error');
      return false;
    }
    return true;
  }

  return { get, set, clear, refresh, isAdmin, isAuthenticated, requireAuth, requireAdmin };
})();


// ============================================================
//  Local Data Store (in-memory + localStorage cache)
// ============================================================
const Store = (() => {
  const CACHE_KEY = 'tb_cache';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  let mem = {
    employees:  [],
    companies:  [],
    candidates: [],
    interviews: [],
    settings:   {},
    syncedAt:   null,
  };

  function load() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.syncedAt && Date.now() - parsed.syncedAt < CACHE_TTL) {
          mem = parsed;
          return true; // cache hit
        }
      }
    } catch {}
    return false; // cache miss
  }

  function save() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(mem)); } catch {}
  }

  function setAll(snapshot) {
    if (snapshot.employees)  mem.employees  = snapshot.employees;
    if (snapshot.companies)  mem.companies  = snapshot.companies;
    if (snapshot.candidates) mem.candidates = snapshot.candidates;
    if (snapshot.interviews) mem.interviews = snapshot.interviews;
    if (snapshot.settings)   mem.settings   = snapshot.settings;
    mem.syncedAt = Date.now();
    save();
  }

  function get(key) { return mem[key]; }

  function upsert(collection, item) {
    const arr = mem[collection];
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) arr[idx] = item;
    else          arr.push(item);
    save();
  }

  function remove(collection, id) {
    mem[collection] = mem[collection].filter(x => x.id !== id);
    save();
  }

  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    mem.syncedAt = null;
  }

  function lastSync() { return mem.syncedAt; }

  return { load, save, setAll, get, upsert, remove, clearCache, lastSync };
})();
