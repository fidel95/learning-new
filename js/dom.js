// dom.js — a mini "web page lab": HTML + JavaScript editors, a live preview, and a DOM tree view.
//
// SAFETY: the learner's page runs inside an <iframe sandbox="allow-scripts allow-forms">.
// (allow-forms is needed: browsers block the "submit" event entirely in a sandbox without it.)
// Without "allow-same-origin" the iframe gets a throw-away identity: it cannot read this book's
// storage, cookies or page. It can only talk to us by postMessage, and we verify who sent each message.
import { el } from './workbench.js';

// ---- This function is converted to text and runs INSIDE the iframe (not in the book). ----
function harness(cfg) {
  const send = (m) => parent.postMessage(Object.assign({ nonce: cfg.nonce }, m), '*');
  const fmt = (v) => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); } };
  console.log = (...a) => send({ type: 'log', text: a.map(fmt).join(' ') });
  window.__g = 0;                                              // loop counter used by the loop guard
  window.addEventListener('error', (e) => send({ type: 'error', text: e.message }));
  window.addEventListener('unhandledrejection', (e) => send({ type: 'error', text: String(e.reason) }));

  // Run the learner's JavaScript as a real <script>, exactly like a normal web page would.
  const s = document.createElement('script');
  s.textContent = cfg.js;
  document.body.appendChild(s);

  // Turn the live page into a plain tree we can send back for drawing.
  let budget = 90;
  function ser(node, depth) {
    if (budget <= 0) return null;
    if (node.nodeType === 3) {
      const t = node.textContent.trim();
      if (!t) return null;
      budget--; return { text: t.slice(0, 32) };
    }
    if (node.nodeType !== 1 || node.tagName === 'SCRIPT') return null;
    budget--;
    const kids = depth >= 6 ? [] : Array.from(node.childNodes).map((n) => ser(n, depth + 1)).filter(Boolean);
    return { tag: node.tagName.toLowerCase(), id: node.id || '', cls: typeof node.className === 'string' ? node.className : '', kids };
  }

  // Wait one tick so the learner's script and first render finish, then snapshot + run tests.
  setTimeout(async () => {
    const tree = ser(document.body, 0);
    const results = [];
    for (const src of cfg.tests) {
      try {
        const fn = new Function('wait', 'return (async () => {' + src + '\n})()');
        const ok = await fn((ms) => new Promise((r) => setTimeout(r, ms)));
        results.push({ ok: ok === true });
      } catch (e) {
        results.push({ ok: false, err: String((e && e.message) || e) });
      }
    }
    send({ type: 'done', tree, results });
  }, 30);
}

// Put a counter check at the top of every loop body so an endless loop throws instead of freezing the tab.
function guardLoops(code) {
  const pattern = /\b(?:for|while)\s*\((?:[^()]|\([^()]*\))*\)\s*\{/g;
  return code.replace(pattern, (m) => m + " if (++window.__g > 1000000) throw new Error('A loop ran over a million times. Is it endless?');");
}

function buildDoc(htmlSrc, jsSrc, tests, nonce) {
  // Our config travels as JSON. "<" is escaped so nothing inside can close the script tag early.
  const cfg = JSON.stringify({ js: guardLoops(jsSrc), tests, nonce }).replace(/</g, '\\u003c');
  return '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'body{font:15px system-ui,sans-serif;margin:12px;color:#222;background:#fff}' +
    'button{font:inherit;cursor:pointer;padding:3px 10px} input{font:inherit;padding:3px 6px}' +
    'li{cursor:pointer} .done{text-decoration:line-through;opacity:.55}' +
    '</style></head><body>' + htmlSrc +
    '<script>(' + harness.toString() + ')(' + cfg + ');<\/script></body></html>';
}

/**
 * mountDom(root, options)
 *   html / js : starting code
 *   tasks     : [{ label, test }]  test = JavaScript source (string) that runs INSIDE the page and returns true/false
 *   tasksEl   : where to draw the checklist
 *   onPass    : called once when every task passes
 */
export function mountDom(root, { html, js, tasks = [], tasksEl = null, onPass = () => {}, rows = 9, showTree = true }) {
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);

  // --- tabs + editors ---
  const tabs = el('div', { class: 'tabs' });
  const tabHtml = el('button', { class: 'tab is-on', type: 'button' }, 'HTML');
  const tabJs = el('button', { class: 'tab', type: 'button' }, 'JavaScript');
  tabs.append(tabHtml, tabJs);
  const htmlEd = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'HTML editor' });
  const jsEd = el('textarea', { class: 'editor', spellcheck: 'false', rows: String(rows), 'aria-label': 'JavaScript editor' });
  htmlEd.value = html; jsEd.value = js; jsEd.hidden = true;
  const showTab = (which) => {
    htmlEd.hidden = which !== 'html'; jsEd.hidden = which !== 'js';
    tabHtml.classList.toggle('is-on', which === 'html'); tabJs.classList.toggle('is-on', which === 'js');
  };
  tabHtml.addEventListener('click', () => showTab('html'));
  tabJs.addEventListener('click', () => showTab('js'));
  for (const ed of [htmlEd, jsEd]) {
    ed.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ed.setRangeText('  ', ed.selectionStart, ed.selectionEnd, 'end'); }
    });
  }

  const runBtn = el('button', { class: 'btn', type: 'button' }, 'Run  (Ctrl/⌘ + Enter)');
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset code');
  const status = el('span', {}, '');
  const bar = el('div', { class: 'bar' });
  bar.append(runBtn, resetBtn, status);

  const previewBox = el('div', { class: 'preview' });
  const treeBox = el('div', { class: 'dtree' });
  const consoleBox = el('div', { class: 'console' });
  root.append(tabs, htmlEd, jsEd, bar, el('div', { class: 'label' }, 'Live page'), previewBox);
  if (showTree) root.append(el('div', { class: 'label' }, 'The DOM — the tree your JavaScript is actually changing'), treeBox);
  root.append(el('div', { class: 'label' }, 'Console'), consoleBox);

  // --- checklist ---
  const taskItems = tasks.map((t) => {
    const li = el('li');
    li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, t.label));
    return li;
  });
  if (tasksEl && tasks.length) { const ul = el('ul', { class: 'tasks' }); ul.append(...taskItems); tasksEl.append(ul); }

  // --- tree drawing ---
  function drawNode(node) {
    const li = el('li');
    if (node.text !== undefined) { li.append(el('span', { class: 'dtree__text' }, '"' + node.text + '"')); return li; }
    let label = '<' + node.tag + (node.id ? ' #' + node.id : '') + (node.cls ? ' .' + node.cls.trim().split(/\s+/).join('.') : '') + '>';
    li.append(el('span', { class: 'dtree__tag' }, label));
    if (node.kids.length) { const ul = el('ul'); node.kids.forEach((k) => ul.append(drawNode(k))); li.append(ul); }
    return li;
  }
  function drawTree(tree) {
    treeBox.replaceChildren();
    if (!tree) return;
    const ul = el('ul'); ul.append(drawNode(tree)); treeBox.append(ul);
  }

  // --- running ---
  let frame = null, runId = 0, passed = false, timer = null, logs = [];
  const drawConsole = () => {
    consoleBox.replaceChildren();
    if (!logs.length) consoleBox.append(el('div', { class: 'muted' }, '(no output — use console.log(x) to print)'));
    for (const l of logs) consoleBox.append(el('div', { class: l.err ? 'err' : '' }, l.text));
  };

  function run() {
    runId++; clearTimeout(timer); logs = [];
    status.textContent = 'running…';
    const next = el('iframe', { sandbox: 'allow-scripts allow-forms', title: 'Live page preview' });
    next.srcdoc = buildDoc(htmlEd.value, jsEd.value, tasks.map((t) => t.test), nonce);
    previewBox.replaceChildren(next);
    frame = next;
    // If the page never reports back, something is wrong (like an endless loop).
    timer = setTimeout(() => { status.textContent = 'page did not finish — is there an endless loop?'; }, 2500);
  }

  function onMessage(e) {
    if (!root.isConnected) { window.removeEventListener('message', onMessage); return; }   // page was turned: clean up
    const d = e.data;
    if (!frame || e.source !== frame.contentWindow || !d || d.nonce !== nonce) return;   // ignore strangers
    if (d.type === 'log') { logs.push({ text: String(d.text) }); drawConsole(); }
    else if (d.type === 'error') { logs.push({ text: String(d.text), err: true }); drawConsole(); }
    else if (d.type === 'done') {
      clearTimeout(timer);
      status.textContent = logs.some((l) => l.err) ? 'error — read the console' : 'ran with no errors';
      drawTree(d.tree); drawConsole();
      let all = tasks.length > 0;
      tasks.forEach((t, i) => {
        const r = d.results[i] || { ok: false };
        taskItems[i].classList.toggle('done', !!r.ok);
        if (!r.ok) all = false;
        if (r.err) logs.push({ text: 'check ' + (i + 1) + ': ' + r.err, err: true });
      });
      drawConsole();
      if (all && !passed) { passed = true; onPass(); }
    }
  }
  window.addEventListener('message', onMessage);

  runBtn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { htmlEd.value = html; jsEd.value = js; run(); });
  let debounce;
  for (const ed of [htmlEd, jsEd]) ed.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(run, 700); });
  run();
}
