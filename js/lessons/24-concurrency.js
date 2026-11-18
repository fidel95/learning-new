// Lesson 24 — Concurrency: races, locks, deadlocks, idempotency.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountRaceLab, mountDeadlockLab } from '../racelab.js';

const SLEEP = `const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // helper for the tests: keep it
`;
const WT = `const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg || "timed out: probably a deadlock")), ms))]);
`;

export const MX = {
  starter: `// A mutex: only ONE task may hold it at a time. Usage:
//   const release = await mutex.lock();
//   try { ...critical section... } finally { release(); }
// This version never blocks anyone. Fix it so that:
//   - lock() resolves immediately if free, otherwise WAITS in a first-in-first-out queue
//   - the function lock() resolves to is "release"; calling it hands the lock to the next waiter
//   - calling release twice must NOT release someone else's lock
class Mutex {
  async lock() {
    return () => {};
  }
}
` + SLEEP,
  visible: `test("a free mutex can be locked and released", async () => { const m = new Mutex(); const r = await m.lock(); r(); const r2 = await m.lock(); r2(); });
test("a second task waits until the first releases", async () => {
  const m = new Mutex(); const r1 = await m.lock(); let got = false;
  const p = m.lock().then((r) => { got = true; return r; });
  await sleep(10); expect(got).toBe(false);
  r1(); const r2 = await p; expect(got).toBe(true); r2();
});`,
  hidden: WT + `test("never more than one task inside the critical section", async () => {
  const m = new Mutex(); let inside = 0, peak = 0;
  await Promise.all(Array.from({ length: 50 }, async () => { const r = await m.lock(); try { inside++; peak = Math.max(peak, inside); await sleep(1); inside--; } finally { r(); } }));
  expect(peak).toBe(1);
});
test("waiters get the lock in the order they asked (FIFO)", async () => {
  const m = new Mutex(); const order = []; const r0 = await m.lock();
  const ps = [1, 2, 3, 4].map((i) => m.lock().then((r) => { order.push(i); r(); }));
  await sleep(5); r0(); await Promise.all(ps); expect(order).toEqual([1, 2, 3, 4]);
});
test("releasing twice does not steal the lock from the next owner", async () => {
  const m = new Mutex(); const rA = await m.lock(); let bHas = false, cHas = false;
  const pB = m.lock().then((r) => { bHas = true; return r; }); const pC = m.lock().then((r) => { cHas = true; return r; });
  rA(); rA(); const rB = await pB; await sleep(10);
  expect(bHas).toBe(true); expect(cHas).toBe(false);
  rB(); const rC = await pC; rC();
});
test("an unprotected read-modify-write becomes safe inside the lock", async () => {
  const m = new Mutex(); let n = 0;
  await Promise.all(Array.from({ length: 100 }, async () => { const r = await m.lock(); try { const x = n; await sleep(0); n = x + 1; } finally { r(); } }));
  expect(n).toBe(100);
});
test("2,000 waiters finish quickly", async () => {
  const m = new Mutex(); let n = 0;
  await withTimeout(Promise.all(Array.from({ length: 2000 }, async () => { const r = await m.lock(); n++; r(); })), 1500, "too slow");
  expect(n).toBe(2000);
});`,
};

export const ML = {
  starter: `// mapLimit(items, limit, fn): like Promise.all(items.map(fn)) but with AT MOST "limit" calls running at once.
// Results keep the order of items. fn(item, index) returns a promise. If any call fails, reject with that error
// and do not START any more calls. Real uses: calling an API with a rate limit, uploading 1000 files.
// This version starts everything at once (a "thundering herd").
async function mapLimit(items, limit, fn) {
  return Promise.all(items.map((item, i) => fn(item, i)));
}
` + SLEEP,
  visible: `test("results keep their order", async () => { expect(await mapLimit([1, 2, 3], 2, async (x) => x * 10)).toEqual([10, 20, 30]); });
test("empty input", async () => { expect(await mapLimit([], 3, async (x) => x)).toEqual([]); });`,
  hidden: WT + `test("never more than 'limit' at once, but really does use all of them", async () => {
  let running = 0, peak = 0;
  await mapLimit(Array.from({ length: 20 }, (_, i) => i), 3, async () => { running++; peak = Math.max(peak, running); await sleep(5); running--; });
  expect(peak).toBe(3);
});
test("order is kept even when later items finish first", async () => {
  const r = await mapLimit([30, 1, 20, 2], 2, async (ms, i) => { await sleep(ms); return i; });
  expect(r).toEqual([0, 1, 2, 3]);
});
test("limit bigger than the list", async () => { expect(await mapLimit([1, 2], 10, async (x) => x + 1)).toEqual([2, 3]); });
test("a failure rejects and stops starting new calls", async () => {
  let started = 0, err = null;
  try { await mapLimit(Array.from({ length: 100 }, (_, i) => i), 2, async (i) => { started++; await sleep(2); if (i === 3) throw new Error("boom"); return i; }); } catch (e) { err = e; }
  expect(err && err.message).toBe("boom"); await sleep(60); expect(started).toBeLessThan(15);
});
test("2,000 items with limit 10 finish quickly", async () => {
  const r = await withTimeout(mapLimit(Array.from({ length: 2000 }, (_, i) => i), 10, async (x) => x * 2), 1500, "too slow");
  expect(r.length).toBe(2000); expect(r[1999]).toBe(3998);
});`,
};

const BANK = `class Mutex {
  constructor() { this.locked = false; this.waiters = []; }
  async lock() {
    if (!this.locked) this.locked = true; else await new Promise((r) => this.waiters.push(r));
    let done = false;
    return () => { if (done) return; done = true; const n = this.waiters.shift(); if (n) n(); else this.locked = false; };
  }
}
class Account { constructor(id, balance) { this.id = id; this.balance = balance; this.mutex = new Mutex(); } }
`;
export const TR = {
  starter: `// transfer(from, to, amount): move money between two accounts, safely, while other transfers run at the same time.
// Mutex and Account are given (each account has its own lock). This version locks "from" then "to".
// Two opposite transfers (A→B and B→A) at once will DEADLOCK. Fix it. Also handle from === to.
// Rules: throw Error("insufficient funds") if the balance is too low (and leave everything unlocked and unchanged).
` + BANK + `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function transfer(from, to, amount) {
  const r1 = await from.mutex.lock();
  const r2 = await to.mutex.lock();
  try {
    if (from.balance < amount) throw new Error("insufficient funds");
    await sleep(1); // a database call
    from.balance -= amount;
    to.balance += amount;
  } finally {
    r2(); r1();
  }
}
`,
  visible: `test("a simple transfer", async () => { const a = new Account("A", 100), b = new Account("B", 0); await transfer(a, b, 30); expect(a.balance).toBe(70); expect(b.balance).toBe(30); });
test("insufficient funds throws", async () => { const a = new Account("A", 10), b = new Account("B", 0); let e = null; try { await transfer(a, b, 50); } catch (x) { e = x; } expect(e && e.message).toBe("insufficient funds"); expect(a.balance).toBe(10); });`,
  hidden: WT + `test("opposite transfers at the same moment do not deadlock", async () => {
  const a = new Account("A", 100), b = new Account("B", 100);
  await withTimeout(Promise.all([transfer(a, b, 10), transfer(b, a, 25)]), 400);
  expect(a.balance).toBe(115); expect(b.balance).toBe(85);
});
test("transferring to yourself does not hang and changes nothing", async () => {
  const a = new Account("A", 100); await withTimeout(transfer(a, a, 10), 400); expect(a.balance).toBe(100);
});
test("only as many transfers succeed as the balance allows", async () => {
  const a = new Account("A", 100), b = new Account("B", 0); let ok = 0, fail = 0;
  await withTimeout(Promise.all(Array.from({ length: 5 }, () => transfer(a, b, 30).then(() => ok++, () => fail++))), 600);
  expect(ok).toBe(3); expect(fail).toBe(2); expect(a.balance).toBe(10); expect(b.balance).toBe(90);
});
test("a failed transfer does not leave the accounts locked", async () => {
  const a = new Account("A", 5), b = new Account("B", 5);
  try { await transfer(a, b, 100); } catch (e) {}
  await withTimeout(transfer(b, a, 1), 400); expect(a.balance).toBe(6);
});
test("60 random transfers among 4 accounts conserve the total and never hang", async () => {
  const acc = ["A", "B", "C", "D"].map((id) => new Account(id, 100)); let s = 2463534242;
  const rnd = (n) => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s % n; };
  const jobs = []; for (let i = 0; i < 60; i++) jobs.push(transfer(acc[rnd(4)], acc[rnd(4)], 1 + rnd(20)).catch(() => {}));
  await withTimeout(Promise.all(jobs), 900);
  expect(acc.reduce((t, x) => t + x.balance, 0)).toBe(400); expect(acc.every((x) => x.balance >= 0)).toBe(true);
});`,
};

export const ID = {
  starter: `// makeIdempotent(): returns a function run(key, fn). It makes sure fn runs ONCE per key, even with double-clicks and retries.
//   - concurrent calls with the same key share ONE running call and all get its result
//   - after success, later calls with that key return the saved result without running fn again
//   - if fn fails, every waiting caller gets the error, and the key is NOT saved (a retry may run fn again)
//   - different keys are independent
// This version just runs fn every time: a double-click charges the card twice.
function makeIdempotent() {
  return (key, fn) => fn();
}
` + SLEEP,
  visible: `test("a double click runs the payment once", async () => {
  const run = makeIdempotent(); let charges = 0;
  const pay = async () => { charges++; await sleep(5); return "receipt-1"; };
  const [a, b] = await Promise.all([run("order-9", pay), run("order-9", pay)]);
  expect(charges).toBe(1); expect(a).toBe("receipt-1"); expect(b).toBe("receipt-1");
});`,
  hidden: `test("ten concurrent calls, one execution, one result", async () => {
  const run = makeIdempotent(); let n = 0;
  const rs = await Promise.all(Array.from({ length: 10 }, () => run("k", async () => { n++; await sleep(5); return { id: 7 }; })));
  expect(n).toBe(1); expect(rs.every((r) => r === rs[0])).toBe(true);
});
test("a later call with the same key reuses the saved result", async () => {
  const run = makeIdempotent(); let n = 0; const f = async () => ++n;
  expect(await run("k", f)).toBe(1); expect(await run("k", f)).toBe(1); expect(n).toBe(1);
});
test("different keys do not interfere", async () => {
  const run = makeIdempotent(); let n = 0; const f = async () => { n++; await sleep(2); return n; };
  await Promise.all([run("a", f), run("b", f), run("c", f)]); expect(n).toBe(3);
});
test("a failure reaches every waiter and is NOT saved", async () => {
  const run = makeIdempotent(); let n = 0;
  const bad = async () => { n++; await sleep(2); throw new Error("card declined"); };
  const rs = await Promise.all([run("k", bad).catch((e) => e.message), run("k", bad).catch((e) => e.message)]);
  expect(rs).toEqual(["card declined", "card declined"]); expect(n).toBe(1);
  expect(await run("k", async () => "ok")).toBe("ok");
});
test("a function that throws synchronously still rejects cleanly", async () => {
  const run = makeIdempotent(); let msg = null;
  try { await run("k", () => { throw new Error("sync"); }); } catch (e) { msg = e.message; }
  expect(msg).toBe("sync");
});`,
};

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const challenge = (right, api, tasks, msg, xp) => mountTestChallenge(right.querySelector('#lab'), { tasks, onPass: finish(right, api, msg, xp) });
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l24',
  title: 'Lesson 24 · Concurrency',
  spreads: [
    // ───────────────────────── Spread 1: the race (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Concurrency · when two things happen at once</p>
        <h1>Races: the bug that only appears in production</h1>
        <p>Until now your code did one thing at a time. Real systems do many: thousands of web requests, background jobs, two people clicking "Buy" on the last ticket. <b>Concurrency</b> means several tasks are <i>in progress</i> in overlapping time. When they touch the <b>same data</b>, results can depend on exactly how their steps interleave. That is a <b>race condition</b>.</p>
        <h2>The classic: read-modify-write</h2>
        <pre><code>const balance = account.balance;   // 1. read   (500)
await db.save(...);                // 2. a pause: another task runs here!
account.balance = balance - 1;     // 3. write  (500 - 1, but the other task already changed it)</code></pre>
        <p>Two tasks read 500. Both write 499. One decrement is gone: a <b>lost update</b>. Nothing crashed, no error appeared, and the money is simply wrong. These bugs are rare in tests, frequent under load, and nearly impossible to reproduce on demand. That is why you must <b>design</b> them out instead of hoping.</p>
        <h2>Vocabulary</h2>
        <ul>
          <li><b>Critical section:</b> the stretch of code that must not be interleaved with another task's use of the same data.</li>
          <li><b>Atomic:</b> all-or-nothing, uninterrupted. An atomic step cannot be observed half-done.</li>
          <li><b>Mutex (lock):</b> only one task may hold it. Everyone else waits. It makes a critical section behave atomically.</li>
          <li><b>Concurrency vs parallelism:</b> concurrency is structure (many tasks in flight); parallelism is simultaneous execution on several CPU cores. JavaScript runs your code on one thread but is still concurrent: every <code>await</code> is a point where other tasks may run.</li>
        </ul>
        <div class="senior">In JavaScript, a stretch of code with <b>no <code>await</code></b> cannot be interleaved with anything. Threaded languages (Java, Go, C, Python threads) can switch tasks between <i>any</i> two instructions, so they need locks far more often. Either way, the real shared state usually lives in a <b>database</b>, and then you need its tools (transactions, lesson 25). The lock in your app only protects one process.</div>
        ${back}`,
      right: `<p class="kicker">Lab · lose some money</p><div id="lab"></div>${foot('lose money, then fix it with a mutex, to turn the page')}`,
      init(left, right, api) {
        mountRaceLab(right.querySelector('#lab'), { onPass: finish(right, api, 'race made and fixed', 700) });
      },
    },

    // ───────────────────────── Spread 2: mutex + mapLimit (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Concurrency · locks and limits</p>
        <h1>Build a mutex, then ration the work</h1>
        <p>A lock is not magic: it is a flag plus a <b>queue of waiters</b>. <code>lock()</code> returns immediately if the flag is free; otherwise the caller joins the queue and sleeps. <code>release()</code> hands the lock <i>directly</i> to the next waiter, so nobody can sneak in between.</p>
        <h2>Rules for using locks well</h2>
        <ul>
          <li><b>Always release in <code>finally</code>.</b> If the critical section throws and you did not release, everyone queues forever.</li>
          <li><b>Keep the critical section tiny.</b> Never hold a lock while waiting on something slow and unrelated. A lock turns concurrency back into a single file line.</li>
          <li><b>Protect the data, not the function.</b> Decide which data a lock guards and always take that lock when touching it. One forgotten path breaks everything.</li>
          <li>A release should only work <b>once</b>; a double release must never free someone else's lock.</li>
        </ul>
        <h2>The opposite problem: too much concurrency</h2>
        <p>Firing 10,000 requests at once crushes the target (and gets you rate-limited or banned), exhausts memory and sockets, and is a "thundering herd". The answer is a <b>concurrency limit</b>: a pool of N workers pulling jobs from a shared list. That is what <code>mapLimit</code> does, and it is the same idea as a thread pool, a connection pool and a semaphore (a lock that admits N holders).</p>
        <div class="senior">Whenever something is limited (database connections, API rate, memory) put a bounded queue or a pool in front of it. <b>Unbounded concurrency is a bug waiting for traffic</b>. And decide what happens on failure: stop the batch, or collect errors? State it.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · Mutex, mapLimit</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'Mutex: a FIFO lock', visible: MX.visible, hidden: MX.hidden, starter: MX.starter, rows: 12 },
          { kind: 'implement', question: 'mapLimit: bounded concurrency', visible: ML.visible, hidden: ML.hidden, starter: ML.starter, rows: 8 },
        ], 'locks and limits built', 1100);
      },
    },

    // ───────────────────────── Spread 3: deadlock (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Concurrency · deadlock</p>
        <h1>Deadlock: everyone waits, forever</h1>
        <p>Locks fix races but create a new failure. <b>Deadlock</b> happens when tasks wait for each other in a circle: T1 holds A and wants B; T2 holds B and wants A. Neither can proceed, neither lets go, and the system just... stops. No error, no crash, no CPU use: a frozen request and eventually a frozen server.</p>
        <h2>The four conditions (all must hold)</h2>
        <ol>
          <li><b>Mutual exclusion:</b> resources can be held by one task at a time.</li>
          <li><b>Hold and wait:</b> a task holds one resource while asking for another.</li>
          <li><b>No preemption:</b> you cannot take a lock away from its holder.</li>
          <li><b>Circular wait:</b> a cycle of tasks each waiting for the next.</li>
        </ol>
        <p>Break <b>any one</b> and deadlock is impossible. The most practical is the last: impose a <b>global lock order</b>. If every task takes locks in the same order (for example, by account id), a cycle cannot form.</p>
        <h2>Other defenses</h2>
        <ul>
          <li><b>Timeouts</b> on lock acquisition, with a clear error and a retry, so nothing waits forever.</li>
          <li><b>Take only one lock at a time</b> when you can (redesign), or use <code>tryLock</code> and back off.</li>
          <li><b>Databases</b> detect deadlocks themselves and abort one transaction (the "victim"); your code must be ready to retry.</li>
          <li>Related failures: <b>livelock</b> (everyone keeps politely stepping aside and nothing finishes) and <b>starvation</b> (an unlucky task never gets the lock).</li>
        </ul>
        <div class="senior">A frozen process with no errors in the logs is the signature of a deadlock. Take a thread or task dump, and look for who holds what and who waits for whom. And remember the lesson from your own system: <b>every wait needs a timeout</b>.</div>
        ${back}`,
      right: `<p class="kicker">Lab · freeze it, then fix it</p><div id="lab"></div>${foot('cause a deadlock, then run the fixed order')}`,
      init(left, right, api) {
        mountDeadlockLab(right.querySelector('#lab'), { onPass: finish(right, api, 'deadlock caused and broken', 800) });
      },
    },

    // ───────────────────────── Spread 4: transfer + idempotency (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Concurrency · safe transfers, safe retries</p>
        <h1>Order the locks, and make retries harmless</h1>
        <h2>Challenge 1: a deadlock-free transfer</h2>
        <p>Each account has its own lock, so unrelated transfers run in parallel. The starter takes <code>from</code> then <code>to</code>, which is the deadlock you just made. Fix it by always locking the <b>lower id first</b>, and handle <code>from === to</code> (locking the same lock twice would wait for yourself forever).</p>
        <h2>Challenge 2: idempotency</h2>
        <p>Networks fail, users double-click, queues redeliver messages. So every operation <i>will</i> eventually be attempted twice. An operation is <b>idempotent</b> if doing it twice has the same effect as once. Reads and "set balance to 10" are; "add $10" is not.</p>
        <ul>
          <li>Give each logical action an <b>idempotency key</b> (an order id, a UUID the client generates). The server remembers the result for that key and replays it for duplicates. Payment APIs such as Stripe work this way.</li>
          <li><b>Single flight:</b> if the same key is already running, new callers wait for that run instead of starting another.</li>
          <li>Do <b>not</b> remember failures. A transient error must be retryable.</li>
          <li>In a real system the saved results live in a database with a unique constraint on the key, because a process memory dies on restart and does not cover a second server. Lesson 26 returns to this.</li>
        </ul>
        <div class="warn">"Exactly once" delivery is mostly a myth. What systems really provide is <b>at-least-once delivery plus idempotent handling</b>, which behaves like exactly once. Design every consumer to survive duplicates.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · transfer, idempotency</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'transfer: ordered locks, no deadlock', visible: TR.visible, hidden: TR.hidden, starter: TR.starter, rows: 14 },
          { kind: 'implement', question: 'makeIdempotent: run once per key', visible: ID.visible, hidden: ID.hidden, starter: ID.starter, rows: 9 },
        ], 'safe under concurrency', 1300);
      },
    },

    // ───────────────────────── Spread 5: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself · concurrency</p>
        <h1>Four judgment calls</h1>
        <p>You have created a race, fixed it with a lock, built that lock, rationed work, caused and broken a deadlock, and made retries safe. Next, lesson 25 goes into the place where most shared state really lives: <b>the database</b>, with indexes, transaction isolation and the same anomalies you just met.</p>
        ${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Two requests both read a stock of 1, both see "available", both decrement and save. Two customers bought the last item. What is this called?</p>',
            options: ['A deadlock', 'A race condition (lost update) on read-modify-write', 'A memory leak', 'A cache miss'], answer: 1,
            why: 'Check-then-act without atomicity. The fix is a lock, a transaction, or a single atomic UPDATE ... WHERE stock > 0.' },
          { prompt: '<p>Task 1 locks A then B. Task 2 locks B then A. Both hang with no error. What is the cleanest fix?</p>',
            options: ['A faster server', 'Make every task acquire locks in the same global order (and use timeouts)', 'Remove the locks entirely', 'Retry in a tight loop forever'], answer: 1,
            why: 'A fixed order prevents circular wait. Timeouts turn a silent freeze into a visible, retryable error.' },
          { prompt: '<p>Why must a lock be released inside <code>finally</code>?</p>',
            options: ['Style', 'If the critical section throws, a missed release would block every later task forever', 'finally is faster', 'It is not necessary'], answer: 1,
            why: 'An exception is the normal way a release gets skipped. finally makes release unconditional.' },
          { prompt: '<p>A payment request times out, and the client retries. How do you avoid charging the customer twice?</p>',
            options: ['Hope the first one failed', 'Send an idempotency key; the server stores the result per key and returns it for duplicates', 'Disable retries and tell users to wait', 'Charge less the second time'], answer: 1,
            why: 'Retries are unavoidable, so make the operation safe to repeat. Store the key (unique constraint) with the result.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(800); });
      },
    },
  ],
};
