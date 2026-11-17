// db.js — a real SQLite database (sql.js, SQLite compiled to WebAssembly) running inside a Web Worker.
//
// WHY a worker? A badly written query (like an endless recursive one) must not freeze the book.
// If a call takes too long we kill the worker; the next call starts a fresh one.
//
// The same worker can also host a tiny web "app": your route handlers (app.get / app.post ...) get
// requests posted to them, talk to the database, and return responses. That is lesson 8's server lab.

const SQL_URL = new URL('../vendor/sql-wasm.js', import.meta.url).href;
const WASM_URL = new URL('../vendor/sql-wasm.wasm', import.meta.url).href;

// This text becomes the worker's program.
const WORKER_SOURCE = `
  let SQL = null, db = null;
  const routes = [];
  let logs = [];

  // ---- the database helpers your server code can use ----
  function bindParams(params) {
    if (params === undefined || params === null) return undefined;
    if (Array.isArray(params)) return params;
    const o = {};                                   // named parameters: { name: 'x' } for :name
    for (const k of Object.keys(params)) o[/^[:$@]/.test(k) ? k : ':' + k] = params[k];
    return o;
  }
  function rowsOf(sql, params) {
    const stmt = db.prepare(sql);
    try {
      const b = bindParams(params); if (b !== undefined) stmt.bind(b);
      const columns = stmt.getColumnNames(); const rows = [];
      while (stmt.step()) rows.push(stmt.get());
      return { columns, rows };
    } finally { stmt.free(); }
  }
  const dbApi = {
    all(sql, params) { const r = rowsOf(sql, params); return r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))); },
    get(sql, params) { const a = dbApi.all(sql, params); return a.length ? a[0] : null; },
    run(sql, params) {
      const b = bindParams(params);
      db.run(sql, b);
      const changes = db.getRowsModified();
      const last = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
      return { changes, lastId: last };
    },
  };

  // ---- tiny web framework ----
  const STATUS = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 415: 'Unsupported Media Type', 500: 'Internal Server Error' };
  function json(data, status, headers) {
    status = status || 200;
    const empty = status === 204 || data === undefined;
    return { __resp: true, status, headers: Object.assign(empty ? {} : { 'content-type': 'application/json; charset=utf-8' }, headers || {}), body: empty ? '' : JSON.stringify(data) };
  }
  const app = {};
  for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
    app[m] = (path, handler) => {
      if (typeof path !== 'string' || typeof handler !== 'function') throw new TypeError('app.' + m + '(path, handler): needs a path string and a function');
      routes.push({ method: m.toUpperCase(), parts: path.split('/').filter(Boolean), handler });
    };
  }
  function match(parts, segs) {
    if (parts.length !== segs.length) return null;
    const params = {};
    for (let i = 0; i < parts.length; i++) {
      if (parts[i][0] === ':') params[parts[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (parts[i] !== segs[i]) return null;
    }
    return params;
  }
  async function dispatch(r) {
    const started = Date.now();
    const u = new URL(r.url, 'https://app.learn.test');
    const segs = u.pathname.split('/').filter(Boolean);
    const method = String(r.method).toUpperCase();
    let out = null; const allowed = [];
    for (const rt of routes) {
      const params = match(rt.parts, segs);
      if (!params) continue;
      if (rt.method !== method) { allowed.push(rt.method); continue; }
      const req = {
        method, path: u.pathname, params, query: Object.fromEntries(u.searchParams), headers: r.headers || {}, text: r.body || '',
        json() { return JSON.parse(r.body || ''); },
      };
      try {
        let res = await rt.handler(req);
        if (!(res && res.__resp)) res = json(res === undefined ? null : res, 200);
        out = res;
      } catch (e) {
        logs.push('error in ' + method + ' ' + u.pathname + ': ' + (e && e.message ? e.message : String(e)));
        out = json({ error: 'Internal Server Error' }, 500);
      }
      break;
    }
    if (!out) out = allowed.length ? json({ error: 'Method not allowed' }, 405, { allow: allowed.join(', ') }) : json({ error: 'No such route' }, 404);
    return { status: out.status, statusText: STATUS[out.status] || '', headers: out.headers, body: out.body, ms: Date.now() - started };
  }

  const show = (v) => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); } };
  const fakeConsole = { log: (...a) => logs.push(a.map(show).join(' ')) };
  const drainLogs = () => { const l = logs; logs = []; return l; };

  self.onmessage = async (event) => {
    const m = event.data;
    try {
      if (m.type === 'init') {
        importScripts(m.sqlUrl);
        SQL = await initSqlJs({ locateFile: () => m.wasmUrl });
        db = new SQL.Database();
        if (m.seed) db.exec(m.seed);
        if (m.code) { const fn = new Function('app', 'db', 'json', 'console', '"use strict";\\n' + m.code); fn(app, dbApi, json, fakeConsole); }
        self.postMessage({ id: m.id, ok: true, logs: drainLogs() });
      } else if (m.type === 'sql') {                   // run one or more statements, return every result table
        const results = db.exec(m.sql);
        self.postMessage({ id: m.id, ok: true, results, changes: db.getRowsModified() });
      } else if (m.type === 'query') {                 // one parameterised query
        const r = rowsOf(m.sql, m.params);
        self.postMessage({ id: m.id, ok: true, columns: r.columns, rows: r.rows });
      } else if (m.type === 'request') {
        const res = await dispatch(m.req);
        self.postMessage({ id: m.id, ok: true, response: res, logs: drainLogs() });
      }
    } catch (e) {
      self.postMessage({ id: m.id, ok: false, error: (e && e.name && e.name !== 'Error' ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)), logs: drainLogs() });
    }
  };
`;

/**
 * DbWorker — one database (and optionally one app) with a safety timeout.
 *   const db = new DbWorker({ seed: 'CREATE TABLE ...', code: 'app.get(...)' });
 *   await db.sql('SELECT 1');   await db.request({ method: 'GET', url: '/x' });   db.reset();
 */
export class DbWorker {
  constructor({ seed = '', code = '' } = {}) {
    this.seed = seed; this.code = code; this.worker = null; this.ready = null; this.nextId = 1; this.pending = new Map();
  }

  _start() {
    const blobUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(blobUrl);
    this.worker = worker;
    worker.onmessage = (e) => {
      const p = this.pending.get(e.data.id);
      if (p) { this.pending.delete(e.data.id); clearTimeout(p.timer); p.resolve(e.data); }
    };
    worker.onerror = (e) => { this._failAll(e.message || 'The database worker crashed.'); };
    this.ready = this._post({ type: 'init', sqlUrl: SQL_URL, wasmUrl: WASM_URL, seed: this.seed, code: this.code }, 8000)
      .then((r) => { URL.revokeObjectURL(blobUrl); return r; });
    return this.ready;
  }

  _failAll(message) {
    for (const [id, p] of this.pending) { clearTimeout(p.timer); p.resolve({ id, ok: false, error: message }); }
    this.pending.clear();
  }

  _post(msg, timeoutMs = 3000) {
    return new Promise((resolve) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.kill();                                   // too slow: kill it. The next call starts a fresh copy.
        resolve({ id, ok: false, timedOut: true, error: 'That took longer than ' + timeoutMs / 1000 + ' seconds, so it was stopped. The database was reset.' });
      }, timeoutMs);
      this.pending.set(id, { resolve, timer });
      this.worker.postMessage({ ...msg, id });
    });
  }

  kill() { if (this.worker) { this.worker.terminate(); this.worker = null; this.ready = null; this._failAll('The database worker was stopped.'); } }
  reset(code) { if (code !== undefined) this.code = code; this.kill(); }

  async _call(msg, timeoutMs) {
    if (!this.worker) { const init = await this._start(); if (!init.ok) { this.kill(); return init; } }
    else { const init = await this.ready; if (!init.ok) return init; }
    return this._post(msg, timeoutMs);
  }

  async init() { return this.worker ? this.ready : this._start(); }
  sql(text) { return this._call({ type: 'sql', sql: text }); }
  query(text, params) { return this._call({ type: 'query', sql: text, params }); }
  request(req) { return this._call({ type: 'request', req }); }
}
