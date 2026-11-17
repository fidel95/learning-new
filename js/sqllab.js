// sqllab.js — interactive tools for lesson 8: SQL playground, SQL challenge cards,
// SQL-injection demo and the server lab (write route handlers, send requests, watch the database).
import { DbWorker } from './db.js';
import { el } from './workbench.js';

const MAX_ROWS = 50;

// ---------- shared: draw result tables ----------
function drawTable(columns, rows) {
  const t = el('table', { class: 'looptable sqltable' });
  const head = el('tr'); columns.forEach((c) => head.append(el('th', {}, c))); t.append(head);
  rows.slice(0, MAX_ROWS).forEach((r) => {
    const tr = el('tr'); r.forEach((v) => tr.append(el('td', {}, v === null ? 'NULL' : String(v)))); t.append(tr);
  });
  const wrap = el('div', { class: 'sqlwrap' }); wrap.append(t);
  if (rows.length > MAX_ROWS) wrap.append(el('div', { class: 'muted' }, 'Showing the first ' + MAX_ROWS + ' of ' + rows.length + ' rows.'));
  if (!rows.length) wrap.append(el('div', { class: 'muted' }, '0 rows'));
  return wrap;
}
function drawResults(box, r) {
  box.replaceChildren();
  if (!r.ok) { box.append(el('div', { class: 'console' }, '')); box.firstChild.append(el('div', { class: 'err' }, r.error)); return; }
  if (!r.results.length) { box.append(el('div', { class: 'muted' }, 'OK. ' + r.changes + ' row' + (r.changes === 1 ? '' : 's') + ' changed. (Run a SELECT to see the table.)')); return; }
  r.results.forEach((res) => box.append(drawTable(res.columns, res.values)));
}
const clean = (v) => (typeof v === 'number' ? Math.round(v * 10000) / 10000 : v);
const sameRows = (a, b) => JSON.stringify(a.map((r) => r.map(clean))) === JSON.stringify(b.map((r) => r.map(clean)));

function wireEditor(editor, run) {
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end'); }
  });
}

// ------------------------------------------------------------------------------------------
// SQL playground
// ------------------------------------------------------------------------------------------
export function mountSqlLab(root, { seed, starter, schema, rows = 6 }) {
  const db = new DbWorker({ seed });
  const editor = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'SQL editor' });
  editor.value = starter;
  const runBtn = el('button', { class: 'btn', type: 'button' }, 'Run  (Ctrl/⌘ + Enter)');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset the database');
  const bar = el('div', { class: 'bar' }); bar.append(runBtn, resetBtn);
  const out = el('div');
  root.append(el('div', { class: 'label' }, 'The database'), el('pre', { class: 'raw' }, schema), editor, bar, el('div', { class: 'label' }, 'Result'), out);

  async function run() {
    runBtn.disabled = true; out.replaceChildren(el('div', { class: 'muted' }, 'running…'));
    const r = await db.sql(editor.value);
    runBtn.disabled = false; drawResults(out, r);
  }
  runBtn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { db.reset(); out.replaceChildren(el('div', { class: 'muted' }, 'Database reset to its starting data.')); });
  wireEditor(editor, run);
  run();
}

// ------------------------------------------------------------------------------------------
// SQL challenge: one card per question
// ------------------------------------------------------------------------------------------
export function mountSqlChallenge(root, { seed, tasks, onPass = () => {}, hint = '' }) {
  const db = new DbWorker({ seed });
  const done = new Set(); let passed = false;
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset the database (ticks you earned stay)');
  const bar = el('div', { class: 'bar' }); bar.append(resetBtn);
  if (hint) root.append(el('p', { class: 'muted' }, hint));
  root.append(bar);
  resetBtn.addEventListener('click', () => db.reset());

  tasks.forEach((t, i) => {
    const card = el('div', { class: 'sqlcard' });
    const title = el('div', { class: 'sqlcard__q' });
    const tick = el('span', { class: 'box', 'aria-hidden': 'true' }, '✓');
    title.append(tick, el('span', {}, (i + 1) + '. ' + t.question));
    const ed = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(t.rows || 3), 'aria-label': 'SQL for question ' + (i + 1) });
    ed.value = t.starter || '';
    const btn = el('button', { class: 'btn', type: 'button' }, 'Run');
    const out = el('div');
    const row = el('div', { class: 'bar' }); row.append(btn);
    card.append(title, ed, row, out); root.append(card);

    async function run() {
      btn.disabled = true;
      const r = await db.sql(ed.value);
      btn.disabled = false; drawResults(out, r);
      if (!r.ok) return;
      let rows = r.results.length ? r.results[r.results.length - 1].values : [];
      if (t.verify) { const v = await db.sql(t.verify.sql); rows = v.ok && v.results.length ? v.results[0].values : []; }
      const ok = sameRows(rows, t.expected);
      if (ok) { done.add(i); title.classList.add('done'); }
      else out.append(el('div', { class: 'muted' }, t.verify ? 'The database does not look right yet. If an earlier try changed too many rows, press "reset the database" above, then run a corrected statement.' : 'That does not match the expected result yet. Compare the columns, the rows and their order.'));
      if (done.size === tasks.length && !passed) { passed = true; onPass(); }
    }
    btn.addEventListener('click', run); wireEditor(ed, run);
  });
}

// ------------------------------------------------------------------------------------------
// SQL injection demo
// ------------------------------------------------------------------------------------------
export function mountInjectionDemo(root) {
  const seed = "CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT);\n" +
    "INSERT INTO users VALUES (1, 'admin', 's3cret!'), (2, 'ana', 'pass123');";
  const db = new DbWorker({ seed });

  const modeBox = el('div', { class: 'modes' });
  const unsafe = el('input', { type: 'radio', name: 'mode' + Math.random(), checked: 'checked' });
  const safe = el('input', { type: 'radio', name: unsafe.name });
  const lab = (input, text) => { const l = el('label'); l.append(input, ' ' + text); return l; };
  modeBox.append(lab(unsafe, 'Unsafe: build the SQL by joining text'), lab(safe, 'Safe: parameters (?)'));
  const user = el('input', { class: 'ex__url', type: 'text', placeholder: 'username', spellcheck: 'false', 'aria-label': 'username' });
  const pass = el('input', { class: 'ex__url', type: 'text', placeholder: 'password', spellcheck: 'false', 'aria-label': 'password' });
  const go = el('button', { class: 'btn', type: 'button' }, 'Log in');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset the database');
  const form = el('div', { class: 'reqline' }); form.append(user, pass);
  const bar = el('div', { class: 'bar' }); bar.append(go, resetBtn);
  const ex = el('div', { class: 'ex' });
  const examples = [
    ['Real login', 'ana', 'pass123'], ['Wrong password', 'ana', 'nope'],
    ["Attack 1", "admin' --", 'anything'], ["Attack 2", "x", "' OR '1'='1"],
    ["Attack 3 (destroy)", "x'; DROP TABLE users; --", 'x'],
  ];
  examples.forEach(([name, u, p]) => { const b = el('button', { class: 'chip', type: 'button' }, name); b.addEventListener('click', () => { user.value = u; pass.value = p; }); ex.append(b); });
  const builtBox = el('pre', { class: 'raw' });
  const verdict = el('div');
  root.append(el('div', { class: 'label' }, 'Example inputs (the attacks are the point)'), ex, modeBox, el('div', { class: 'label' }, 'Login form'), form, bar,
    el('div', { class: 'label' }, 'The SQL the server runs'), builtBox, el('div', { class: 'label' }, 'Outcome'), verdict);

  go.addEventListener('click', async () => {
    const u = user.value, p = pass.value;
    go.disabled = true; verdict.replaceChildren(el('div', { class: 'muted' }, 'running…'));
    let rows = [], error = null;
    if (unsafe.checked) {
      const q = "SELECT * FROM users WHERE username = '" + u + "' AND password = '" + p + "'";
      builtBox.textContent = q;
      const r = await db.sql(q);
      if (!r.ok) error = r.error; else rows = r.results.length ? r.results[0].values : [];
    } else {
      builtBox.textContent = 'SELECT * FROM users WHERE username = ? AND password = ?\n-- parameters sent separately: [' + JSON.stringify(u) + ', ' + JSON.stringify(p) + ']';
      const r = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [u, p]);
      if (!r.ok) error = r.error; else rows = r.rows;
    }
    go.disabled = false; verdict.replaceChildren();
    if (error) { verdict.append(el('div', { class: 'status status--warn' }, 'SQL error: ' + error)); return; }
    if (!rows.length) { verdict.append(el('div', { class: 'status status--info' }, 'Login failed. No matching user.')); return; }
    const name = rows[0][1];
    const breach = name === 'admin' && p !== 's3cret!';
    verdict.append(el('div', { class: 'status status--' + (breach ? 'bad' : 'good') }, 'Logged in as ' + name + (breach ? '   ← the attacker never knew the password!' : '')));
  });
  resetBtn.addEventListener('click', () => { db.reset(); verdict.replaceChildren(el('div', { class: 'muted' }, 'Database reset: the users table is back.')); builtBox.textContent = ''; });
}

// ------------------------------------------------------------------------------------------
// Server lab: YOU write the routes
// ------------------------------------------------------------------------------------------
export function mountServerLab(root, { seed, code, examples = [], viewTable = 'notes', requests = [], tasks = [], tasksEl = null, onPass = () => {}, rows = 16 }) {
  const db = new DbWorker({ seed });
  const editor = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'Server code' });
  editor.value = code;
  const runBtn = el('button', { class: 'btn', type: 'button' }, 'Start server  (Ctrl/⌘ + Enter)');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset code');
  const status = el('span', {});
  const bar = el('div', { class: 'bar' }); bar.append(runBtn, resetBtn, status);
  const logBox = el('div', { class: 'console' });

  // manual request panel
  const ex = el('div', { class: 'ex' });
  const method = el('select', { 'aria-label': 'HTTP method' }); ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach((m) => method.append(el('option', { value: m }, m)));
  const url = el('input', { class: 'ex__url', type: 'text', spellcheck: 'false', 'aria-label': 'URL' });
  const line = el('div', { class: 'reqline' }); line.append(method, url);
  const body = el('textarea', { class: 'editor', rows: '2', spellcheck: 'false', placeholder: 'JSON body (the panel adds Content-Type: application/json for you)', 'aria-label': 'Body' });
  const send = el('button', { class: 'btn', type: 'button' }, 'Send request');
  const sendBar = el('div', { class: 'bar' }); sendBar.append(send);
  const resp = el('div');
  const viewBox = el('div');
  examples.forEach((e) => { const b = el('button', { class: 'chip', type: 'button' }, e.name); b.addEventListener('click', () => { method.value = e.method; url.value = e.url; body.value = e.body || ''; }); ex.append(b); });
  if (examples[0]) { method.value = examples[0].method; url.value = examples[0].url; }

  root.append(editor, bar, el('div', { class: 'label' }, 'Server log'), logBox,
    el('div', { class: 'label' }, 'Send your own request to your server'), ex, line, body, sendBar, resp,
    el('div', { class: 'label' }, 'Inside the database right now: table ' + viewTable), viewBox);

  const taskItems = tasks.map((t) => { const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, t.label)); return li; });
  if (tasksEl && tasks.length) { const ul = el('ul', { class: 'tasks' }); ul.append(...taskItems); tasksEl.append(ul); }

  const showLogs = (logs, isErr) => (logs || []).forEach((l) => logBox.append(el('div', { class: isErr ? 'err' : '' }, l)));
  async function refreshView() {
    const r = await db.query('SELECT * FROM ' + viewTable);
    viewBox.replaceChildren(r.ok ? drawTable(r.columns, r.rows) : el('div', { class: 'muted' }, 'Table not available: ' + r.error));
  }
  const toRequest = (r) => ({ method: r.method, url: r.url, body: r.body || '', headers: r.body ? { 'content-type': 'application/json' } : {} });

  let passed = false, runId = 0;
  async function start() {
    const id = ++runId;
    runBtn.disabled = true; status.textContent = 'starting…'; logBox.replaceChildren(); resp.replaceChildren();
    db.reset(editor.value);
    const init = await db.init();
    if (id !== runId) return;
    runBtn.disabled = false;
    if (!init.ok) { status.textContent = 'your code has an error'; showLogs([init.error], true); viewBox.replaceChildren(); markTasks(null); return; }
    showLogs(init.logs);
    status.textContent = 'server running';
    // Automated checks: send the scripted requests in order, in one fresh server.
    const results = {};
    for (const rq of requests) {
      const r = await db.request(toRequest(rq));
      if (!r.ok) { results[rq.id] = { status: 0, body: null, error: r.error }; showLogs([r.error], true); continue; }
      let parsed = null; try { parsed = r.response.body ? JSON.parse(r.response.body) : null; } catch { parsed = null; }
      results[rq.id] = { status: r.response.status, body: parsed, raw: r.response.body, headers: r.response.headers };
      showLogs(r.logs);
    }
    if (id !== runId) return;
    markTasks(results);
    await refreshView();
  }
  function markTasks(results) {
    let all = tasks.length > 0;
    tasks.forEach((t, i) => {
      let ok = false; if (results) { try { ok = !!t.check(results, editor.value); } catch { ok = false; } }
      taskItems[i].classList.toggle('done', ok); if (!ok) all = false;
    });
    if (all && !passed) { passed = true; onPass(); }
  }

  send.addEventListener('click', async () => {
    send.disabled = true; resp.replaceChildren(el('div', { class: 'muted' }, 'waiting…'));
    const r = await db.request(toRequest({ method: method.value, url: url.value, body: body.value }));
    send.disabled = false; resp.replaceChildren();
    if (!r.ok) { resp.append(el('div', { class: 'status status--bad' }, r.error)); return; }
    const s = r.response; const cls = s.status >= 500 ? 'bad' : s.status >= 400 ? 'warn' : s.status >= 300 ? 'info' : 'good';
    let pretty = s.body; try { pretty = JSON.stringify(JSON.parse(s.body), null, 2); } catch { /* not JSON */ }
    resp.append(el('div', { class: 'status status--' + cls }, s.status + ' ' + s.statusText), el('pre', { class: 'raw' }, pretty || '(empty body)'));
    showLogs(r.logs, false); refreshView();
  });
  runBtn.addEventListener('click', start);
  resetBtn.addEventListener('click', () => { editor.value = code; start(); });
  wireEditor(editor, start);
  start();
}
