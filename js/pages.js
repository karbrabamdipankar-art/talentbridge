// ============================================================
//  TalentBridge — Page Renderers
//  File: js/pages.js
// ============================================================

const Pages = {};

// ── SHARED MODAL ENGINE ───────────────────────────────────
const Modal = (() => {
  function open(html, onClose) {
    close();
    const overlay = document.createElement('div');
    overlay.id = 'tb-modal-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(15,20,45,.55);backdrop-filter:blur(4px);
      z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;`;
    overlay.innerHTML = `<div class="modal" style="animation:slideUp .25s ease">${html}</div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(onClose); });
  }
  function close(cb) {
    const el = document.getElementById('tb-modal-overlay');
    if (el) el.remove();
    if (cb) cb();
  }
  function header(title, sub = '') {
    return `<div class="modal-header">
      <div><div class="modal-title">${title}</div>
      ${sub ? `<div style="font-size:13px;color:var(--text-muted);font-weight:600;margin-top:3px">${sub}</div>` : ''}
      </div>
      <button class="modal-close" onclick="Modal.close()">✕</button>
    </div><div class="modal-body">`;
  }
  function footer(cancelTxt = 'Cancel', saveTxt = '💾 Save', onSave = '') {
    return `<div class="form-actions">
      <button class="btn btn-ghost" onclick="Modal.close()">✕ ${cancelTxt}</button>
      <button class="btn btn-primary" onclick="${onSave}">${saveTxt}</button>
    </div>`;
  }
  return { open, close, header, footer };
})();

// ── DASHBOARD ─────────────────────────────────────────────
Pages.Dashboard = {
  render() {
    const candidates = Store.get('candidates') || [];
    const interviews = Store.get('interviews') || [];
    const companies  = Store.get('companies')  || [];
    const total   = candidates.length;
    const placed  = candidates.filter(c => c.status === 'Selected').length;
    const pct     = total ? Math.round(placed/total*100) : 0;
    const el = document.getElementById('page-dashboard');
    el.innerHTML = `
      <div class="welcome-banner">
        <h2>Good day! Let's place some talent 🎯</h2>
        <p>Here's your live pipeline snapshot — synced with Google Sheets.</p>
      </div>
      <div class="stats-grid">
        ${stat('👥','Total Candidates', total, 'var(--sky)')}
        ${stat('🏆','Placed', placed, 'var(--mint)', pct + '% rate')}
        ${stat('🎤','Interviews', interviews.length, 'var(--sun)')}
        ${stat('🏢','Companies', companies.length, 'var(--coral)')}
      </div>
      <div class="two-col" style="margin-bottom:20px">
        <div>
          <div class="section-header"><div class="section-title">📊 Pipeline</div></div>
          <div style="background:var(--surface);border-radius:var(--radius);border:2px solid var(--border);padding:22px">
            ${pipeline(candidates)}
          </div>
        </div>
        <div>
          <div class="section-header"><div class="section-title">⚡ Quick Actions</div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button class="action-btn" onclick="Pages.Candidates.openAdd()"><div class="ab-icon">👤</div><div class="ab-title">Add Candidate</div><div class="ab-desc">Register a new profile</div></button>
            <button class="action-btn" onclick="Pages.Interviews.openAdd()"><div class="ab-icon">🎤</div><div class="ab-title">Log Interview</div><div class="ab-desc">Record scores & notes</div></button>
            <button class="action-btn" onclick="App.navigate('companies')"><div class="ab-icon">🏢</div><div class="ab-title">Companies</div><div class="ab-desc">Partner companies</div></button>
            <button class="action-btn" onclick="App.manualSync()"><div class="ab-icon">🔄</div><div class="ab-title">Sync Now</div><div class="ab-desc">Refresh all data</div></button>
          </div>
        </div>
      </div>
      <div class="section-header"><div class="section-title">🌟 Recent Candidates</div></div>
      <div class="table-wrap">
        <table><thead><tr><th>Candidate</th><th>Status</th><th>Company</th><th>Consultancy</th><th>Date</th></tr></thead>
        <tbody>${recentRows(candidates)}</tbody></table>
      </div>`;
    App.updateBadges();
  }
};

function stat(icon, label, val, color, sub='') {
  return `<div class="stat-card">
    <div class="accent" style="background:${color}"></div>
    <div class="stat-icon">${icon}</div>
    <div class="stat-val">${val}</div>
    <div class="stat-label">${label}</div>
    ${sub ? `<div class="stat-delta delta-up">${sub}</div>` : ''}
  </div>`;
}
function pipeline(candidates) {
  const total = candidates.length || 1;
  const items = [
    ['New','var(--sky)'],['Interview Scheduled','var(--sun)'],
    ['Shortlisted','var(--lavender)'],['Selected','var(--mint)'],['Rejected','var(--coral)']
  ];
  return items.map(([s,c]) => {
    const n = candidates.filter(x=>x.status===s).length;
    return `<div class="prog-row"><span>${s}</span><strong>${n}</strong></div>
      <div class="prog-bar"><div class="prog-fill" style="width:${Math.round(n/total*100)}%;background:${c}"></div></div>`;
  }).join('');
}
function recentRows(candidates) {
  if (!candidates.length) return '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">No candidates yet</td></tr>';
  return [...candidates].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,8).map(c=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">${UI.avatar(c.name)}<div><div style="font-weight:700">${c.name}</div><div style="font-size:12px;color:var(--text-muted)">${c.college||''}</div></div></div></td>
      <td>${UI.statusBadge(c.status)}</td>
      <td>${c.selectedCo||c.prospects||'—'}</td>
      <td>${c.consultancy||'—'}</td>
      <td>${UI.fmtDate(c.createdAt)}</td>
    </tr>`).join('');
}

// ── CANDIDATES ────────────────────────────────────────────
Pages.Candidates = {
  editId: null,

  render(search = '') {
    const el = document.getElementById('page-candidates');
    const q  = (search || document.getElementById('global-search')?.value || '').toLowerCase();
    let   list = Store.get('candidates') || [];
    const fStatus = document.getElementById('filter-status')?.value || '';
    const fCons   = document.getElementById('filter-consultancy')?.value || '';
    if (fStatus) list = list.filter(c => c.status === fStatus);
    if (fCons)   list = list.filter(c => c.consultancy === fCons);
    if (q)       list = list.filter(c => (c.name+c.email+c.skills+c.consultancy).toLowerCase().includes(q));

    const all = Store.get('candidates') || [];
    const consultancies = [...new Set(all.map(c=>c.consultancy).filter(Boolean))];

    el.innerHTML = `
      <div class="section-header">
        <div class="section-title">👥 All Candidates</div>
        <button class="btn btn-primary" onclick="Pages.Candidates.openAdd()">+ Add Candidate</button>
      </div>
      <div class="filter-row">
        <select class="filter-select" id="filter-status" onchange="Pages.Candidates.render()">
          <option value="">All Statuses</option>
          ${['New','Interview Scheduled','Shortlisted','Selected','Rejected'].map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-consultancy" onchange="Pages.Candidates.render()">
          <option value="">All Consultancies</option>
          ${consultancies.map(c=>`<option>${c}</option>`).join('')}
        </select>
        <span style="margin-left:auto;font-size:13px;font-weight:800;color:var(--text-muted)">${list.length} candidate${list.length!==1?'s':''}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Candidate</th><th>Skills</th><th>Consultancy</th><th>Prospects</th><th>Status</th><th>Score</th><th>Actions</th></tr></thead>
          <tbody>${list.length ? list.map(c => this.row(c)).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No candidates found</td></tr>'}</tbody>
        </table>
      </div>`;
  },

  row(c) {
    const skills   = (c.skills||'').split(',').slice(0,3).map(s=>`<span class="pill pill-sky" style="margin:1px;font-size:11px">${s.trim()}</span>`).join('');
    const interv   = (Store.get('interviews')||[]).filter(i=>i.candidateId===c.id);
    const avg      = interv.length ? ((interv.reduce((a,i)=>(a+(+i.tech+ +i.comm+ +i.prob+ +i.culture)/4),0))/interv.length).toFixed(1) : null;
    const scoreHtml = avg !== null
      ? `<div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${avg*10}%;background:${UI.scoreColor(avg)};border-radius:3px"></div>
          </div>
          <span style="font-size:12px;font-weight:800;color:${UI.scoreColor(avg)}">${avg}</span>
        </div>`
      : '<span style="font-size:12px;color:var(--text-muted)">—</span>';
    const isAdmin = Session.isAdmin();
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px">${UI.avatar(c.name)}<div><div style="font-weight:700">${c.name}</div><div style="font-size:12px;color:var(--text-muted)">${c.degree||''} · ${c.year||''}</div></div></div></td>
      <td><div style="display:flex;flex-wrap:wrap;gap:2px;max-width:160px">${skills}</div></td>
      <td>${c.consultancy||'—'}</td>
      <td style="font-size:12px;color:var(--text-muted)">${(c.prospects||'—').slice(0,40)}</td>
      <td>${UI.statusBadge(c.status)}</td>
      <td style="min-width:110px">${scoreHtml}</td>
      <td style="white-space:nowrap">
        <button class="icon-btn" onclick="Pages.Candidates.openEdit('${c.id}')" title="Edit">✏️</button>
        ${isAdmin ? `<button class="icon-btn del" onclick="Pages.Candidates.remove('${c.id}')" title="Delete" style="margin-left:4px">🗑️</button>` : ''}
      </td>
    </tr>`;
  },

  openAdd() {
    this.editId = null;
    const companies = Store.get('companies') || [];
    Modal.open(Modal.header('👤 Add New Candidate','Fill in the candidate details below') + candidateForm(null, companies) + Modal.footer('Cancel','💾 Save Candidate','Pages.Candidates.save()') + '</div>');
  },

  openEdit(id) {
    const c = (Store.get('candidates')||[]).find(x=>x.id===id);
    if (!c) return;
    this.editId = id;
    const companies = Store.get('companies') || [];
    Modal.open(Modal.header('✏️ Edit Candidate') + candidateForm(c, companies) + Modal.footer('Cancel','💾 Update','Pages.Candidates.save()') + '</div>');
  },

  async save() {
    const data = collectCandidateForm();
    if (!data.name) { UI.toast('Name is required', 'error'); return; }
    UI.showLoading(this.editId ? 'Updating…' : 'Saving…');
    try {
      const res = this.editId
        ? await API.Candidates.update({ ...data, id: this.editId })
        : await API.Candidates.create(data);
      UI.hideLoading();
      if (!res.ok) { UI.toast(res.msg, 'error'); return; }
      Modal.close();
      UI.toast(this.editId ? '✅ Candidate updated!' : '🎉 Candidate added!');
      await App.syncData(false);
      this.render();
    } catch(e) { UI.hideLoading(); UI.toast(e.message, 'error'); }
  },

  remove(id) {
    const c = (Store.get('candidates')||[]).find(x=>x.id===id);
    UI.confirm(`Delete "${c?.name}"? This cannot be undone.`, async () => {
      UI.showLoading('Deleting…');
      try {
        const res = await API.Candidates.delete(id);
        UI.hideLoading();
        if (!res.ok) { UI.toast(res.msg, 'error'); return; }
        Store.remove('candidates', id);
        UI.toast('🗑️ Candidate deleted');
        this.render();
        App.updateBadges();
      } catch(e) { UI.hideLoading(); UI.toast(e.message, 'error'); }
    });
  }
};

function candidateForm(c, companies) {
  const v = (k) => c?.[k] || '';
  const coOpts = companies.map(co=>`<option value="${co.name}" ${c?.selectedCo===co.name?'selected':''}>${co.name}</option>`).join('');
  return `<div class="form-grid">
    <div class="form-group"><label>Full Name *</label><input id="cf-name" value="${v('name')}" placeholder="e.g. Priya Sharma"></div>
    <div class="form-group"><label>Email</label><input id="cf-email" type="email" value="${v('email')}" placeholder="priya@email.com"></div>
    <div class="form-group"><label>Phone</label><input id="cf-phone" value="${v('phone')}" placeholder="+91 98765 43210"></div>
    <div class="form-group"><label>Degree</label><input id="cf-degree" value="${v('degree')}" placeholder="B.Tech CSE"></div>
    <div class="form-group"><label>College</label><input id="cf-college" value="${v('college')}" placeholder="NIT Agartala"></div>
    <div class="form-group"><label>Graduation Year</label><input id="cf-year" type="number" value="${v('year')}" placeholder="2025" min="2000" max="2035"></div>
    <div class="form-group full"><label>Skills (comma separated)</label><input id="cf-skills" value="${v('skills')}" placeholder="Python, React, SQL"></div>
    <div class="form-group"><label>Source Consultancy</label><input id="cf-consultancy" value="${v('consultancy')}" placeholder="TechHire Solutions"></div>
    <div class="form-group"><label>Status</label>
      <select id="cf-status">
        ${['New','Interview Scheduled','Shortlisted','Selected','Rejected'].map(s=>`<option value="${s}" ${v('status')===s||(!c&&s==='New')?'selected':''}>${s}</option>`).join('')}
      </select></div>
    <div class="form-group full"><label>Prospect Companies</label><input id="cf-prospects" value="${v('prospects')}" placeholder="Infosys, TCS, Wipro"></div>
    <div class="form-group"><label>Selected Company</label>
      <select id="cf-selectedCo"><option value="">— None —</option>${coOpts}</select></div>
    <div class="form-group"><label>Placement Date</label><input id="cf-placementDate" type="date" value="${v('placementDate')}"></div>
    <div class="form-group full"><label>Notes</label><textarea id="cf-notes" rows="3" placeholder="Additional notes…">${v('notes')}</textarea></div>
  </div>`;
}

function collectCandidateForm() {
  const g = id => document.getElementById(id)?.value || '';
  return { name:g('cf-name'), email:g('cf-email'), phone:g('cf-phone'), degree:g('cf-degree'),
    college:g('cf-college'), year:g('cf-year'), skills:g('cf-skills'), consultancy:g('cf-consultancy'),
    status:g('cf-status'), prospects:g('cf-prospects'), selectedCo:g('cf-selectedCo'),
    placementDate:g('cf-placementDate'), notes:g('cf-notes') };
}

// ── INTERVIEWS ────────────────────────────────────────────
Pages.Interviews = {
  render() {
    const interviews = Store.get('interviews') || [];
    const el = document.getElementById('page-interviews');
    el.innerHTML = `
      <div class="section-header">
        <div class="section-title">🎤 Interview Records</div>
        <button class="btn btn-primary" onclick="Pages.Interviews.openAdd()">+ Log Interview</button>
      </div>
      ${!interviews.length
        ? '<div class="empty"><div class="em-icon">🎤</div><div class="em-title">No interviews logged yet</div></div>'
        : interviews.map(i => interviewCard(i)).join('')}`;
  },

  openAdd() {
    const cands = Store.get('candidates') || [];
    Modal.open(Modal.header('🎤 Log Interview','Record scores and observations') + interviewForm(null, cands) + Modal.footer('Cancel','💾 Save','Pages.Interviews.save()') + '</div>');
  },

  async save() {
    const data = collectInterviewForm();
    if (!data.candidateId || !data.company) { UI.toast('Candidate and company required', 'error'); return; }
    const cand = (Store.get('candidates')||[]).find(c=>c.id===data.candidateId);
    data.candidateName = cand?.name || '';
    UI.showLoading('Saving…');
    try {
      const res = await API.Interviews.create(data);
      UI.hideLoading();
      if (!res.ok) { UI.toast(res.msg,'error'); return; }
      Modal.close();
      UI.toast('🎤 Interview logged!');
      await App.syncData(false);
      this.render();
    } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
  },

  async remove(id) {
    UI.confirm('Delete this interview record?', async () => {
      UI.showLoading('Deleting…');
      try {
        const res = await API.Interviews.delete(id);
        UI.hideLoading();
        if (!res.ok) { UI.toast(res.msg,'error'); return; }
        Store.remove('interviews', id);
        UI.toast('🗑️ Interview deleted');
        this.render();
      } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
    });
  }
};

function interviewCard(i) {
  const avg = ((+i.tech + +i.comm + +i.prob + +i.culture)/4).toFixed(1);
  const oc  = { Passed:'pill-mint', Failed:'pill-coral', Pending:'pill-sun', 'On Hold':'pill-sun' };
  const isAdmin = Session.isAdmin();
  return `<div class="interview-card">
    <div class="int-header">
      <div>
        <div class="int-candidate">${i.candidate||i.candidateName||'—'}</div>
        <div class="int-meta">🏢 ${i.company} &nbsp;·&nbsp; 📅 ${UI.fmtDate(i.date)} &nbsp;·&nbsp; ${i.round||''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="pill ${oc[i.outcome]||'pill-sun'}">${i.outcome}</span>
        ${isAdmin ? `<button class="icon-btn del" onclick="Pages.Interviews.remove('${i.id}')" title="Delete">🗑️</button>` : ''}
      </div>
    </div>
    <div class="score-grid">
      ${scoreItem(i.tech,'Technical','var(--sky)')}
      ${scoreItem(i.comm,'Communication','var(--mint)')}
      ${scoreItem(i.prob,'Problem Solving','var(--lavender)')}
      ${scoreItem(i.culture,'Cultural Fit','var(--sun)')}
    </div>
    <div class="overall-score">
      <div class="overall-val" style="color:${UI.scoreColor(avg)}">${avg}</div>
      <div><div style="font-weight:800;font-size:14px">Overall</div>
        <div class="overall-label">${i.interviewer ? 'by ' + i.interviewer : ''}</div></div>
      <div style="margin-left:auto;font-size:13px;font-weight:600;color:var(--text-muted);max-width:280px">${i.notes||''}</div>
    </div>
  </div>`;
}
function scoreItem(v, label, color) {
  return `<div class="score-item"><div class="s-val" style="color:${color}">${v||0}</div><div class="s-label">${label}</div></div>`;
}
function interviewForm(i, candidates) {
  const v = k => i?.[k] || '';
  const candOpts = candidates.map(c=>`<option value="${c.id}" ${v('candidateId')===c.id?'selected':''}>${c.name}</option>`).join('');
  return `<div class="form-grid">
    <div class="form-group"><label>Candidate *</label><select id="if-candidateId"><option value="">Select Candidate</option>${candOpts}</select></div>
    <div class="form-group"><label>Company *</label><input id="if-company" value="${v('company')}" placeholder="Company name"></div>
    <div class="form-group"><label>Date</label><input id="if-date" type="date" value="${v('date')||new Date().toISOString().slice(0,10)}"></div>
    <div class="form-group"><label>Round</label>
      <select id="if-round">${['Technical Round 1','Technical Round 2','HR Round','Managerial Round','Final Round'].map(r=>`<option ${v('round')===r?'selected':''}>${r}</option>`).join('')}</select></div>
    <div class="form-group"><label>Technical (0–10)</label><input id="if-tech" type="number" value="${v('tech')||''}" min="0" max="10" step="0.1"></div>
    <div class="form-group"><label>Communication (0–10)</label><input id="if-comm" type="number" value="${v('comm')||''}" min="0" max="10" step="0.1"></div>
    <div class="form-group"><label>Problem Solving (0–10)</label><input id="if-prob" type="number" value="${v('prob')||''}" min="0" max="10" step="0.1"></div>
    <div class="form-group"><label>Cultural Fit (0–10)</label><input id="if-culture" type="number" value="${v('culture')||''}" min="0" max="10" step="0.1"></div>
    <div class="form-group"><label>Outcome</label>
      <select id="if-outcome">${['Pending','Passed','Failed','On Hold'].map(o=>`<option ${v('outcome')===o?'selected':''}>${o}</option>`).join('')}</select></div>
    <div class="form-group"><label>Interviewer</label><input id="if-interviewer" value="${v('interviewer')}" placeholder="Interviewer name"></div>
    <div class="form-group full"><label>Notes / Feedback</label><textarea id="if-notes" rows="3">${v('notes')}</textarea></div>
  </div>`;
}
function collectInterviewForm() {
  const g = id => document.getElementById(id)?.value || '';
  return { candidateId:g('if-candidateId'), company:g('if-company'), date:g('if-date'),
    round:g('if-round'), tech:g('if-tech'), comm:g('if-comm'), prob:g('if-prob'), culture:g('if-culture'),
    outcome:g('if-outcome'), interviewer:g('if-interviewer'), notes:g('if-notes') };
}

// ── TRACKING ──────────────────────────────────────────────
Pages.Tracking = {
  render() {
    const selected = (Store.get('candidates')||[]).filter(c=>c.status==='Selected');
    const el = document.getElementById('page-tracking');
    el.innerHTML = `
      <div class="section-header"><div class="section-title">📡 6-Month Post-Placement Tracker</div></div>
      <div class="notice">✅ Tracking placed candidates for 6 months after joining.</div>
      ${!selected.length
        ? '<div class="empty"><div class="em-icon">📡</div><div class="em-title">No placed candidates yet</div><div class="em-desc">Candidates marked "Selected" appear here</div></div>'
        : selected.map(c => this.card(c)).join('')}`;
  },

  card(c) {
    const tr = c.trackingData || {};
    const months = ['month1','month2','month3','month4','month5','month6'];
    const doneCount  = months.filter(m=>tr[m]?.status==='done').length;
    const avgRating  = months.filter(m=>tr[m]?.rating).length
      ? (months.filter(m=>tr[m]?.rating).reduce((a,m)=>a+(+tr[m].rating),0)/months.filter(m=>tr[m]?.rating).length).toFixed(1)
      : '—';
    const dots = months.map((m,i) => {
      const md  = tr[m] || {};
      const cls = md.status || 'pending';
      const ico = cls==='done'?'✓':cls==='current'?'●':'○';
      return `<div class="month-dot ${cls}" onclick="Pages.Tracking.openUpdate('${c.id}','${m}')" title="Month ${i+1}${md.notes?' · '+md.notes:''}">
        <span>${ico}</span><span style="font-size:9px;display:block">M${i+1}</span>
      </div>`;
    }).join('');
    return `<div class="tracker-card">
      <div class="tracker-top">
        ${UI.avatar(c.name,42,12)}
        <div style="flex:1;margin-left:12px">
          <div class="tracker-name">${c.name}</div>
          <div class="tracker-co">🏢 ${c.selectedCo||'—'} &nbsp;·&nbsp; Placed: ${UI.fmtDate(c.placementDate)}</div>
        </div>
        <div style="text-align:right"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--mint)">${doneCount}/6</div><div style="font-size:11px;font-weight:700;color:var(--text-muted)">check-ins</div></div>
        <div style="text-align:right;margin-left:16px"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--sun)">${avgRating}</div><div style="font-size:11px;font-weight:700;color:var(--text-muted)">avg rating</div></div>
      </div>
      <div class="months-bar">${dots}</div>
    </div>`;
  },

  _ctx: null,
  openUpdate(cid, month) {
    this._ctx = {cid, month};
    const c   = (Store.get('candidates')||[]).find(x=>x.id===cid);
    const md  = c?.trackingData?.[month] || {};
    const idx = ['month1','month2','month3','month4','month5','month6'].indexOf(month)+1;
    Modal.open(Modal.header(`📡 Month ${idx} Check-in — ${c?.name||''}`) + `
      <div class="form-grid">
        <div class="form-group full"><label>Status</label>
          <select id="tr-status">
            <option value="done" ${md.status==='done'?'selected':''}>✅ Check-in Done</option>
            <option value="current" ${md.status==='current'?'selected':''}>🔄 In Progress</option>
            <option value="pending" ${md.status==='pending'?'selected':''}>⏳ Pending</option>
          </select></div>
        <div class="form-group full"><label>Performance Rating (1–5)</label>
          <input id="tr-rating" type="number" min="1" max="5" value="${md.rating||''}" placeholder="4"></div>
        <div class="form-group full"><label>Notes / Observations</label>
          <textarea id="tr-notes" rows="3">${md.notes||''}</textarea></div>
      </div>` + Modal.footer('Cancel','💾 Update','Pages.Tracking.saveUpdate()') + '</div>');
  },

  async saveUpdate() {
    const {cid, month} = this._ctx;
    const data = { candidateId:cid, month,
      status:  document.getElementById('tr-status')?.value,
      rating:  document.getElementById('tr-rating')?.value || null,
      notes:   document.getElementById('tr-notes')?.value };
    UI.showLoading('Saving…');
    try {
      const res = await API.Candidates.updateTracking(data);
      UI.hideLoading();
      if (!res.ok) { UI.toast(res.msg,'error'); return; }
      Modal.close();
      UI.toast('✅ Tracking updated!');
      await App.syncData(false);
      this.render();
    } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
  }
};

// ── COMPANIES ─────────────────────────────────────────────
Pages.Companies = {
  render() {
    const companies = Store.get('companies') || [];
    const isAdmin   = Session.isAdmin();
    const el = document.getElementById('page-companies');
    el.innerHTML = `
      <div class="section-header">
        <div class="section-title">🏢 Partner Companies</div>
        ${isAdmin ? '<button class="btn btn-primary" onclick="Pages.Companies.openAdd()">+ Add Company</button>' : ''}
      </div>
      ${!companies.length
        ? '<div class="empty"><div class="em-icon">🏢</div><div class="em-title">No companies added yet</div></div>'
        : `<div class="cards-grid">${companies.map(co=>this.card(co)).join('')}</div>`}`;
  },

  card(co) {
    const colors = ['#2DD4A7','#38BDF8','#A78BFA','#FF7E6B','#FFB830'];
    let h = 0; for(const c of co.name) h+=c.charCodeAt(0);
    const color   = co.color || colors[h%colors.length];
    const placed  = (Store.get('candidates')||[]).filter(c=>c.selectedCo===co.name).length;
    const short   = (Store.get('candidates')||[]).filter(c=>(c.prospects||'').includes(co.name)).length;
    const initials= co.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const isAdmin = Session.isAdmin();
    return `<div class="company-card">
      <div class="c-top">
        <div class="company-logo" style="background:${color}">${initials}</div>
        <div style="display:flex;align-items:center;gap:6px">
          ${UI.statusBadge(co.status)}
          ${isAdmin ? `<button class="icon-btn del" onclick="Pages.Companies.remove('${co.id}')" title="Delete">🗑️</button>` : ''}
        </div>
      </div>
      <div class="company-name">${co.name}</div>
      <div class="company-sector">🏭 ${co.sector||'—'} &nbsp;·&nbsp; ${co.ctc||'—'}</div>
      <div style="font-size:12px;color:var(--text-muted);font-weight:600;margin-top:6px">👤 ${co.contact||'—'}</div>
      <div class="company-stats">
        <div class="cstat"><div class="cstat-val" style="color:var(--mint)">${placed}</div><div class="cstat-label">Placed</div></div>
        <div class="cstat"><div class="cstat-val" style="color:var(--lavender)">${short}</div><div class="cstat-label">Shortlisted</div></div>
        <div class="cstat"><div class="cstat-val" style="color:var(--sun)">${co.openings||0}</div><div class="cstat-label">Openings</div></div>
      </div>
    </div>`;
  },

  openAdd() {
    Modal.open(Modal.header('🏢 Add Partner Company') + companyForm(null) + Modal.footer('Cancel','💾 Save','Pages.Companies.save()') + '</div>');
  },

  async save() {
    const data = collectCompanyForm();
    if (!data.name) { UI.toast('Company name required','error'); return; }
    UI.showLoading('Saving…');
    try {
      const res = await API.Companies.create(data);
      UI.hideLoading();
      if (!res.ok) { UI.toast(res.msg,'error'); return; }
      Modal.close();
      UI.toast('🏢 Company added!');
      await App.syncData(false);
      this.render();
    } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
  },

  remove(id) {
    const co = (Store.get('companies')||[]).find(x=>x.id===id);
    UI.confirm(`Remove "${co?.name}"?`, async () => {
      UI.showLoading('Deleting…');
      try {
        const res = await API.Companies.delete(id);
        UI.hideLoading();
        if (!res.ok) { UI.toast(res.msg,'error'); return; }
        Store.remove('companies', id);
        UI.toast('🗑️ Company removed');
        this.render();
      } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
    });
  }
};
function companyForm(co) {
  const v = k => co?.[k] || '';
  return `<div class="form-grid">
    <div class="form-group"><label>Company Name *</label><input id="co-name" value="${v('name')}" placeholder="e.g. Infosys Ltd."></div>
    <div class="form-group"><label>Sector</label><input id="co-sector" value="${v('sector')}" placeholder="IT Services, Fintech…"></div>
    <div class="form-group"><label>Contact Person</label><input id="co-contact" value="${v('contact')}" placeholder="Anjali Mehta (HR)"></div>
    <div class="form-group"><label>Contact Email</label><input id="co-email" type="email" value="${v('email')}" placeholder="hr@company.com"></div>
    <div class="form-group"><label>Phone</label><input id="co-phone" value="${v('phone')}" placeholder="+91 …"></div>
    <div class="form-group"><label>CTC Range</label><input id="co-ctc" value="${v('ctc')}" placeholder="₹4–8 LPA"></div>
    <div class="form-group"><label>Open Positions</label><input id="co-openings" type="number" value="${v('openings')||0}" min="0"></div>
    <div class="form-group"><label>Status</label>
      <select id="co-status">${['Active','Negotiating','On Hold'].map(s=>`<option ${v('status')===s||(!co&&s==='Active')?'selected':''}>${s}</option>`).join('')}</select></div>
    <div class="form-group full"><label>Notes</label><textarea id="co-notes" rows="2">${v('notes')}</textarea></div>
  </div>`;
}
function collectCompanyForm() {
  const g = id => document.getElementById(id)?.value || '';
  return { name:g('co-name'), sector:g('co-sector'), contact:g('co-contact'), email:g('co-email'),
    phone:g('co-phone'), ctc:g('co-ctc'), openings:g('co-openings'), status:g('co-status'), notes:g('co-notes') };
}

// ── IMPORT ────────────────────────────────────────────────
Pages.Import = {
  render() {
    const el = document.getElementById('page-import');
    el.innerHTML = `
      <div class="section-header">
        <div class="section-title">📥 Bulk Import Candidates</div>
        <button class="btn btn-ghost" onclick="Pages.Import.downloadSample()">⬇️ Download Sample CSV</button>
      </div>
      <div class="import-steps">
        ${['Download Template','Fill Your Data','Upload CSV','Review & Import'].map((t,i)=>
          `<div class="import-step"><div class="step-num">${i+1}</div><div class="step-title">${t}</div></div>`).join('')}
      </div>
      <div id="import-upload-section">
        <div class="drop-zone" id="drop-zone" ondragover="Pages.Import.dragOver(event)" ondragleave="Pages.Import.dragLeave(event)" ondrop="Pages.Import.drop(event)">
          <input type="file" accept=".csv" onchange="Pages.Import.fileSelected(event)" style="position:absolute;inset:0;opacity:0;cursor:pointer">
          <span class="drop-icon">📂</span>
          <div class="drop-title">Drop your CSV file here</div>
          <div class="drop-sub">or click to browse</div>
          <span class="drop-hint">Accepts .csv only</span>
        </div>
      </div>
      <div id="import-preview-section" style="display:none"></div>`;
  },

  dragOver(e) { e.preventDefault(); document.getElementById('drop-zone').classList.add('drag-over'); },
  dragLeave()  { document.getElementById('drop-zone').classList.remove('drag-over'); },
  drop(e)      { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f?.name.endsWith('.csv')) this.process(f); else UI.toast('Please upload a .csv file','error'); },
  fileSelected(e) { const f = e.target.files[0]; if(f) this.process(f); },

  process(file) {
    const reader = new FileReader();
    reader.onload = e => this.parse(e.target.result);
    reader.readAsText(file);
  },

  _rows: [], _headers: [], _map: {},
  parse(text) {
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    if (lines.length < 2) { UI.toast('CSV is empty','error'); return; }
    const parseLine = l => { const res=[]; let cur='',inQ=false; for(const ch of l){if(ch==='"')inQ=!inQ; else if(ch===','&&!inQ){res.push(cur.trim());cur='';}else cur+=ch;} res.push(cur.trim()); return res; };
    this._headers = parseLine(lines[0]);
    this._rows    = lines.slice(1).map(parseLine);
    this._map     = this.autoMap(this._headers);
    this.showPreview();
  },

  autoMap(headers) {
    const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g,'');
    const patterns = { name:['name','fullname'], email:['email'], phone:['phone','mobile'], degree:['degree','qualification'],
      college:['college','institution','university'], year:['year','graduationyear','batch'], skills:['skills','skill'],
      consultancy:['consultancy','source','partner'], status:['status'], prospects:['prospects','companies'],
      selectedCo:['selectedcompany','selectedco'], placementDate:['placementdate','date'], notes:['notes','remarks'] };
    const map = {};
    headers.forEach((h,i) => { const n=normalize(h); for(const [f,aliases] of Object.entries(patterns)) { if(aliases.includes(n)&&map[f]===undefined) map[f]=i; } });
    return map;
  },

  get(row, field) { const idx=this._map[field]; return (idx!==undefined&&row[idx])||''; },

  showPreview() {
    const valid  = this._rows.filter(r => this.get(r,'name')).length;
    const errors = this._rows.length - valid;
    document.getElementById('import-upload-section').style.display = 'none';
    const prev = document.getElementById('import-preview-section');
    prev.style.display = 'block';
    prev.innerHTML = `
      <div class="import-summary">
        <div class="sum-card"><div class="sum-val" style="color:var(--sky)">${this._rows.length}</div><div class="sum-label">Total Rows</div></div>
        <div class="sum-card"><div class="sum-val" style="color:var(--mint)">${valid}</div><div class="sum-label">Valid</div></div>
        <div class="sum-card"><div class="sum-val" style="color:var(--coral)">${errors}</div><div class="sum-label">Errors</div></div>
      </div>
      <div class="section-header" style="margin-top:16px">
        <div class="section-title">👀 Preview (${this._rows.length} rows)</div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-ghost" onclick="Pages.Import.reset()">✕ Cancel</button>
          <button class="btn btn-mint" onclick="Pages.Import.confirm()">✅ Import Valid Rows</button>
        </div>
      </div>
      <div class="preview-table-wrap">
        <table>
          <thead><tr><th>#</th><th>Status</th><th>Name</th><th>Email</th><th>Degree</th><th>College</th><th>Skills</th><th>Consultancy</th><th>Candidate Status</th></tr></thead>
          <tbody>${this._rows.map((row,i) => {
            const ok = this.get(row,'name');
            return `<tr class="${ok?'':'error-row'}">
              <td>${i+1}</td><td>${ok?'✅':'❌ No name'}</td>
              <td>${this.get(row,'name')||'—'}</td><td>${this.get(row,'email')||'—'}</td>
              <td>${this.get(row,'degree')||'—'}</td><td>${this.get(row,'college')||'—'}</td>
              <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${this.get(row,'skills')||'—'}</td>
              <td>${this.get(row,'consultancy')||'—'}</td>
              <td>${UI.statusBadge(this.get(row,'status')||'New')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
  },

  async confirm() {
    const valid = this._rows.filter(r => this.get(r,'name'));
    if (!valid.length) { UI.toast('No valid rows','error'); return; }
    UI.showLoading(`Importing 0/${valid.length}…`);
    let done = 0;
    for (const row of valid) {
      try {
        await API.Candidates.create({
          name: this.get(row,'name'), email: this.get(row,'email'),
          phone: this.get(row,'phone'), degree: this.get(row,'degree'),
          college: this.get(row,'college'), year: this.get(row,'year'),
          skills: this.get(row,'skills'), consultancy: this.get(row,'consultancy'),
          status: this.get(row,'status')||'New', prospects: this.get(row,'prospects'),
          selectedCo: this.get(row,'selectedCo'), placementDate: this.get(row,'placementDate'),
          notes: this.get(row,'notes'),
        });
        done++;
        UI.showLoading(`Importing ${done}/${valid.length}…`);
      } catch {}
    }
    UI.hideLoading();
    UI.toast(`🎉 Imported ${done} candidates!`);
    await App.syncData(false);
    App.updateBadges();
    this.reset();
    App.navigate('candidates');
  },

  reset() {
    document.getElementById('import-upload-section').style.display = 'block';
    document.getElementById('import-preview-section').style.display = 'none';
    this._rows=[]; this._headers=[]; this._map={};
  },

  downloadSample() {
    const csv = `name,email,phone,degree,college,year,skills,consultancy,status,prospects,selectedCo,placementDate,notes
Arjun Mehta,arjun.mehta@gmail.com,+91 98765 00001,B.Tech CSE,NIT Agartala,2025,"Python, Django",TechHire Solutions,New,"Infosys, TCS",,,"Strong backend candidate"
Divya Nair,divya.nair@gmail.com,+91 98765 00002,MCA,Tripura University,2025,"React, Node.js",SkillBridge,Interview Scheduled,Wipro,,,"Frontend specialist"`;
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'talentbridge_import_template.csv';
    a.click();
    UI.toast('📥 Template downloaded!');
  }
};

// ── ADMIN PANEL ───────────────────────────────────────────
Pages.Admin = {
  render() {
    if (!Session.isAdmin()) return;
    const employees = Store.get('employees') || [];
    const el = document.getElementById('page-admin');
    el.innerHTML = `
      <div class="two-col" style="gap:24px">
        <!-- Employee Management -->
        <div>
          <div class="section-header">
            <div class="section-title">👥 Employee Accounts</div>
            <button class="btn btn-primary" onclick="Pages.Admin.openAddEmployee()">+ Add Employee</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>${!employees.length
                ? '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">No employees yet</td></tr>'
                : employees.map(e => `<tr>
                  <td><div style="display:flex;align-items:center;gap:10px">${UI.avatar(e.displayName||e.username)}<div style="font-weight:700">${e.displayName||e.username}</div></div></td>
                  <td style="font-size:13px;color:var(--text-muted)">${e.username}</td>
                  <td>${UI.statusBadge(e.role)}</td>
                  <td>${UI.statusBadge(e.status)}</td>
                  <td>
                    <button class="icon-btn" onclick="Pages.Admin.openEditEmployee('${e.id}')" title="Edit">✏️</button>
                    <button class="icon-btn del" onclick="Pages.Admin.removeEmployee('${e.id}')" title="Delete" style="margin-left:4px">🗑️</button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Admin Settings -->
        <div>
          <div class="section-header"><div class="section-title">⚙️ Admin Settings</div></div>
          <div style="background:var(--surface);border-radius:var(--radius);border:2px solid var(--border);padding:22px">
            <div class="form-group" style="margin-bottom:14px">
              <label>Organization Name</label>
              <input id="setting-orgName" value="${Store.get('settings')?.orgName||''}" placeholder="Your Organization">
            </div>
            <div class="form-group" style="margin-bottom:14px">
              <label>App Name</label>
              <input id="setting-appName" value="${Store.get('settings')?.appName||'TalentBridge'}" placeholder="TalentBridge">
            </div>
            <div class="form-group" style="margin-bottom:20px">
              <label>Session Timeout (minutes)</label>
              <input id="setting-timeout" type="number" value="${Store.get('settings')?.sessionTimeoutMinutes||60}" min="15" max="480">
            </div>
            <button class="btn btn-primary" onclick="Pages.Admin.saveSettings()" style="width:100%">💾 Save Settings</button>
          </div>

          <div class="section-header" style="margin-top:20px"><div class="section-title">🔐 Change Admin Password</div></div>
          <div style="background:var(--surface);border-radius:var(--radius);border:2px solid var(--border);padding:22px">
            <div class="form-group" style="margin-bottom:14px">
              <label>Current Password</label>
              <input id="pwd-current" type="password" placeholder="Current password">
            </div>
            <div class="form-group" style="margin-bottom:14px">
              <label>New Password</label>
              <input id="pwd-new" type="password" placeholder="Min 6 characters">
            </div>
            <div class="form-group" style="margin-bottom:20px">
              <label>Confirm New Password</label>
              <input id="pwd-confirm" type="password" placeholder="Repeat new password">
            </div>
            <button class="btn btn-primary" onclick="Pages.Admin.changePassword()" style="width:100%;background:linear-gradient(135deg,var(--mint),var(--sky))">🔐 Change Password</button>
          </div>
        </div>
      </div>`;
  },

  openAddEmployee() {
    Modal.open(Modal.header('👤 Add Employee Account') + employeeForm(null) + Modal.footer('Cancel','💾 Create Account','Pages.Admin.saveEmployee()') + '</div>');
  },
  openEditEmployee(id) {
    const e = (Store.get('employees')||[]).find(x=>x.id===id);
    Pages.Admin._editEmpId = id;
    Modal.open(Modal.header('✏️ Edit Employee') + employeeForm(e) + Modal.footer('Cancel','💾 Update','Pages.Admin.saveEmployee()') + '</div>');
  },
  _editEmpId: null,

  async saveEmployee() {
    const id = this._editEmpId;
    const g = i => document.getElementById(i)?.value||'';
    const data = { username:g('emp-username'), password:g('emp-password'), displayName:g('emp-displayName'), role:g('emp-role'), status:g('emp-status'), notes:g('emp-notes') };
    if (!data.username) { UI.toast('Username required','error'); return; }
    UI.showLoading('Saving…');
    try {
      const res = id
        ? await API.Employees.update({...data, id})
        : await API.Employees.create(data);
      UI.hideLoading();
      if (!res.ok) { UI.toast(res.msg,'error'); return; }
      this._editEmpId = null;
      Modal.close();
      UI.toast(id ? '✅ Employee updated!' : '🎉 Employee created!');
      await App.syncData(false);
      this.render();
    } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
  },

  removeEmployee(id) {
    const e = (Store.get('employees')||[]).find(x=>x.id===id);
    UI.confirm(`Delete account for "${e?.displayName||e?.username}"?`, async () => {
      UI.showLoading('Deleting…');
      try {
        const res = await API.Employees.delete(id);
        UI.hideLoading();
        if (!res.ok) { UI.toast(res.msg,'error'); return; }
        Store.remove('employees', id);
        UI.toast('🗑️ Account deleted');
        this.render();
      } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
    });
  },

  async saveSettings() {
    const g = id => document.getElementById(id)?.value||'';
    UI.showLoading('Saving…');
    try {
      const res = await API.Settings.update({ orgName:g('setting-orgName'), appName:g('setting-appName'), sessionTimeoutMinutes:g('setting-timeout') });
      UI.hideLoading();
      if (!res.ok) { UI.toast(res.msg,'error'); return; }
      UI.toast('⚙️ Settings saved!');
      await App.syncData(false);
    } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
  },

  async changePassword() {
    const cur = document.getElementById('pwd-current')?.value;
    const nw  = document.getElementById('pwd-new')?.value;
    const cf  = document.getElementById('pwd-confirm')?.value;
    if (!cur||!nw) { UI.toast('All fields required','error'); return; }
    if (nw !== cf) { UI.toast('Passwords do not match','error'); return; }
    if (nw.length < 6) { UI.toast('Password must be at least 6 characters','error'); return; }
    UI.showLoading('Updating password…');
    try {
      const res = await API.Auth.changeAdminPassword(cur, nw);
      UI.hideLoading();
      if (!res.ok) { UI.toast(res.msg,'error'); return; }
      UI.toast('🔐 Password changed! Please log in again.','success',4000);
      setTimeout(() => App.logout(), 2500);
    } catch(e) { UI.hideLoading(); UI.toast(e.message,'error'); }
  }
};

function employeeForm(e) {
  const v = k => e?.[k]||'';
  return `<div class="form-grid">
    <div class="form-group"><label>Display Name</label><input id="emp-displayName" value="${v('displayName')}" placeholder="Full name"></div>
    <div class="form-group"><label>Username *</label><input id="emp-username" value="${v('username')}" placeholder="john.doe"></div>
    <div class="form-group"><label>${e?'New Password (leave blank to keep)':'Password *'}</label><input id="emp-password" type="password" placeholder="Min 6 characters"></div>
    <div class="form-group"><label>Role</label>
      <select id="emp-role"><option value="employee" ${v('role')==='employee'?'selected':''}>Employee</option><option value="admin" ${v('role')==='admin'?'selected':''}>Admin</option></select></div>
    <div class="form-group"><label>Status</label>
      <select id="emp-status"><option value="active" ${v('status')==='active'||!e?'selected':''}>Active</option><option value="inactive" ${v('status')==='inactive'?'selected':''}>Inactive</option></select></div>
    <div class="form-group"><label>Notes</label><input id="emp-notes" value="${v('notes')}" placeholder="Optional notes"></div>
  </div>`;
}

// ── LOGS ──────────────────────────────────────────────────
Pages.Logs = {
  async render() {
    const el = document.getElementById('page-logs');
    el.innerHTML = `<div class="section-header"><div class="section-title">📋 Activity Logs</div>
      <button class="btn btn-ghost" onclick="Pages.Logs.render()">🔄 Refresh</button></div>
      <div id="logs-body" style="background:var(--surface);border-radius:var(--radius);border:2px solid var(--border);padding:20px;font-family:monospace;font-size:12px;max-height:70vh;overflow-y:auto">
        <div style="color:var(--text-muted)">Loading logs…</div>
      </div>`;
    try {
      const res = await API.Logs.get();
      const logs = res.data || [];
      document.getElementById('logs-body').innerHTML = !logs.length
        ? '<div style="color:var(--text-muted)">No activity logs yet</div>'
        : logs.map(l => `<div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;gap:12px;flex-wrap:wrap">
            <span style="color:var(--text-muted);min-width:160px">${UI.fmtDate(l.timestamp)}</span>
            <span style="color:var(--mint);min-width:120px;font-weight:700">${l.user}</span>
            <span style="color:var(--sun);min-width:160px">${l.action}</span>
            <span style="color:var(--text)">${l.details}</span>
          </div>`).join('');
    } catch(e) { document.getElementById('logs-body').innerHTML = `<div style="color:var(--coral)">Failed to load logs: ${e.message}</div>`; }
  }
};
