// runner.js — runs the learner's code safely.
//
// WHY a Web Worker? Learner code can contain mistakes like `while (true) {}`.
// If we ran it on the page itself, the whole book would freeze forever.
// A Worker is a separate background thread: if it hangs, we simply kill it.
// It also has no access to the page (DOM), so the learner's code can't break the book.

// This text becomes the Worker's program. It lives in a string so the whole
// project works without a build step or extra files.
const WORKER_SOURCE = `
  // Turn any JavaScript value into { type, text } that we can send back safely.
  function describe(value) {
    if (value === null) return { type: 'null', text: 'null' };
    const t = typeof value;
    if (t === 'string') return { type: 'string', text: JSON.stringify(value) };
    if (t === 'undefined') return { type: 'undefined', text: 'undefined' };
    if (t === 'function') return { type: 'function', text: 'ƒ ' + (value.name || '(anonymous)') };
    if (t === 'object') {
      const kind = Array.isArray(value) ? 'array' : 'object';
      try { return { type: kind, text: JSON.stringify(value) }; }
      catch (e) { return { type: kind, text: String(value) }; }
    }
    return { type: t, text: String(value) }; // number, boolean, bigint, symbol
  }

  self.onmessage = (event) => {
    const { code, names, fnNames, probes, stepNames } = event.data;
    const logs = [];
    // ---- Loop tracing: at the start of every loop pass we copy the variables we can see. ----
    const steps = [];
    function step(loopId, readVars) {
      if (steps.length >= 400) return;                       // cap: a runaway loop must not eat memory
      const raw = readVars();
      const vars = {};
      for (const k of Object.keys(raw)) {
        const text = describe(raw[k]).text;
        if (typeof raw[k] !== 'function') vars[k] = text.length > 40 ? text.slice(0, 37) + '...' : text;
      }
      steps.push({ loop: loopId, vars });
    }
    // ---- Call tracing: every time a traced function starts or ends, we write it down. ----
    const events = [];
    let truncated = false;
    function record(entry) {
      if (events.length >= 300) { truncated = true; return; }   // never let a runaway program flood memory
      events.push(entry);
    }
    function trace(fn, name) {
      return function (...args) {
        const shownArgs = args.map(a => describe(a).text);
        record({ t: 'call', name, args: shownArgs });
        try {
          const result = fn.apply(this, args);
          record({ t: 'ret', name, args: shownArgs, value: describe(result).text });
          return result;
        } catch (e) {
          record({ t: 'throw', name, args: shownArgs });
          throw e;
        }
      };
    }
    // Replace console.log so we can show the output inside the book.
    const fakeConsole = {
      log: (...args) => logs.push(args.map(a => describe(a).text.replace(/^"|"$/g, '')).join(' ')),
    };
    try {
      // After the learner's code runs we read each variable they declared.
      // try/catch per name because a variable inside a block { } is not visible out here.
      const snapshotCode = names
        .map(n => 'try { __s[' + JSON.stringify(n) + '] = ' + n + '; } catch (e) {}')
        .join('\\n');
      // Function declarations are "hoisted": they exist before any line runs. So on the very first
      // line we can swap each one for a traced wrapper. (try/catch: skip any we can't reach.)
      const wrapCode = fnNames
        .map(n => 'try { ' + n + ' = __trace(' + n + ', ' + JSON.stringify(n) + '); } catch (e) {}')
        .join('\\n');
      // Probes = extra test expressions the lesson wants evaluated using the learner's code.
      const probeCode = Object.keys(probes)
        .map(k => 'try { __p[' + JSON.stringify(k) + '] = (' + probes[k] + '); } catch (e) { __p[' + JSON.stringify(k) + '] = { __error: String(e && e.message) }; }')
        .join('\\n');
      // Put a __step(...) call at the top of every for-loop and while-loop body.
      // It reads every variable name from the file (those not visible there are skipped).
      let loopId = 0;
      const reader = '() => { const o = {}; ' +
        stepNames.map(n => 'try { o[' + JSON.stringify(n) + '] = ' + n + '; } catch (e) {}').join(' ') + ' return o; }';
      const loopPattern = /\\b(?:for|while)\\s*\\((?:[^()]|\\([^()]*\\))*\\)\\s*\\{/g;
      const instrumented = stepNames.length
        ? code.replace(loopPattern, (m) => m + ' __step(' + (loopId++) + ', ' + reader + ');')
        : code;
      const body = '"use strict";\\nconst __s = {}; const __p = {};\\n' + wrapCode + '\\n' + instrumented + '\\n;' + snapshotCode + '\\n' + probeCode + '\\nreturn { __s, __p };';
      const run = new Function('console', '__trace', '__step', body);
      const packed = run(fakeConsole, trace, step);
      const raw = packed.__s;
      const probeOut = {};
      for (const k of Object.keys(packed.__p)) {
        const v = packed.__p[k];
        probeOut[k] = (typeof v === 'function' || typeof v === 'symbol') ? String(v) : v;
      }
      const vars = {};
      for (const key of Object.keys(raw)) vars[key] = describe(raw[key]);
      // 'raw' is also sent so lesson tests can compare real values (===), not just text.
      const values = {};
      for (const key of Object.keys(raw)) {
        const v = raw[key];
        values[key] = (typeof v === 'function') ? '[function]' : v;
      }
      self.postMessage({ ok: true, vars, values, logs, probes: probeOut, events, truncated, steps });
    } catch (error) {
      self.postMessage({ ok: false, error: (error && error.name ? error.name + ': ' : '') + (error && error.message ? error.message : String(error)), logs, events, truncated, steps });
    }
  };
`;

// Find names the learner declared with let / const / var, in order.
export function declaredNames(code) {
  const names = [];
  const pattern = /\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = pattern.exec(code)) !== null) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

// Find names of functions written as `function name(` (these can be traced).
export function declaredFunctions(code) {
  const names = [];
  const pattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let match;
  while ((match = pattern.exec(code)) !== null) if (!names.includes(match[1])) names.push(match[1]);
  return names;
}

// Names of function parameters, so loop traces can show them too (e.g. n in sumTo(n)).
export function declaredParams(code) {
  const names = [];
  const pattern = /\bfunction\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/g;
  let match;
  while ((match = pattern.exec(code)) !== null) {
    for (const raw of match[1].split(',')) {
      const n = raw.trim().replace(/=.*/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n) && !names.includes(n)) names.push(n);
    }
  }
  return names;
}

// Remember which keyword each name was declared with (let / const / var).
export function declaredKinds(code) {
  const kinds = {};
  const pattern = /\b(let|const|var)\s+([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = pattern.exec(code)) !== null) kinds[match[2]] = match[1];
  return kinds;
}

// Run code and resolve with { ok, vars, values, logs, error, source }.
// Gives up after `timeoutMs` and kills the worker (this is how infinite loops are survived).
export function runCode(code, { timeoutMs = 1500, probes = {} } = {}) {
  return new Promise((resolve) => {
    const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    let finished = false;

    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ source: code, kinds: declaredKinds(code), vars: {}, values: {}, logs: [], probes: {}, events: [], truncated: false, steps: [], ...result });
    };

    const timer = setTimeout(
      () => finish({ ok: false, error: 'Timed out: your code ran for over 1.5 seconds. Is there a loop that never ends?' }),
      timeoutMs,
    );
    worker.onmessage = (e) => finish(e.data);
    worker.onerror = (e) => finish({ ok: false, error: e.message || 'Unknown error' });
    worker.postMessage({ code, names: declaredNames(code), fnNames: declaredFunctions(code), probes, stepNames: [...new Set([...declaredNames(code), ...declaredParams(code)])] });
  });
}
