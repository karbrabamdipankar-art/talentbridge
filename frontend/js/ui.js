// ============================================================
//  TalentBridge — Shared UI Utilities
//  File: js/ui.js
// ============================================================

const UI = (() => {

  // ── TOAST NOTIFICATIONS ───────────────────────────────────
  function toast(msg, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }
    const icons = { success: '🎉', error: '❌', warning: '⚠️', info: 'ℹ️', sync: '🔄' };
    const colors = {
      success: 'linear-gradient(135deg,#2DD4A7,#38BDF8)',
      error:   'linear-gradient(135deg,#FF7E6B,#ef4444)',
      warning: 'linear-gradient(135deg,#FFB830,#f97316)',
      info:    'linear-gradient(135deg,#A78BFA,#38BDF8)',
      sync:    'linear-gradient(135deg,#1A1A2E,#0F3460)',
    };
    const t = document.createElement('div');
    t.style.cssText = `
      background:${colors[type]||colors.info};color:#fff;padding:12px 18px;
      border-radius:14px;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;
      box-shadow:0 8px 28px rgba(0,0,0,0.2);display:flex;align-items:center;gap:8px;
      transform:translateX(120%);transition:transform .3s cubic-bezier(.34,1.56,.64,1);
      max-width:320px;word-break:break-word;
    `;
    t.innerHTML = `<span>${icons[type]||'•'}</span><span>${msg}</span>`;
    container.appendChild(t);
    requestAnimationFrame(() => { t.style.transform = 'translateX(0)'; });
    setTimeout(() => {
      t.style.transform = 'translateX(120%)';
      setTimeout(() => t.remove(), 350);
    }, duration);
  }

  // ── LOADING OVERLAY ───────────────────────────────────────
  function showLoading(msg = 'Loading…') {
    let el = document.getElementById('tb-loading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tb-loading';
      el.style.cssText = `
        position:fixed;inset:0;background:rgba(15,20,45,.85);backdrop-filter:blur(6px);
        z-index:9998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;
      `;
      el.innerHTML = `
        <div style="width:48px;height:48px;border:4px solid rgba(255,184,48,.3);border-top-color:#FFB830;
          border-radius:50%;animation:spin .8s linear infinite"></div>
        <div id="tb-loading-msg" style="color:#fff;font-family:'Nunito',sans-serif;font-weight:700;font-size:16px">${msg}</div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
      document.body.appendChild(el);
    } else {
      document.getElementById('tb-loading-msg').textContent = msg;
    }
  }

  function hideLoading() {
    const el = document.getElementById('tb-loading');
    if (el) { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(()=>el.remove(), 300); }
  }

  // ── SYNC STATUS INDICATOR ─────────────────────────────────
  function setSyncStatus(state) {
    // state: 'syncing' | 'synced' | 'error' | 'offline'
    const el = document.getElementById('sync-status');
    if (!el) return;
    const map = {
      syncing: { color: '#FFB830', icon: '🔄', text: 'Syncing…', anim: 'spin .8s linear infinite' },
      synced:  { color: '#2DD4A7', icon: '✓',  text: 'Synced',  anim: 'none' },
      error:   { color: '#FF7E6B', icon: '✕',  text: 'Sync failed', anim: 'none' },
      offline: { color: '#9CA3AF', icon: '⚡', text: 'Offline', anim: 'none' },
    };
    const s = map[state] || map.synced;
    el.innerHTML = `
      <span style="display:inline-block;animation:${s.anim};font-size:12px">${s.icon}</span>
      <span style="color:${s.color};font-size:12px;font-weight:700">${s.text}</span>
    `;
  }

  // ── CONFIRM DIALOG ────────────────────────────────────────
  function confirm(msg, onYes, onNo) {
    let overlay = document.getElementById('tb-confirm');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'tb-confirm';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,20,45,.6);backdrop-filter:blur(4px);z-index:9997;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:32px 28px;max-width:380px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.2);">
        <div style="font-size:36px;margin-bottom:12px">⚠️</div>
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:18px;margin-bottom:8px">Are you sure?</div>
        <div style="font-family:'Nunito',sans-serif;font-size:14px;font-weight:600;color:#6B7280;margin-bottom:24px">${msg}</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button id="tb-confirm-no"  style="padding:10px 24px;border-radius:12px;border:2px solid #F0E8D0;background:#FFF8E7;font-family:'Nunito',sans-serif;font-weight:800;cursor:pointer;">Cancel</button>
          <button id="tb-confirm-yes" style="padding:10px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#FF7E6B,#ef4444);color:#fff;font-family:'Nunito',sans-serif;font-weight:800;cursor:pointer;">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('tb-confirm-yes').onclick = () => { overlay.remove(); if (onYes) onYes(); };
    document.getElementById('tb-confirm-no').onclick  = () => { overlay.remove(); if (onNo)  onNo(); };
    overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); if (onNo) onNo(); } };
  }

  // ── FORM HELPERS ──────────────────────────────────────────
  function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const out = {};
    form.querySelectorAll('input,select,textarea').forEach(el => {
      if (el.id) out[el.id.replace(formId + '-', '')] = el.value;
    });
    return out;
  }

  function fillForm(formId, data) {
    if (!data) return;
    Object.entries(data).forEach(([k, v]) => {
      const el = document.getElementById(formId + '-' + k) || document.getElementById(k);
      if (el) el.value = v || '';
    });
  }

  function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.querySelectorAll('input,select,textarea').forEach(el => { el.value = ''; });
  }

  // ── AVATAR ────────────────────────────────────────────────
  function avatar(name, size = 34, radius = 10) {
    const colors = ['#2DD4A7','#38BDF8','#A78BFA','#FF7E6B','#FFB830','#F472B6'];
    let h = 0; for (const c of (name||'?')) h += c.charCodeAt(0);
    const bg   = colors[h % colors.length];
    const init = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    return `<div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${bg};
      display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*.38)}px;
      font-weight:900;color:#fff;flex-shrink:0">${init}</div>`;
  }

  // ── STATUS BADGE ──────────────────────────────────────────
  function statusBadge(s) {
    const map = {
      'New':                 { cls:'sky',      dot:'#38BDF8' },
      'Interview Scheduled': { cls:'sun',      dot:'#FFB830' },
      'Shortlisted':         { cls:'lavender', dot:'#A78BFA' },
      'Selected':            { cls:'mint',     dot:'#2DD4A7' },
      'Rejected':            { cls:'coral',    dot:'#FF7E6B' },
      'active':              { cls:'mint',     dot:'#2DD4A7' },
      'inactive':            { cls:'coral',    dot:'#FF7E6B' },
      'Active':              { cls:'mint',     dot:'#2DD4A7' },
      'Negotiating':         { cls:'sun',      dot:'#FFB830' },
      'On Hold':             { cls:'coral',    dot:'#FF7E6B' },
      'Passed':              { cls:'mint',     dot:'#2DD4A7' },
      'Failed':              { cls:'coral',    dot:'#FF7E6B' },
      'Pending':             { cls:'sun',      dot:'#FFB830' },
    };
    const info = map[s] || { cls:'sky', dot:'#38BDF8' };
    const styles = {
      sky:      'background:rgba(56,189,248,.12);color:#0369A1',
      sun:      'background:rgba(255,184,48,.12);color:#92400E',
      lavender: 'background:rgba(167,139,250,.12);color:#5B21B6',
      mint:     'background:rgba(45,212,167,.12);color:#065F46',
      coral:    'background:rgba(255,126,107,.12);color:#991B1B',
    };
    return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;
      border-radius:20px;font-size:12px;font-weight:800;${styles[info.cls]}">
      <span style="width:6px;height:6px;border-radius:50%;background:${info.dot};flex-shrink:0"></span>${s}</span>`;
  }

  // ── FORMAT DATE ───────────────────────────────────────────
  function fmtDate(val) {
    if (!val) return '—';
    try { return new Date(val).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return val; }
  }

  // ── SCORE COLOR ───────────────────────────────────────────
  function scoreColor(v) {
    const n = parseFloat(v);
    if (isNaN(n)) return '#9CA3AF';
    if (n >= 8)  return '#2DD4A7';
    if (n >= 6)  return '#FFB830';
    return '#FF7E6B';
  }

  return { toast, showLoading, hideLoading, setSyncStatus, confirm,
           getFormData, fillForm, clearForm, avatar, statusBadge, fmtDate, scoreColor };
})();
