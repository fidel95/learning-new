// httplab.js — two tools for learning HTTP:
//   mountRequestBuilder: build a raw HTTP request by hand and read the raw response ("Postman-lite").
//   mountApiLab: write real async JavaScript with fetch() against the pretend server and watch the network log.
import { createServer } from './mockserver.js';
import { el } from './workbench.js';

const PRETTY = (text) => { try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; } };
const statusClass = (s) => (s >= 500 ? 'bad' : s >= 400 ? 'warn' : s >= 300 ? 'info' : 'good');

function headerLines(obj) { return Object.entries(obj || {}).map(([k, v]) => k + ': ' + v); }

// ------------------------------------------------------------------------------------------
// 1. Request builder (runs the pretend server right here on the page)
// ------------------------------------------------------------------------------------------
const EXAMPLES = [
  { name: 'List users', method: 'GET', url: '/api/users', headers: '', body: '' },
  { name: 'One user', method: 'GET', url: '/api/users/2', headers: '', body: '' },
  { name: 'Missing user', method: 'GET', url: '/api/users/99', headers: '', body: '' },
  { name: 'Create user', method: 'POST', url: '/api/users', headers: 'Content-Type: application/json', body: '{"name": "Zed"}' },
  { name: 'Create (no header)', method: 'POST', url: '/api/users', headers: '', body: '{"name": "Zed"}' },
  { name: 'Create (bad data)', method: 'POST', url: '/api/users', headers: 'Content-Type: application/json', body: '{"name": ""}' },
  { name: 'Delete user 1', method: 'DELETE', url: '/api/users/1', headers: '', body: '' },
  { name: 'Secret (no token)', method: 'GET', url: '/api/secret', headers: '', body: '' },
  { name: 'Secret (token)', method: 'GET', url: '/api/secret', headers: 'Authorization: Bearer lesson7-token', body: '' },
  { name: 'Admin (403)', method: 'GET', url: '/api/admin', headers: 'Authorization: Bearer lesson7-token', body: '' },
];

export function mountRequestBuilder(root, { examples = EXAMPLES } = {}) {
  let server = createServer();

  const exRow = el('div', { class: 'ex' });
  const method = el('select', { 'aria-label': 'HTTP method' });
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach((m) => method.append(el('option', { value: m }, m)));
  const url = el('input', { class: 'ex__url', type: 'text', spellcheck: 'false', 'aria-label': 'URL' });
  const line = el('div', { class: 'reqline' }); line.append(method, url);
  const headers = el('textarea', { class: 'editor', rows: '2', spellcheck: 'false', placeholder: 'Header-Name: value  (one per line)', 'aria-label': 'Headers' });
  const body = el('textarea', { class: 'editor', rows: '3', spellcheck: 'false', placeholder: 'Body (for POST / PUT / PATCH)', 'aria-label': 'Body' });
  const send = el('button', { class: 'btn', type: 'button' }, 'Send request');
  const resetServer = el('button', { class: 'link-btn', type: 'button' }, 'reset the server data');
  const bar = el('div', { class: 'bar' }); bar.append(send, resetServer);
  const rawReq = el('pre', { class: 'raw' });
  const result = el('div', { class: 'resp' });

  const load = (e) => { method.value = e.method; url.value = e.url; headers.value = e.headers; body.value = e.body; showRaw(); };
  examples.forEach((e) => { const b = el('button', { class: 'chip', type: 'button' }, e.name); b.addEventListener('click', () => load(e)); exRow.append(b); });

  root.append(el('div', { class: 'label' }, 'Examples (click one, then Send)'), exRow, el('div', { class: 'label' }, 'Request line'), line,
    el('div', { class: 'label' }, 'Headers'), headers, el('div', { class: 'label' }, 'Body'), body, bar,
    el('div', { class: 'label' }, 'What actually travels over the wire'), rawReq, el('div', { class: 'label' }, 'Response'), result);

  const parseHeaders = () => {
    const h = {};
    headers.value.split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) h[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); });
    return h;
  };
  function showRaw() {
    let path = url.value || '/';
    try { const u = new URL(path, 'https://api.learn.test'); path = u.pathname + u.search; } catch { /* keep as typed */ }
    const hs = parseHeaders();
    const lines = [method.value + ' ' + path + ' HTTP/1.1', 'Host: api.learn.test'];
    if (body.value && !hs['content-type']) lines.push('Content-Type: text/plain;charset=UTF-8');
    headerLines(Object.fromEntries(Object.entries(hs).map(([k, v]) => [k, v]))).forEach((l) => lines.push(l));
    rawReq.textContent = lines.join('\n') + (body.value ? '\n\n' + body.value : '');
  }
  for (const n of [method, url, headers, body]) n.addEventListener('input', showRaw);

  send.addEventListener('click', () => {
    const hs = parseHeaders();
    if (body.value && !hs['content-type']) hs['content-type'] = 'text/plain;charset=UTF-8';   // what a browser would add
    const req = { method: method.value, url: url.value || '/', headers: hs, body: body.value };
    const res = server.handle(req);
    result.replaceChildren(el('div', { class: 'muted' }, 'waiting…'));
    send.disabled = true;
    setTimeout(() => {
      send.disabled = false;
      result.replaceChildren();
      if (res.networkError) { result.append(el('div', { class: 'status status--bad' }, 'Network error: could not reach that server (this lab only knows api.learn.test)')); return; }
      const badge = el('div', { class: 'status status--' + statusClass(res.status) }, res.status + ' ' + res.statusText + '   ·   ' + res.delay + ' ms');
      const raw = ['HTTP/1.1 ' + res.status + ' ' + res.statusText, ...headerLines(res.headers)].join('\n') + (res.body ? '\n\n' + PRETTY(res.body) : '\n\n(empty body)');
      result.append(badge, el('pre', { class: 'raw' }, raw));
    }, 220);
  });
  resetServer.addEventListener('click', () => { server = createServer(); result.replaceChildren(el('div', { class: 'muted' }, 'Server data reset: users are Ana, Bo and Cy again.')); });
  load(examples[0]);
}

// ------------------------------------------------------------------------------------------
// 2. API lab: your JavaScript runs in a Web Worker whose fetch() talks to the pretend server
// ------------------------------------------------------------------------------------------
function workerSource() {
  return `
  ${createServer.toString()}
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const realSetTimeout = self.setTimeout.bind(self), realSetInterval = self.setInterval.bind(self), realClearInterval = self.clearInterval.bind(self);

  self.onmessage = async (event) => {
    const { code, probes } = event.data;
    const server = createServer();
    const t0 = Date.now();
    const logs = []; const net = []; const errors = [];
    let inflight = 0;                                   // timers + requests still pending

    const show = (v) => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); } };
    const fakeConsole = { log: (...a) => logs.push(a.map(show).join(' ')), error: (...a) => logs.push('error: ' + a.map(show).join(' ')) };

    // Learner timers count as "still running" so we wait for them before finishing.
    const myTimeout = (fn, ms, ...args) => { inflight++; return realSetTimeout(() => { inflight--; fn(...args); }, Math.min(Number(ms) || 0, 3000)); };

    function makeResponse(r, url) {
      const headers = r.headers; let used = false;
      const read = () => { if (used) return Promise.reject(new TypeError('Failed to execute: body stream already read')); used = true; return Promise.resolve(r.body); };
      return {
        ok: r.status >= 200 && r.status < 300, status: r.status, statusText: r.statusText, url,
        headers: { get: (n) => { const v = headers[String(n).toLowerCase()]; return v === undefined ? null : v; }, has: (n) => String(n).toLowerCase() in headers },
        text: () => read(),
        json: () => read().then((t) => JSON.parse(t)),
      };
    }

    function fakeFetch(input, init) {
      init = init || {};
      const url = new URL(String(input && input.url ? input.url : input), 'https://api.learn.test').toString();
      const method = String(init.method || 'GET').toUpperCase();
      const headers = {};
      const given = init.headers;
      if (given) { const pairs = (typeof given.entries === 'function') ? Array.from(given.entries()) : Object.entries(given); pairs.forEach(([k, v]) => { headers[String(k).toLowerCase()] = String(v); }); }
      // Like a real browser: a body that is not a string becomes the useless text "[object Object]".
      const body = init.body === undefined || init.body === null ? '' : String(init.body);
      if (body && !headers['content-type']) headers['content-type'] = 'text/plain;charset=UTF-8';
      const entry = { n: net.length + 1, method, url, reqHeaders: headers, reqBody: body, start: Date.now() - t0 };
      net.push(entry);
      inflight++;
      const r = server.handle({ method, url, headers, body });
      return new Promise((resolve, reject) => {
        realSetTimeout(() => {
          inflight--; entry.end = Date.now() - t0;
          if (r.networkError) { entry.error = 'Network error'; reject(new TypeError('Failed to fetch')); return; }
          entry.status = r.status; entry.statusText = r.statusText; entry.resHeaders = r.headers; entry.resBody = r.body;
          resolve(makeResponse(r, url));
        }, r.delay || 200);
      });
    }

    self.addEventListener('unhandledrejection', (e) => { errors.push('Uncaught (in promise) ' + (e.reason && e.reason.message ? e.reason.name + ': ' + e.reason.message : String(e.reason))); e.preventDefault(); });

    const idle = () => new Promise((resolve) => { const i = realSetInterval(() => { if (inflight === 0) { realClearInterval(i); resolve(); } }, 20); });
    const probeNames = Object.keys(probes);
    const probeCode = probeNames.map((k) =>
      'try { const __st = Date.now(); __p[' + JSON.stringify(k) + '] = await (' + probes[k] + '); __t[' + JSON.stringify(k) + '] = Date.now() - __st; } ' +
      'catch (e) { __p[' + JSON.stringify(k) + '] = { __error: String(e && e.message) }; }').join('\\n');

    try {
      const body = '"use strict";\\nconst __p = {}, __t = {};\\n' + code + '\\n;await __idle();\\n' + probeCode + '\\nawait __idle();\\nreturn { __p, __t };';
      const run = new AsyncFunction('console', 'fetch', 'setTimeout', '__idle', body);
      const out = await run(fakeConsole, fakeFetch, myTimeout, idle);
      self.postMessage({ ok: true, logs, net, errors, probes: out.__p, times: out.__t });
    } catch (e) {
      await idle();
      self.postMessage({ ok: false, error: (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)), logs, net, errors, probes: {}, times: {} });
    }
  };`;
}

function runApiCode(code, probes) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([workerSource()], { type: 'text/javascript' }));
    const worker = new Worker(url);
    let finished = false;
    const finish = (r) => {
      if (finished) return; finished = true; clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url);
      resolve({ source: code, ok: false, logs: [], net: [], errors: [], probes: {}, times: {}, ...r });
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'Timed out after 8 seconds. Is something waiting forever (or looping)?' }), 8000);
    worker.onmessage = (e) => finish(e.data);
    worker.onerror = (e) => finish({ ok: false, error: e.message || 'Unknown error' });
    worker.postMessage({ code, probes });
  });
}

export function mountApiLab(root, { starter, tasks = [], tasksEl = null, probes = {}, onPass = () => {}, rows = 12 }) {
  const editor = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'Code editor' });
  editor.value = starter;
  const runBtn = el('button', { class: 'btn', type: 'button' }, 'Run  (Ctrl/⌘ + Enter)');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset code');
  const status = el('span', {});
  const bar = el('div', { class: 'bar' }); bar.append(runBtn, resetBtn, status);
  const netBox = el('div', { class: 'net' });
  const consoleBox = el('div', { class: 'console' });
  root.append(editor, bar, el('div', { class: 'label' }, 'Network log — every request your code made (click a row for details)'), netBox, el('div', { class: 'label' }, 'Console'), consoleBox);

  const taskItems = tasks.map((t) => { const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, t.label)); return li; });
  if (tasksEl && tasks.length) { const ul = el('ul', { class: 'tasks' }); ul.append(...taskItems); tasksEl.append(ul); }

  function drawNet(list) {
    netBox.replaceChildren();
    if (!list.length) { netBox.append(el('div', { class: 'muted' }, 'No requests yet. Use fetch("/api/users") in your code.')); return; }
    const total = Math.max(...list.map((r) => r.end || r.start + 1), 1);
    for (const r of list) {
      const row = el('div', { class: 'net__row' });
      const head = el('div', { class: 'net__head', role: 'button', tabindex: '0' });
      const shortUrl = r.url.replace('https://api.learn.test', '');
      head.append(el('span', { class: 'net__n' }, String(r.n)), el('span', { class: 'net__m' }, r.method), el('span', { class: 'net__u' }, shortUrl),
        el('span', { class: 'net__s net__s--' + (r.error ? 'bad' : statusClass(r.status)) }, r.error ? 'failed' : String(r.status)),
        el('span', { class: 'net__t' }, r.end !== undefined ? (r.end - r.start) + ' ms' : '…'));
      const bar2 = el('div', { class: 'net__bar' }); const fill = el('span');
      fill.style.marginLeft = (r.start / total * 100) + '%'; fill.style.width = Math.max(2, ((r.end || total) - r.start) / total * 100) + '%';
      bar2.append(fill);
      const detail = el('pre', { class: 'raw net__detail' }); detail.hidden = true;
      detail.textContent = ['→ ' + r.method + ' ' + shortUrl, ...headerLines(r.reqHeaders)].join('\n') + (r.reqBody ? '\n\n' + r.reqBody : '') +
        '\n\n← ' + (r.error ? r.error : r.status + ' ' + r.statusText + '\n' + headerLines(r.resHeaders).join('\n') + '\n\n' + (r.resBody ? PRETTY(r.resBody) : '(empty body)'));
      const toggle = () => { detail.hidden = !detail.hidden; };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      row.append(head, bar2, detail); netBox.append(row);
    }
  }

  let passed = false, runId = 0;
  async function run() {
    const id = ++runId;
    status.textContent = 'running…'; runBtn.disabled = true;
    const r = await runApiCode(editor.value, probes);
    if (id !== runId) return;
    runBtn.disabled = false;
    status.textContent = r.ok ? 'finished' : 'error — read the console';
    drawNet(r.net);
    consoleBox.replaceChildren();
    r.logs.forEach((l) => consoleBox.append(el('div', {}, l)));
    r.errors.forEach((l) => consoleBox.append(el('div', { class: 'err' }, l)));
    if (!r.ok) consoleBox.append(el('div', { class: 'err' }, r.error));
    if (r.ok && !r.logs.length && !r.errors.length) consoleBox.append(el('div', { class: 'muted' }, '(no output — use console.log(x) to print)'));
    let all = tasks.length > 0;
    tasks.forEach((t, i) => {
      let ok = false; try { ok = r.ok && !!t.check(r); } catch { ok = false; }
      taskItems[i].classList.toggle('done', ok); if (!ok) all = false;
    });
    if (all && !passed) { passed = true; onPass(); }
  }
  runBtn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { editor.value = starter; run(); });
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end'); }
  });
  run();
}
