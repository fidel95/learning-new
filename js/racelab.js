// racelab.js — lesson 24: make a race condition happen, fix it, then make a deadlock and break it.
import { el } from './workbench.js';

// A small FIFO mutex (the lab's own copy; the learner writes theirs in the challenge).
class Mutex {
  constructor() { this.locked = false; this.waiters = []; }
  async lock() {
    if (!this.locked) this.locked = true;
    else await new Promise((r) => this.waiters.push(r)); // ownership is handed over directly
    let done = false;
    return () => { if (done) return; done = true; const n = this.waiters.shift(); if (n) n(); else this.locked = false; };
  }
}
const sleep = () => new Promise((r) => setTimeout(r, Math.random() * 3));

// ───────────────────────── Lab 1: the race ─────────────────────────
export function mountRaceLab(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'Two accounts hold $500 each ($1000 in total). 8 workers each move $1 from A to B, 25 times. Money must be conserved: A + B is always $1000. Try each mode.'));
  const mode = el('select', { 'aria-label': 'Protection mode' });
  [['none', 'No protection (read, wait, write)'], ['mutex', 'Mutex around the whole transfer'], ['atomic', 'No await inside (one uninterrupted step)']].forEach(([v, t]) => mode.append(el('option', { value: v }, t)));
  const btn = el('button', { class: 'btn', type: 'button' }, 'Run 200 transfers');
  const out = el('div'); const seen = { none: false, mutex: false };
  root.append(el('div', { class: 'label' }, 'Mode'), mode, btn, out);

  btn.addEventListener('click', async () => {
    btn.disabled = true; out.replaceChildren(el('p', { class: 'muted' }, 'running…'));
    const A = { v: 500 }, B = { v: 500 }, mu = new Mutex(), m = mode.value;
    async function xfer() {
      if (m === 'atomic') { A.v -= 1; B.v += 1; return; } // no await: JavaScript cannot switch tasks in the middle
      const release = m === 'mutex' ? await mu.lock() : null;
      try { const a = A.v; await sleep(); A.v = a - 1; const b = B.v; await sleep(); B.v = b + 1; } // each pause stands for a database call or a network request
      finally { if (release) release(); }
    }
    await Promise.all(Array.from({ length: 8 }, async () => { for (let i = 0; i < 25; i++) await xfer(); }));
    const total = A.v + B.v, diff = total - 1000;
    const ok = diff === 0;
    out.replaceChildren(
      el('div', { class: 'status status--' + (ok ? 'good' : 'bad') }, ok ? 'A = $' + A.v + ', B = $' + B.v + ', total = $' + total + '. Money conserved.' : 'A = $' + A.v + ', B = $' + B.v + ', total = $' + total + '. ' + (diff > 0 ? '$' + diff + ' appeared from nowhere' : '$' + (-diff) + ' vanished') + '. Expected A = $300, B = $700.'),
      el('p', { class: 'muted' }, ok ? (m === 'atomic' ? 'No await between the read and the write means no other task can run in between. Fragile: add one await later and the bug is back.' : 'Only one worker is inside the critical section at a time, so each read-modify-write is whole.') : 'Each worker read a balance, paused, then wrote back a stale answer, erasing other workers\' updates (a lost update). A and B lose different updates, so money is created or destroyed.'));
    if (m === 'none' && !ok) seen.none = true; if (m === 'mutex' && ok) seen.mutex = true;
    btn.disabled = false;
    if (seen.none && seen.mutex) onPass();
  });
}

// ───────────────────────── Lab 2: the deadlock ─────────────────────────
export function mountDeadlockLab(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'Two transfers at once: T1 moves A→B and T2 moves B→A. Each must lock both accounts. Choose the order in which they take the locks.'));
  const mode = el('select', { 'aria-label': 'Lock order' });
  [['arg', 'Lock "from" first, then "to"'], ['ordered', 'Always lock the account with the smaller id first']].forEach(([v, t]) => mode.append(el('option', { value: v }, t)));
  const btn = el('button', { class: 'btn', type: 'button' }, 'Run both transfers');
  const log = el('pre', { class: 'raw' }, ''); const out = el('div'); const seen = { dead: false, fixed: false };
  root.append(el('div', { class: 'label' }, 'Strategy'), mode, btn, out, log);

  btn.addEventListener('click', async () => {
    btn.disabled = true; log.textContent = ''; out.replaceChildren();
    const lines = []; const say = (s) => { lines.push(s); log.textContent = lines.join('\n'); };
    const accounts = { A: { id: 'A', mu: new Mutex() }, B: { id: 'B', mu: new Mutex() } };
    const state = { T1: 'starting', T2: 'starting' };
    async function transfer(name, from, to) {
      let first = from, second = to;
      if (mode.value === 'ordered' && to.id < from.id) { first = to; second = from; }
      state[name] = 'waiting for ' + first.id; const r1 = await first.mu.lock(); say(name + ' locked ' + first.id);
      await new Promise((r) => setTimeout(r, 50));
      state[name] = 'holds ' + first.id + ', waiting for ' + second.id; say(name + ' wants ' + second.id + '…');
      const r2 = await second.mu.lock(); say(name + ' locked ' + second.id);
      state[name] = 'moving money'; say(name + ' transferred $10 and released both');
      r2(); r1(); state[name] = 'done';
    }
    const work = Promise.all([transfer('T1', accounts.A, accounts.B), transfer('T2', accounts.B, accounts.A)]).then(() => true);
    const stuck = new Promise((r) => setTimeout(() => r(false), 1200));
    const finished = await Promise.race([work, stuck]);
    if (finished) {
      out.replaceChildren(el('div', { class: 'status status--good' }, 'Both finished. Everyone agreed on one global order, so nobody can wait in a circle.'));
      if (mode.value === 'ordered') seen.fixed = true;
    } else {
      out.replaceChildren(el('div', { class: 'status status--bad' }, 'DEADLOCK after 1.2 s. T1: ' + state.T1 + '. T2: ' + state.T2 + '. Each holds what the other needs and nobody will ever let go.'));
      seen.dead = true;
    }
    btn.disabled = false;
    if (seen.dead && seen.fixed) onPass();
  });
}
