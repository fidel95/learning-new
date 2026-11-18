// isolab.js — lesson 25: a tiny transaction engine so you can SEE isolation anomalies.
// It models read uncommitted, read committed, repeatable read (snapshot + first-committer-wins) and serializable (read validation).
import { el } from './workbench.js';

export const LEVELS = ['Read uncommitted', 'Read committed', 'Repeatable read', 'Serializable'];
class Abort extends Error {}

class Engine {
  constructor(init) { this.committed = { ...init }; this.last = {}; this.clock = 0; this.txs = []; }
  begin(name, level) { const t = new Tx(this, name, level); this.txs.push(t); return t; }
}
class Tx {
  constructor(eng, name, level) { this.eng = eng; this.name = name; this.level = level; this.snap = { ...eng.committed }; this.snapTs = eng.clock; this.writes = {}; this.reads = []; this.state = 'active'; }
  view() {
    let base;
    if (this.level >= 2) base = { ...this.snap };
    else { base = { ...this.eng.committed }; if (this.level === 0) for (const o of this.eng.txs) if (o !== this && o.state === 'active') Object.assign(base, o.writes); }
    return Object.assign(base, this.writes);
  }
  query(fn) { const r = fn(this.view()); this.reads.push({ fn, r }); return r; }
  get(k) { return this.query((v) => v[k]); }
  put(k, v) { this.writes[k] = v; }
  rollback() { this.state = 'rolled back'; this.writes = {}; }
  commit() {
    const e = this.eng;
    if (this.level >= 2) for (const k of Object.keys(this.writes)) if ((e.last[k] || 0) > this.snapTs) { this.state = 'aborted'; throw new Abort('write conflict on "' + k + '": someone else changed it after you started'); }
    if (this.level >= 3) { const latest = { ...e.committed }; for (const x of this.reads) if (JSON.stringify(x.fn(latest)) !== JSON.stringify(x.r)) { this.state = 'aborted'; throw new Abort('serialization failure: something you read has since changed'); } }
    e.clock++; for (const k of Object.keys(this.writes)) { e.committed[k] = this.writes[k]; e.last[k] = e.clock; }
    this.state = 'committed';
  }
}

const count = (val) => (v) => Object.values(v).filter((x) => x === val).length;
export const SCENARIOS = [
  { id: 'dirty', name: 'Dirty read', want: 1, init: { balance: 100 },
    steps: [['A', 'UPDATE balance = 0   (not committed yet)', (A) => A.put('balance', 0)], ['B', 'SELECT balance', (A, B, m) => (m.b = B.get('balance'))], ['A', 'ROLLBACK', (A) => A.rollback()], ['B', 'COMMIT', (A, B) => B.commit()]],
    bad: (m) => m.b === 0, why: 'B saw 0, a value that was rolled back and never officially existed.' },
  { id: 'nonrep', name: 'Non-repeatable read', want: 2, init: { price: 10 },
    steps: [['A', 'SELECT price', (A, B, m) => (m.a1 = A.get('price'))], ['B', 'UPDATE price = 20', (A, B) => B.put('price', 20)], ['B', 'COMMIT', (A, B) => B.commit()], ['A', 'SELECT price  (again)', (A, B, m) => (m.a2 = A.get('price'))], ['A', 'COMMIT', (A) => A.commit()]],
    bad: (m) => m.a1 !== m.a2, why: 'The same query inside one transaction returned two different answers.' },
  { id: 'phantom', name: 'Phantom read', want: 2, init: { o1: 'open', o2: 'open', o3: 'open' },
    steps: [['A', "SELECT COUNT(*) WHERE status='open'", (A, B, m) => (m.c1 = A.query(count('open')))], ['B', "INSERT an 'open' order", (A, B) => B.put('o4', 'open')], ['B', 'COMMIT', (A, B) => B.commit()], ['A', "SELECT COUNT(*) WHERE status='open'  (again)", (A, B, m) => (m.c2 = A.query(count('open')))], ['A', 'COMMIT', (A) => A.commit()]],
    bad: (m) => m.c1 !== m.c2, why: 'A new row appeared inside A\'s transaction. (The SQL standard allows this at repeatable read; snapshot databases like Postgres prevent it there.)' },
  { id: 'lost', name: 'Lost update', want: 2, init: { stock: 100 },
    steps: [['A', 'SELECT stock', (A, B, m) => (m.a = A.get('stock'))], ['B', 'SELECT stock', (A, B, m) => (m.b = B.get('stock'))], ['A', 'UPDATE stock = a - 10', (A, B, m) => A.put('stock', m.a - 10)], ['A', 'COMMIT', (A) => A.commit()], ['B', 'UPDATE stock = b - 20', (A, B, m) => B.put('stock', m.b - 20)], ['B', 'COMMIT', (A, B) => B.commit()]],
    bad: (m, e, T) => T.A.state === 'committed' && T.B.state === 'committed' && e.committed.stock !== 70, why: 'Both committed, but the stock is not 70: one decrement was overwritten.' },
  { id: 'skew', name: 'Write skew', want: 3, init: { alice: 1, bob: 1 },
    steps: [['A', 'SELECT COUNT(*) doctors on call', (A, B, m) => (m.a = A.query(count(1)))], ['B', 'SELECT COUNT(*) doctors on call', (A, B, m) => (m.b = B.query(count(1)))], ['A', 'if count > 1: alice goes off call', (A, B, m) => { if (m.a > 1) A.put('alice', 0); }], ['B', 'if count > 1: bob goes off call', (A, B, m) => { if (m.b > 1) B.put('bob', 0); }], ['A', 'COMMIT', (A) => A.commit()], ['B', 'COMMIT', (A, B) => B.commit()]],
    bad: (m, e) => count(1)(e.committed) === 0, why: 'Each transaction was fine alone, but together nobody is on call. They wrote DIFFERENT rows, so no write conflict was detected.' },
];

export function simulate(sc, level) {
  const e = new Engine(sc.init), T = { A: e.begin('A', level), B: e.begin('B', level) }, m = {}, log = [];
  for (const [who, text, fn] of sc.steps) {
    const tx = T[who];
    if (tx.state !== 'active') { log.push({ who, text, res: 'skipped (' + tx.state + ')', cls: 'muted' }); continue; }
    try { const r = fn(T.A, T.B, m); log.push({ who, text, res: r !== undefined && !/COMMIT|ROLLBACK|UPDATE|INSERT|if/.test(text) ? '→ ' + JSON.stringify(r) : '', cls: '' }); }
    catch (err) { if (!(err instanceof Abort)) throw err; log.push({ who, text, res: 'ABORTED: ' + err.message, cls: 'bad' }); }
  }
  return { log, anomaly: !!sc.bad(m, e, T), final: e.committed, T };
}
export const weakestSafe = (sc) => { for (let l = 0; l < LEVELS.length; l++) if (!simulate(sc, l).anomaly) return l; return LEVELS.length - 1; };

export function mountIsolationLab(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'Two transactions, A and B, run these steps in exactly this interleaved order. Pick an anomaly and an isolation level, then run it.'));
  const sSel = el('select', { 'aria-label': 'Anomaly' }); SCENARIOS.forEach((s, i) => sSel.append(el('option', { value: String(i) }, s.name)));
  const lSel = el('select', { 'aria-label': 'Isolation level' }); LEVELS.forEach((l, i) => lSel.append(el('option', { value: String(i) }, l)));
  lSel.value = '1';
  const btn = el('button', { class: 'btn', type: 'button' }, 'Run');
  const out = el('div'); root.append(sSel, lSel, btn, out);
  btn.addEventListener('click', () => {
    const sc = SCENARIOS[+sSel.value], r = simulate(sc, +lSel.value);
    const t = el('table', { class: 'looptable' }); const head = el('tr'); ['', 'statement', 'result'].forEach((h) => head.append(el('th', {}, h))); t.append(head);
    r.log.forEach((x) => { const tr = el('tr'); tr.append(el('td', {}, x.who), el('td', {}, x.text), el('td', { class: x.cls }, x.res)); t.append(tr); });
    out.replaceChildren(t, el('div', { class: 'status status--' + (r.anomaly ? 'bad' : 'good') }, r.anomaly ? 'ANOMALY at ' + LEVELS[+lSel.value] + '. ' + sc.why : 'No anomaly at ' + LEVELS[+lSel.value] + (r.T.A.state === 'aborted' || r.T.B.state === 'aborted' ? ' (the database aborted a transaction; the app must retry it).' : '.')));
  });
  root.append(el('h2', {}, 'Your isolation cheat sheet'), el('p', { class: 'muted' }, 'For each anomaly, choose the WEAKEST (cheapest) level that prevents it. Use the lab above to find out.'));
  const sels = SCENARIOS.map((sc) => { const row = el('div', { class: 'sqlcard' }); const s = el('select', { 'aria-label': 'Weakest level preventing ' + sc.name }); s.append(el('option', { value: '' }, 'level…')); LEVELS.forEach((l, i) => s.append(el('option', { value: String(i) }, l))); row.append(el('div', { class: 'sqlcard__q' }, sc.name), s); root.append(row); return { s, row, sc }; });
  const chk = el('button', { class: 'btn', type: 'button' }, 'Check my cheat sheet'), res = el('div'); root.append(chk, res); let passed = false;
  chk.addEventListener('click', () => {
    let n = 0; sels.forEach(({ s, row, sc }) => { const ok = s.value === String(weakestSafe(sc)); if (ok) n++; row.classList.toggle('tm--ok', ok); row.classList.toggle('tm--bad', !ok && s.value !== ''); });
    const ok = n === SCENARIOS.length; res.replaceChildren(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, n + ' of ' + SCENARIOS.length + ' right' + (ok ? '. That table is worth memorizing.' : '. Try the unsafe levels in the lab to find where each anomaly stops.')));
    if (ok && !passed) { passed = true; onPass(); }
  });
}
