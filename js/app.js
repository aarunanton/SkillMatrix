/* SkillMatrix — single-page app, no build step, data stored in the browser. */
(function () {
  'use strict';

  const KEY = 'skillmatrix.v2';
  const OLD_KEYS = ['skillmatrix.v1'];
  const METHODS = ['Observed practical', 'Supervised runs', 'Written or oral assessment', 'Review of work output'];
  const BASES = ['Training', 'Qualification', 'Experience'];
  const DUE_SOON_DAYS = 60;
  const INDEPENDENT = 2; // level at which someone counts as "cover" for a piece of equipment

  // ---------- state ----------
  let S = migrate(load() || clone(window.SM_SAMPLE));
  let ui = { area: '', q: '', mode: 'all', person: '', tArea: '' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      for (const k of [KEY, ...OLD_KEYS]) { const s = localStorage.getItem(k); if (s) return JSON.parse(s); }
    } catch (e) { /* storage unavailable */ }
    return null;
  }
  // Bring older saves up to the current shape (roles, ISO 9001 awareness course).
  function migrate(d) {
    d.roles = d.roles || []; d.audit = d.audit || []; d.records = d.records || {}; d.courses = d.courses || [];
    d.people.forEach(p => {
      if (p.roleId && d.roles.some(r => r.id === p.roleId)) return;
      const name = (p.role || '').trim(); if (!name) { p.roleId = ''; return; }
      let r = d.roles.find(x => x.name === name);
      if (!r) { r = { id: uid('r'), name, reqs: {} }; d.roles.push(r); }
      p.roleId = r.id;
    });
    if (!d.courses.some(c => c.awareness)) {
      const c = { id: uid('c'), name: 'Quality policy, culture & ethics briefing', validityMonths: 12, awareness: true };
      d.courses.push(c); d.people.forEach(p => { d.records[c.id + '|' + p.id] = { required: true, completed: '' }; });
    }
    d.version = 2;
    return d;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable: keep in memory */ }
  }
  function uid(p) { return p + Math.random().toString(36).slice(2, 8); }

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isoDay = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const fmtDate = s => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const person = id => S.people.find(p => p.id === id);
  const equip = id => S.equipment.find(e => e.id === id);
  const pname = id => (person(id) || {}).name || '—';
  const areas = () => [...new Set(S.equipment.map(e => e.area))].sort();
  const rating = (eid, pid) => S.ratings[eid + '|' + pid];
  const lvlLabel = l => (S.scale.find(s => s.level === l) || {}).label || '';
  const byName = (a, b) => a.name.localeCompare(b.name);

  const roleOf = p => p && S.roles.find(r => r.id === p.roleId);
  const roleReq = (eid, pid) => ((roleOf(person(pid)) || {}).reqs || {})[eid] || 0;
  // Make sure everyone in a role has at least the role's required target on each item.
  function applyRole(pid) {
    const p = person(pid); const r = roleOf(p); if (!r) return 0; let n = 0;
    Object.keys(r.reqs).forEach(eid => {
      const lvl = r.reqs[eid]; if (!equip(eid) || !lvl) return;
      const k = eid + '|' + pid; const x = S.ratings[k];
      if (!x) { S.ratings[k] = { desired: lvl, actual: 0, updated: '', by: '' }; n++; }
      else if (x.desired < lvl) { x.desired = lvl; n++; }
    });
    return n;
  }
  // A sign-off (level 1+) without a basis or an effectiveness check is what an ISO 9001 auditor would flag.
  function evidenceGaps() {
    const out = [];
    for (const k in S.ratings) {
      const r = S.ratings[k]; const [eid, pid] = k.split('|');
      if (!equip(eid) || !person(pid) || r.actual < 1) continue;
      const miss = []; if (!r.basis) miss.push('basis'); if (!r.check || r.check.result !== 'Competent') miss.push('effectiveness check');
      if (miss.length) out.push({ eid, pid, r, miss });
    }
    return out;
  }

  function log(type, detail) {
    S.audit.unshift({ ts: new Date().toISOString().slice(0, 19), type, by: S.user || 'Unknown', detail });
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- derived data ----------
  function gaps() {
    const out = [];
    for (const k in S.ratings) {
      const r = S.ratings[k]; const [eid, pid] = k.split('|');
      if (equip(eid) && person(pid) && r.desired > r.actual) out.push({ eid, pid, ...r });
    }
    return out;
  }
  function cover(eid) {
    return S.people.filter(p => { const r = rating(eid, p.id); return r && r.actual >= INDEPENDENT; }).length;
  }
  function trainers(eid) {
    return S.people.filter(p => { const r = rating(eid, p.id); return r && r.actual >= 3; });
  }
  function recStatus(c, rec) {
    if (!rec || !rec.required) return { s: 'na', label: 'Not required' };
    if (!rec.completed) return { s: 'bad', label: 'Never done', due: null };
    const due = new Date(rec.completed + 'T00:00:00'); due.setMonth(due.getMonth() + Number(c.validityMonths || 0));
    const days = Math.round((due - today()) / 86400000);
    if (days < 0) return { s: 'bad', label: 'Overdue', due, days };
    if (days <= DUE_SOON_DAYS) return { s: 'warn', label: 'Due soon', due, days };
    return { s: 'ok', label: 'Valid', due, days };
  }
  function trainingIssues() {
    const out = [];
    S.courses.forEach(c => S.people.forEach(p => {
      const rec = S.records[c.id + '|' + p.id]; const st = recStatus(c, rec);
      if (st.s === 'bad' || st.s === 'warn') out.push({ c, p, st });
    }));
    return out.sort((a, b) => (a.st.due || 0) - (b.st.due || 0));
  }

  // ---------- nav ----------
  const icons = {
    dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    matrix: '<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    people: '<circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.2 3.2 0 010 6.3M18 14.8c1.9.7 3.1 2.4 3.5 5.2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    equipment: '<path d="M4 20h16M7 20V9l5-5 5 5v11M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    training: '<path d="M8 3h8M9 3v4M15 3v4M4 7h16v14H4zM8 12h3M8 16h8" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    audit: '<path d="M12 7v5l3 2M3.5 12a8.5 8.5 0 101.7-5.1M3 4v4h4" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    roles: '<path d="M4 6h16M4 12h10M4 18h7M17 15l2 2 3-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    evidence: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 14l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    settings: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 01-4 0v-.1A1.7 1.7 0 006.8 19.8l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 14H3a2 2 0 010-4h.1A1.7 1.7 0 004.2 7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010 3.1V3a2 2 0 014 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1A1.7 1.7 0 0020.9 10H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" fill="none" stroke="currentColor" stroke-width="1.5"/>'
  };
  const routes = [
    ['dashboard', 'Overview'], ['matrix', 'Skills matrix'], ['people', 'People'],
    ['equipment', 'Equipment & SOPs'], ['roles', 'Roles & requirements'], ['training', 'Recurring training'],
    ['evidence', 'ISO 9001 evidence'], ['audit', 'Change log'], ['settings', 'Settings']
  ];
  function renderNav(cur) {
    $('#nav').innerHTML = routes.map(([r, l]) =>
      `<a href="#/${r}" class="${cur === r ? 'active' : ''}"><svg viewBox="0 0 24 24">${icons[r]}</svg>${l}</a>`).join('');
    const sel = $('#userSel');
    sel.innerHTML = S.people.slice().sort(byName).map(p => `<option ${p.name === S.user ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  }

  const BACK = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="vertical-align:-2px;margin-right:4px"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // ---------- pages ----------
  function pageDashboard() {
    const g = gaps(); const ti = trainingIssues();
    const overdue = ti.filter(x => x.st.s === 'bad'); const soon = ti.filter(x => x.st.s === 'warn');
    const covers = S.equipment.map(e => ({ e, n: cover(e.id) })).sort((a, b) => a.n - b.n);
    const spof = covers.filter(x => x.n <= 1);
    const noTrainer = gaps().filter(x => !trainers(x.eid).some(t => t.id !== x.pid));
    const ev = evidenceGaps();
    const isSample = S.org.name.includes('(sample)');
    const ico = {
      risk: '<path d="M12 4l9 16H3zM12 10v4M12 17h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
      clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
      person: '<circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5" fill="none" stroke="currentColor" stroke-width="1.7"/>'
    };
    // One list, ordered by consequence: lost capability first, then lapsed safety training, then upcoming expiries.
    const items = [
      ...spof.map(x => ({ go: '#/equipment/' + x.e.id, ico: 'risk', t1: x.e.name, t2: x.n ? `Only ${pname(S.people.find(p => (rating(x.e.id, p.id) || {}).actual >= INDEPENDENT).id)} can operate it` : 'Nobody can operate it independently', right: coverPips(x.n) })),
      ...overdue.map(x => ({ go: '#/people/' + x.p.id, ico: 'clock', t1: `${x.p.name}: ${x.c.name}`, t2: x.st.due ? 'Expired ' + fmtDate(isoDay(x.st.due)) : 'Never completed', right: `<span class="chip bad">${x.st.label}</span>` })),
      ...soon.map(x => ({ go: '#/people/' + x.p.id, ico: 'clock', t1: `${x.p.name}: ${x.c.name}`, t2: 'Expires ' + fmtDate(isoDay(x.st.due)), right: `<span class="chip warn">In ${x.st.days} days</span>` }))
    ];
    const shown = items.slice(0, 12);

    return `
      ${isSample ? `<div class="banner"><span>This is <b>sample data</b> for a fictional lab. Load your own in Settings, or start from a blank matrix.</span><a class="btn" href="#/settings">Open Settings</a></div>` : ''}
      <div class="page-head" style="margin-bottom:4px"><div><h1>${esc(S.org.name)}</h1><p class="muted" style="margin:0">${S.people.length} people, ${S.equipment.length} equipment items and skills across ${areas().length} areas</p></div>
        <div class="actions"><a class="btn primary" href="#/matrix">Open the matrix</a></div></div>
      <div class="status">
        <a href="#/equipment" class="${spof.length ? 'bad' : 'ok'}"><b>${spof.length}</b> ${spof.length === 1 ? 'item depends' : 'items depend'} on one person or none</a>
        <a href="#/training" class="${overdue.length ? 'bad' : 'ok'}"><b>${overdue.length}</b> safety training overdue</a>
        <a href="#/training" class="${soon.length ? 'warn' : 'ok'}"><b>${soon.length}</b> expiring in ${DUE_SOON_DAYS} days</a>
        <a href="#/matrix?mode=gaps" class="${g.length ? 'warn' : 'ok'}"><b>${g.length}</b> below target, across ${new Set(g.map(x => x.pid)).size} people</a>
        <a href="#/evidence?show=gaps" class="${ev.length ? 'warn' : 'ok'}"><b>${ev.length}</b> ${ev.length === 1 ? 'sign-off' : 'sign-offs'} missing ISO 9001 evidence</a>
      </div>
      <div class="grid split">
        <section class="card">
          <h2>Needs attention</h2>
          ${shown.length ? `<ul class="attn">${shown.map(x => `<li data-go="${x.go}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ico[x.ico]}</svg><div><div class="t1">${esc(x.t1)}</div><div class="t2">${esc(x.t2)}</div></div><div>${x.right}</div></li>`).join('')}</ul>
            ${items.length > shown.length ? `<p class="small muted" style="margin:10px 0 0">${items.length - shown.length} more. See <a href="#/equipment">Equipment</a> and <a href="#/training">Recurring training</a>.</p>` : ''}`
            : '<div class="empty-state">Nothing needs attention. Every item has cover and all training is in date.</div>'}
        </section>
        <div class="grid" style="gap:16px">
          <section class="card">
            <h2>Gaps with no one to train</h2>
            ${noTrainer.length ? `<p class="small muted">Targets nobody here can sign off, because no one else is at level 3 or above.</p><ul class="attn">${noTrainer.slice(0, 5).map(x => `<li data-cell="${x.eid}|${x.pid}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ico.person}</svg><div><div class="t1">${esc(pname(x.pid))}</div><div class="t2">${esc(equip(x.eid).name)}</div></div><div><span class="lvl l${x.actual}">${x.actual}</span> → <span class="lvl l${x.desired}">${x.desired}</span></div></li>`).join('')}</ul>`
              : '<p class="muted small" style="margin:0">Every open gap has someone who can train it.</p>'}
          </section>
          <section class="card">
            <h2>Recent changes</h2>
            ${S.audit.length ? `<ul class="feed">${S.audit.slice(0, 5).map(a => `<li>${esc(a.detail)}<div class="eqmeta">${esc(a.by)}, ${fmtDate(a.ts.slice(0, 10))}</div></li>`).join('')}</ul>
              <p class="small" style="margin:10px 0 0"><a href="#/audit">Full change log</a></p>` : '<p class="muted small" style="margin:0">No changes yet.</p>'}
          </section>
        </div>
      </div>`;
  }
  function coverPips(n) {
    const s = n <= 1 ? 'bad' : n === 2 ? 'warn' : 'ok'; const shown = Math.max(3, Math.min(n, 5));
    let dots = ''; for (let i = 0; i < shown; i++) dots += `<i class="${i < n ? '' : 'off'}"></i>`;
    return `<span class="pips ${s}" title="${n} ${n === 1 ? 'person' : 'people'} can operate independently" aria-label="${n} independent operators">${dots}<span>${n}</span></span>`;
  }
  function coverChip(n) {
    const s = n <= 1 ? 'bad' : n === 2 ? 'warn' : 'ok';
    return `<span class="chip ${s}">${n} ${n === 1 ? 'person' : 'people'}</span>`;
  }

  function pageMatrix() {
    const people = S.people.slice().sort(byName).filter(p => !ui.person || p.id === ui.person);
    const q = ui.q.trim().toLowerCase();
    const eqs = S.equipment.filter(e => (!ui.area || e.area === ui.area) &&
      (!q || [e.name, e.make, e.model, e.sop, e.location].join(' ').toLowerCase().includes(q)));
    const grouped = {}; eqs.forEach(e => (grouped[e.area] = grouped[e.area] || []).push(e));
    const head = people.map(p => `<th class="pcol" title="${esc(p.name)} — ${esc(p.role)}"><a href="#/people/${p.id}"><div class="vert">${esc(p.name)}</div></a></th>`).join('');
    let body = '';
    Object.keys(grouped).sort().forEach(a => {
      body += `<tr class="area"><td class="eqcol">${esc(a)}</td><td colspan="${people.length + 1}"></td></tr>`;
      grouped[a].forEach(e => {
        const cells = people.map(p => {
          const r = rating(e.id, p.id);
          const title = `${p.name} · ${e.name}` + (r ? ` — current ${r.actual}, target ${r.desired}` : ' — not assessed');
          if (!r) return `<td class="c"><button class="cell empty ${ui.mode !== 'all' ? 'dim' : ''}" data-cell="${e.id}|${p.id}" title="${esc(title)}" aria-label="${esc(title)}"></button></td>`;
          const gap = r.desired > r.actual;
          const dim = (ui.mode === 'gaps' && !gap) || (ui.mode === 'qualified' && r.actual < INDEPENDENT);
          return `<td class="c"><button class="cell l${r.actual} ${gap ? 'gap' : ''} ${dim ? 'dim' : ''}" data-cell="${e.id}|${p.id}" title="${esc(title)}" aria-label="${esc(title)}">${r.actual}</button></td>`;
        }).join('');
        body += `<tr><td class="eqcol"><a href="#/equipment/${e.id}" class="eqname" style="color:inherit">${esc(e.name)}</a><div class="eqmeta">${esc([e.sop, e.location].filter(Boolean).join(' · '))}</div></td>${cells}<td class="covercol">${coverPips(cover(e.id))}</td></tr>`;
      });
    });

    return `
      <div class="page-head"><div><h1>Skills matrix</h1><p class="muted">Click any cell to record a sign-off or change a target. Every change is logged.</p></div>
        <div class="actions"><button class="btn" id="exportCsv">Export CSV</button><a class="btn primary" href="#/equipment?new=1">Add equipment</a></div></div>
      <div class="toolbar">
        <input type="search" id="mq" placeholder="Search equipment or SOP" value="${esc(ui.q)}" aria-label="Search equipment">
        <select id="marea" aria-label="Area"><option value="">All areas</option>${areas().map(a => `<option ${a === ui.area ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
        <select id="mperson" aria-label="Person"><option value="">Everyone</option>${S.people.slice().sort(byName).map(p => `<option value="${p.id}" ${p.id === ui.person ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="Highlight">
          ${[['all', 'Everything'], ['gaps', 'Gaps only'], ['qualified', 'Who can operate']].map(([m, l]) => `<button data-mode="${m}" class="${ui.mode === m ? 'on' : ''}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="legend">${S.scale.map(s => `<span title="${esc(s.label)}"><i class="lvl l${s.level}">${s.level}</i>${esc(shortLabel(s.label))}</span>`).join('')}
        <span><i class="gapdot"></i>Below target</span></div>
      ${eqs.length && people.length ? `<div class="matrix-wrap"><table class="m"><thead><tr><th class="eqcol"><span class="small muted">Equipment / skill</span></th>${head}<th class="covercol small muted" style="font-weight:500">Cover</th></tr></thead><tbody>${body}</tbody></table></div>`
        : '<div class="card empty-state">Nothing matches these filters.</div>'}`;
  }
  function shortLabel(l) { const t = l.split(/[:(]/)[0].replace('Authorised to ', '').trim(); return t.charAt(0).toUpperCase() + t.slice(1); }

  function pagePeople() {
    const g = gaps(); const ti = trainingIssues();
    const rows = S.people.slice().sort(byName).map(p => {
      const ng = g.filter(x => x.pid === p.id).length; const nt = ti.filter(x => x.p.id === p.id && x.st.s === 'bad').length;
      const nq = S.equipment.filter(e => { const r = rating(e.id, p.id); return r && r.actual >= INDEPENDENT; }).length;
      return `<tr class="click" data-go="#/people/${p.id}"><td><b style="font-weight:500">${esc(p.name)}</b><div class="eqmeta">${esc((roleOf(p) || {}).name || p.role || 'No role')}</div></td><td>${esc(p.team)}</td>
        <td class="num">${nq}</td><td class="num">${ng ? `<span class="chip warn">${ng}</span>` : '0'}</td><td class="num">${nt ? `<span class="chip bad">${nt}</span>` : '0'}</td></tr>`;
    }).join('');
    return `<div class="page-head"><div><h1>People</h1><p class="muted">Each person's profile is their training plan: gaps, trainers and recurring training in one place.</p></div>
      <div class="actions"><button class="btn primary" id="addPerson">Add person</button></div></div>
      <div class="card table-wrap"><table class="t"><thead><tr><th>Name</th><th>Team</th><th class="num">Can operate</th><th class="num">Open gaps</th><th class="num">Training overdue</th></tr></thead><tbody>${rows || ''}</tbody></table>
      ${S.people.length ? '' : '<div class="empty-state">No people yet. Add your first team member.</div>'}</div>`;
  }

  function pagePerson(id) {
    const p = person(id); if (!p) return notFound();
    const byArea = {};
    S.equipment.forEach(e => { const r = rating(e.id, p.id); if (!r) return; const a = byArea[e.area] = byArea[e.area] || { act: 0, des: 0, n: 0 }; a.act += r.actual; a.des += Math.max(r.desired, r.actual); a.n++; });
    const plan = gaps().filter(x => x.pid === p.id).map(x => ({ ...x, e: equip(x.eid) })).sort((a, b) => a.e.area.localeCompare(b.e.area));
    const qual = S.equipment.map(e => ({ e, r: rating(e.id, p.id) })).filter(x => x.r && x.r.actual >= INDEPENDENT);
    return `
      <p class="small"><a href="#/people">${BACK}People</a></p>
      <div class="page-head"><div><h1>${esc(p.name)}</h1><p class="muted">${roleOf(p) ? `<a href="#/roles/${roleOf(p).id}">${esc(roleOf(p).name)}</a>` : 'No role'} · ${esc(p.team)}</p></div>
        <div class="actions"><a class="btn" href="#/evidence?person=${p.id}">ISO 9001 evidence</a><a class="btn" href="#/matrix?person=${p.id}">View in matrix</a><button class="btn" data-edit-person="${p.id}">Edit</button></div></div>
      <div class="grid two" style="margin-bottom:16px">
        <div class="card"><h2>Competence by area</h2>
          ${Object.keys(byArea).length ? `<div class="bars">${Object.keys(byArea).sort().map(a => { const v = byArea[a]; const pct = v.des ? Math.round(v.act / v.des * 100) : 100;
            return `<div class="bar-row"><span>${esc(a)}</span><div class="bar" title="${pct}% of target"><i style="width:${pct}%"></i></div><span class="num small muted">${pct}%</span></div>`; }).join('')}</div>
            <p class="small muted" style="margin:12px 0 0">Share of target level reached across assessed items in each area.</p>` : '<div class="empty-state">Not assessed on any equipment yet.</div>'}
        </div>
        <div class="card"><h2>Recurring training</h2>
          <table class="t"><tbody>${S.courses.map(c => { const rec = S.records[c.id + '|' + p.id]; const st = recStatus(c, rec); if (st.s === 'na') return '';
            return `<tr class="click" data-rec="${c.id}|${p.id}"><td>${esc(c.name)}<div class="eqmeta">Last done ${fmtDate(rec.completed)}</div></td><td class="num"><span class="chip ${st.s}">${st.label}${st.due ? ' · ' + fmtDate(isoDay(st.due)) : ''}</span></td></tr>`; }).join('') || '<tr><td class="muted">No recurring training required.</td></tr>'}</tbody></table>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px"><h2>Training plan</h2>
        ${plan.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Equipment / skill</th><th>SOP</th><th>Current</th><th>Target</th><th>Who can train</th><th>Planned</th><th>Status</th></tr></thead><tbody>
          ${plan.map(x => { const tr = trainers(x.eid).filter(t => t.id !== p.id).map(t => t.name.split(' ')[0]).join(', ') || '<span class="chip bad">No trainer</span>';
            return `<tr class="click" data-cell="${x.eid}|${p.id}"><td><div class="eqname">${esc(x.e.name)}</div><div class="eqmeta">${esc(x.e.area)}</div></td><td class="small code">${esc(x.e.sop)}</td>
              <td><span class="lvl l${x.actual}">${x.actual}</span></td><td><span class="lvl l${x.desired}">${x.desired}</span>${roleReq(x.eid, p.id) >= x.desired ? '<div class="eqmeta">Role</div>' : ''}</td><td class="small">${tr}</td>
              <td class="small">${x.planned ? fmtDate(x.planned) : '<span class="muted">Not set</span>'}</td><td>${x.status ? `<span class="chip ${x.status === 'In progress' ? 'warn' : 'na'}">${esc(x.status)}</span>` : '<span class="chip na">Not started</span>'}</td></tr>`; }).join('')}
          </tbody></table></div>` : '<div class="empty-state">No open gaps. Everything is at or above target.</div>'}
      </div>
      <div class="card"><h2>Authorised to operate (${qual.length})</h2>
        ${qual.length ? `<table class="t"><tbody>${qual.map(x => `<tr class="click" data-cell="${x.e.id}|${p.id}"><td>${esc(x.e.name)}<div class="eqmeta">${esc(x.e.sop)} · signed off ${fmtDate(x.r.updated)}${x.r.by ? ' by ' + esc(x.r.by) : ''}${x.r.check && x.r.check.result === 'Competent' ? '' : ' · <span style="color:var(--warn)">no effectiveness check</span>'}</div></td><td class="num"><span class="lvl l${x.r.actual}">${x.r.actual}</span></td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">Not yet authorised on any equipment.</div>'}
      </div>`;
  }

  function pageEquipment() {
    const rows = S.equipment.slice().sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name)).map(e => {
      const n = cover(e.id);
      return `<tr class="click" data-go="#/equipment/${e.id}"><td><div class="eqname">${esc(e.name)}</div><div class="eqmeta">${esc([e.make, e.model].filter(Boolean).join(' '))}</div></td><td>${esc(e.area)}</td><td>${esc(e.location)}</td>
        <td><span class="code">${esc(e.sop)}</span>${e.sopRev ? ` <span class="muted small">rev ${esc(e.sopRev)}</span>` : ''}</td><td>${esc(pname(e.owner))}</td><td class="num">${coverPips(n)}</td></tr>`;
    }).join('');
    return `<div class="page-head"><div><h1>Equipment & SOPs</h1><p class="muted">Every item links to its SOP and a person in charge. Skills that aren't equipment (e.g. acid handling, simulation) live here too.</p></div>
      <div class="actions"><button class="btn primary" id="addEq">Add equipment or skill</button></div></div>
      <div class="card table-wrap"><table class="t"><thead><tr><th>Equipment / skill</th><th>Area</th><th>Location</th><th>SOP</th><th>Person in charge</th><th class="num">Independent operators</th></tr></thead><tbody>${rows}</tbody></table>
      ${S.equipment.length ? '' : '<div class="empty-state">No equipment yet.</div>'}</div>`;
  }

  function pageEquipmentOne(id) {
    const e = equip(id); if (!e) return notFound();
    const levels = S.scale.slice().reverse().map(s => {
      const ps = S.people.filter(p => { const r = rating(e.id, p.id); return r && r.actual === s.level; }).sort(byName);
      return `<tr><td style="width:44px"><span class="lvl l${s.level}">${s.level}</span></td><td>${esc(s.label)}<div class="eqmeta">${ps.length ? ps.map(p => `<a href="#/people/${p.id}">${esc(p.name)}</a>`).join(', ') : 'Nobody'}</div></td></tr>`;
    }).join('');
    const waiting = gaps().filter(x => x.eid === e.id);
    return `<p class="small"><a href="#/equipment">${BACK}Equipment & SOPs</a></p>
      <div class="page-head"><div><h1>${esc(e.name)}</h1><p class="muted">${esc([e.make, e.model].filter(Boolean).join(' ') || 'Skill')} · ${esc(e.area)} · ${esc(e.location)}</p></div>
        <div class="actions"><button class="btn" data-edit-eq="${e.id}">Edit</button></div></div>
      <div class="grid two">
        <div class="card"><h2>Who can do what</h2><table class="t"><tbody>${levels}</tbody></table></div>
        <div class="card"><h2>Details</h2>
          <table class="t"><tbody>
            <tr><td class="muted">SOP</td><td>${esc(e.sop || '—')}${e.sopRev ? ' · rev ' + esc(e.sopRev) : ''}</td></tr>
            <tr><td class="muted">Person in charge</td><td>${esc(pname(e.owner))}</td></tr>
            <tr><td class="muted">Independent operators</td><td>${coverChip(cover(e.id))}</td></tr>
            <tr><td class="muted">Waiting for training</td><td>${waiting.length ? waiting.map(x => esc(pname(x.pid))).join(', ') : 'Nobody'}</td></tr>
          </tbody></table>
        </div>
      </div>`;
  }

  function pageTraining() {
    const people = S.people.slice().sort(byName);
    const head = people.map(p => `<th class="pcol" title="${esc(p.name)}"><a href="#/people/${p.id}"><div class="vert">${esc(p.name)}</div></a></th>`).join('');
    const body = S.courses.map(c => `<tr><td class="eqcol"><span class="eqname">${esc(c.name)}</span><div class="eqmeta">Valid for ${c.validityMonths} months · <a href="#" data-edit-course="${c.id}">edit</a></div></td>
      ${people.map(p => { const rec = S.records[c.id + '|' + p.id]; const st = recStatus(c, rec);
        const txt = st.s === 'na' ? '—' : st.due ? fmtDate(isoDay(st.due)).replace(/ \d{4}$/, m => ' ' + m.trim().slice(2)) : 'Never';
        return `<td class="c"><button class="tcell ${st.s}" data-rec="${c.id}|${p.id}" title="${esc(p.name + ' · ' + c.name + ': ' + st.label)}">${esc(txt)}</button></td>`; }).join('')}</tr>`).join('');
    return `<div class="page-head"><div><h1>Recurring training</h1><p class="muted">Each cell shows the <b>expiry date</b>, worked out from the last completion and the course's validity period.</p></div>
      <div class="actions"><button class="btn primary" id="addCourse">Add course</button></div></div>
      <div class="legend"><span><span class="chip ok">Valid</span></span><span><span class="chip warn">Expires within ${DUE_SOON_DAYS} days</span></span><span><span class="chip bad">Overdue or never done</span></span><span><span class="chip na">— Not required</span></span></div>
      <div class="matrix-wrap"><table class="m"><thead><tr><th class="eqcol"><span class="small muted">Course</span></th>${head.replace(/class="pcol"/g, 'class="pcol" style="width:96px;min-width:96px"')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function pageAudit() {
    const types = [...new Set(S.audit.map(a => a.type))];
    const f = ui.auditType || '';
    const rows = S.audit.filter(a => !f || a.type === f).map(a => `<tr><td class="small" style="white-space:nowrap">${fmtDate(a.ts.slice(0, 10))} <span class="muted">${a.ts.slice(11, 16)}</span></td><td><span class="chip na">${esc(a.type)}</span></td><td>${esc(a.detail)}</td><td class="small">${esc(a.by)}</td></tr>`).join('');
    return `<div class="page-head"><div><h1>Change log</h1><p class="muted">Recorded automatically for every change. Nothing here can be edited.</p></div>
      <div class="actions"><select id="auditType" style="width:auto"><option value="">All changes</option>${types.map(t => `<option ${t === f ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><button class="btn" id="exportAudit">Export CSV</button></div></div>
      <div class="card table-wrap"><table class="t"><thead><tr><th>When</th><th>Type</th><th>Change</th><th>By</th></tr></thead><tbody>${rows}</tbody></table>
      ${S.audit.length ? '' : '<div class="empty-state">No changes yet.</div>'}</div>`;
  }


  function pageRoles() {
    const rows = S.roles.slice().sort(byName).map(r => {
      const members = S.people.filter(p => p.roleId === r.id);
      const nReq = Object.values(r.reqs).filter(Boolean).length;
      const unmet = members.reduce((n, p) => n + Object.keys(r.reqs).filter(eid => equip(eid) && ((rating(eid, p.id) || {}).actual || 0) < r.reqs[eid]).length, 0);
      return `<tr class="click" data-go="#/roles/${r.id}"><td><b style="font-weight:500">${esc(r.name)}</b></td><td class="num">${members.length}</td><td class="num">${nReq}</td><td class="num">${unmet ? `<span class="chip warn">${unmet}</span>` : '0'}</td></tr>`;
    }).join('');
    return `<div class="page-head"><div><h1>Roles & requirements</h1><p class="muted">Set what competence each role needs once (ISO 9001 clause 7.2 a). Everyone in the role gets it as their target.</p></div>
      <div class="actions"><button class="btn primary" id="addRole">Add role</button></div></div>
      <div class="card table-wrap"><table class="t"><thead><tr><th>Role</th><th class="num">People</th><th class="num">Required items</th><th class="num">Not yet met</th></tr></thead><tbody>${rows}</tbody></table>
      ${S.roles.length ? '' : '<div class="empty-state">No roles yet. Add one, then choose the equipment and level it needs.</div>'}</div>`;
  }

  function pageRole(id) {
    const r = S.roles.find(x => x.id === id); if (!r) return notFound();
    const members = S.people.filter(p => p.roleId === r.id).sort(byName);
    const grouped = {}; S.equipment.forEach(e => (grouped[e.area] = grouped[e.area] || []).push(e));
    const opts = v => `<option value="0" ${!v ? 'selected' : ''}>Not required</option>` + S.scale.filter(x => x.level > 0).map(x => `<option value="${x.level}" ${v === x.level ? 'selected' : ''}>${x.level} — ${esc(shortLabel(x.label))}</option>`).join('');
    const body = Object.keys(grouped).sort().map(a => `<tr class="area-row"><td colspan="3">${esc(a)}</td></tr>` + grouped[a].map(e => {
      const v = r.reqs[e.id] || 0; const met = members.filter(p => ((rating(e.id, p.id) || {}).actual || 0) >= v).length;
      return `<tr><td><div class="eqname">${esc(e.name)}</div><div class="eqmeta"><span class="code">${esc(e.sop)}</span></div></td>
        <td style="width:260px"><select data-req="${e.id}" aria-label="Required level for ${esc(e.name)}">${opts(v)}</select></td>
        <td class="num small">${v ? `${met} of ${members.length} meet it` : '<span class="muted">—</span>'}</td></tr>`; }).join('')).join('');
    return `<p class="small"><a href="#/roles">${BACK}Roles & requirements</a></p>
      <div class="page-head"><div><h1>${esc(r.name)}</h1><p class="muted">${members.length ? members.map(p => `<a href="#/people/${p.id}">${esc(p.name)}</a>`).join(', ') : 'Nobody has this role yet.'}</p></div>
        <div class="actions"><button class="btn" data-rename-role="${r.id}">Rename or remove</button><button class="btn primary" id="saveRole" data-role="${r.id}">Save requirements</button></div></div>
      <div class="card table-wrap"><table class="t"><thead><tr><th>Equipment / skill</th><th>Required level</th><th class="num">Status</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function pageEvidence(params) {
    const only = params.get('person') || ui.evPerson || '';
    const gapsOnly = params.get('show') === 'gaps' || ui.evGaps;
    const people = S.people.slice().sort(byName).filter(p => !only || p.id === only);
    const evg = evidenceGaps();
    const sections = people.map(p => {
      const items = S.equipment.map(e => ({ e, r: rating(e.id, p.id), req: roleReq(e.id, p.id) }))
        .filter(x => x.r && (x.r.actual >= 1 || x.r.desired >= 1 || x.req))
        .filter(x => !gapsOnly || evg.some(g => g.eid === x.e.id && g.pid === p.id));
      if (gapsOnly && !items.length) return '';
      const met = items.filter(x => x.r.actual >= Math.max(x.r.desired, x.req)).length;
      const rows = items.map(x => {
        const target = Math.max(x.r.desired, x.req); const c = x.r.check;
        const chk = c ? `${esc(c.method)}<div class="eqmeta">${esc(c.result)}, ${fmtDate(c.date)}${c.by ? ' · ' + esc(c.by) : ''}</div>` : (x.r.actual >= 1 ? '<span class="chip warn">Missing</span>' : '<span class="muted">—</span>');
        return `<tr class="click" data-cell="${x.e.id}|${p.id}"><td><div class="eqname">${esc(x.e.name)}</div><div class="eqmeta"><span class="code">${esc(x.e.sop)}</span>${x.e.sopRev ? ' rev ' + esc(x.e.sopRev) : ''}</div></td>
          <td><span class="lvl l${target}">${target}</span><div class="eqmeta">${x.req >= target && x.req ? 'Role' : 'Individual'}</div></td>
          <td><span class="lvl l${x.r.actual}">${x.r.actual}</span>${x.r.actual < target ? '<div class="eqmeta" style="color:var(--warn)">Below</div>' : ''}</td>
          <td class="small">${x.r.basis ? esc(x.r.basis) + (x.r.basisNote ? `<div class="eqmeta">${esc(x.r.basisNote)}</div>` : '') : (x.r.actual >= 1 ? '<span class="chip warn">Missing</span>' : '<span class="muted">—</span>')}</td>
          <td class="small">${chk}</td>
          <td class="small">${x.r.actual >= 1 && x.r.updated ? `${esc(x.r.by || '—')}<div class="eqmeta">${fmtDate(x.r.updated)}</div>` : '<span class="muted">—</span>'}</td>
          <td class="small code">${esc(x.r.evidence || '')}</td></tr>`;
      }).join('');
      const tr = S.courses.map(c => { const rec = S.records[c.id + '|' + p.id]; const st = recStatus(c, rec); if (st.s === 'na') return '';
        return `<tr><td>${esc(c.name)}${c.awareness ? ' <span class="chip na">7.3 awareness</span>' : ''}</td><td class="small">${fmtDate(rec.completed)}</td><td><span class="chip ${st.s}">${st.label}${st.due ? ' · ' + fmtDate(isoDay(st.due)) : ''}</span></td></tr>`; }).join('');
      return `<section class="card evidence-person">
        <div class="ev-head"><div><h2 style="margin:0">${esc(p.name)}</h2><p class="small muted" style="margin:2px 0 0">${esc((roleOf(p) || {}).name || 'No role')} · ${esc(p.team)}</p></div>
          <div class="small muted" style="text-align:right">${met} of ${items.length} requirements met</div></div>
        ${items.length ? `<div class="table-wrap"><table class="t ev"><thead><tr><th>Equipment / skill</th><th>Required <span class="iso">7.2 a</span></th><th>Current</th><th>Basis <span class="iso">7.2 b</span></th><th>Effectiveness check <span class="iso">7.2 c</span></th><th>Signed off <span class="iso">7.2 d</span></th><th>Evidence ref.</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted small">No competence requirements recorded.</p>'}
        ${!gapsOnly && tr ? `<h3 class="ev-sub">Training and awareness <span class="iso">7.2 / 7.3</span></h3><div class="table-wrap"><table class="t"><thead><tr><th>Course</th><th>Last completed</th><th>Status</th></tr></thead><tbody>${tr}</tbody></table></div>` : ''}
      </section>`;
    }).join('');
    return `<div class="page-head no-print-actions"><div><h1>ISO 9001 competence evidence</h1><p class="muted">Clause 7.2 (competence) and 7.3 (awareness) records, ready for an internal or external audit. Generated ${fmtDate(isoDay(new Date()))} from ${esc(S.org.name)}.</p></div>
        <div class="actions"><button class="btn" id="exportEvidence">Export CSV</button><button class="btn primary" id="printEvidence">Print or save as PDF</button></div></div>
      <div class="toolbar no-print">
        <select id="evPerson" aria-label="Person"><option value="">Everyone</option>${S.people.slice().sort(byName).map(p => `<option value="${p.id}" ${p.id === only ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="Show"><button data-evgaps="0" class="${gapsOnly ? '' : 'on'}">Full record</button><button data-evgaps="1" class="${gapsOnly ? 'on' : ''}">Missing evidence only (${evg.length})</button></div>
      </div>
      ${sections || '<div class="card empty-state">No missing evidence. Every sign-off has a basis and an effectiveness check.</div>'}`;
  }

  function pageSettings() {
    return `<div class="page-head"><div><h1>Settings</h1><p class="muted">Data is saved in this browser only. Export a backup regularly.</p></div></div>
      <div class="grid two">
        <div class="card"><h2>Organisation</h2>
          <div class="field"><label for="orgName">Name</label><input id="orgName" value="${esc(S.org.name)}"></div>
          <h2 style="margin-top:20px">Authorisation scale</h2>
          ${S.scale.map(s => `<div class="field" style="display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:center"><span class="lvl l${s.level}">${s.level}</span><input data-scale="${s.level}" value="${esc(s.label)}" aria-label="Level ${s.level} meaning"></div>`).join('')}
          <button class="btn primary" id="saveSettings">Save</button>
        </div>
        <div class="card"><h2>Your data</h2>
          <p class="small muted">Back up or move your matrix between computers.</p>
          <div class="toolbar"><button class="btn" id="exportJson">Export backup (.json)</button><label class="btn" style="width:auto">Import backup<input type="file" id="importJson" accept=".json,application/json" hidden></label></div>
          <h2 style="margin-top:20px">Start over</h2>
          <p class="small muted">Replace everything with the fictional sample lab, or start with a blank matrix that keeps the scale above.</p>
          <div class="toolbar"><button class="btn" id="resetSample">Load sample data</button><button class="btn danger" id="resetBlank">Start blank</button></div>
        </div>
      </div>`;
  }
  function notFound() { return '<div class="card empty-state">That page doesn\'t exist. <a href="#/dashboard">Back to overview</a></div>'; }

  // ---------- dialogs ----------
  const dlg = () => $('#dlg');
  function openDialog(html, onSubmit, onExtra) {
    const d = dlg(); d.innerHTML = `<form method="dialog" id="dlgForm">${html}</form>`;
    const f = $('#dlgForm', d);
    f.addEventListener('submit', ev => {
      if (ev.submitter && ev.submitter.value === 'cancel') return;
      ev.preventDefault();
      if (onSubmit(new FormData(f), f) !== false) { d.close(); save(); render(); }
    });
    f.querySelectorAll('[data-extra]').forEach(b => b.addEventListener('click', ev => { ev.preventDefault(); if (onExtra && onExtra(b.dataset.extra) !== false) { d.close(); save(); render(); } }));
    d.showModal();
    const first = f.querySelector('input:not([type=radio]):not([type=hidden]), select, textarea'); if (first) first.focus();
  }
  const foot = (extra = '') => `<div class="dlg-foot">${extra}<button class="btn" value="cancel" formnovalidate>Cancel</button><button class="btn primary" value="ok">Save</button></div>`;

  function editCell(key) {
    const [eid, pid] = key.split('|'); const e = equip(eid), p = person(pid); if (!e || !p) return;
    const r = rating(eid, pid) || { desired: 0, actual: 0 };
    const req = roleReq(eid, pid); const role = roleOf(p);
    const approvers = S.people.filter(x => x.id !== pid && (rating(eid, x.id) || {}).actual >= 3).sort(byName);
    const radios = (name, val) => S.scale.map(s => `<label><input type="radio" name="${name}" value="${s.level}" ${s.level === val ? 'checked' : ''}><span class="lvl l${s.level}">${s.level}</span><span>${esc(s.label)}</span></label>`).join('');
    const sel = (name, list, val, blank) => `<select id="f-${name}" name="${name}">${blank !== undefined ? `<option value="">${blank}</option>` : ''}${list.map(x => `<option ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    const c = r.check;
    openDialog(`
      <div class="dlg-head"><h2 style="margin:0">${esc(p.name)}</h2><p class="muted small" style="margin:2px 0 0">${esc(e.name)} · <span class="code">${esc(e.sop || 'No SOP')}</span>${e.sopRev ? ' rev ' + esc(e.sopRev) : ''}</p></div>
      <div class="dlg-body">
        <div class="err" id="dlgErr" role="alert" hidden></div>
        <div class="field"><label>Current level</label><div class="levels">${radios('actual', r.actual)}</div></div>
        <div class="field"><label for="f-desired">Target level</label><select id="f-desired" name="desired">${S.scale.map(s => `<option value="${s.level}" ${s.level === Math.max(r.desired, req) ? 'selected' : ''} ${s.level < req ? 'disabled' : ''}>${s.level} — ${esc(shortLabel(s.label))}</option>`).join('')}</select>
          <div class="hint">${req ? `The ${esc(role.name)} role requires at least level ${req}.` : 'No role requirement for this item.'}</div></div>

        <fieldset class="iso-box"><legend>Sign-off evidence <span class="iso">ISO 9001 7.2</span></legend>
          <div class="row2">
            <div class="field"><label for="f-basis">Competent on the basis of</label>${sel('basis', BASES, r.basis || 'Training')}</div>
            <div class="field"><label for="f-basisNote">Details</label><input id="f-basisNote" name="basisNote" value="${esc(r.basisNote || '')}" placeholder="e.g. vendor course, 2 yrs on similar rig"></div>
          </div>
          <div class="row2">
            <div class="field"><label for="f-method">Effectiveness check</label>${sel('method', METHODS, '', 'Choose how it was checked')}</div>
            <div class="field"><label for="f-result">Result</label>${sel('result', ['Competent', 'Not yet competent'], 'Competent')}</div>
          </div>
          <div class="hint" style="margin:-6px 0 12px">${c ? `Last check: ${esc(c.method)}, ${esc(c.result)}, ${fmtDate(c.date)}${c.by ? ' by ' + esc(c.by) : ''}. Leave blank to keep it.` : 'Required when you raise the current level. Records that the training worked, not just that it happened.'}</div>
          <div class="row2">
            <div class="field"><label for="f-by">Signed off by</label><select id="f-by" name="by">${approvers.map(a => `<option ${a.name === S.user ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}${approvers.some(a => a.name === S.user) ? '' : `<option selected>${esc(S.user)}</option>`}</select>
              <div class="hint">${approvers.length ? 'People at level 3+ on this item are listed first.' : 'Nobody else is at level 3+ on this item yet.'}</div></div>
            <div class="field"><label for="f-evidence">Evidence reference</label><input id="f-evidence" name="evidence" class="code" value="${esc(r.evidence || '')}" placeholder="e.g. QMS/TR-1042"></div>
          </div>
        </fieldset>

        <div class="row2">
          <div class="field"><label for="f-planned">Training planned for</label><input type="date" id="f-planned" name="planned" value="${esc(r.planned || '')}"></div>
          <div class="field"><label for="f-status">Training status</label><select id="f-status" name="status">${['', 'Planned', 'In progress', 'On hold', 'Cancelled'].map(s => `<option value="${s}" ${s === (r.status || '') ? 'selected' : ''}>${s || 'Not started'}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label for="f-note">Note for the change log</label><input id="f-note" name="note" placeholder="e.g. completed 3 supervised runs"></div>
      </div>${foot(rating(eid, pid) ? '<button class="btn danger left" data-extra="clear">Remove</button>' : '')}`,
      fd => {
        const old = rating(eid, pid); const oldActual = old ? old.actual : 0;
        let actual = +fd.get('actual'); const desired = Math.max(+fd.get('desired'), req);
        const method = fd.get('method'); const result = fd.get('result'); const by = fd.get('by');
        const note = (fd.get('note') || '').trim();
        const raised = actual > oldActual;
        if (raised && !method) return showErr('Record how competence was checked before raising the level (ISO 9001 7.2 c).');
        const changes = []; let check = old && old.check;
        if (method) {
          check = { method, result, date: isoDay(new Date()), by };
          changes.push(`effectiveness check: ${method}, ${result}`);
          if (raised && result !== 'Competent') { actual = oldActual; changes.push('level not raised'); }
        }
        const n = { desired, actual, planned: fd.get('planned') || '', status: fd.get('status') || '', basis: fd.get('basis'), basisNote: (fd.get('basisNote') || '').trim(), evidence: (fd.get('evidence') || '').trim(), check };
        if (actual !== oldActual || !old) changes.unshift(`current ${old ? oldActual : '—'} → ${actual}`);
        if (!old || old.desired !== desired) changes.push(`target ${old ? old.desired : '—'} → ${desired}`);
        if ((old && old.basis) !== n.basis && actual >= 1) changes.push(`basis ${n.basis}`);
        if ((old && old.evidence || '') !== n.evidence && n.evidence) changes.push(`evidence ${n.evidence}`);
        if ((old && old.planned || '') !== n.planned && n.planned) changes.push(`training planned ${n.planned}`);
        if ((old && old.status || '') !== n.status) changes.push(`status ${n.status || 'Not started'}`);
        const actualChanged = actual !== oldActual;
        S.ratings[key] = { ...old, ...n, updated: actualChanged ? isoDay(new Date()) : ((old && old.updated) || ''), by: actualChanged ? by : ((old && old.by) || '') };
        if (changes.length) { log('rating', `${p.name} · ${e.name}: ${changes.join(', ')}${actualChanged ? ` (signed off by ${by})` : ''}${note ? ' — ' + note : ''}`); toast(raised && actual === oldActual ? 'Check recorded. Level not raised.' : 'Saved and logged'); }
      },
      x => { if (x === 'clear') { if (!confirmInline()) return false; delete S.ratings[key]; log('rating', `${p.name} · ${e.name}: assessment removed`); toast('Removed'); } });
  }
  function showErr(msg) { const el = $('#dlgErr'); if (el) { el.textContent = msg; el.hidden = false; el.scrollIntoView({ block: 'nearest' }); } return false; }

  function editPerson(id) {
    const p = id ? person(id) : { name: '', role: '', team: '' };
    openDialog(`<div class="dlg-head"><h2 style="margin:0">${id ? 'Edit person' : 'Add person'}</h2></div>
      <div class="dlg-body">
        <div class="field"><label for="f-n">Full name</label><input id="f-n" name="name" required value="${esc(p.name)}"></div>
        <div class="row2"><div class="field"><label for="f-r">Role</label><input id="f-r" name="role" list="roleList" value="${esc((roleOf(p) || {}).name || p.role || '')}"><datalist id="roleList">${S.roles.map(r => `<option>${esc(r.name)}</option>`).join('')}</datalist><div class="hint">Pick a role or type a new one. Its requirements become this person's targets.</div></div>
        <div class="field"><label for="f-t">Team</label><input id="f-t" name="team" list="teams" value="${esc(p.team)}"><datalist id="teams">${[...new Set(S.people.map(x => x.team))].map(t => `<option>${esc(t)}</option>`).join('')}</datalist></div></div>
        ${id ? '' : '<p class="small muted">They\'ll appear as a new column in the matrix straight away. Default recurring training is set to required for the core safety courses.</p>'}
      </div>${foot(id ? '<button class="btn danger left" data-extra="del">Remove person</button>' : '')}`,
      fd => {
        const v = { name: fd.get('name').trim(), role: fd.get('role').trim(), team: fd.get('team').trim() };
        if (!v.name) return false;
        let r = v.role ? S.roles.find(x => x.name.toLowerCase() === v.role.toLowerCase()) : null;
        if (v.role && !r) { r = { id: uid('r'), name: v.role, reqs: {} }; S.roles.push(r); log('role', `Added role ${v.role}`); }
        v.roleId = r ? r.id : ''; v.role = r ? r.name : '';
        if (id) { const was = p.roleId; Object.assign(p, v); const n = applyRole(p.id); log('person', `Updated ${v.name}${was !== v.roleId ? `: role → ${v.role || 'none'}` : ''}${n ? ` (${n} ${n === 1 ? 'target' : 'targets'} set from role)` : ''}`); }
        else {
          const np = { id: uid('p'), ...v }; S.people.push(np);
          S.courses.forEach((c, i) => { S.records[c.id + '|' + np.id] = { required: i < 3 || !!c.awareness, completed: '' }; });
          const n = applyRole(np.id);
          log('person', `Added ${v.name}${v.role ? ' as ' + v.role : ''}${n ? ` (${n} ${n === 1 ? 'target' : 'targets'} set from role)` : ''}`); location.hash = '#/people/' + np.id;
        }
        toast('Saved');
      },
      x => {
        if (x !== 'del') return false;
        if (!confirmInline()) return false;
        S.people = S.people.filter(q => q.id !== id);
        Object.keys(S.ratings).forEach(k => { if (k.endsWith('|' + id)) delete S.ratings[k]; });
        Object.keys(S.records).forEach(k => { if (k.endsWith('|' + id)) delete S.records[k]; });
        S.equipment.forEach(e => { if (e.owner === id) e.owner = ''; });
        log('person', `Removed ${p.name}`); location.hash = '#/people'; toast('Removed');
      });
  }
  // Second click confirms destructive actions, without browser dialogs.
  function confirmInline() {
    const b = $('#dlg [data-extra]');
    if (b && b.dataset.armed) return true;
    if (b) { b.dataset.armed = '1'; b.textContent = 'Click again to confirm'; }
    return false;
  }

  function editRole(id) {
    const r = id ? S.roles.find(x => x.id === id) : { name: '' };
    const n = id ? S.people.filter(p => p.roleId === id).length : 0;
    openDialog(`<div class="dlg-head"><h2 style="margin:0">${id ? 'Rename role' : 'Add role'}</h2></div>
      <div class="dlg-body"><div class="field"><label for="f-rn">Role name</label><input id="f-rn" name="name" required value="${esc(r.name)}" placeholder="e.g. Test Technician"></div>
      ${id ? `<p class="small muted">${n ? `${n} ${n === 1 ? 'person has' : 'people have'} this role. Removing it keeps their current targets.` : 'Nobody has this role.'}</p>` : '<p class="small muted">Next, choose the equipment and levels this role needs.</p>'}</div>
      ${foot(id ? '<button class="btn danger left" data-extra="del">Remove role</button>' : '')}`,
      fd => {
        const name = fd.get('name').trim(); if (!name) return false;
        if (id) { log('role', `Renamed role ${r.name} → ${name}`); r.name = name; S.people.forEach(p => { if (p.roleId === id) p.role = name; }); }
        else { const nr = { id: uid('r'), name, reqs: {} }; S.roles.push(nr); log('role', `Added role ${name}`); location.hash = '#/roles/' + nr.id; }
        toast('Saved');
      },
      x => {
        if (x !== 'del' || !confirmInline()) return false;
        S.roles = S.roles.filter(q => q.id !== id); S.people.forEach(p => { if (p.roleId === id) { p.roleId = ''; p.role = ''; } });
        log('role', `Removed role ${r.name}`); location.hash = '#/roles'; toast('Removed');
      });
  }

  function editEquipment(id) {
    const e = id ? equip(id) : { name: '', make: '', model: '', area: ui.area || '', location: '', sop: '', sopRev: '', owner: '' };
    openDialog(`<div class="dlg-head"><h2 style="margin:0">${id ? 'Edit equipment or skill' : 'Add equipment or skill'}</h2></div>
      <div class="dlg-body">
        <div class="field"><label for="f-en">Name</label><input id="f-en" name="name" required value="${esc(e.name)}" placeholder="e.g. Tensile tester 100 kN, or Acid handling"></div>
        <div class="row2"><div class="field"><label for="f-mk">Make</label><input id="f-mk" name="make" value="${esc(e.make)}"></div><div class="field"><label for="f-md">Model</label><input id="f-md" name="model" value="${esc(e.model)}"></div></div>
        <div class="row2"><div class="field"><label for="f-ar">Area</label><input id="f-ar" name="area" required list="areas" value="${esc(e.area)}"><datalist id="areas">${areas().map(a => `<option>${esc(a)}</option>`).join('')}</datalist></div>
        <div class="field"><label for="f-lo">Location</label><input id="f-lo" name="location" value="${esc(e.location)}"></div></div>
        <div class="row2"><div class="field"><label for="f-so">SOP number</label><input id="f-so" name="sop" value="${esc(e.sop)}"></div><div class="field"><label for="f-sr">SOP revision</label><input id="f-sr" name="sopRev" value="${esc(e.sopRev)}"></div></div>
        <div class="field"><label for="f-ow">Person in charge</label><select id="f-ow" name="owner"><option value="">—</option>${S.people.slice().sort(byName).map(p => `<option value="${p.id}" ${p.id === e.owner ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
        ${id ? '<p class="small muted">Changing the SOP revision is logged, so you can show which version people were trained on.</p>' : ''}
      </div>${foot(id ? '<button class="btn danger left" data-extra="del">Remove</button>' : '')}`,
      fd => {
        const v = {}; ['name', 'make', 'model', 'area', 'location', 'sop', 'sopRev', 'owner'].forEach(k => v[k] = (fd.get(k) || '').trim());
        if (!v.name || !v.area) return false;
        if (id) {
          const ch = []; if (e.sopRev !== v.sopRev) ch.push(`SOP ${v.sop} rev ${e.sopRev || '—'} → ${v.sopRev}`); if (e.owner !== v.owner) ch.push(`person in charge → ${pname(v.owner)}`);
          Object.assign(e, v); log('equipment', `Updated ${v.name}${ch.length ? ': ' + ch.join(', ') : ''}`);
        } else { const ne = { id: uid('e'), ...v }; S.equipment.push(ne); log('equipment', `Added ${v.name}${v.sop ? ' (' + v.sop + ')' : ''}`); location.hash = '#/equipment/' + ne.id; }
        toast('Saved');
      },
      x => {
        if (x !== 'del' || !confirmInline()) return false;
        S.equipment = S.equipment.filter(q => q.id !== id);
        Object.keys(S.ratings).forEach(k => { if (k.startsWith(id + '|')) delete S.ratings[k]; });
        log('equipment', `Removed ${e.name}`); location.hash = '#/equipment'; toast('Removed');
      });
  }

  function editRecord(key) {
    const [cid, pid] = key.split('|'); const c = S.courses.find(x => x.id === cid), p = person(pid); if (!c || !p) return;
    const rec = S.records[key] || { required: false, completed: '' };
    openDialog(`<div class="dlg-head"><h2 style="margin:0">${esc(c.name)}</h2><p class="muted small" style="margin:2px 0 0">${esc(p.name)} · valid for ${c.validityMonths} months</p></div>
      <div class="dlg-body">
        <div class="field"><label><input type="checkbox" name="required" ${rec.required ? 'checked' : ''} style="width:auto;margin-right:8px">Required for this person</label></div>
        <div class="field"><label for="f-cd">Last completed</label><input type="date" id="f-cd" name="completed" value="${esc(rec.completed || '')}"><div class="hint">The expiry date is calculated for you.</div></div>
        <button class="btn" data-extra="today">Completed today</button>
      </div>${foot()}`,
      fd => {
        const n = { required: !!fd.get('required'), completed: fd.get('completed') || '' };
        if (n.required !== !!rec.required || n.completed !== (rec.completed || '')) {
          S.records[key] = n; log('training', `${p.name} · ${c.name}: ${n.required ? (n.completed ? 'completed ' + n.completed : 'required, not done') : 'not required'}`); toast('Saved and logged');
        }
      },
      x => { if (x === 'today') { S.records[key] = { required: true, completed: isoDay(new Date()) }; log('training', `${p.name} · ${c.name}: completed ${isoDay(new Date())}`); toast('Saved and logged'); } });
  }

  function editCourse(id) {
    const c = id ? S.courses.find(x => x.id === id) : { name: '', validityMonths: 24 };
    openDialog(`<div class="dlg-head"><h2 style="margin:0">${id ? 'Edit course' : 'Add recurring course'}</h2></div>
      <div class="dlg-body"><div class="field"><label for="f-cn">Course name</label><input id="f-cn" name="name" required value="${esc(c.name)}"></div>
      <div class="field"><label for="f-cv">Valid for (months)</label><input id="f-cv" type="number" min="1" max="120" name="validity" required value="${esc(c.validityMonths)}"></div></div>
      ${foot(id ? '<button class="btn danger left" data-extra="del">Remove course</button>' : '')}`,
      fd => {
        const v = { name: fd.get('name').trim(), validityMonths: +fd.get('validity') };
        if (id) { Object.assign(c, v); log('training', `Updated course ${v.name} (valid ${v.validityMonths} months)`); }
        else { const nc = { id: uid('c'), ...v }; S.courses.push(nc); S.people.forEach(p => { S.records[nc.id + '|' + p.id] = { required: true, completed: '' }; }); log('training', `Added course ${v.name}`); }
        toast('Saved');
      },
      x => {
        if (x !== 'del' || !confirmInline()) return false;
        S.courses = S.courses.filter(q => q.id !== id); Object.keys(S.records).forEach(k => { if (k.startsWith(id + '|')) delete S.records[k]; });
        log('training', `Removed course ${c.name}`); toast('Removed');
      });
  }

  // ---------- export ----------
  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const csvCell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function exportMatrixCsv() {
    const people = S.people.slice().sort(byName);
    const head = ['Area', 'Equipment / skill', 'Make', 'Model', 'Location', 'SOP', 'SOP rev', 'Person in charge'];
    people.forEach(p => head.push(p.name + ' (target)', p.name + ' (current)'));
    const rows = [head];
    S.equipment.forEach(e => {
      const r = [e.area, e.name, e.make, e.model, e.location, e.sop, e.sopRev, pname(e.owner)];
      people.forEach(p => { const x = rating(e.id, p.id); r.push(x ? x.desired : '', x ? x.actual : ''); });
      rows.push(r);
    });
    download('skill-matrix.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  }

  function exportEvidenceCsv() {
    const rows = [['Person', 'Role', 'Equipment / skill', 'SOP', 'SOP rev', 'Required level (7.2 a)', 'Requirement source', 'Current level', 'Basis (7.2 b)', 'Basis details', 'Check method (7.2 c)', 'Check result', 'Check date', 'Signed off by (7.2 d)', 'Sign-off date', 'Evidence ref.']];
    S.people.slice().sort(byName).forEach(p => S.equipment.forEach(e => {
      const r = rating(e.id, p.id); const req = roleReq(e.id, p.id); if (!r || !(r.actual >= 1 || r.desired >= 1 || req)) return;
      const c = r.check || {};
      rows.push([p.name, (roleOf(p) || {}).name || '', e.name, e.sop, e.sopRev, Math.max(r.desired, req), req >= r.desired && req ? 'Role' : 'Individual', r.actual, r.basis || '', r.basisNote || '', c.method || '', c.result || '', c.date || '', r.by || '', r.updated || '', r.evidence || '']);
    }));
    download('iso9001-competence-evidence-' + isoDay(new Date()) + '.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  }

  // ---------- router ----------
  function parse() {
    const h = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [path, qs] = h.split('?'); const parts = path.split('/');
    const params = new URLSearchParams(qs || '');
    return { page: parts[0], id: parts[1], params };
  }
  function render() {
    const { page, id, params } = parse();
    if (page === 'matrix') { if (params.get('mode')) ui.mode = params.get('mode'); if (params.get('person')) ui.person = params.get('person'); }
    renderNav(page);
    const m = $('#main');
    const map = {
      dashboard: pageDashboard, matrix: pageMatrix, people: () => id ? pagePerson(id) : pagePeople(),
      equipment: () => id ? pageEquipmentOne(id) : pageEquipment(), training: pageTraining, audit: pageAudit, settings: pageSettings,
      roles: () => id ? pageRole(id) : pageRoles(), evidence: () => pageEvidence(params)
    };
    m.innerHTML = (map[page] || notFound)();
    document.title = (routes.find(r => r[0] === page) || [, 'SkillMatrix'])[1] + ' · SkillMatrix';
    $('#side').classList.remove('open');
    if (page === 'equipment' && params.get('new')) { history.replaceState(null, '', '#/equipment'); editEquipment(); }
  }

  // ---------- events ----------
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-cell],[data-go],[data-rec],[data-mode],[data-evgaps],[data-edit-person],[data-edit-eq],[data-edit-course],[data-rename-role],#addPerson,#addEq,#addCourse,#addRole,#saveRole,#exportCsv,#exportAudit,#exportEvidence,#printEvidence,#exportJson,#saveSettings,#resetSample,#resetBlank,#menuBtn');
    if (!t || t.closest('dialog')) return;
    if (t.dataset.cell) return editCell(t.dataset.cell);
    if (t.dataset.rec) return editRecord(t.dataset.rec);
    if (t.dataset.go) { if (ev.target.closest('a')) return; location.hash = t.dataset.go; return; }
    if (t.dataset.mode) { ui.mode = t.dataset.mode; history.replaceState(null, '', '#/matrix'); return render(); }
    if (t.dataset.evgaps) { ui.evGaps = t.dataset.evgaps === '1'; history.replaceState(null, '', '#/evidence'); return render(); }
    if (t.dataset.renameRole) return editRole(t.dataset.renameRole);
    if (t.dataset.editPerson) return editPerson(t.dataset.editPerson);
    if (t.dataset.editEq) return editEquipment(t.dataset.editEq);
    if (t.dataset.editCourse) { ev.preventDefault(); return editCourse(t.dataset.editCourse); }
    switch (t.id) {
      case 'addPerson': return editPerson();
      case 'addEq': return editEquipment();
      case 'addCourse': return editCourse();
      case 'addRole': return editRole();
      case 'saveRole': {
        const r = S.roles.find(x => x.id === t.dataset.role); if (!r) return;
        const before = JSON.stringify(r.reqs); const reqs = {};
        document.querySelectorAll('[data-req]').forEach(sel => { const v = +sel.value; if (v) reqs[sel.dataset.req] = v; });
        r.reqs = reqs; let n = 0; S.people.filter(p => p.roleId === r.id).forEach(p => { n += applyRole(p.id); });
        if (before !== JSON.stringify(reqs)) log('role', `Updated requirements for ${r.name}: ${Object.keys(reqs).length} items${n ? `, ${n} ${n === 1 ? 'target' : 'targets'} raised for people in the role` : ''}`);
        save(); render(); return toast(n ? `Saved. ${n} ${n === 1 ? 'target' : 'targets'} updated.` : 'Requirements saved');
      }
      case 'exportEvidence': return exportEvidenceCsv();
      case 'printEvidence': return window.print();
      case 'exportCsv': return exportMatrixCsv();
      case 'menuBtn': return $('#side').classList.toggle('open');
      case 'exportAudit': return download('change-log.csv', [['When', 'Type', 'Change', 'By'], ...S.audit.map(a => [a.ts.replace('T', ' '), a.type, a.detail, a.by])].map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
      case 'exportJson': return download('skillmatrix-backup-' + isoDay(new Date()) + '.json', JSON.stringify(S, null, 2), 'application/json');
      case 'saveSettings':
        S.org.name = $('#orgName').value.trim() || S.org.name;
        document.querySelectorAll('[data-scale]').forEach(i => { const s = S.scale.find(x => x.level === +i.dataset.scale); if (s && i.value.trim()) s.label = i.value.trim(); });
        log('settings', 'Updated organisation settings'); save(); render(); return toast('Settings saved');
      case 'resetSample':
        if (!t.dataset.armed) { t.dataset.armed = 1; t.textContent = 'Click again — this replaces all data'; return; }
        S = migrate(clone(window.SM_SAMPLE)); save(); render(); return toast('Sample data loaded');
      case 'resetBlank':
        if (!t.dataset.armed) { t.dataset.armed = 1; t.textContent = 'Click again — this deletes all data'; return; }
        S = migrate({ version: 2, org: { name: 'My organisation' }, scale: S.scale, people: [], equipment: [], ratings: {}, courses: [], records: {}, audit: [], roles: [], user: '' });
        save(); location.hash = '#/people'; render(); return toast('Started a blank matrix. Add people first.');
    }
  });
  document.addEventListener('input', ev => {
    if (ev.target.id === 'mq') { ui.q = ev.target.value; const pos = ev.target.selectionStart; render(); const i = $('#mq'); i.focus(); i.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', ev => {
    const t = ev.target;
    if (t.id === 'marea') { ui.area = t.value; render(); }
    if (t.id === 'mperson') { ui.person = t.value; history.replaceState(null, '', '#/matrix'); render(); }
    if (t.id === 'auditType') { ui.auditType = t.value; render(); }
    if (t.id === 'evPerson') { ui.evPerson = t.value; history.replaceState(null, '', '#/evidence'); render(); }
    if (t.id === 'userSel') { S.user = t.value; save(); toast('Changes will be recorded as ' + t.value); }
    if (t.id === 'importJson' && t.files[0]) {
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const d = JSON.parse(rd.result);
          if (!d.people || !d.equipment || !d.ratings) throw new Error('bad');
          S = migrate(d); log('settings', 'Imported backup'); save(); render(); toast('Backup imported');
        } catch (e) { toast('That file isn\'t a SkillMatrix backup'); }
      };
      rd.readAsText(t.files[0]);
    }
  });
  window.addEventListener('hashchange', render);
  if (!S.user && S.people[0]) S.user = S.people[0].name;
  render();
})();
