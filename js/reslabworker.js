// reslabworker.js — the "chaos" test bench for lesson 13 (a classic Web Worker).
// It takes the learner's resilientCall(callService) function and throws five situations at it:
// a healthy dependency, a flaky one, a slow one, a dead one, and one that dies and then recovers.
// Each scenario gets its OWN copy of the learner's code, so a circuit breaker's memory never leaks between them.

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function seeded(seed) {                         // the same "random" numbers every run, so results are stable
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

const SCENARIOS = [
  { id: 'healthy',  name: 'Healthy',        n: 40, gap: 5,  behave: () => ({ ok: true, delay: 20 }) },
  { id: 'flaky',    name: 'Flaky (30% fail)', n: 40, gap: 5, behave: (c, now, r) => (r() < 0.3 ? { ok: false, delay: 15 } : { ok: true, delay: 20 }) },
  { id: 'slow',     name: 'Slow (20% hang 1.5 s)', n: 30, gap: 5, behave: (c, now, r) => (r() < 0.2 ? { ok: true, delay: 1500 } : { ok: true, delay: 20 }) },
  { id: 'down',     name: 'Down',           n: 40, gap: 5,  behave: () => ({ ok: false, delay: 10 }) },
  { id: 'recovery', name: 'Dies, then recovers', n: 50, gap: 50, behave: (c, now) => (now < 600 ? { ok: false, delay: 10 } : { ok: true, delay: 20 }) },
];

async function runScenario(sc, code) {
  const rand = seeded(sc.id.length * 7919 + sc.n);
  const t0 = performance.now();
  let calls = 0;
  const callService = () => {                    // what the learner may call: ONE attempt at the dependency
    calls++;
    const b = sc.behave(calls, performance.now() - t0, rand);
    return new Promise((resolve, reject) => setTimeout(() => (b.ok ? resolve({ ok: true, data: 'payload' }) : reject(new Error('service error'))), b.delay));
  };

  let fn = null;
  try {
    fn = await new AsyncFunction('sleep', '"use strict";\n' + code + '\n;return typeof resilientCall === "function" ? resilientCall : null;')(sleep);
  } catch (e) { return { id: sc.id, name: sc.name, error: (e && e.name ? e.name + ': ' : '') + e.message }; }
  if (!fn) return { id: sc.id, name: sc.name, error: 'Define  async function resilientCall(callService) { ... }' };

  const lat = []; let ok = 0, fallback = 0, errors = 0, lateOk = 0, lateN = 0;
  for (let i = 0; i < sc.n; i++) {
    const start = performance.now();
    let outcome = 'error';
    try {
      const result = await Promise.race([fn(callService), sleep(4000).then(() => { throw new Error('hung'); })]);
      outcome = result && result.fallback === true ? 'fallback' : result && result.ok === true ? 'ok' : 'error';
    } catch (e) { outcome = 'error'; }
    lat.push(performance.now() - start);
    if (outcome === 'ok') ok++; else if (outcome === 'fallback') fallback++; else errors++;
    if (sc.id === 'recovery' && start - t0 > 1600) { lateN++; if (outcome === 'ok') lateOk++; }
    await sleep(sc.gap);
  }
  lat.sort((a, b) => a - b);
  return { id: sc.id, name: sc.name, n: sc.n, ok, fallback, errors, calls, avgMs: lat.reduce((a, b) => a + b, 0) / lat.length, p95Ms: lat[Math.floor(lat.length * 0.95)] || 0, lateOk, lateN };
}

self.onmessage = async (event) => {
  const results = await Promise.all(SCENARIOS.map((sc) => runScenario(sc, event.data.code)));
  self.postMessage({ ok: true, results });
};
