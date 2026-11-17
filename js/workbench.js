// workbench.js — the interactive code editor + memory diagram + console.
import { runCode } from './runner.js';

// Small helper: build an element with attributes and text in one line.
function el(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}

/**
 * mountWorkbench(root, options)
 *   starter:  text that starts inside the editor
 *   tasks:    [{ label, check(result) -> boolean }]  (optional, shown as a checklist)
 *   tasksEl:  where to draw the checklist (optional)
 *   onPass:   called once when every task is done
 *   autorun:  run automatically while typing (good for playgrounds)
 */
export function mountWorkbench(root, { starter, tasks = [], tasksEl = null, onPass = () => {}, autorun = false, rows = 7, probes = {}, trace = false }) {
  const editor = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'Code editor' });
  editor.value = starter;

  const runBtn = el('button', { class: 'btn', type: 'button' }, 'Run  (Ctrl/⌘ + Enter)');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset code');
  const status = el('span', {}, '');
  const bar = el('div', { class: 'bar' });
  bar.append(runBtn, resetBtn, status);

  const memoryLabel = el('div', { class: 'label' }, 'Memory — every variable your code made');
  const memory = el('div', { class: 'memory', 'aria-live': 'polite' });
  const consoleLabel = el('div', { class: 'label' }, 'Console');
  const consoleBox = el('div', { class: 'console' });

  root.append(editor, bar, memoryLabel, memory);

  // Optional "Call stack" panel: replay each function call/return one step at a time.
  const stackBox = el('div', { class: 'stackbox' });
  const stackFrames = el('div', { class: 'stack' });
  const stackCaption = el('div', { class: 'stack__caption' });
  const prevBtn = el('button', { class: 'btn', type: 'button' }, '◀');
  const nextBtn = el('button', { class: 'btn', type: 'button' }, 'Step ▶');
  const playBtn = el('button', { class: 'link-btn', type: 'button' }, 'auto-play');
  if (trace) {
    const controls = el('div', { class: 'bar' });
    controls.append(prevBtn, nextBtn, playBtn);
    stackBox.append(el('div', { class: 'label' }, 'Call stack — functions waiting for each other'), stackFrames, stackCaption, controls);
    root.append(stackBox);
  }
  root.append(consoleLabel, consoleBox);

  // Checklist items, redrawn on each run.
  const taskItems = tasks.map((t) => {
    const li = el('li');
    li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, t.label));
    return li;
  });
  if (tasksEl && tasks.length) {
    const ul = el('ul', { class: 'tasks' });
    ul.append(...taskItems);
    tasksEl.append(ul);
  }

  let previous = {};      // last run's variables, so we can flash the ones that changed
  let passed = false;     // makes sure onPass fires only once
  let runId = 0;          // ignores answers from older, slower runs

  function renderMemory(result) {
    memory.replaceChildren();
    const names = Object.keys(result.vars);
    if (!names.length) {
      memory.append(el('div', { class: 'empty' }, 'Nothing stored yet. Try: let x = 5;'));
      return;
    }
    for (const name of names) {
      const v = result.vars[name];
      const cell = el('div', { class: 'cell' });
      if (previous[name] !== undefined && previous[name] !== v.text) cell.classList.add('changed');
      const top = el('div', { class: 'cell__name' });
      top.append(el('span', {}, name), el('span', { class: 'cell__kind' }, result.kinds[name] || ''));
      cell.append(top, el('div', { class: 'cell__value' }, v.text), el('div', { class: 'cell__type' }, 'type: ' + v.type));
      memory.append(cell);
    }
    previous = Object.fromEntries(names.map((n) => [n, result.vars[n].text]));
  }

  function renderConsole(result) {
    consoleBox.replaceChildren();
    for (const line of result.logs) consoleBox.append(el('div', {}, line));
    if (!result.ok) consoleBox.append(el('div', { class: 'err' }, result.error));
    if (result.ok && !result.logs.length) consoleBox.append(el('div', { class: 'muted' }, '(no output — use console.log(x) to print)'));
  }

  // ---- Call stack replay ----
  let events = [];
  let step = 0;
  let playTimer = null;
  const callText = (e) => e.name + '(' + e.args.join(', ') + ')';

  function drawStack() {
    stackFrames.replaceChildren();
    const stack = [];
    let caption = events.length ? 'Press Step ▶ to watch your functions run.' : 'Define a function with  function name() { }  and call it to see the stack.';
    for (let i = 0; i < step; i++) {
      const e = events[i];
      if (e.t === 'call') { stack.push(e); caption = callText(e) + ' is called.'; }
      else { stack.pop(); caption = e.t === 'ret' ? callText(e) + ' returns ' + e.value + '.' : callText(e) + ' threw an error.'; }
    }
    // Draw the bottom of the stack first; column-reverse puts the newest call on top.
    stackFrames.append(el('div', { class: 'frame frame--base' }, '(top level of your file)'));
    stack.forEach((e, i) => {
      const f = el('div', { class: 'frame' + (i === stack.length - 1 ? ' frame--top' : '') }, callText(e));
      stackFrames.append(f);
    });
    stackCaption.textContent = (step >= events.length && events.length ? 'Done. ' : '') + caption;
    prevBtn.disabled = step === 0;
    nextBtn.disabled = step >= events.length;
  }
  function stopPlay() { clearInterval(playTimer); playTimer = null; playBtn.textContent = 'auto-play'; }
  function go(delta) { step = Math.max(0, Math.min(events.length, step + delta)); drawStack(); }
  if (trace) {
    prevBtn.addEventListener('click', () => { stopPlay(); go(-1); });
    nextBtn.addEventListener('click', () => { stopPlay(); go(1); });
    playBtn.addEventListener('click', () => {
      if (playTimer) { stopPlay(); return; }
      if (step >= events.length) step = 0;
      playBtn.textContent = 'pause';
      playTimer = setInterval(() => { if (step >= events.length) { stopPlay(); return; } go(1); }, 700);
    });
  }

  async function run() {
    const myRun = ++runId;
    status.textContent = 'running…';
    const result = await runCode(editor.value, { probes });
    if (myRun !== runId) return;               // a newer run already started
    status.textContent = result.ok ? 'ran with no errors' : 'error — read the console';
    renderMemory(result);
    renderConsole(result);
    if (trace) { stopPlay(); events = result.events; step = 0; drawStack(); }

    // A task only counts when the code ran without errors.
    let allDone = tasks.length > 0;
    tasks.forEach((t, i) => {
      let ok = false;
      try { ok = result.ok && !!t.check(result); } catch { ok = false; }
      taskItems[i].classList.toggle('done', ok);
      if (!ok) allDone = false;
    });
    if (allDone && !passed) { passed = true; onPass(); }
  }

  runBtn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { editor.value = starter; run(); });
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    // Tab inserts two spaces instead of jumping out of the editor.
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.setRangeText('  ', s, editor.selectionEnd, 'end');
    }
  });
  if (autorun) {
    let timer;
    editor.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 450); });
  }

  run(); // show the starter's result immediately
  return { run, editor };
}

/**
 * mountQuiz(root, questions, onPass)
 *   Each question: { prompt (html), options: [text], answer: index, why: text }
 */
export function mountQuiz(root, questions, onPass) {
  let correct = 0;
  questions.forEach((q, qi) => {
    const box = el('div', { class: 'q' });
    const prompt = el('div');
    prompt.innerHTML = q.prompt;                       // our own trusted lesson text
    const opts = el('div', { class: 'q__opts' });
    const why = el('p', { class: 'q__why' });
    let solved = false;

    q.options.forEach((text, oi) => {
      const b = el('button', { class: 'q__opt', type: 'button' }, text);
      b.addEventListener('click', () => {
        if (solved) return;
        if (oi === q.answer) {
          solved = true; b.classList.add('right');
          why.textContent = '✓ ' + q.why;
          opts.querySelectorAll('button').forEach((x) => (x.disabled = true));
          if (++correct === questions.length) onPass();
        } else {
          b.classList.add('wrong'); b.disabled = true;
          why.textContent = 'Not quite — reason it through again, then pick another.';
        }
      });
      opts.append(b);
    });
    box.append(el('div', { class: 'label' }, `Question ${qi + 1} of ${questions.length}`), prompt, opts, why);
    root.append(box);
  });
}
