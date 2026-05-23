// ============================================================
//  TalentBridge — Main Application Controller
//  File: js/app.js
// ============================================================

const App = (() => {

  // ── STATE ─────────────────────────────────────────────────
  let currentPage    = 'dashboard';
  let syncInterval   = null;
  const SYNC_EVERY   = 3 * 60 * 1000; // auto-sync every 3 minutes

  // ── BOOT ──────────────────────────────────────────────────
  async function boot() {
    // If not authenticated, redirect to login
    if (!Session.isAuthenticated()) {
      window.location.href = 'index';
      return;
    }

    // Build chrome
    buildSidebar();
    buildTopbar();
    buildPages();
    applyRoleVisibility();

    // Initial sync
    await syncData(true);

    // Start auto-sync
    syncInterval = setInterval(() => syncData(false), SYNC_EVERY);

    // Navigate to default page
    navigate('dashboard');

    // Refresh session on activity
    document.addEventListener('click', () => Session.refresh());
    document.addEventListener('keydown', () => Session.refresh());

    // Watch for network coming back online
    window.addEventListener('online',  () => { UI.toast('Back online — syncing…', 'info'); syncData(false); });
    window.addEventListener('offline', () => UI.setSyncStatus('offline'));
  }

  // ── SYNC ENGINE ───────────────────────────────────────────
  async function syncData(showSpinner = false) {
    UI.setSyncStatus('syncing');
    if (showSpinner) UI.showLoading('Syncing with server…');
    try {
      const res = await API.Sync.all();
      if (!res.ok) throw new Error(res.msg || 'Sync failed');
      Store.setAll(res);
      UI.setSyncStatus('synced');
      if (showSpinner) UI.hideLoading();
      updateSyncTime();
      refreshCurrentPage();
      return true;
    } catch(e) {
      UI.setSyncStatus('error');
      if (showSpinner) {
        UI.hideLoading();
        UI.toast('Sync failed: ' + e.message + ' — using cached data', 'warning', 5000);
      }
      return false;
    }
  }

  function updateSyncTime() {
    const el = document.getElementById('last-sync-time');
    if (el) {
      const t = Store.lastSync();
      el.textContent = t ? 'Last synced: ' + new Date(t).toLocaleTimeString() : '';
    }
  }

  // ── NAVIGATION ────────────────────────────────────────────
  function navigate(page) {
    // Validate page access
    if (page === 'admin' && !Session.isAdmin()) {
      UI.toast('Admin access required', 'error');
      return;
    }
    currentPage = page;

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Show correct page
    document.querySelectorAll('.page-section').forEach(el => {
      el.style.display = el.id === 'page-' + page ? 'block' : 'none';
    });

    // Update topbar title
    const titles = {
      dashboard:  'Dashboard',
      candidates: 'All Candidates',
      interviews: 'Interview Records',
      tracking:   '6-Month Tracker',
      companies:  'Partner Companies',
      import:     'Bulk Import CSV',
      admin:      'Admin Panel',
      logs:       'Activity Logs',
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[page] || page;

    // Render the page
    renderPage(page);
  }

  function refreshCurrentPage() {
    renderPage(currentPage);
  }

  function renderPage(page) {
    switch(page) {
      case 'dashboard':  Pages.Dashboard.render();  break;
      case 'candidates': Pages.Candidates.render(); break;
      case 'interviews': Pages.Interviews.render(); break;
      case 'tracking':   Pages.Tracking.render();   break;
      case 'companies':  Pages.Companies.render();  break;
      case 'import':     Pages.Import.render();     break;
      case 'admin':      Pages.Admin.render();      break;
      case 'logs':       Pages.Logs.render();       break;
    }
  }

  // ── BUILD CHROME ──────────────────────────────────────────
  function buildSidebar() {
    const session = Session.get();
    const isAdmin = Session.isAdmin();

    const nav = [
      { page: 'dashboard',  icon: '🏠', label: 'Dashboard'       },
      { page: 'candidates', icon: '👥', label: 'All Candidates',  badge: 'badge-candidates' },
      { page: 'interviews', icon: '🎤', label: 'Interviews',      badge: 'badge-interviews' },
      { page: 'tracking',   icon: '📡', label: '6-Month Tracker', badge: 'badge-tracking'   },
      { page: 'companies',  icon: '🏢', label: 'Companies'        },
      { page: 'import',     icon: '📥', label: 'Bulk Import'      },
      ...(isAdmin ? [
        { page: 'admin', icon: '⚙️', label: 'Admin Panel',   adminOnly: true },
        { page: 'logs',  icon: '📋', label: 'Activity Logs', adminOnly: true },
      ] : []),
    ];

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <div class="logo">
        <div class="logo-icon">🚀</div>
        <div>
          <div class="logo-text">TalentBridge</div>
          <div class="logo-sub">Placement Suite</div>
        </div>
      </div>
      <nav class="nav">
        <div class="nav-section">Overview</div>
        ${nav.filter(n=>['dashboard'].includes(n.page)).map(navItem).join('')}
        <div class="nav-section">Candidates</div>
        ${nav.filter(n=>['candidates','interviews','tracking'].includes(n.page)).map(navItem).join('')}
        <div class="nav-section">Companies</div>
        ${nav.filter(n=>['companies','import'].includes(n.page)).map(navItem).join('')}
        ${isAdmin ? `<div class="nav-section">Admin</div>
        ${nav.filter(n=>n.adminOnly).map(navItem).join('')}` : ''}
      </nav>
      <div class="sidebar-footer">
        <div id="sync-status" style="display:flex;align-items:center;gap:6px;margin-bottom:12px;padding:0 4px"></div>
        <div class="user-pill">
          ${UI.avatar(session?.displayName || 'User', 34, 10)}
          <div class="user-info" style="margin-left:10px">
            <div class="name">${session?.displayName || session?.username || 'User'}</div>
            <div class="role">${session?.role === 'admin' ? '🔑 Admin' : '👤 Employee'}</div>
          </div>
        </div>
      </div>`;

    // Bind nav clicks
    sidebar.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.page));
    });
  }

  function navItem(n) {
    return `<div class="nav-item" data-page="${n.page}">
      <span class="icon">${n.icon}</span> ${n.label}
      ${n.badge ? `<span class="badge" id="${n.badge}">0</span>` : ''}
    </div>`;
  }

  function buildTopbar() {
    const topbar = document.getElementById('topbar');
    if (!topbar) return;
    topbar.innerHTML = `
      <div class="topbar-title" id="page-title">Dashboard</div>
      <div style="display:flex;align-items:center;gap:10px;margin-left:auto;flex-wrap:wrap">
        <div class="search-bar">
          <span>🔍</span>
          <input type="text" id="global-search" placeholder="Search candidates, companies…" oninput="App.handleSearch(this.value)">
        </div>
        <button class="btn btn-ghost" onclick="App.manualSync()" title="Sync with Google Sheets">
          🔄 Sync Now
        </button>
        <button class="btn btn-primary" onclick="Pages.Candidates.openAdd()">+ Add Candidate</button>
        <button class="btn btn-ghost" onclick="App.logout()" style="color:#FF7E6B;border-color:#FF7E6B">↩ Logout</button>
      </div>
      <div id="last-sync-time" style="width:100%;font-size:11px;font-weight:600;color:#9CA3AF;margin-top:4px;padding:0 0 4px"></div>`;
  }

  function buildPages() {
    const main = document.getElementById('main-content');
    if (!main) return;
    const pages = ['dashboard','candidates','interviews','tracking','companies','import','admin','logs'];
    main.innerHTML = pages.map(p => `<div id="page-${p}" class="page-section" style="display:none"></div>`).join('');
  }

  function applyRoleVisibility() {
    const isAdmin = Session.isAdmin();
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });
    document.querySelectorAll('[data-employee-only]').forEach(el => {
      el.style.display = !isAdmin ? '' : 'none';
    });
  }

  function updateBadges() {
    const candidates = Store.get('candidates') || [];
    const interviews = Store.get('interviews') || [];
    const selected   = candidates.filter(c => c.status === 'Selected');

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('badge-candidates', candidates.length);
    set('badge-interviews', interviews.length);
    set('badge-tracking',   selected.length);
  }

  // ── MANUAL SYNC ───────────────────────────────────────────
  async function manualSync() {
    const ok = await syncData(true);
    if (ok) UI.toast('✓ Data synced from Google Sheets!', 'sync');
  }

  // ── SEARCH ────────────────────────────────────────────────
  let searchTimer = null;
  function handleSearch(val) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (currentPage === 'candidates') Pages.Candidates.render(val);
    }, 250);
  }

  // ── LOGOUT ────────────────────────────────────────────────
  function logout() {
    clearInterval(syncInterval);
    Session.clear();
    Store.clearCache();
    window.location.href = 'index';
  }

  return { boot, navigate, syncData, manualSync, handleSearch, logout, updateBadges, refreshCurrentPage };
})();

// Auto-boot when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.boot());
