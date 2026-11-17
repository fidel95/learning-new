// tscheck.js — main-thread helpers that talk to the TypeScript worker and the test worker.
import { runCode } from './runner.js';

const TS_WORKER_URL = new URL('./tsworker.js', import.meta.url).href;
const TEST_WORKER_URL = new URL('./testworker.js', import.meta.url).href;

// ---------- TypeScript checking (one long-lived worker, restarted if it hangs) ----------
let tsWorker = null, nextId = 1; const waiting = new Map();

function startTs() {
  tsWorker = new Worker(TS_WORKER_URL);
  tsWorker.onmessage = (e) => { const w = waiting.get(e.data.id); if (w) { waiting.delete(e.data.id); clearTimeout(w.timer); w.resolve(e.data); } };
  tsWorker.onerror = (e) => failAll('The TypeScript worker failed: ' + (e.message || 'unknown error'));
}
function failAll(error) { for (const [id, w] of waiting) { clearTimeout(w.timer); w.resolve({ id, ok: false, error }); } waiting.clear(); if (tsWorker) { tsWorker.terminate(); tsWorker = null; } }

/** checkTs(code) → { ok, diagnostics: [{line, col, code, message}], js } */
export function checkTs(code) {
  if (!tsWorker) startTs();
  return new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => { waiting.delete(id); failAll('The TypeScript checker took too long and was restarted.'); resolve({ id, ok: false, error: 'The TypeScript checker took too long and was restarted. Try again.' }); }, 30000);
    waiting.set(id, { resolve, timer });
    tsWorker.postMessage({ id, code });
  });
}

/** Run plain JavaScript (the compiled output) safely and return { ok, logs, error }. */
export async function runJs(js) { const r = await runCode(js); return { ok: r.ok, logs: r.logs, error: r.error }; }

// ---------- Running tests (a fresh worker each time) ----------
/** runTests(code, tests) → { ok, results: [{ name, ok, error }] } or { ok:false, error } */
export function runTests(code, tests, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const worker = new Worker(TEST_WORKER_URL);
    let done = false;
    const finish = (r) => { if (done) return; done = true; clearTimeout(timer); worker.terminate(); resolve(r); };
    const timer = setTimeout(() => finish({ ok: false, error: 'Timed out after ' + timeoutMs / 1000 + ' seconds. Is there a loop that never ends?' }), timeoutMs);
    worker.onmessage = (e) => finish(e.data);
    worker.onerror = (e) => finish({ ok: false, error: e.message || 'Unknown error' });
    worker.postMessage({ code, tests });
  });
}
