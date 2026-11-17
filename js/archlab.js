// archlab.js — tools for lesson 12 (architecture and system design):
//   simulate()          a small, honest "teaching model" of a web system under load
//   mountSystemLab()    build an architecture with sliders and toggles, see the bottleneck move
//   mountEstimation()   back-of-the-envelope estimation practice
// (The numbers are simplified on purpose: the SHAPE of the trade-offs is real, the constants are not.)
import { el } from './workbench.js';

// ---------------------------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------------------------
export const CACHE = { none: { hit: 0, cost: 0, label: 'no cache' }, small: { hit: 0.6, cost: 60, label: 'small cache (60% hits)' }, medium: { hit: 0.85, cost: 150, label: 'medium cache (85% hits)' }, large: { hit: 0.95, cost: 300, label: 'large cache (95% hits)' } };
const APP_UNITS_PER_SERVER = 400;      // dynamic requests one app server can process per second
const DB_UNITS = 800;                  // "work units" one database node can do per second (a read costs 1, a write costs 3)
const STATIC_SHARE = 0.5;              // half of all requests are images / scripts / styles
const P95_FACTOR = 2.2;                // typical ratio between the slow tail and the average

const shed = (u) => (u > 1 ? 1 - 1 / u : 0);                 // above 100% load, the excess is dropped (errors)
const slow = (u) => 1 / (1 - Math.min(u, 0.95));              // waiting time explodes as utilization approaches 100%

/** simulate({ rps, readShare, cdn, apps, cache, replicas, queue }) → metrics */
export function simulate(cfg) {
  const { rps, readShare, cdn, apps, cache, replicas, queue } = cfg;
  const hit = CACHE[cache].hit;
  const dynamic = rps * (1 - STATIC_SHARE);
  const staticAtOrigin = rps * STATIC_SHARE * (cdn ? 0.02 : 1);
  const appLoad = dynamic + staticAtOrigin * 0.25;
  const uApp = appLoad / (apps * APP_UNITS_PER_SERVER);

  const reads = dynamic * readShare, writes = dynamic * (1 - readShare);
  const dbReads = reads * (1 - hit), writeUnits = writes * 3;
  let uRead, uWrite;
  if (replicas > 0) { uRead = dbReads / (replicas * DB_UNITS); uWrite = writeUnits / DB_UNITS; }
  else { uRead = uWrite = (dbReads + writeUnits) / DB_UNITS; }

  const appShed = shed(uApp), readShed = shed(uRead), writeShed = shed(uWrite);
  const readOk = hit + (1 - hit) * (1 - readShed);
  const success = (1 - appShed) * (STATIC_SHARE + (1 - STATIC_SHARE) * (readShare * readOk + (1 - readShare) * (1 - writeShed)));
  const errorRate = Math.max(0, 1 - success);

  const appMs = 30 * slow(uApp);
  const readMs = appMs + hit * 2 + (1 - hit) * 15 * slow(uRead);
  const writeMs = appMs + (queue ? 5 : 25 * slow(uWrite));
  const dynamicMean = readShare * readMs + (1 - readShare) * writeMs;
  const p95 = dynamicMean * P95_FACTOR;

  const cost = apps * 120 + (cdn ? 100 : 0) + CACHE[cache].cost + 400 + replicas * 350 + (queue ? 80 : 0);
  const tiers = [
    { id: 'app', label: 'App servers', u: uApp },
    { id: 'dbread', label: replicas > 0 ? 'DB read replicas' : 'Database', u: uRead },
    { id: 'dbwrite', label: 'DB primary (writes)', u: uWrite },
  ];
  const worst = tiers.reduce((a, b) => (b.u > a.u ? b : a));
  return { uApp, uRead, uWrite, errorRate, p95, cost, bottleneck: worst.u > 0.85 ? worst : null, tiers, appLoad, dbReads, writeUnits };
}

// ---------------------------------------------------------------------------------------------
// The system lab UI
// ---------------------------------------------------------------------------------------------
const fmtMoney = (n) => '$' + n.toLocaleString('en-US');
const pct = (x) => (x * 100 < 0.1 && x > 0 ? '<0.1' : (x * 100).toFixed(x < 0.1 ? 1 : 0)) + '%';

export function mountSystemLab(root, { rps = 3000, readShare = 0.95, trafficSlider = true, start = {}, targets = null, onPass = () => {} }) {
  const cfg = { rps, readShare, cdn: false, apps: 2, cache: 'none', replicas: 0, queue: false, ...start };

  const controls = el('div', { class: 'syslab__controls' });
  const row = (label, node) => { const r = el('label', { class: 'syslab__row' }); r.append(el('span', {}, label), node); controls.append(r); return r; };
  const traffic = el('input', { type: 'range', min: '100', max: '10000', step: '100', value: String(cfg.rps) });
  const trafficVal = el('b', {}, '');
  if (trafficSlider) { const r = row('Traffic (requests/second)', traffic); r.append(trafficVal); }
  const cdn = el('input', { type: 'checkbox' }); row('CDN for images, scripts, styles ($100)', cdn);
  const apps = el('input', { type: 'range', min: '1', max: '20', step: '1', value: String(cfg.apps) }); const appsVal = el('b', {}); const appsRow = row('App servers ($120 each)', apps); appsRow.append(appsVal);
  const cache = el('select', { 'aria-label': 'Cache size' }); Object.entries(CACHE).forEach(([k, v]) => cache.append(el('option', { value: k }, v.label + (v.cost ? ' ($' + v.cost + ')' : ''))));
  row('Cache in front of the database', cache);
  const repl = el('input', { type: 'range', min: '0', max: '6', step: '1', value: '0' }); const replVal = el('b', {}); const replRow = row('Database read replicas ($350 each)', repl); replRow.append(replVal);
  const queue = el('input', { type: 'checkbox' }); row('Queue + workers for writes ($80)', queue);

  const diagram = el('div', { class: 'syslab__diagram' });
  const metrics = el('div', { class: 'syslab__metrics' });
  const checks = el('ul', { class: 'tasks' });
  root.append(controls, diagram, metrics);
  if (targets) root.append(el('div', { class: 'label' }, 'Your goals at ' + cfg.rps.toLocaleString('en-US') + ' requests/second'), checks);

  const targetItems = targets ? targets.map((t) => { const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {})); checks.append(li); return li; }) : [];
  let passed = false;

  function tierBox(title, sub, u) {
    const b = el('div', { class: 'tier' + (u !== undefined && u > 0.85 ? ' tier--hot' : '') });
    b.append(el('div', { class: 'tier__t' }, title), el('div', { class: 'tier__s' }, sub));
    if (u !== undefined) {
      const bar = el('div', { class: 'tier__bar' }); const fill = el('span'); fill.style.width = Math.min(100, u * 100) + '%';
      fill.className = u > 1 ? 'is-over' : u > 0.85 ? 'is-hot' : u > 0.6 ? 'is-warm' : 'is-ok'; bar.append(fill);
      b.append(bar, el('div', { class: 'tier__u' }, Math.round(u * 100) + '% busy'));
    }
    return b;
  }

  function update() {
    cfg.rps = Number(traffic.value); cfg.cdn = cdn.checked; cfg.apps = Number(apps.value); cfg.cache = cache.value; cfg.replicas = Number(repl.value); cfg.queue = queue.checked;
    trafficVal.textContent = cfg.rps.toLocaleString('en-US'); appsVal.textContent = String(cfg.apps); replVal.textContent = String(cfg.replicas);
    const r = simulate(cfg);
    diagram.replaceChildren(
      tierBox('Users', cfg.rps.toLocaleString('en-US') + ' req/s'),
      el('div', { class: 'tier__arrow' }, '→'),
      cfg.cdn ? tierBox('CDN', 'absorbs 98% of static') : tierBox('(no CDN)', 'static hits you'),
      el('div', { class: 'tier__arrow' }, '→'),
      tierBox('App ×' + cfg.apps, 'stateless', r.uApp),
      el('div', { class: 'tier__arrow' }, '→'),
      tierBox(CACHE[cfg.cache].hit ? 'Cache' : '(no cache)', CACHE[cfg.cache].hit ? Math.round(CACHE[cfg.cache].hit * 100) + '% of reads' : 'every read hits the DB'),
      el('div', { class: 'tier__arrow' }, '→'),
      tierBox(cfg.replicas ? 'Replicas ×' + cfg.replicas : 'Database', 'reads', r.uRead),
      tierBox(cfg.replicas || true ? 'Primary' : '', cfg.queue ? 'writes via queue' : 'writes', cfg.replicas ? r.uWrite : undefined),
    );
    const worst = r.bottleneck;
    metrics.replaceChildren();
    const line = (label, value, cls) => { const d = el('div', { class: 'syslab__metric' }); d.append(el('span', {}, label), el('b', { class: cls || '' }, value)); metrics.append(d); };
    line('p95 latency', Math.round(r.p95) + ' ms', r.p95 > 400 ? 'bad' : r.p95 > 250 ? 'warn' : 'ok');
    line('Errors', pct(r.errorRate), r.errorRate > 0.01 ? 'bad' : r.errorRate > 0.001 ? 'warn' : 'ok');
    line('Cost per month', fmtMoney(r.cost));
    const noCache = simulate({ ...cfg, cache: 'none' });
    line('If the cache died: errors', pct(noCache.errorRate), noCache.errorRate > 0.2 ? 'bad' : noCache.errorRate > 0.01 ? 'warn' : 'ok');
    metrics.append(el('div', { class: 'syslab__bottleneck' }, worst ? '⚠ Bottleneck: ' + worst.label + ' (' + Math.round(worst.u * 100) + '% busy). Adding capacity anywhere else will not help.' : '✓ No tier is above 85% busy.'));

    if (targets) {
      let all = true;
      targets.forEach((t, i) => {
        const res = t.check(cfg, r); const ok = res.ok; if (!ok) all = false;
        targetItems[i].classList.toggle('done', ok); targetItems[i].lastChild.textContent = t.label + (res.note ? '  →  ' + res.note : '');
      });
      if (all && !passed) { passed = true; onPass(); }
    }
  }
  [traffic, cdn, apps, cache, repl, queue].forEach((n) => n.addEventListener('input', update));
  cdn.checked = cfg.cdn; cache.value = cfg.cache; repl.value = String(cfg.replicas); queue.checked = cfg.queue; apps.value = String(cfg.apps); traffic.value = String(cfg.rps);
  update();
}

// ---------------------------------------------------------------------------------------------
// Estimation practice
// ---------------------------------------------------------------------------------------------
const SUFFIX = { k: 1e3, m: 1e6, b: 1e9, g: 1e9, t: 1e12, p: 1e15, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, pb: 1e15 };
/** "3.6k", "50 million", "2e6", "1,234" → number (or NaN) */
export function parseNumber(text) {
  const t = String(text).trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
  const m = /^(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*(k|m|b|g|t|p|kb|mb|gb|tb|pb|thousand|million|billion|trillion)?\b/.exec(t);
  if (!m) return NaN;
  const words = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
  return Number(m[1]) * (m[2] ? (words[m[2]] || SUFFIX[m[2]]) : 1);
}

export function mountEstimation(root, { questions, onPass = () => {} }) {
  const done = new Set(); let passed = false;
  questions.forEach((q, i) => {
    const card = el('div', { class: 'sqlcard' });
    const title = el('div', { class: 'sqlcard__q' });
    title.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, (i + 1) + '. ' + q.prompt));
    const input = el('input', { class: 'ex__url', type: 'text', placeholder: 'your estimate (' + q.unit + ')', 'aria-label': 'Estimate for question ' + (i + 1), spellcheck: 'false' });
    const btn = el('button', { class: 'btn', type: 'button' }, 'Check');
    const row = el('div', { class: 'reqline' }); row.append(input, btn);
    const out = el('div');
    card.append(title, row, out); root.append(card);
    const check = () => {
      const v = parseNumber(input.value);
      out.replaceChildren();
      if (!Number.isFinite(v) || v <= 0) { out.append(el('div', { class: 'status status--warn' }, 'Type a number, like 23000, 23k or 2.3e4.')); return; }
      const ratio = v / q.answer;
      const ok = ratio >= 1 / q.tolerance && ratio <= q.tolerance;
      out.append(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, ok ? '✓ Close enough! Estimation is about the order of magnitude.' : (ratio > 1 ? 'Too high' : 'Too low') + ' by about ' + (ratio > 1 ? ratio : 1 / ratio).toFixed(1) + '×. Try again.'));
      if (ok) { out.append(el('pre', { class: 'raw' }, q.work)); done.add(i); title.classList.add('done'); }
      if (done.size === questions.length && !passed) { passed = true; onPass(); }
    };
    btn.addEventListener('click', check); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
  });
}
