// debuglab.js — engineering-practice simulators for lesson 10:
//   mountBisect   : find the commit that broke the build, like `git bisect`
//   mountIncident : investigate a production incident with logs, metrics, deploys and a code diff
import { el } from './workbench.js';

// ------------------------------------------------------------------------------------------
// 1. Bisect lab
// ------------------------------------------------------------------------------------------
const COMMITS = [
  ['Initial cart and pricing', 'maya'], ['Add product search', 'li'], ['Fix typo in footer', 'maya'], ['Add coupon support', 'sam'],
  ['Update dependencies', 'bot'], ['Add order history page', 'li'], ['Improve search ranking', 'li'], ['Refactor tax helpers', 'sam'],
  ['Add dark mode toggle', 'maya'], ['Speed up price math', 'sam'], ['Round totals earlier', 'sam'], ['Update README', 'maya'],
  ['Add Spanish translations', 'li'], ['Fix button alignment', 'maya'], ['Upgrade logging library', 'bot'], ['Add gift wrap option', 'li'],
];
const hash = (i) => ((i * 2654435761) >>> 0).toString(16).padStart(8, '0').slice(0, 7);

export function mountBisect(root, { onSolved = () => {} }) {
  let culprit, status, runs, selected, solved;
  const info = el('div', { class: 'bisect__info' });
  const list = el('div', { class: 'bisect' });
  const detail = el('div', { class: 'bisect__detail' });
  const newBtn = el('button', { class: 'link-btn', type: 'button' }, 'new bug (start over)');
  const hintBtn = el('button', { class: 'link-btn', type: 'button' }, 'hint: which commit should I test next?');
  const bar = el('div', { class: 'bar' }); bar.append(hintBtn, newBtn);
  root.append(info, list, detail, bar);

  function start() {
    culprit = 4 + Math.floor(Math.random() * 11);      // index 4..14: first commit where the tests fail
    status = COMMITS.map(() => '?'); runs = 0; selected = null; solved = false;
    draw(); detail.replaceChildren(el('div', { class: 'muted' }, 'Click a commit to inspect it. The newest commit (bottom) is broken; the oldest (top) was fine.'));
  }
  const bounds = () => {                                // newest known-good and oldest known-bad so far
    let good = -1, bad = COMMITS.length;
    status.forEach((s, i) => { if (s === 'ok' && i > good) good = i; if (s === 'fail' && i < bad) bad = i; });
    return { good, bad };
  };
  function draw(highlight = -1) {
    info.textContent = 'Test runs used: ' + runs + '   ·   a perfect binary search needs at most ' + Math.ceil(Math.log2(COMMITS.length)) + '.';
    list.replaceChildren();
    COMMITS.forEach(([msg, who], i) => {
      const row = el('div', { class: 'bisect__row' + (selected === i ? ' is-sel' : '') + (highlight === i ? ' is-hint' : ''), role: 'button', tabindex: '0', 'data-i': String(i) });
      const mark = status[i] === 'ok' ? '✓' : status[i] === 'fail' ? '✗' : '?';
      row.append(el('span', { class: 'bisect__mark bisect__mark--' + status[i] }, mark), el('span', { class: 'bisect__hash' }, hash(i + 1)),
        el('span', { class: 'bisect__msg' }, msg), el('span', { class: 'bisect__who' }, who + ' · day ' + (i + 1)));
      const pick = () => { selected = i; draw(); showDetail(i); };
      row.addEventListener('click', pick);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      list.append(row);
    });
  }
  function showDetail(i) {
    detail.replaceChildren();
    detail.append(el('div', { class: 'label' }, 'Commit ' + hash(i + 1) + ': ' + COMMITS[i][0]));
    const run = el('button', { class: 'btn', type: 'button' }, 'Run the tests on this commit');
    const blame = el('button', { class: 'btn btn--alt', type: 'button' }, 'This is the FIRST bad commit');
    const row = el('div', { class: 'bar' }); row.append(run, blame);
    const out = el('pre', { class: 'raw' });
    if (status[i] !== '?') out.textContent = status[i] === 'ok' ? 'PASS  checkout total = 107.90' : 'FAIL  checkout total: expected 107.90, got 108.00';
    detail.append(row, out);
    run.addEventListener('click', () => {
      if (solved) return;
      const bad = i >= culprit;
      if (status[i] === '?') runs++;
      status[i] = bad ? 'fail' : 'ok';
      out.textContent = bad ? 'FAIL  checkout total: expected 107.90, got 108.00' : 'PASS  checkout total = 107.90';
      draw(); // keep selection
    });
    blame.addEventListener('click', () => {
      if (solved) return;
      const prevOk = i === 0 || status[i - 1] === 'ok';
      if (status[i] !== 'fail' || !prevOk) {
        out.textContent = 'Not proven yet. To blame a commit you must show that it FAILS and that the commit just before it PASSES. Test both.';
        return;
      }
      if (i !== culprit) { out.textContent = 'Hmm: the results contradict that (tests are deterministic). Re-read the ✓ and ✗ marks.'; return; }
      solved = true; draw();
      const best = Math.ceil(Math.log2(COMMITS.length));
      out.textContent = '✓ Found it: commit ' + hash(i + 1) + ' "' + COMMITS[i][0] + '" by ' + COMMITS[i][1] + '.\nYou used ' + runs + ' test run' + (runs === 1 ? '' : 's') +
        (runs <= best ? '. That is optimal.' : '. Binary search would have needed at most ' + best + '.') +
        '\nWith 1,000 commits it would still take only about 10 runs.';
      onSolved();
    });
  }
  newBtn.addEventListener('click', start);
  hintBtn.addEventListener('click', () => {
    const { good, bad } = bounds();
    if (bad - good <= 1) { draw(); return; }
    draw(Math.floor((good + bad) / 2));
  });
  start();
}

// ------------------------------------------------------------------------------------------
// 2. Incident lab
// ------------------------------------------------------------------------------------------
// A tiny seeded random generator, so every learner sees the same incident.
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const pad = (n) => String(n).padStart(2, '0');
const stamp = (totalMin, sec) => pad(Math.floor(totalMin / 60)) + ':' + pad(totalMin % 60) + ':' + pad(sec);

function buildIncident() {
  const rand = rng(20261117);
  const pick = (items, weights) => { let r = rand() * weights.reduce((a, b) => a + b, 0); for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; } return items[0]; };
  const logs = [];
  for (let m = 13 * 60 + 50; m < 14 * 60 + 20; m++) {                   // 13:50 .. 14:19, five sampled lines per minute
    for (let k = 0; k < 5; k++) {
      const route = pick(['/checkout', '/cart', '/search'], [55, 25, 20]);
      const region = pick(['US', 'EU', 'APAC'], [60, 30, 10]);
      const coupon = pick([null, 'SAVE10', 'welcome', ' FREE5 '], [62, 20, 12, 6]);
      const version = m < 14 * 60 ? 'v2.40' : (m < 14 * 60 + 2 && rand() < 0.5 ? 'v2.40' : 'v2.41');
      let level = 'info', msg = route === '/checkout' ? 'checkout ok total=$' + (20 + Math.floor(rand() * 180)) + '.' + pad(Math.floor(rand() * 100)) : route === '/cart' ? 'cart updated' : 'search ok results=' + Math.floor(rand() * 40);
      if (route === '/checkout' && version === 'v2.41' && coupon === null) {
        level = 'error'; msg = "TypeError: Cannot read properties of null (reading 'replace') at normalizeCoupon (pricing.js:41)";
      } else if (region === 'EU' && rand() < 0.22) {
        level = 'warn'; msg = 'payment-gateway slow response ' + (1.4 + rand()).toFixed(1) + 's';      // a red herring: slow but fine
      } else if (m < 14 * 60 && rand() < 0.015) {
        level = 'error'; msg = 'ECONNRESET talking to cache (retry succeeded)';                          // another harmless red herring
      }
      logs.push({ t: stamp(m, Math.floor(rand() * 60)), level, route, region, coupon: coupon === null ? 'null' : coupon.trim() === coupon ? coupon : '"' + coupon + '"', version, msg });
    }
  }
  logs.sort((a, b) => (a.t < b.t ? -1 : 1));
  // per-minute metrics 13:30 .. 14:29
  const metrics = [];
  for (let m = 13 * 60 + 30; m < 14 * 60 + 30; m++) {
    const rate = m < 14 * 60 ? 0.004 + rand() * 0.004 : m === 14 * 60 ? 0.11 : m === 14 * 60 + 1 ? 0.24 : 0.37 + rand() * 0.03;
    metrics.push({ m, rpm: Math.round(40 + rand() * 8), rate });
  }
  return { logs, metrics };
}

const DEPLOYS = [
  { t: '13:12', v: 'v2.40', by: 'sam', note: 'Update footer links (#479)' },
  { t: '14:00', v: 'v2.41', by: 'li', note: 'Support coupon codes with spaces (#482)' },
];
const DIFF = [
  ' // pricing.js', ' export function normalizeCoupon(coupon) {',
  '-  const code = coupon.trim().toUpperCase();',
  '+  const code = coupon.replace(/\\s/g, "").toUpperCase();', '   return code;', ' }', '',
  ' // checkout.js', ' const code = normalizeCoupon(order.coupon);', ' const discount = lookupDiscount(code);',
  '', ' // tests: pricing.test.js (unchanged by this PR)', '   test("trims spaces around a coupon", ...)', '   test("uppercases a coupon", ...)',
];

export function mountIncident(root, { onSolved = () => {} }) {
  const data = buildIncident();
  const seen = new Set(['logs']);
  const tabs = el('div', { class: 'tabs' });
  const panel = el('div', { class: 'incident__panel' });
  const alert = el('div', { class: 'status status--bad' }, '🚨 ALERT 14:03 · checkout error rate is 38% (normal: under 1%). Customers cannot pay. You are on call.');
  root.append(alert, tabs, panel);
  const defs = [['logs', 'Logs'], ['metrics', 'Metrics'], ['deploys', 'Deploys'], ['diff', 'Code change'], ['diagnose', 'Diagnose']];
  const buttons = {};
  defs.forEach(([id, label]) => {
    const b = el('button', { class: 'tab', type: 'button' }, label); buttons[id] = b;
    b.addEventListener('click', () => show(id)); tabs.append(b);
  });

  function show(id) {
    seen.add(id);
    for (const [k, b] of Object.entries(buttons)) b.classList.toggle('is-on', k === id);
    panel.replaceChildren();
    ({ logs: drawLogs, metrics: drawMetrics, deploys: drawDeploys, diff: drawDiff, diagnose: drawDiagnose })[id]();
  }

  // ----- logs with filters and "group by" -----
  function drawLogs() {
    const level = el('select', { 'aria-label': 'Level' }); ['any level', 'error', 'warn', 'info'].forEach((l) => level.append(el('option', { value: l }, l)));
    const text = el('input', { class: 'ex__url', type: 'text', placeholder: 'search text (message, route, region, coupon, version)', spellcheck: 'false', 'aria-label': 'Search' });
    const filters = el('div', { class: 'reqline' }); filters.append(level, text);
    const group = el('select', { 'aria-label': 'Group by' }); ['(no grouping)', 'region', 'route', 'coupon', 'version'].forEach((g) => group.append(el('option', { value: g }, g)));
    const groupRow = el('div', { class: 'bar' }); groupRow.append(el('span', {}, 'Group by field:'), group);
    const grouped = el('div'); const table = el('div', { class: 'logs' });
    panel.append(el('p', { class: 'muted' }, 'Sampled logs from 13:50 to 14:20 (about 1 in 20 requests). Filter them, then group by a field to see which kind of request fails.'), filters, groupRow, grouped, table);
    const matches = (l) => !text.value.trim() || (l.msg + ' ' + l.route + ' ' + l.region + ' ' + l.coupon + ' ' + l.version).toLowerCase().includes(text.value.trim().toLowerCase());
    function refresh() {
      const inText = data.logs.filter(matches);
      grouped.replaceChildren();
      if (group.value !== '(no grouping)') {
        const g = {}; inText.forEach((l) => { const k = l[group.value]; g[k] = g[k] || { n: 0, e: 0 }; g[k].n++; if (l.level === 'error') g[k].e++; });
        const t = el('table', { class: 'looptable' }); const h = el('tr'); ['value', 'requests', 'errors', 'error rate'].forEach((c) => h.append(el('th', {}, c))); t.append(h);
        Object.entries(g).sort((a, b) => b[1].e / b[1].n - a[1].e / a[1].n).forEach(([k, v]) => {
          const tr = el('tr'); tr.append(el('td', {}, k), el('td', {}, String(v.n)), el('td', {}, String(v.e)), el('td', {}, Math.round(v.e / v.n * 100) + '%')); t.append(tr);
        });
        grouped.append(t);
      }
      const rows = inText.filter((l) => level.value === 'any level' || l.level === level.value);
      table.replaceChildren(el('div', { class: 'muted' }, rows.length + ' of ' + data.logs.length + ' lines'));
      rows.slice(0, 40).forEach((l) => {
        const line = el('div', { class: 'logline logline--' + l.level });
        line.append(el('span', { class: 'logline__t' }, l.t), el('span', { class: 'logline__lvl' }, l.level), el('span', {}, l.route + ' ' + l.region + ' coupon=' + l.coupon + ' ' + l.version + '  ' + l.msg));
        table.append(line);
      });
      if (rows.length > 40) table.append(el('div', { class: 'muted' }, 'First 40 shown. Narrow the filter.'));
    }
    [level, text, group].forEach((n) => n.addEventListener('input', refresh));
    refresh();
  }

  // ----- metrics chart -----
  function drawMetrics() {
    const W = 520, H = 190, L = 34, B = 24, T = 12;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', '100%'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Error rate per minute');
    const n = data.metrics.length; const x = (i) => L + (i / (n - 1)) * (W - L - 8); const y = (v) => T + (1 - v / 0.45) * (H - T - B);
    const add = (tag, attrs, text) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text) e.textContent = text; svg.append(e); };
    [0, 0.1, 0.2, 0.3, 0.4].forEach((v) => { add('line', { x1: L, x2: W - 8, y1: y(v), y2: y(v), stroke: '#e3d6b8' }); add('text', { x: 2, y: y(v) + 4, 'font-size': 10, fill: '#5b4e40' }, Math.round(v * 100) + '%'); });
    add('polyline', { points: data.metrics.map((d, i) => x(i) + ',' + y(d.rate)).join(' '), fill: 'none', stroke: '#b3402f', 'stroke-width': 2.5 });
    const di = data.metrics.findIndex((d) => d.m === 14 * 60);
    add('line', { x1: x(di), x2: x(di), y1: T, y2: H - B, stroke: '#2b2118', 'stroke-dasharray': '4 3' });
    add('text', { x: x(di) + 4, y: T + 10, 'font-size': 10.5, fill: '#2b2118' }, 'deploy v2.41');
    ['13:30', '13:45', '14:00', '14:15'].forEach((lab, k) => add('text', { x: x(k * 15), y: H - 6, 'font-size': 10.5, fill: '#5b4e40', 'text-anchor': 'middle' }, lab));
    const wrap = el('div', { class: 'graph' }); wrap.append(svg);
    panel.append(el('p', { class: 'muted' }, 'Checkout error rate per minute, with the deploy marked. Requests per minute stayed flat at about 40 to 48 the whole time.'), wrap);
  }

  function drawDeploys() {
    panel.append(el('p', { class: 'muted' }, 'Recent deploys to production:'));
    DEPLOYS.forEach((d) => { const row = el('div', { class: 'logline logline--info' }); row.append(el('span', { class: 'logline__t' }, d.t), el('span', { class: 'logline__lvl' }, d.v), el('span', {}, d.note + '  (by ' + d.by + ')')); panel.append(row); });
    panel.append(el('p', { class: 'muted' }, 'The first rollout went to half the servers at 14:00 and to all of them at 14:02.'));
  }

  function drawDiff() {
    const pre = el('pre', { class: 'raw diff' });
    DIFF.forEach((l) => pre.append(el('div', { class: l[0] === '+' ? 'diff__add' : l[0] === '-' ? 'diff__del' : '' }, l || ' ')));
    panel.append(el('p', { class: 'muted' }, 'The change that shipped in v2.41 (#482, "Support coupon codes with spaces"):'), pre);
  }

  function drawDiagnose() {
    const need = ['logs', 'metrics', 'deploys', 'diff'].filter((t) => !seen.has(t));
    const questions = [
      { q: '1. What is the root cause?', opts: [
        'The payment provider is slow in the EU region', 'v2.41 crashes on checkouts that have no coupon (the coupon is null)', 'The database ran out of connections', 'A traffic spike overloaded the servers'], ok: 1,
        why: 'Every error is a TypeError in normalizeCoupon, and every failing request has coupon=null. The new code calls coupon.replace on null. The EU slowness is a harmless red herring that existed before.' },
      { q: '2. What do you do FIRST, right now?', opts: [
        'Restart all the servers', 'Roll back to v2.40 (stop the damage), then investigate', 'Add more servers', 'Block EU users'], ok: 1,
        why: 'Mitigate first: a rollback undoes the one thing that changed and takes minutes. A restart cannot fix a bug in the code, and more servers just fail faster.' },
      { q: '3. What best PREVENTS this from happening again?', opts: [
        'Add a regression test for a checkout with no coupon, handle null explicitly, and require tests in code review', 'Ask developers to be more careful', 'Only deploy on Fridays', 'Raise the server timeouts'], ok: 0,
        why: 'Humans will always make mistakes, so the system must catch them: a test for the missing case, a guard in the code, and a review rule. "Be more careful" is not a fix.' },
    ];
    const answers = [];
    panel.append(el('p', { class: 'muted' }, need.length ? 'Look at the evidence before you decide. Still unopened: ' + need.map((n) => ({ logs: 'Logs', metrics: 'Metrics', deploys: 'Deploys', diff: 'Code change' })[n]).join(', ') + '.' : 'You have seen all the evidence. Make the call.'));
    const result = el('div');
    questions.forEach((qq, qi) => {
      const box = el('div', { class: 'q' }); box.append(el('div', { class: 'label' }, qq.q));
      const opts = el('div', { class: 'q__opts' });
      qq.opts.forEach((o, oi) => { const l = el('label', { class: 'q__opt q__opt--radio' }); const r = el('input', { type: 'radio', name: 'dq' + qi }); r.addEventListener('change', () => { answers[qi] = oi; }); l.append(r, ' ' + o); opts.append(l); });
      box.append(opts); panel.append(box);
    });
    const submit = el('button', { class: 'btn', type: 'button' }, 'Submit my diagnosis');
    submit.disabled = need.length > 0;
    panel.append(submit, result);
    submit.addEventListener('click', () => {
      result.replaceChildren();
      let all = true;
      questions.forEach((qq, qi) => {
        const ok = answers[qi] === qq.ok; if (!ok) all = false;
        result.append(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, (ok ? '✓ ' : '✗ ') + qq.q.replace(/^\d\. /, '') + (ok ? '' : ' Not quite.')), el('p', { class: 'muted' }, ok ? qq.why : 'Check the evidence again.'));
      });
      if (all) { result.append(el('div', { class: 'status status--good' }, 'Incident resolved. In real life you would now write a blameless postmortem: the timeline, the cause, and the action items above.')); onSolved(); }
    });
  }
  show('logs');
}
