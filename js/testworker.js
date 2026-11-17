// testworker.js — a tiny test framework (like Jest or Vitest) running in a Web Worker.
// Receives { code, tests } and answers with one result per test.
//
// WHY a worker: the code under test might loop forever; the page can then simply kill the worker.

self.onmessage = async (event) => {
  const { code, tests } = event.data;
  const queue = [];              // every test() call is stored here, then run one by one
  const path = [];               // names of the describe() blocks we are inside

  function describe(name, fn) { path.push(name); try { fn(); } finally { path.pop(); } }
  function test(name, fn) { queue.push({ name: path.concat(name).join(' › '), fn }); }

  // ---- expect(...): the assertion helpers ----
  const show = (v) => { try { return typeof v === 'undefined' ? 'undefined' : typeof v === 'function' ? '[function]' : JSON.stringify(v); } catch (e) { return String(v); } };
  function deepEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  class AssertionError extends Error {}
  function expect(actual) {
    const make = (negate) => {
      const check = (pass, message) => { if (negate ? pass : !pass) throw new AssertionError((negate ? 'NOT: ' : '') + message); };
      return {
        toBe: (e) => check(Object.is(actual, e), 'Expected ' + show(e) + ', received ' + show(actual)),
        toEqual: (e) => check(deepEqual(actual, e), 'Expected ' + show(e) + ', received ' + show(actual)),
        toBeTruthy: () => check(!!actual, 'Expected a truthy value, received ' + show(actual)),
        toBeFalsy: () => check(!actual, 'Expected a falsy value, received ' + show(actual)),
        toBeNull: () => check(actual === null, 'Expected null, received ' + show(actual)),
        toBeUndefined: () => check(actual === undefined, 'Expected undefined, received ' + show(actual)),
        toBeGreaterThan: (e) => check(actual > e, 'Expected ' + show(actual) + ' to be greater than ' + show(e)),
        toBeLessThan: (e) => check(actual < e, 'Expected ' + show(actual) + ' to be less than ' + show(e)),
        toBeCloseTo: (e, digits = 2) => check(Math.abs(actual - e) < Math.pow(10, -digits) / 2, 'Expected ' + show(actual) + ' to be close to ' + show(e)),
        toContain: (e) => check(actual != null && actual.includes(e), 'Expected ' + show(actual) + ' to contain ' + show(e)),
        toHaveLength: (n) => check(actual != null && actual.length === n, 'Expected length ' + n + ', received ' + (actual == null ? show(actual) : actual.length)),
        toThrow: () => {
          let threw = false;
          try { actual(); } catch (err) { threw = true; }
          check(threw, 'Expected the function to throw an error, but it did not');
        },
      };
    };
    const api = make(false); api.not = make(true);
    return api;
  }

  try {
    new Function('describe', 'test', 'it', 'expect', '"use strict";\n' + code + '\n' + tests)(describe, test, test, expect);
  } catch (e) {
    self.postMessage({ ok: false, error: (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)) });
    return;
  }
  const results = [];
  for (const t of queue) {
    try { await t.fn(); results.push({ name: t.name, ok: true }); }
    catch (e) { results.push({ name: t.name, ok: false, error: (e && e.message) ? e.message : String(e) }); }
  }
  self.postMessage({ ok: true, results });
};
