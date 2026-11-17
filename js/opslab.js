// opslab.js — three simulators for lesson 13 (reliability and operations):
//   mountDeployLab      compare deployment strategies when a release has a bug
//   mountResilienceLab  write timeout / retry / circuit-breaker code and test it against failures
//   mountAlertLab       tune an alert: catch real incidents without waking people for noise
// The pure model functions are exported so they can be tested without a browser.
import { el } from './workbench.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, text = '') => { const n = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); if (text) n.textContent = text; return n; };

// ---------------------------------------------------------------------------------------------
// 1. Deployment strategies
// ---------------------------------------------------------------------------------------------
export const STRATEGIES = {
  bigbang:   { label: 'Big bang (everything at once)', rollback: 180 },
  rolling:   { label: 'Rolling (a few servers at a time)', rollback: 150 },
  bluegreen: { label: 'Blue / green (switch all, instant switch back)', rollback: 30 },
  canary:    { label: 'Canary (a small slice first)', rollback: 20 },
  flag:      { label: 'Feature flag (1% → 10% → 50% → 100%)', rollback: 5 },
};
const TRAFFIC = 100;            // requests per second
const VISIBLE = 0.02;           // monitoring only notices an error rate above 2%

/** simulateDeploy({ strategy, canary (0..1), auto, severity: 'obvious'|'subtle' }) */
export function simulateDeploy({ strategy, canary = 0.05, auto, severity }) {
  const f = severity === 'obvious' ? 0.4 : 0.03;                 // how many requests the bad version breaks
  const share = (t) => {                                          // fraction of traffic on the new version
    switch (strategy) {
      case 'bigbang': case 'bluegreen': return 1;
      case 'rolling': return Math.min(1, t / 300);
      case 'canary': return t < 300 ? canary : Math.min(1, canary + ((t - 300) / 180) * (1 - canary));
      default: return t < 120 ? 0.01 : t < 240 ? 0.1 : t < 360 ? 0.5 : 1;
    }
  };
  let tVisible = null;
  for (let t = 0; t <= 1800; t++) if (share(t) * f >= VISIBLE) { tVisible = t; break; }
  const delay = auto ? 60 : 300;                                  // automatic checks react in a minute; humans in five
  const tDetect = tVisible === null ? Infinity : tVisible + delay;
  const rollback = STRATEGIES[strategy].rollback;
  const tRecover = tDetect + rollback;
  const rateAt = (t) => {
    if (t < tDetect) return share(t) * f;
    if (t < tRecover) return share(tDetect) * f * (1 - (t - tDetect) / rollback);
    return 0;
  };
  let failed = 0, peak = 0;
  for (let t = 0; t < 1800; t++) { const r = rateAt(t); failed += TRAFFIC * r; peak = Math.max(peak, r); }
  return { failed: Math.round(failed), peak, tDetect, tRecover, rateAt, never: tDetect === Infinity };
}

export function mountDeployLab(root) {
  const strategy = el('select', { 'aria-label': 'Strategy' }); Object.entries(STRATEGIES).forEach(([k, v]) => strategy.append(el('option', { value: k }, v.label)));
  const canary = el('input', { type: 'range', min: '1', max: '50', step: '1', value: '5' }); const canaryVal = el('b');
  const auto = el('input', { type: 'checkbox' });
  const severity = el('select', { 'aria-label': 'Bug severity' }); [['obvious', 'Obvious bug: breaks 40% of requests'], ['subtle', 'Subtle bug: breaks 3% of requests']].forEach(([v, l]) => severity.append(el('option', { value: v }, l)));
  const controls = el('div', { class: 'syslab__controls' });
  const row = (label, node, extra) => { const r = el('label', { class: 'syslab__row' }); r.append(el('span', {}, label), node); if (extra) r.append(extra); controls.append(r); return r; };
  row('Strategy', strategy); const canaryRow = row('Canary size', canary, canaryVal); row('Automatic health checks and rollback', auto); row('The bug in this release', severity);
  const chart = el('div', { class: 'graph' }); const metrics = el('div', { class: 'syslab__metrics' }); const compare = el('div');
  root.append(controls, el('div', { class: 'label' }, 'Error rate over time (the new version is released at 0:00)'), chart, metrics, el('div', { class: 'label' }, 'Same bug, every strategy: failed requests'), compare);

  function update() {
    const cfg = { strategy: strategy.value, canary: Number(canary.value) / 100, auto: auto.checked, severity: severity.value };
    canaryVal.textContent = canary.value + '%'; canaryRow.hidden = cfg.strategy !== 'canary';
    const r = simulateDeploy(cfg);
    // chart
    const W = 520, H = 170, L = 34, B = 22, T = 8, X = 900; const x = (t) => L + (t / X) * (W - L - 8); const y = (v) => T + (1 - v / 0.45) * (H - T - B);
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Error rate over time' });
    [0, 0.1, 0.2, 0.3, 0.4].forEach((v) => { svg.append(svgEl('line', { x1: L, x2: W - 8, y1: y(v), y2: y(v), stroke: '#e3d6b8' }), svgEl('text', { x: 2, y: y(v) + 4, 'font-size': 10, fill: '#5b4e40' }, Math.round(v * 100) + '%')); });
    svg.append(svgEl('line', { x1: L, x2: W - 8, y1: y(VISIBLE), y2: y(VISIBLE), stroke: '#b07b12', 'stroke-dasharray': '3 3' }), svgEl('text', { x: W - 10, y: y(VISIBLE) - 3, 'font-size': 9.5, fill: '#b07b12', 'text-anchor': 'end' }, 'monitoring notices (2%)'));
    const pts = []; for (let t = 0; t <= X; t += 5) pts.push(x(t) + ',' + y(r.rateAt(t)));
    svg.append(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: '#b3402f', 'stroke-width': 2.5 }));
    if (!r.never && r.tDetect < X) svg.append(svgEl('line', { x1: x(r.tDetect), x2: x(r.tDetect), y1: T, y2: H - B, stroke: '#2b2118', 'stroke-dasharray': '4 3' }), svgEl('text', { x: x(r.tDetect) + 3, y: T + 10, 'font-size': 10, fill: '#2b2118' }, 'noticed'));
    [0, 300, 600, 900].forEach((t) => svg.append(svgEl('text', { x: x(t), y: H - 6, 'font-size': 10, fill: '#5b4e40', 'text-anchor': 'middle' }, Math.floor(t / 60) + ' min')));
    chart.replaceChildren(svg);
    metrics.replaceChildren();
    const line = (a, b, cls) => { const d = el('div', { class: 'syslab__metric' }); d.append(el('span', {}, a), el('b', { class: cls || '' }, b)); metrics.append(d); };
    line('Failed requests', r.failed.toLocaleString('en-US'), r.failed > 5000 ? 'bad' : r.failed > 800 ? 'warn' : 'ok');
    line('Worst error rate', Math.round(r.peak * 1000) / 10 + '%', r.peak > 0.2 ? 'bad' : r.peak > 0.05 ? 'warn' : 'ok');
    line('Noticed after', r.never ? 'never' : Math.round(r.tDetect) + ' s', r.never ? 'bad' : '');
    line('Back to normal after', r.never ? 'never (bad version stays)' : Math.round(r.tRecover) + ' s');
    // comparison table
    const t = el('table', { class: 'looptable' }); const h = el('tr'); ['strategy', 'failed requests'].forEach((c) => h.append(el('th', {}, c))); t.append(h);
    Object.entries(STRATEGIES).forEach(([k, v]) => { const s = simulateDeploy({ ...cfg, strategy: k }); const tr = el('tr'); tr.append(el('td', {}, v.label.split(' (')[0] + (k === cfg.strategy ? '  ◀' : '')), el('td', {}, s.never ? 'unbounded' : s.failed.toLocaleString('en-US'))); t.append(tr); });
    compare.replaceChildren(t);
  }
  [strategy, canary, auto, severity].forEach((n) => n.addEventListener('input', update));
  update();
}

// ---------------------------------------------------------------------------------------------
// 2. Resilience lab
// ---------------------------------------------------------------------------------------------
const RES_WORKER_URL = new URL('./reslabworker.js', import.meta.url).href;

function runResilience(code) {
  return new Promise((resolve) => {
    const worker = new Worker(RES_WORKER_URL); let done = false;
    const finish = (r) => { if (done) return; done = true; clearTimeout(timer); worker.terminate(); resolve(r); };
    const timer = setTimeout(() => finish({ ok: false, error: 'The test bench gave up after 40 seconds: something takes far too long (an endless wait or loop?).' }), 25000);
    worker.onmessage = (e) => finish(e.data); worker.onerror = (e) => finish({ ok: false, error: e.message || 'worker error' });
    worker.postMessage({ code });
  });
}

export function mountResilienceLab(root, { starter, tasks = [], tasksEl = null, onPass = () => {}, rows = 18 }) {
  const editor = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'resilientCall code' });
  editor.value = starter;
  const btn = el('button', { class: 'btn', type: 'button' }, 'Run the failure scenarios  (Ctrl/⌘ + Enter)');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset code'); const status = el('span');
  const bar = el('div', { class: 'bar' }); bar.append(btn, resetBtn, status);
  const out = el('div');
  root.append(editor, bar, el('div', { class: 'label' }, 'Results (the same traffic is replayed against each failure)'), out);
  const taskItems = tasks.map((t) => { const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, t.label)); return li; });
  if (tasksEl && tasks.length) { const ul = el('ul', { class: 'tasks' }); ul.append(...taskItems); tasksEl.append(ul); }

  let passed = false, runId = 0;
  async function run() {
    const id = ++runId; btn.disabled = true; status.textContent = 'running 5 scenarios (a few seconds)…';
    const r = await runResilience(editor.value);
    if (id !== runId) return; btn.disabled = false; status.textContent = '';
    out.replaceChildren();
    if (!r.ok) { out.append(el('div', { class: 'status status--bad' }, r.error)); return; }
    const t = el('table', { class: 'looptable' }); const h = el('tr');
    ['scenario', 'succeeded', 'fallback', 'errors', 'avg ms', 'p95 ms', 'calls to dependency'].forEach((c) => h.append(el('th', {}, c))); t.append(h);
    const by = {};
    for (const s of r.results) {
      by[s.id] = s; const tr = el('tr');
      if (s.error) { tr.append(el('td', {}, s.name), el('td', { colspan: '6' }, s.error)); t.append(tr); continue; }
      [s.name, s.ok + '/' + s.n, String(s.fallback), String(s.errors), Math.round(s.avgMs), Math.round(s.p95Ms), s.calls + ' (' + (s.calls / s.n).toFixed(1) + ' per request)'].forEach((v) => tr.append(el('td', {}, String(v))));
      t.append(tr);
    }
    const wrap = el('div', { class: 'sqlwrap' }); wrap.append(t); out.append(wrap);
    let all = tasks.length > 0;
    tasks.forEach((tk, i) => { let ok = false; try { ok = !!tk.check(by); } catch { ok = false; } taskItems[i].classList.toggle('done', ok); if (!ok) all = false; });
    if (all && !passed) { passed = true; onPass(); }
  }
  btn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { editor.value = starter; });
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end'); }
  });
}

// ---------------------------------------------------------------------------------------------
// 3. Alert tuning
// ---------------------------------------------------------------------------------------------
export const INCIDENTS = [{ name: 'Incident 1', start: 190, end: 215, maxTtd: 5 }, { name: 'Incident 2', start: 940, end: 980, maxTtd: 10 }];

/** A day (1,440 minutes) of error-rate data in percent, with two real incidents and some harmless blips. */
export function makeDay() {
  let s = 4242; const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const noise = () => (rand() + rand() + rand() - 1.5) * 0.3;
  const data = Array.from({ length: 1440 }, () => Math.max(0.05, 0.3 + noise()));
  const set = (a, b, v) => { for (let m = a; m <= b; m++) data[m] = v + noise(); };
  set(80, 81, 7); set(300, 300, 8); set(455, 456, 6.5); set(610, 612, 5.5); set(1200, 1201, 9);   // harmless blips
  set(190, 215, 12); set(940, 980, 4);                                                              // the real incidents
  return data;
}

/** evaluateAlerts(data, threshold %, minutes) → pages, detection times, false pages */
export function evaluateAlerts(data, threshold, minutes) {
  const pages = []; let run = 0, firing = false;
  data.forEach((v, m) => {
    if (v > threshold) { run++; if (run >= minutes && !firing) { firing = true; pages.push(m); } } else { run = 0; firing = false; }
  });
  const detected = INCIDENTS.map((inc) => { const p = pages.find((m) => m >= inc.start && m <= inc.end); return p === undefined ? null : p - inc.start; });
  const falsePages = pages.filter((m) => !INCIDENTS.some((inc) => m >= inc.start && m <= inc.end)).length;
  return { pages, detected, falsePages };
}

export function mountAlertLab(root, { tasks = [], tasksEl = null, onPass = () => {} }) {
  const data = makeDay();
  const threshold = el('input', { type: 'range', min: '0.5', max: '15', step: '0.5', value: '1' }); const thVal = el('b');
  const minutes = el('input', { type: 'range', min: '1', max: '15', step: '1', value: '1' }); const minVal = el('b');
  const controls = el('div', { class: 'syslab__controls' });
  const row = (label, node, v) => { const r = el('label', { class: 'syslab__row' }); r.append(el('span', {}, label), node, v); controls.append(r); };
  row('Alert when the error rate is above', threshold, thVal); row('…for this many minutes in a row', minutes, minVal);
  const chart = el('div', { class: 'graph' }); const stats = el('div', { class: 'syslab__metrics' }); const list = el('ul', { class: 'tasks' });
  root.append(controls, el('div', { class: 'label' }, 'A day of error rate (the red bands are the REAL incidents; 🔔 is a page to the on-call engineer)'), chart, stats);
  const items = tasks.map((t) => { const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {})); list.append(li); return li; });
  if (tasksEl && tasks.length) tasksEl.append(list); else if (tasks.length) root.append(list);
  let passed = false;

  function update() {
    const th = Number(threshold.value), n = Number(minutes.value); thVal.textContent = th + '%'; minVal.textContent = n + (n === 1 ? ' min' : ' min');
    const ev = evaluateAlerts(data, th, n);
    const W = 520, H = 170, L = 34, B = 22, T = 8; const x = (m) => L + (m / 1439) * (W - L - 8); const y = (v) => T + (1 - Math.min(v, 15) / 15) * (H - T - B);
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Error rate over a day' });
    INCIDENTS.forEach((inc) => svg.append(svgEl('rect', { x: x(inc.start) - 1, y: T, width: Math.max(3, x(inc.end) - x(inc.start)), height: H - T - B, fill: 'rgba(179,64,47,.25)' })));
    [0, 5, 10, 15].forEach((v) => svg.append(svgEl('line', { x1: L, x2: W - 8, y1: y(v), y2: y(v), stroke: '#e3d6b8' }), svgEl('text', { x: 2, y: y(v) + 4, 'font-size': 10, fill: '#5b4e40' }, v + '%')));
    svg.append(svgEl('polyline', { points: data.map((v, m) => (m % 3 === 0 ? x(m) + ',' + y(v) : null)).filter(Boolean).join(' '), fill: 'none', stroke: '#2b2118', 'stroke-width': 1.2 }));
    svg.append(svgEl('line', { x1: L, x2: W - 8, y1: y(th), y2: y(th), stroke: '#b3402f', 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }));
    ev.pages.forEach((m) => svg.append(svgEl('text', { x: x(m), y: T + 12, 'font-size': 13, 'text-anchor': 'middle' }, '🔔')));
    ['00:00', '06:00', '12:00', '18:00'].forEach((lab, k) => svg.append(svgEl('text', { x: x(k * 360), y: H - 6, 'font-size': 10, fill: '#5b4e40', 'text-anchor': 'middle' }, lab)));
    chart.replaceChildren(svg);
    stats.replaceChildren();
    const line = (a, b, cls) => { const d = el('div', { class: 'syslab__metric' }); d.append(el('span', {}, a), el('b', { class: cls || '' }, b)); stats.append(d); };
    INCIDENTS.forEach((inc, i) => line(inc.name + ' detected', ev.detected[i] === null ? 'MISSED' : 'after ' + ev.detected[i] + ' min', ev.detected[i] === null ? 'bad' : 'ok'));
    line('False alarms (pages at harmless blips)', String(ev.falsePages), ev.falsePages > 1 ? 'bad' : ev.falsePages ? 'warn' : 'ok');
    line('Total pages today', String(ev.pages.length));
    let all = tasks.length > 0;
    tasks.forEach((t, i) => { const res = t.check(ev); items[i].classList.toggle('done', res.ok); items[i].lastChild.textContent = t.label + (res.note ? '  →  ' + res.note : ''); if (!res.ok) all = false; });
    if (all && !passed) { passed = true; onPass(); }
  }
  [threshold, minutes].forEach((n) => n.addEventListener('input', update));
  update();
}
