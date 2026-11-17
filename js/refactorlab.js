// refactorlab.js — measure code design, and practise refactoring with a safety net of tests.
//   mountSmellLab : edit code, see its design metrics and "smells" update live
//   mountRefactor : refactor code; behavior tests must stay green while the design criteria get met
import { analyzeCode, runTests } from './tscheck.js';
import { el } from './workbench.js';

// Rules of thumb for "too much". (Teams argue about the exact numbers; the habit of measuring is the point.)
export const LIMITS = { lines: 15, complexity: 8, depth: 3, params: 4 };

function wireEditor(editor, run) {
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end'); }
  });
}

// ---------- drawing the metrics ----------
function cell(value, limit, text) {
  const td = el('td', { class: value > limit ? 'metric metric--bad' : value > limit * 0.75 ? 'metric metric--warn' : 'metric metric--ok' }, text !== undefined ? text : String(value));
  return td;
}
export function drawAnalysis(box, a, limits = LIMITS) {
  box.replaceChildren();
  if (a.syntax && a.syntax.length) { box.append(el('div', { class: 'status status--warn' }, 'Syntax problem: ' + a.syntax[0])); return; }
  if (!a.functions.length) { box.append(el('div', { class: 'muted' }, 'No functions found yet.')); return; }
  const t = el('table', { class: 'looptable' });
  const head = el('tr'); ['function', 'lines', 'complexity', 'nesting', 'params'].forEach((c) => head.append(el('th', {}, c))); t.append(head);
  a.functions.forEach((f) => {
    const tr = el('tr'); tr.append(el('td', {}, f.name), cell(f.lines, limits.lines), cell(f.complexity, limits.complexity), cell(f.depth, limits.depth), cell(f.params, limits.params)); t.append(tr);
  });
  const wrap = el('div', { class: 'sqlwrap' }); wrap.append(t); box.append(wrap);
  const smells = [];
  if (a.magic.length) smells.push('Magic numbers (' + a.magic.length + '): ' + [...new Set(a.magic.map((m) => m.value))].slice(0, 8).join(', ') + '. What do they mean? Give them names.');
  if (a.duplicates.length) smells.push('Duplicated code: "' + a.duplicates[0].text.slice(0, 50) + '" appears on lines ' + a.duplicates[0].lines.join(', ') + '.');
  if (a.vague.length) smells.push('Vague names: ' + [...new Set(a.vague.map((v) => v.name))].join(', ') + '. A name should say what the thing IS.');
  a.functions.forEach((f) => {
    if (f.lines > limits.lines) smells.push(f.name + ' is long (' + f.lines + ' lines): it probably does several jobs.');
    if (f.complexity > limits.complexity) smells.push(f.name + ' has ' + f.complexity + ' decision paths: hard to hold in your head and to test.');
    if (f.depth > limits.depth) smells.push(f.name + ' nests ' + f.depth + ' levels deep: flatten it with guard clauses or helpers.');
    if (f.params > limits.params) smells.push(f.name + ' takes ' + f.params + ' parameters: group related ones into an object.');
  });
  if (!smells.length) box.append(el('div', { class: 'status status--good' }, '✓ No smells detected'));
  else { box.append(el('div', { class: 'label' }, 'Smells')); smells.forEach((s) => box.append(el('div', { class: 'problem' }, s))); }
}

// ---------- 1. Smell lab ----------
export function mountSmellLab(root, { starter, rows = 14 }) {
  const editor = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'Code to measure' });
  editor.value = starter;
  const status = el('span', {});
  const bar = el('div', { class: 'bar' }); const runBtn = el('button', { class: 'btn', type: 'button' }, 'Measure  (Ctrl/⌘ + Enter)'); bar.append(runBtn, status);
  const out = el('div');
  root.append(editor, bar, el('div', { class: 'label' }, 'Design metrics (red = past the rule of thumb)'), out);
  let id = 0, first = true;
  async function run() {
    const my = ++id; status.textContent = first ? 'loading the analyzer (the TypeScript parser, first time only)…' : 'measuring…';
    const r = await analyzeCode(editor.value);
    if (my !== id) return;
    first = false; status.textContent = '';
    if (!r.ok) { out.replaceChildren(el('div', { class: 'status status--warn' }, r.error)); return; }
    drawAnalysis(out, r.analysis);
  }
  runBtn.addEventListener('click', run); wireEditor(editor, run);
  let t; editor.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 800); });
  run();
}

// ---------- 2. Refactoring lab / challenge ----------
export function mountRefactor(root, { code, visible, hidden, criteria, limits = LIMITS, onPass = () => {}, rows = 16, buttonText = 'Check my refactoring' }) {
  const editor = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'Code to refactor' });
  editor.value = code;
  const btn = el('button', { class: 'btn', type: 'button' }, buttonText);
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset to the original');
  const bar = el('div', { class: 'bar' }); bar.append(btn, resetBtn);
  const list = el('ul', { class: 'tasks' });
  const items = criteria.map((c) => { const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, c.label)); list.append(li); return li; });
  const testBox = el('div'); const metricBox = el('div');
  root.append(editor, bar, el('div', { class: 'label' }, 'Your goals'), list, el('div', { class: 'label' }, 'Behavior safety net'), testBox, el('div', { class: 'label' }, 'Design metrics'), metricBox);

  let passed = false;
  async function run() {
    btn.disabled = true; testBox.replaceChildren(el('div', { class: 'muted' }, 'running tests and measuring…'));
    const [t, a] = await Promise.all([runTests(editor.value, visible + '\n' + hidden, 5000), analyzeCode(editor.value)]);
    btn.disabled = false;
    // behavior
    testBox.replaceChildren();
    let behaviorOk = false;
    if (!t.ok) testBox.append(el('div', { class: 'status status--bad' }, t.error));
    else {
      const bad = t.results.filter((x) => !x.ok); behaviorOk = bad.length === 0 && t.results.length > 0;
      testBox.append(el('div', { class: 'status status--' + (behaviorOk ? 'good' : 'bad') }, behaviorOk ? '✓ All ' + t.results.length + ' behavior tests pass: behavior unchanged' : bad.length + ' of ' + t.results.length + ' behavior tests FAIL: you changed what the code does'));
      bad.slice(0, 4).forEach((x) => { const row = el('div', { class: 'testrow testrow--fail' }); row.append(el('span', { class: 'testrow__mark' }, '✗'), el('span', {}, x.name)); row.append(el('div', { class: 'testrow__err' }, x.error)); testBox.append(row); });
    }
    // design
    if (!a.ok) { metricBox.replaceChildren(el('div', { class: 'status status--warn' }, a.error)); return; }
    drawAnalysis(metricBox, a.analysis, limits);
    let all = behaviorOk;
    criteria.forEach((c, i) => {
      let ok = false; try { ok = !!c.check(a.analysis, behaviorOk); } catch { ok = false; }
      items[i].classList.toggle('done', ok); if (!ok) all = false;
    });
    if (all && !passed) { passed = true; onPass(); }
  }
  btn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { editor.value = code; });
  wireEditor(editor, run);
}
