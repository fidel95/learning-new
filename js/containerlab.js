// containerlab.js — lesson 27: Docker layer caching, simulated honestly.
import { el } from './workbench.js';

const FILES = { 'package.json': 'deps', 'package-lock.json': 'deps', 'src/app.js': 'src', 'src/util.js': 'src', 'README.md': 'src' };
const COST = { FROM: 0, COPY: 1, RUN: 20, CMD: 0, WORKDIR: 0, ENV: 0 };
const match = (tok, f) => tok === '.' || tok === './' || tok === f || (tok === 'package*.json' && /^package(-lock)?\.json$/.test(f)) || ((tok === 'src' || tok === 'src/') && f.startsWith('src/'));

export function parseDockerfile(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const [op, ...rest] = l.split(/\s+/); const o = op.toUpperCase(); let cost = COST[o] ?? 1;
    if (o === 'RUN' && /npm (install|ci)/.test(l)) cost = 60; else if (o === 'RUN' && /npm (run )?(test|build)/.test(l)) cost = 20; else if (o === 'RUN') cost = 5;
    const srcs = o === 'COPY' ? rest.slice(0, -1) : [];
    return { text: l, op: o, srcs, cost };
  });
}

// Build with a cache. A step is cached only if its text, the content of the files it copies, AND every earlier step are unchanged.
export function build(steps, version, cache) {
  let valid = true; const rows = []; let total = 0; const newCache = [];
  steps.forEach((s, i) => {
    const copied = s.op === 'COPY' ? Object.keys(FILES).filter((f) => s.srcs.some((t) => match(t, f))).map((f) => f + '@' + (version[f] || 0)).join(',') : '';
    const key = s.text + '|' + copied;
    const hit = valid && cache[i] === key; if (!hit) valid = false;
    newCache.push(key); rows.push({ s, hit }); if (!hit) total += s.cost;
  });
  return { rows, total, cache: newCache };
}

export function mountLayerLab(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'A Dockerfile builds an image as a stack of layers, one per instruction. Docker reuses a cached layer only if that instruction and everything above it is unchanged. "npm install" costs about 60 s here; copying files about 1 s. Reorder the Dockerfile so that editing your source code does NOT reinstall dependencies.'));
  const ed = el('textarea', { class: 'editor', spellcheck: 'false', rows: '7', 'aria-label': 'Dockerfile' });
  ed.value = 'FROM node:20\nCOPY . .\nRUN npm install\nCMD ["node", "src/app.js"]\n';
  const b0 = el('button', { class: 'btn', type: 'button' }, 'Build from scratch'), b1 = el('button', { class: 'btn', type: 'button' }, 'Edit src/app.js, rebuild'), b2 = el('button', { class: 'btn', type: 'button' }, 'Add a dependency, rebuild');
  const bar = el('div', { class: 'bar' }); bar.append(b0, b1, b2); const out = el('div');
  root.append(el('div', { class: 'label' }, 'Dockerfile'), ed, bar, out);
  let cache = [], version = {}, passed = false, lastSrc = null;
  const show = (title, r) => {
    const t = el('table', { class: 'looptable' }); const h = el('tr'); ['instruction', 'layer', 'cost'].forEach((x) => h.append(el('th', {}, x))); t.append(h);
    r.rows.forEach(({ s, hit }) => { const tr = el('tr'); tr.append(el('td', {}, s.text), el('td', { class: hit ? '' : 'bad' }, hit ? 'cached' : 'rebuilt'), el('td', {}, hit ? '0 s' : s.cost + ' s')); t.append(tr); });
    out.replaceChildren(el('div', { class: 'label' }, title), t, el('div', { class: 'status status--' + (r.total <= 5 ? 'good' : 'warn') }, 'Total build time: ' + r.total + ' s'));
  };
  b0.addEventListener('click', () => { version = {}; cache = []; const r = build(parseDockerfile(ed.value), version, cache); cache = r.cache; show('First build', r); });
  const edit = (files, title) => { if (!cache.length) { out.replaceChildren(el('p', { class: 'muted' }, 'Build from scratch first, so there is a cache.')); return null; } files.forEach((f) => { version[f] = (version[f] || 0) + 1; }); const steps = parseDockerfile(ed.value); const r = build(steps, version, cache); cache = r.cache; show(title, r); return { r, steps }; };
  b1.addEventListener('click', () => { const x = edit(['src/app.js'], 'After editing src/app.js'); if (!x) return; lastSrc = x; check(); });
  b2.addEventListener('click', () => { const x = edit(['package.json', 'package-lock.json'], 'After adding a dependency'); if (!x) return; const inst = x.r.rows.find((q) => /npm (install|ci)/.test(q.s.text)); out.append(el('p', { class: 'muted' }, inst && !inst.hit ? 'Correct: dependencies changed, so the install must rerun.' : 'The install did NOT rerun even though package.json changed. Your copy order is wrong, so you would ship stale dependencies.')); });
  const check = () => { if (!lastSrc || passed) return; const hasInstall = lastSrc.steps.some((s) => /npm (install|ci)/.test(s.text)); const v2 = { ...version, 'package.json': (version['package.json'] || 0) + 1 }; const r2 = build(lastSrc.steps, v2, cache); const reinstalls = r2.rows.some((q) => /npm (install|ci)/.test(q.s.text) && !q.hit);
    if (lastSrc.r.total <= 5 && hasInstall && reinstalls) { passed = true; out.append(el('p', { class: 'muted' }, 'Dependencies are now cached: copy only the dependency files, install, THEN copy the source.')); onPass(); } };
}
