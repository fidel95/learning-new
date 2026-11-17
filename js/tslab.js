// tslab.js — tools for lesson 9: a TypeScript playground, type-fixing challenge cards,
// a test lab, and test-writing challenge cards.
import { checkTs, runJs, runTests } from './tscheck.js';
import { el } from './workbench.js';

function wireEditor(editor, run) {
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end'); }
  });
}

// Remove comments so a word inside a comment does not trip our "no any / no ts-ignore" rules.
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const FORBIDDEN = [
  { re: /\bany\b/, msg: 'The type "any" switches the safety off, so it is not allowed here.' },
  { re: /@ts-(ignore|nocheck|expect-error)/, msg: 'Silencing the compiler with a @ts- comment is not allowed. Fix the cause.' },
  { re: /\bas\s+unknown\b/, msg: '"as unknown as ..." is a trick that lies to the compiler. Fix the types instead.' },
];

function drawProblems(box, r) {
  box.replaceChildren();
  if (!r.ok) { box.append(el('div', { class: 'status status--warn' }, r.error)); return; }
  if (!r.diagnostics.length) { box.append(el('div', { class: 'status status--good' }, '✓ No type errors')); return; }
  box.append(el('div', { class: 'status status--bad' }, r.diagnostics.length + ' type error' + (r.diagnostics.length === 1 ? '' : 's')));
  r.diagnostics.forEach((d) => {
    const row = el('div', { class: 'problem' });
    row.append(el('span', { class: 'problem__pos' }, 'line ' + d.line + ':' + d.col), el('span', { class: 'problem__msg' }, d.message), el('span', { class: 'problem__code' }, 'TS' + d.code));
    box.append(row);
  });
}

// ------------------------------------------------------------------------------------------
// TypeScript playground
// ------------------------------------------------------------------------------------------
export function mountTsLab(root, { starter, rows = 12 }) {
  const editor = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'TypeScript editor' });
  editor.value = starter;
  const runBtn = el('button', { class: 'btn', type: 'button' }, 'Check & run  (Ctrl/⌘ + Enter)');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset code');
  const status = el('span', {});
  const bar = el('div', { class: 'bar' }); bar.append(runBtn, resetBtn, status);
  const problems = el('div'); const jsBox = el('pre', { class: 'raw' }); const consoleBox = el('div', { class: 'console' });
  const details = el('details', { class: 'jsout' }); details.append(el('summary', {}, 'The JavaScript this becomes (the types are simply deleted)'), jsBox);
  root.append(editor, bar, el('div', { class: 'label' }, 'Type checker'), problems, el('div', { class: 'label' }, 'Console (the program still runs, even with type errors)'), consoleBox, details);

  let runId = 0, first = true;
  async function run() {
    const id = ++runId;
    status.textContent = first ? 'loading the TypeScript compiler (3 MB, first time only)…' : 'checking…';
    runBtn.disabled = true;
    const r = await checkTs(editor.value);
    if (id !== runId) return;
    first = false; runBtn.disabled = false;
    status.textContent = r.ok ? (r.diagnostics.length ? r.diagnostics.length + ' problem(s)' : 'all good') : 'checker problem';
    drawProblems(problems, r);
    consoleBox.replaceChildren();
    if (!r.ok) return;
    jsBox.textContent = r.js.trim();
    const out = await runJs(r.js);
    if (id !== runId) return;
    out.logs.forEach((l) => consoleBox.append(el('div', {}, l)));
    if (!out.ok) consoleBox.append(el('div', { class: 'err' }, out.error));
    if (out.ok && !out.logs.length) consoleBox.append(el('div', { class: 'muted' }, '(no output: use console.log(x) to print)'));
  }
  runBtn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { editor.value = starter; run(); });
  wireEditor(editor, run);
  let t; editor.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 900); });
  run();
}

// ------------------------------------------------------------------------------------------
// TypeScript challenge cards
// ------------------------------------------------------------------------------------------
export function mountTsChallenge(root, { tasks, onPass = () => {} }) {
  const done = new Set(); let passed = false;
  tasks.forEach((t, i) => {
    const card = el('div', { class: 'sqlcard' });
    const title = el('div', { class: 'sqlcard__q' });
    title.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, (i + 1) + '. ' + t.question));
    const ed = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(t.rows || 9), 'aria-label': 'Code for task ' + (i + 1) });
    ed.value = t.starter;
    const btn = el('button', { class: 'btn', type: 'button' }, 'Check');
    const hint = el('span', { class: 'muted' }, 'expected output: ' + t.expect.join(' · '));
    const bar = el('div', { class: 'bar' }); bar.append(btn, hint);
    const out = el('div');
    card.append(title, ed, bar, out); root.append(card);

    async function run() {
      btn.disabled = true; out.replaceChildren(el('div', { class: 'muted' }, 'checking…'));
      const r = await checkTs(ed.value);
      btn.disabled = false; out.replaceChildren();
      drawProblems(out, r);
      if (!r.ok || r.diagnostics.length) return;
      const plain = stripComments(ed.value);
      for (const f of FORBIDDEN) if (f.re.test(plain)) { out.append(el('div', { class: 'status status--warn' }, f.msg)); return; }
      const ran = await runJs(r.js);
      const box = el('div', { class: 'console' });
      ran.logs.forEach((l) => box.append(el('div', {}, l)));
      if (!ran.ok) box.append(el('div', { class: 'err' }, ran.error));
      out.append(box);
      const ok = ran.ok && JSON.stringify(ran.logs) === JSON.stringify(t.expect);
      if (ok) { done.add(i); title.classList.add('done'); }
      else out.append(el('div', { class: 'muted' }, 'It compiles, but the output is not what the task expects.'));
      if (done.size === tasks.length && !passed) { passed = true; onPass(); }
    }
    btn.addEventListener('click', run); wireEditor(ed, run);
  });
}

// ------------------------------------------------------------------------------------------
// Test results drawing + test lab
// ------------------------------------------------------------------------------------------
function drawTests(box, r, { hideNames = false } = {}) {
  box.replaceChildren();
  if (!r.ok) { const c = el('div', { class: 'console' }); c.append(el('div', { class: 'err' }, r.error)); box.append(c); return; }
  const passed = r.results.filter((x) => x.ok).length;
  box.append(el('div', { class: 'status status--' + (passed === r.results.length && r.results.length ? 'good' : 'bad') }, passed + ' of ' + r.results.length + ' tests passed'));
  r.results.forEach((x) => {
    const row = el('div', { class: 'testrow testrow--' + (x.ok ? 'ok' : 'fail') });
    row.append(el('span', { class: 'testrow__mark' }, x.ok ? '✓' : '✗'), el('span', {}, hideNames && x.ok ? '(hidden test passed)' : x.name));
    if (!x.ok && x.error) row.append(el('div', { class: 'testrow__err' }, x.error));
    box.append(row);
  });
}

export function mountTestLab(root, { code, tests, rows = 8 }) {
  const codeEd = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'Code under test' }); codeEd.value = code;
  const testEd = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows + 2), 'aria-label': 'Tests' }); testEd.value = tests;
  const runBtn = el('button', { class: 'btn', type: 'button' }, 'Run tests  (Ctrl/⌘ + Enter)');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset');
  const bar = el('div', { class: 'bar' }); bar.append(runBtn, resetBtn);
  const out = el('div');
  root.append(el('div', { class: 'label' }, 'Code under test'), codeEd, el('div', { class: 'label' }, 'Tests'), testEd, bar, el('div', { class: 'label' }, 'Test report'), out);
  async function run() { runBtn.disabled = true; const r = await runTests(codeEd.value, testEd.value); runBtn.disabled = false; drawTests(out, r); }
  runBtn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { codeEd.value = code; testEd.value = tests; run(); });
  wireEditor(codeEd, run); wireEditor(testEd, run);
  run();
}

// ------------------------------------------------------------------------------------------
// Test challenge cards:  kind 'implement' (make hidden tests pass)  or  'catch' (write tests that catch a bug)
// ------------------------------------------------------------------------------------------
export function mountTestChallenge(root, { tasks, onPass = () => {} }) {
  const done = new Set(); let passed = false;
  tasks.forEach((t, i) => {
    const card = el('div', { class: 'sqlcard' });
    const title = el('div', { class: 'sqlcard__q' });
    title.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, (i + 1) + '. ' + t.question));
    card.append(title);
    if (t.kind === 'implement') { card.append(el('div', { class: 'label' }, 'The visible tests (read-only)'), el('pre', { class: 'raw' }, t.visible)); }
    else { card.append(el('div', { class: 'label' }, 'The function being tested (you cannot see its code, only use it)'), el('pre', { class: 'raw' }, t.signature)); }
    const ed = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(t.rows || 10), 'aria-label': 'Editor for task ' + (i + 1) });
    ed.value = t.starter;
    card.append(el('div', { class: 'label' }, t.kind === 'implement' ? 'Your implementation' : 'Your tests'), ed);
    const btn = el('button', { class: 'btn', type: 'button' }, t.kind === 'implement' ? 'Run all tests' : 'Test my tests');
    const bar = el('div', { class: 'bar' }); bar.append(btn);
    const out = el('div');
    card.append(bar, out); root.append(card);

    async function run() {
      btn.disabled = true; out.replaceChildren(el('div', { class: 'muted' }, 'running…'));
      let ok = false;
      if (t.kind === 'implement') {
        const vis = await runTests(ed.value, t.visible);
        const hid = await runTests(ed.value, t.hidden);
        out.replaceChildren(); drawTests(out, vis);
        if (hid.ok) {
          const bad = hid.results.filter((x) => !x.ok);
          out.append(el('div', { class: 'status status--' + (bad.length ? 'warn' : 'good') }, bad.length ? bad.length + ' of ' + hid.results.length + ' hidden edge-case tests fail' : 'All ' + hid.results.length + ' hidden edge-case tests pass too'));
          bad.forEach((x) => out.append(el('div', { class: 'testrow testrow--fail' }, ' ✗ ' + x.name.replace(/^.*› /, '') + ' → ' + x.error)));
        } else out.append(el('div', { class: 'status status--bad' }, hid.error));
        ok = vis.ok && hid.ok && vis.results.length > 0 && vis.results.every((x) => x.ok) && hid.results.every((x) => x.ok);
      } else {
        const good = await runTests(t.correct, ed.value);
        const bugs = await runTests(t.buggy, ed.value);
        out.replaceChildren();
        const goodPass = good.ok && good.results.length >= (t.minTests || 3) && good.results.every((x) => x.ok);
        const caught = bugs.ok && bugs.results.some((x) => !x.ok);
        out.append(el('div', { class: 'status status--' + (goodPass ? 'good' : 'bad') }, goodPass ? '✓ Your tests pass on the correct code' : good.ok ? 'On the CORRECT code: ' + good.results.filter((x) => x.ok).length + ' of ' + good.results.length + ' pass (need ≥ ' + (t.minTests || 3) + ' tests, all passing)' : good.error));
        if (!good.ok || !goodPass) drawTests(out.appendChild(el('div')), good);
        out.append(el('div', { class: 'status status--' + (caught ? 'good' : 'bad') }, caught ? '✓ Your tests caught the bug in the faulty version' : 'The faulty version slipped through: every one of your tests still passed. Think about which input would expose the bug.'));
        ok = goodPass && caught;
      }
      btn.disabled = false;
      if (ok) { done.add(i); title.classList.add('done'); }
      if (done.size === tasks.length && !passed) { passed = true; onPass(); }
    }
    btn.addEventListener('click', run); wireEditor(ed, run);
  });
}
