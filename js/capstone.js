// capstone.js — the capstone workbench for lesson 15:
//   mountProjectChooser   pick a project (or invent one) and see the engineering requirements
//   mountDesignDoc        write a design doc with live feedback; export Markdown
//   mountMilestones       a definition-of-done checklist for each build milestone
//   mountShip             final self-review, links and retrospective
// Everything the learner types is saved in this browser (localStorage), wrapped in try/catch so the page still works without it.
import { el } from './workbench.js';

const KEY = 'learning-new:capstone:v1';
export const store = {
  load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
  save(patch) { try { localStorage.setItem(KEY, JSON.stringify({ ...store.load(), ...patch })); } catch { /* not saved: private mode */ } },
};

export const PROJECTS = [
  { id: 'habits', name: 'Habit tracker', pitch: 'People create habits, check in each day, and see streaks and weekly stats.',
    model: 'users, habits, check_ins (one per habit per day)',
    hard: ['Streaks across time zones and missed days', 'Making "check in" safe to repeat (idempotent)', 'Authorization: only you can see your habits'],
    api: 'POST /habits · GET /habits · POST /habits/:id/checkins · GET /habits/:id/stats' },
  { id: 'links', name: 'Link shortener with analytics', pitch: 'Turn long URLs into short codes, redirect visitors, and count clicks.',
    model: 'links (code, url, owner), clicks (link, time, referrer)',
    hard: ['Unique short codes and collisions', 'A fast, cacheable redirect path vs write-heavy click counting', 'Abuse: rate limits and malicious URLs'],
    api: 'POST /links · GET /:code (redirect) · GET /links/:code/stats' },
  { id: 'splitter', name: 'Group expense splitter', pitch: 'Friends log shared expenses and the app works out who owes whom.',
    model: 'groups, members, expenses, splits',
    hard: ['Money as whole cents, never floating point; rounding fairly', 'Transactions: an expense and its splits succeed or fail together', 'Authorization per group'],
    api: 'POST /groups · POST /groups/:id/expenses · GET /groups/:id/balances · POST /groups/:id/settle' },
  { id: 'custom', name: 'My own idea', pitch: 'Something you actually want. Keep it small enough to finish in 2 to 4 weeks.',
    model: 'you decide', hard: ['Scope: cut until it is small, then cut again'], api: 'you decide' },
];

export const REQUIREMENTS = [
  'A JSON API with input validation and correct status codes (200, 201, 400, 401/403, 404)',
  'Persistent data in a real database, with parameterized queries only',
  'Authentication and per-user authorization',
  'Automated tests (unit + endpoint) that run in CI on every push',
  'A live, public deployment that deploys from main',
  'Structured logs, a /health endpoint, and no stack traces leaked to users',
  'At least one failure-handling feature: idempotency, timeouts/retries, or rate limiting',
  'A README with an architecture diagram, plus a design doc and at least two ADRs',
];

// ---------------------------------------------------------------------------------------------
export function mountProjectChooser(root, { onChosen = () => {} }) {
  const saved = store.load();
  const grid = el('div', { class: 'projects' });
  const detail = el('div');
  const custom = el('textarea', { class: 'editor', rows: '3', placeholder: 'Describe your idea in 2 to 3 sentences: who has what problem?', 'aria-label': 'Your own idea' });
  custom.value = saved.customIdea || '';
  root.append(el('div', { class: 'label' }, 'Choose your capstone'), grid, detail);

  function show(id) {
    const p = PROJECTS.find((x) => x.id === id);
    grid.querySelectorAll('.project').forEach((n) => n.classList.toggle('is-on', n.dataset.id === id));
    detail.replaceChildren();
    detail.append(el('h2', {}, p.name), el('p', {}, p.pitch));
    detail.append(el('div', { class: 'label' }, 'Likely data'), el('p', {}, p.model), el('div', { class: 'label' }, 'Starting API'), el('p', {}, p.api), el('div', { class: 'label' }, 'The interesting engineering problems'));
    const ul = el('ul'); p.hard.forEach((h) => ul.append(el('li', {}, h))); detail.append(ul);
    if (id === 'custom') detail.append(el('div', { class: 'label' }, 'Your idea'), custom);
    const confirm = el('button', { class: 'btn', type: 'button' }, 'This is my capstone');
    confirm.addEventListener('click', () => {
      if (id === 'custom' && custom.value.trim().length < 20) { custom.placeholder = 'Please write a few words first…'; custom.focus(); return; }
      store.save({ project: id, customIdea: custom.value.trim() }); onChosen(id);
      detail.append(el('div', { class: 'status status--good' }, '✓ Saved. Next page: write the design doc.'));
    });
    detail.append(confirm);
    detail.append(el('div', { class: 'label' }, 'Every capstone must meet these (whatever the idea)'));
    const req = el('ul', { class: 'tasks' }); REQUIREMENTS.forEach((r) => { const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '•'), el('span', {}, r)); req.append(li); }); detail.append(req);
  }
  PROJECTS.forEach((p) => {
    const card = el('button', { class: 'project', type: 'button', 'data-id': p.id });
    card.append(el('b', {}, p.name), el('span', {}, p.pitch));
    card.addEventListener('click', () => show(p.id)); grid.append(card);
  });
  show(saved.project || 'habits');
}

// ---------------------------------------------------------------------------------------------
const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const bullets = (t) => t.split('\n').filter((l) => /^\s*([-*•]|\d+[.)])\s+\S/.test(l)).length;
export const DOC_SECTIONS = [
  { id: 'title', label: 'Title', single: true, hint: 'Name of your app.', check: (t) => ({ ok: t.trim().length >= 3, tip: 'Give it a name.' }) },
  { id: 'context', label: '1. Context and problem', hint: 'Who has what pain, and why does it matter? What happens today without your app?', check: (t) => ({ ok: words(t) >= 40, tip: 'Aim for at least 40 words: who, what pain, why now. (' + words(t) + ' so far)' }) },
  { id: 'goals', label: '2. Goals', hint: 'Bullets. What must be true when you are done? Make them checkable.', check: (t) => ({ ok: bullets(t) >= 3, tip: 'At least 3 bullet points starting with "-". (' + bullets(t) + ' so far)' }) },
  { id: 'nongoals', label: '3. Non-goals', hint: 'Bullets. What you deliberately will NOT build. This is how you protect your scope.', check: (t) => ({ ok: bullets(t) >= 2, tip: 'At least 2 bullets of things you will NOT do. (' + bullets(t) + ' so far)' }) },
  { id: 'design', label: '4. Proposed design', hint: 'Architecture, data model (tables and relationships) and the list of API endpoints with status codes.', check: (t) => ({ ok: words(t) >= 60 && /api|endpoint|route|\bGET\b|\bPOST\b/i.test(t) && /table|database|model|schema|store/i.test(t), tip: 'At least 60 words, covering both the API (endpoints) and the data (tables / model).' }) },
  { id: 'alternatives', label: '5. Alternatives considered', hint: 'Bullets. At least two other ways you could do a key part, each with its trade-off, and why you chose yours.', check: (t) => ({ ok: bullets(t) >= 2 && /because|trade|vs|but|however|cost|downside|instead/i.test(t), tip: 'At least 2 bullet options, each stating a trade-off (use words like "because", "but", "cost").' }) },
  { id: 'risks', label: '6. Risks and open questions', hint: 'Bullets. What could go wrong or what do you not know yet? How will you find out?', check: (t) => ({ ok: bullets(t) >= 2, tip: 'At least 2 bullets. (' + bullets(t) + ' so far)' }) },
  { id: 'rollout', label: '7. Testing and rollout', hint: 'How will you test it, deploy it, and roll it back if it breaks?', check: (t) => ({ ok: words(t) >= 20 && /test/i.test(t) && /roll\s?back|revert|undo/i.test(t), tip: 'Mention how you will test AND how you will roll back (at least 20 words).' }) },
  { id: 'metrics', label: '8. Success metrics', hint: 'How will you know it works? Use numbers: latency, success rate, test count.', check: (t) => ({ ok: /\d/.test(t) && words(t) >= 8, tip: 'Include at least one number, like "p95 under 300 ms" or "99% of requests succeed".' }) },
];

export function mountDesignDoc(root, { onPass = () => {} }) {
  const saved = store.load();
  const values = { ...(saved.doc || {}) };
  const fields = {};
  const form = el('div'); const report = el('div'); const out = el('pre', { class: 'raw docmd' });
  const copyBtn = el('button', { class: 'btn', type: 'button' }, 'Copy as Markdown');
  const dlBtn = el('button', { class: 'link-btn', type: 'button' }, 'download DESIGN.md');
  const bar = el('div', { class: 'bar' }); bar.append(copyBtn, dlBtn);
  DOC_SECTIONS.forEach((s) => {
    form.append(el('div', { class: 'label' }, s.label), el('div', { class: 'muted' }, s.hint));
    const node = s.single ? el('input', { class: 'ex__url', type: 'text', 'aria-label': s.label }) : el('textarea', { class: 'editor', rows: '4', spellcheck: 'true', 'aria-label': s.label });
    node.value = values[s.id] || ''; fields[s.id] = node; node.addEventListener('input', update); form.append(node);
  });
  root.append(form, el('div', { class: 'label' }, 'How complete is it?'), report, el('div', { class: 'label' }, 'Your design doc (Markdown)'), out, bar);

  const markdown = () => '# Design doc: ' + (fields.title.value || '<your app>') + '\n\n' + DOC_SECTIONS.filter((s) => !s.single).map((s) => '## ' + s.label + '\n' + (fields[s.id].value.trim() || '_(empty)_')).join('\n\n') + '\n';
  let passed = false;
  function update() {
    const doc = {}; DOC_SECTIONS.forEach((s) => { doc[s.id] = fields[s.id].value; }); store.save({ doc });
    report.replaceChildren(); let ok = 0;
    DOC_SECTIONS.forEach((s) => { const r = s.check(fields[s.id].value); if (r.ok) ok++; else report.append(el('div', { class: 'problem' }, s.label + ': ' + r.tip)); });
    report.prepend(el('div', { class: 'status status--' + (ok === DOC_SECTIONS.length ? 'good' : ok >= 7 ? 'info' : 'warn') }, ok + ' of ' + DOC_SECTIONS.length + ' sections meet the bar' + (ok === DOC_SECTIONS.length ? '. A reviewer could work from this.' : ' (all of them are needed)')));
    out.textContent = markdown();
    if (ok === DOC_SECTIONS.length && !passed) { passed = true; onPass(); }
  }
  copyBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(markdown()); copyBtn.textContent = 'Copied ✓'; } catch { copyBtn.textContent = 'Select the text and copy it'; } setTimeout(() => { copyBtn.textContent = 'Copy as Markdown'; }, 1800); });
  dlBtn.addEventListener('click', () => { const a = el('a', { href: URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown' })), download: 'DESIGN.md' }); a.click(); });
  update();
}

// ---------------------------------------------------------------------------------------------
export const MILESTONES = [
  { id: 'm0', name: 'M0 · Repo and CI (day 1)', goal: 'Every change is tested automatically from the very first commit.', items: [
    'Repository created; the capstone template copied in and committed',
    'README has a one-paragraph purpose',
    '"npm test" passes locally',
    'The CI workflow ran green on GitHub after a push',
    'Work happens on branches and merges by pull request, even if you are the only developer' ] },
  { id: 'm1', name: 'M1 · Walking skeleton (days 2-3)', goal: 'The thinnest possible slice, live on the internet, before any real feature.', items: [
    '/health endpoint returns 200',
    'Deployed to a public URL',
    'Deploy happens automatically from main (or one command), and is documented',
    'A smoke test or curl against the LIVE URL succeeds' ] },
  { id: 'm2', name: 'M2 · First real feature (week 1)', goal: 'One complete user story, tested at both levels.', items: [
    'One end-to-end story works: request → validation → logic → response',
    'Unit tests for the logic and an endpoint test for the route',
    'Bad input returns a 400 with a useful message (tested)',
    'Status codes are right (201 created, 404 missing, ...)' ] },
  { id: 'm3', name: 'M3 · Real data (week 1-2)', goal: 'State survives restarts and is accessed safely.', items: [
    'Schema or migrations are committed to the repo',
    'Every query is parameterized (no string-built SQL)',
    'All data access lives behind one layer (store/repository)',
    'Tests run against a real or in-memory test database' ] },
  { id: 'm4', name: 'M4 · Security and access (week 2)', goal: 'Only the right people can do the right things.', items: [
    'Authentication works; every route checks it',
    'Authorization: a user cannot read or change another user\'s data (tested)',
    'No secrets in the repo or its history; the platform holds them',
    'Rate limiting or other abuse control on at least one endpoint',
    'The security checklist in the template has been reviewed' ] },
  { id: 'm5', name: 'M5 · Reliability and observability (week 2-3)', goal: 'It fails gracefully, and you can see what it is doing.', items: [
    'Structured logs with a request id, and no secrets in them',
    'Errors never leak stack traces to users',
    'At least one failure-handling feature: idempotency, timeouts/retries or circuit breaker',
    'A runbook entry for the most likely failure' ] },
  { id: 'm6', name: 'M6 · Ship and reflect (week 3-4)', goal: 'Someone else can understand, run and trust it.', items: [
    'README has an architecture diagram and run instructions',
    'At least two ADRs record real decisions with their trade-offs',
    'The design doc is updated to match what you actually built',
    'A short demo (script or GIF) shows it working live' ] },
];

export function mountMilestones(root) {
  const saved = store.load(); const checked = { ...(saved.milestones || {}) };
  const summary = el('div', { class: 'status status--info' });
  root.append(summary);
  const bars = [];
  MILESTONES.forEach((m) => {
    const box = el('details', { class: 'milestone' }); if (!saved.milestones || !Object.keys(saved.milestones).length) box.open = m.id === 'm0';
    const sum = el('summary', {}); const count = el('span', { class: 'milestone__n' }); sum.append(el('b', {}, m.name), count); box.append(sum, el('p', { class: 'muted' }, m.goal));
    m.items.forEach((it, i) => {
      const id = m.id + '.' + i; const l = el('label', { class: 'milestone__item' }); const cb = el('input', { type: 'checkbox' }); cb.checked = !!checked[id];
      cb.addEventListener('change', () => { checked[id] = cb.checked; store.save({ milestones: checked }); refresh(); });
      l.append(cb, el('span', {}, it)); box.append(l);
    });
    bars.push({ m, count }); root.append(box);
  });
  function refresh() {
    let total = 0, done = 0;
    bars.forEach(({ m, count }) => { const d = m.items.filter((_, i) => checked[m.id + '.' + i]).length; count.textContent = d + '/' + m.items.length; total += m.items.length; done += d; });
    summary.textContent = 'Progress: ' + done + ' of ' + total + ' checklist items (' + Math.round((done / total) * 100) + '%). It saves in this browser.';
  }
  refresh();
}

// ---------------------------------------------------------------------------------------------
const RETRO = [
  ['well', 'What went well, and what would you repeat? (at least a few sentences)'],
  ['hard', 'What was hardest, and what did it teach you?'],
  ['change', 'If you rebuilt it, what is the first decision you would change, and why?'],
];
const isUrl = (t) => /^https:\/\/[^\s/]+\.[^\s/]+/.test(t.trim());

export function mountShip(root, { onDone = () => {} }) {
  const saved = store.load(); const ship = { ...(saved.ship || {}) };
  const repo = el('input', { class: 'ex__url', type: 'text', placeholder: 'https://github.com/you/your-capstone', 'aria-label': 'Repository URL' }); repo.value = ship.repo || '';
  const live = el('input', { class: 'ex__url', type: 'text', placeholder: 'https://your-app.example', 'aria-label': 'Live URL' }); live.value = ship.live || '';
  const retro = {}; const retroBox = el('div');
  RETRO.forEach(([id, q]) => { retroBox.append(el('div', { class: 'label' }, q)); const t = el('textarea', { class: 'editor', rows: '3', 'aria-label': q }); t.value = ship[id] || ''; retro[id] = t; t.addEventListener('input', update); retroBox.append(t); });
  const explain = el('input', { type: 'checkbox' }); explain.checked = !!ship.explain;
  const explainRow = el('label', { class: 'milestone__item' }); explainRow.append(explain, el('span', {}, 'I can explain every design decision in my README without notes, and I am proud to show it.'));
  const status = el('div'); const submit = el('button', { class: 'btn', type: 'button' }, 'Finish the capstone');
  root.append(el('div', { class: 'label' }, 'Your repository'), repo, el('div', { class: 'label' }, 'Your live app'), live, retroBox, explainRow, el('div', { class: 'bar' }), submit, status);
  [repo, live, explain].forEach((n) => n.addEventListener('input', update));

  const milestoneProgress = () => { const saved2 = store.load().milestones || {}; let total = 0, done = 0; MILESTONES.forEach((m) => m.items.forEach((_, i) => { total++; if (saved2[m.id + '.' + i]) done++; })); return { total, done }; };
  function checks() {
    const mp = milestoneProgress();
    return [
      { ok: mp.done === mp.total, text: 'Every milestone item checked (' + mp.done + '/' + mp.total + ')' },
      { ok: !!store.load().doc && DOC_SECTIONS.every((s) => s.check((store.load().doc || {})[s.id] || '').ok), text: 'Design doc complete' },
      { ok: isUrl(repo.value), text: 'Repository link is an https URL' },
      { ok: isUrl(live.value), text: 'Live app link is an https URL' },
      { ok: Object.values(retro).every((t) => words(t.value) >= 15), text: 'Retrospective answered (at least 15 words each)' },
      { ok: explain.checked, text: 'You confirmed you can explain your decisions' },
    ];
  }
  function update() { store.save({ ship: { repo: repo.value, live: live.value, explain: explain.checked, ...Object.fromEntries(Object.entries(retro).map(([k, t]) => [k, t.value])) } }); }
  submit.addEventListener('click', () => {
    update(); status.replaceChildren();
    const cs = checks(); cs.forEach((c) => status.append(el('div', { class: 'status status--' + (c.ok ? 'good' : 'warn') }, (c.ok ? '✓ ' : '✗ ') + c.text)));
    if (cs.every((c) => c.ok)) onDone();
  });
}
