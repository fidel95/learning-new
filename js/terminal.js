// terminal.js — a practice terminal (using the Sim from gitsim.js) plus live pictures of what Git is doing.
import { Sim } from './gitsim.js';
import { el } from './workbench.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, text = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text) n.textContent = text;
  return n;
};

// ---------- Picture 1: the three places Git keeps things ----------
function drawAreas(box, sim) {
  box.replaceChildren();
  const s = sim.status();
  const head = sim.tip(sim.head.branch);

  const col = (title, sub) => {
    const c = el('div', { class: 'area' });
    c.append(el('div', { class: 'area__title' }, title), el('div', { class: 'area__sub' }, sub));
    return c;
  };
  const row = (text, kind) => el('div', { class: 'area__row area__row--' + kind }, text);

  const work = col('Working folder', 'files you edit');
  const files = Object.keys(sim.work).sort();
  if (!files.length) work.append(el('div', { class: 'area__empty' }, 'empty'));
  for (const f of files) {
    let kind = 'clean', tag = '';
    if (s.untracked.includes(f)) { kind = 'new'; tag = ' · untracked'; }
    else if (s.unmerged.includes(f)) { kind = 'conflict'; tag = ' · CONFLICT'; }
    else if (s.unstaged.some((x) => x.file === f)) { kind = 'mod'; tag = ' · changed'; }
    work.append(row(f + tag, kind));
  }
  for (const x of s.unstaged.filter((u) => u.kind === 'deleted')) work.append(row(x.file + ' · deleted', 'mod'));

  const stage = col('Staging area', 'what the next commit will hold');
  if (!s.staged.length) stage.append(el('div', { class: 'area__empty' }, 'nothing staged'));
  for (const x of s.staged) stage.append(row(x.file + ' · ' + x.kind, 'staged'));

  const repo = col('Repository', sim.head.detached ? 'detached HEAD' : 'branch ' + sim.head.branch);
  const ids = head || sim.head.detached ? [...sim._ancestors(sim._headId())].sort((a, b) => sim.order.indexOf(b) - sim.order.indexOf(a)) : [];
  if (!ids.length) repo.append(el('div', { class: 'area__empty' }, 'no commits yet'));
  ids.slice(0, 5).forEach((id) => repo.append(row(id.slice(0, 7) + '  ' + sim.commits[id].message, 'commit')));
  if (ids.length > 5) repo.append(el('div', { class: 'area__empty' }, '… and ' + (ids.length - 5) + ' older'));

  const arrow = (t) => el('div', { class: 'area__arrow' }, t);
  box.append(work, arrow('git add →'), stage, arrow('git commit →'), repo);
}

// ---------- Picture 2: the commit graph ----------
function drawGraph(box, sim) {
  box.replaceChildren();
  if (!sim.order.length) { box.append(el('div', { class: 'area__empty' }, 'No commits yet. Make one and the history draws itself here.')); return; }

  // Lane = a horizontal row. A commit continues its first parent's lane unless another child already took it.
  const lane = {}; const claimed = new Set(); let lanes = 0;
  for (const id of sim.order) {
    const p = sim.commits[id].parents[0];
    if (p !== undefined && !claimed.has(p)) { lane[id] = lane[p]; claimed.add(p); }
    else lane[id] = lanes++;
  }
  const X = 78, Y = 62, PAD = 36;
  const pos = (id) => ({ x: PAD + sim.order.indexOf(id) * X, y: 52 + lane[id] * Y });
  const width = PAD * 2 + Math.max(1, sim.order.length - 1) * X + 60;
  const s = svg('svg', { width, height: 52 + lanes * Y + 24, role: 'img', 'aria-label': 'Commit graph' });
  const color = (i) => 'hsl(' + ((i * 83 + 12) % 360) + ' 55% 40%)';

  for (const id of sim.order) for (const p of sim.commits[id].parents) {
    const a = pos(p), b = pos(id);
    const d = a.y === b.y ? 'M' + a.x + ' ' + a.y + ' L' + b.x + ' ' + b.y
      : 'M' + a.x + ' ' + a.y + ' C' + (a.x + X / 2) + ' ' + a.y + ' ' + (b.x - X / 2) + ' ' + b.y + ' ' + b.x + ' ' + b.y;
    s.append(svg('path', { d, fill: 'none', stroke: color(lane[id]), 'stroke-width': 3 }));
  }
  const head = sim._headId();
  for (const id of sim.order) {
    const { x, y } = pos(id);
    const g = svg('g'); g.append(svg('title', {}, id.slice(0, 7) + ' ' + sim.commits[id].message));
    g.append(svg('circle', { cx: x, cy: y, r: 10, fill: id === head ? '#f6d28b' : '#fff9ea', stroke: color(lane[id]), 'stroke-width': 3 }));
    g.append(svg('text', { x, y: y + 27, 'text-anchor': 'middle', 'font-size': 10.5, 'font-family': 'ui-monospace, Menlo, monospace', fill: '#5b4e40' }, id.slice(0, 7)));
    const msg = sim.commits[id].message; g.append(svg('text', { x, y: y + 39, 'text-anchor': 'middle', 'font-size': 10, fill: '#2b2118' }, msg.length > 11 ? msg.slice(0, 10) + '…' : msg));
    s.append(g);
  }
  // Branch name labels sit above their tip commit. The one HEAD points to is highlighted.
  const stacks = {};
  for (const [name, tip] of Object.entries(sim.branches)) {
    const { x, y } = pos(tip); const n = stacks[tip] = (stacks[tip] || 0) + 1;
    const current = !sim.head.detached && sim.head.branch === name;
    const label = (current ? 'HEAD → ' : '') + name; const w = label.length * 6.6 + 14;
    const yy = y - 22 - (n - 1) * 19;
    s.append(svg('rect', { x: x - w / 2, y: yy - 12, width: w, height: 16, rx: 8, fill: current ? '#b3402f' : '#5b4e40' }));
    s.append(svg('text', { x, y: yy, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: '#fff' }, label));
  }
  if (sim.head.detached) {
    const { x, y } = pos(sim.head.detached);
    s.append(svg('rect', { x: x - 28, y: y - 34, width: 56, height: 16, rx: 8, fill: '#b3402f' }));
    s.append(svg('text', { x, y: y - 22, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: '#fff' }, 'HEAD'));
  }
  box.append(s);
}

/**
 * mountTerminal(root, options)
 *   preset : 'empty' | 'conflict'
 *   view   : 'areas' | 'graph' | 'both' | 'none'
 *   tasks  : [{ label, check(sim) -> boolean }]
 */
export function mountTerminal(root, { preset = 'empty', view = 'areas', tasks = [], tasksEl = null, onPass = () => {}, welcome = 'Type  help  to see what you can do. Try:  git init' }) {
  const sim = new Sim(preset);
  const screen = el('div', { class: 'term', role: 'log', 'aria-live': 'polite' });
  const form = el('form', { class: 'term__form', autocomplete: 'off' });
  const prompt = el('span', { class: 'term__prompt' });
  const input = el('input', { class: 'term__input', type: 'text', spellcheck: 'false', autocapitalize: 'off', 'aria-label': 'Terminal input' });
  form.append(prompt, input);
  const resetBtn = el('button', { class: 'link-btn', type: 'button' }, 'reset the practice folder');
  const picture = el('div', { class: view === 'graph' ? 'graph' : 'areas' });
  const picture2 = el('div', { class: 'graph' });

  root.append(screen, form, el('div', { class: 'bar' }));
  if (view !== 'none') root.append(el('div', { class: 'label' }, view === 'graph' ? 'Commit history (each circle is a snapshot)' : 'Where your files are right now'), picture);
  if (view === 'both') root.append(el('div', { class: 'label' }, 'Commit history (each circle is a snapshot)'), picture2);
  root.querySelector('.bar').append(resetBtn);

  const taskItems = tasks.map((t) => {
    const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, t.label)); return li;
  });
  if (tasksEl && tasks.length) { const ul = el('ul', { class: 'tasks' }); ul.append(...taskItems); tasksEl.append(ul); }

  const done = new Set();                 // a task stays ticked once earned, even if you change things later
  let passed = false;
  const past = []; let cursor = 0;

  const promptText = () => '~/project' + (sim.inited ? ' (' + (sim.head.detached ? 'detached' : sim.head.branch) + (sim.merging ? '|MERGING' : '') + ')' : '') + ' $';
  const say = (text, cls) => { screen.append(el('div', { class: 'term__line' + (cls ? ' ' + cls : '') }, text)); };
  const refresh = () => {
    prompt.textContent = promptText();
    if (view === 'areas' || view === 'both') drawAreas(picture, sim);
    if (view === 'graph') drawGraph(picture, sim);
    if (view === 'both') drawGraph(picture2, sim);
    tasks.forEach((t, i) => {
      let ok = false; try { ok = !!t.check(sim); } catch { ok = false; }
      if (ok) done.add(i);
      taskItems[i].classList.toggle('done', done.has(i));
    });
    if (tasks.length && done.size === tasks.length && !passed) { passed = true; onPass(); }
    screen.scrollTop = screen.scrollHeight;
  };

  say(welcome, 'term__muted');
  refresh();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value;
    say(promptText() + ' ' + line, 'term__cmd');
    if (line.trim()) { past.push(line); cursor = past.length; }
    const result = sim.run(line);
    if (result.clear) screen.replaceChildren();
    for (const l of result.lines) say(l.text, l.err ? 'term__err' : '');
    input.value = '';
    refresh();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && past.length) { e.preventDefault(); cursor = Math.max(0, cursor - 1); input.value = past[cursor] || ''; }
    if (e.key === 'ArrowDown' && past.length) { e.preventDefault(); cursor = Math.min(past.length, cursor + 1); input.value = past[cursor] || ''; }
  });
  screen.addEventListener('click', () => input.focus());
  resetBtn.addEventListener('click', () => { sim.reset(preset); screen.replaceChildren(); say('Practice folder reset. Your earned ticks stay.', 'term__muted'); refresh(); input.focus(); });
  return { sim, input };
}
