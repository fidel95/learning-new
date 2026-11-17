// peoplelab.js — three labs for lesson 14 (working with people):
//   mountReview      review a pull request that has planted problems
//   mountPlanning    choose project scope under uncertainty (Monte Carlo)
//   mountScenarios   hard conversations: choose a response and see the consequence
import { el } from './workbench.js';

// ---------------------------------------------------------------------------------------------
// 1. Code review lab
// ---------------------------------------------------------------------------------------------
export const PR = {
  title: 'Add password reset endpoints',
  description: 'Adds POST /reset/request (emails a reset link) and POST /reset/apply (sets a new password). Tested manually.',
  code: [
    '// routes/password.js',
    'import { db } from "./db.js";',
    'import { sendEmail } from "./mail.js";',
    '',
    'export async function requestReset(req, res) {',
    '  const email = req.body.email;',
    '  const user = await db.get("SELECT * FROM users WHERE email = \'" + email + "\'");',
    '  if (!user) {',
    '    return res.status(404).json({ error: "No account with that email" });',
    '  }',
    '  const token = Math.random().toString(36).slice(2);',
    '  await db.run("UPDATE users SET reset_token = ? WHERE id = ?", [token, user.id]);',
    '  await sendEmail(email, "Reset: https://app.example.com/reset?token=" + token);',
    '  console.log("reset requested for", email, "token", token);',
    '  return res.json({ ok: true });',
    '}',
    '',
    'export async function applyReset(req, res) {',
    '  const { token, password } = req.body;',
    '  const user = await db.get("SELECT * FROM users WHERE reset_token = ?", [token]);',
    '  if (user) {',
    '    await db.run("UPDATE users SET password = ? WHERE id = ?", [password, user.id]);',
    '  }',
    '  return res.json({ ok: true });',
    '}',
    '',
    'function isValid(p) { return p.length > 0; }',
  ],
  // lines are 1-based. cats = categories that count as a match.
  issues: [
    { id: 'sqli', lines: [7], cats: ['security'], blocker: true, title: 'SQL injection', why: 'The email is pasted into the SQL text. An attacker can send  \' OR \'1\'=\'1  and log in as anyone. Use a parameter (?), as lines 12 and 20 already do.' },
    { id: 'enum', lines: [8, 9], cats: ['security'], blocker: false, title: 'Reveals which emails have accounts', why: 'A 404 for unknown emails lets attackers test a list of addresses. Answer the same way whether or not the account exists ("if that email exists, we sent a link").' },
    { id: 'rand', lines: [11], cats: ['security'], blocker: true, title: 'Guessable reset token', why: 'Math.random is not cryptographically secure; tokens can be predicted. Use crypto.randomBytes (or crypto.randomUUID) with enough length.' },
    { id: 'expiry', lines: [12], cats: ['design', 'security'], blocker: false, title: 'Token never expires and is stored in plain text', why: 'A reset link should work once and expire (say 30 minutes), and a database leak should not hand out working tokens: store a hash of the token plus an expiry time.' },
    { id: 'log', lines: [14], cats: ['security'], blocker: false, title: 'Logs the secret', why: 'Anyone who can read logs can now take over accounts. Never log tokens, passwords or full emails of secrets. Log that a reset happened, not its credential.' },
    { id: 'plain', lines: [22], cats: ['security'], blocker: true, title: 'Password stored as plain text', why: 'Passwords must be hashed with a slow, salted algorithm (bcrypt, scrypt or argon2). A leaked table would expose every password, and people reuse them.' },
    { id: 'reuse', lines: [21, 22, 23, 24], cats: ['bug', 'design'], blocker: false, title: 'Token is never cleared; invalid tokens look successful', why: 'After a reset the token must be deleted, or the same link works forever. And an unknown token still answers { ok: true }, hiding failure from the user.' },
    { id: 'valid', lines: [27], cats: ['design', 'nit', 'bug'], blocker: false, title: 'Dead, weak validation', why: 'isValid is never called and only checks "not empty". New passwords need real rules (minimum length, not in a breached list), applied before saving.' },
  ],
  praise: [12, 20],             // good lines: parameterized queries
};

const CATS = [['bug', 'Bug'], ['security', 'Security'], ['design', 'Design'], ['nit', 'Nit (style, optional)'], ['question', 'Question'], ['praise', 'Praise']];

export function mountReview(root, { onPass = () => {} }) {
  const comments = new Map();                    // line number → { cat, text }
  const head = el('div', { class: 'review__head' });
  head.append(el('b', {}, 'Pull request: ' + PR.title), el('div', { class: 'muted' }, PR.description));
  const table = el('div', { class: 'review' });
  const verdictBox = el('div', { class: 'q' });
  verdictBox.append(el('div', { class: 'label' }, 'Your verdict'));
  const verdicts = [['approve', 'Approve: ship it'], ['comment', 'Comment only: no decision'], ['changes', 'Request changes: do not merge yet']];
  const radios = verdicts.map(([v, text]) => { const l = el('label', { class: 'q__opt q__opt--radio' }); const r = el('input', { type: 'radio', name: 'verdict' }); l.append(r, ' ' + text); verdictBox.append(l); return [v, r]; });
  const submit = el('button', { class: 'btn', type: 'button' }, 'Submit review');
  const result = el('div');
  root.append(head, el('p', { class: 'muted' }, 'Click a line to add a review comment. Be specific and say why. Praise good code too.'), table, verdictBox, submit, result);

  function draw() {
    table.replaceChildren();
    PR.code.forEach((text, i) => {
      const n = i + 1;
      const row = el('div', { class: 'review__line' + (comments.has(n) ? ' has-comment' : ''), 'data-n': String(n) });
      const code = el('div', { class: 'review__row', role: 'button', tabindex: '0', 'aria-label': 'Comment on line ' + n });
      code.append(el('span', { class: 'review__n' }, String(n)), el('span', { class: 'review__plus' }, '+'), el('span', { class: 'review__code' }, text || ' '));
      const open = () => toggleForm(n, row);
      code.addEventListener('click', open); code.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); open(); } });
      row.append(code);
      if (comments.has(n)) { const c = comments.get(n); const b = el('div', { class: 'review__comment review__comment--' + c.cat }); b.append(el('b', {}, (CATS.find((x) => x[0] === c.cat) || [0, c.cat])[1] + ': '), el('span', {}, c.text)); const del = el('button', { class: 'link-btn', type: 'button' }, 'remove'); del.addEventListener('click', () => { comments.delete(n); draw(); }); b.append(' ', del); row.append(b); }
      table.append(row);
    });
  }
  function toggleForm(n, row) {
    if (row.querySelector('.review__form')) { row.querySelector('.review__form').remove(); return; }
    const form = el('div', { class: 'review__form' });
    const sel = el('select', { 'aria-label': 'Comment category' }); CATS.forEach(([v, l]) => sel.append(el('option', { value: v }, l)));
    const input = el('input', { class: 'ex__url', type: 'text', placeholder: 'What is wrong or good, why it matters, and how to fix it', 'aria-label': 'Comment text' });
    const save = el('button', { class: 'btn', type: 'button' }, 'Add comment');
    const doSave = () => { if (input.value.trim().length < 8) { input.placeholder = 'Please explain (at least a few words)…'; input.focus(); return; } comments.set(n, { cat: sel.value, text: input.value.trim() }); draw(); };
    save.addEventListener('click', doSave); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSave(); });
    form.append(sel, input, save); row.append(form); input.focus();
  }

  let passed = false;
  submit.addEventListener('click', () => {
    result.replaceChildren();
    const verdict = (radios.find(([, r]) => r.checked) || [])[0];
    let found = 0, blockersFound = 0; const blockers = PR.issues.filter((i) => i.blocker).length;
    const matched = new Set();
    PR.issues.forEach((issue) => {
      const hit = [...comments.entries()].some(([line, c]) => issue.lines.includes(line) && issue.cats.includes(c.cat));
      const row = el('div', { class: 'status status--' + (hit ? 'good' : issue.blocker ? 'bad' : 'warn') }, (hit ? '✓ Found: ' : '✗ Missed: ') + issue.title + (issue.blocker ? '  (blocker)' : ''));
      result.append(row, el('p', { class: 'muted' }, issue.why));
      if (hit) { found++; if (issue.blocker) blockersFound++; issue.lines.forEach((l) => matched.add(l)); }
    });
    const noise = [...comments.entries()].filter(([line, c]) => !['praise', 'question'].includes(c.cat) && !PR.issues.some((i) => i.lines.includes(line)) && c.cat !== 'nit').length;
    result.append(el('div', { class: 'status status--' + (noise <= 2 ? 'info' : 'warn') }, 'Comments on code that was fine: ' + noise + (noise > 2 ? '. Too many "problems" that are not problems wastes the author\'s time and your credibility.' : '. Good precision.')));
    const praised = PR.praise.some((l) => comments.has(l) && comments.get(l).cat === 'praise');
    result.append(el('div', { class: 'status status--info' }, praised ? '✓ You praised something good. Reviews that only criticize demotivate people.' : 'Tip: you did not praise anything. Lines 12 and 20 do parameterized queries correctly, which is worth saying.'));
    const verdictOk = verdict === 'changes';
    result.append(el('div', { class: 'status status--' + (verdictOk ? 'good' : 'bad') }, verdictOk ? '✓ Request changes: correct. Blocking security problems must be fixed before merge.' : verdict ? '✗ This PR has blocking security problems, so approving or staying neutral is wrong. Request changes.' : '✗ Choose a verdict.'));
    result.append(el('p', { class: 'muted' }, 'Also missing from the PR: automated tests ("tested manually" is not evidence). A good reviewer asks for them and for a smaller, safer scope.'));
    const ok = blockersFound === blockers && found >= 5 && verdictOk && noise <= 2;
    result.append(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, ok ? 'Review accepted: you caught all the blockers, most issues, and made the right call.' : 'Not yet: find every blocker (' + blockersFound + '/' + blockers + '), at least 5 issues in total (' + found + '/8), choose "Request changes", and keep false alarms to 2 or fewer. Add or edit comments and submit again.'));
    if (ok && !passed) { passed = true; onPass(); }
  });
  draw();
}

// ---------------------------------------------------------------------------------------------
// 2. Planning under uncertainty
// ---------------------------------------------------------------------------------------------
export const ITEMS = [
  { id: 'login', name: 'Login with email', days: 3, sigma: 0.25, value: 20, must: true },
  { id: 'reset', name: 'Password reset', days: 2, sigma: 0.3, value: 10 },
  { id: 'profile', name: 'Profile page', days: 3, sigma: 0.25, value: 8 },
  { id: 'pay', name: 'Payments integration', days: 5, sigma: 0.6, value: 30 },
  { id: 'notify', name: 'Notifications', days: 4, sigma: 0.5, value: 10 },
  { id: 'dark', name: 'Dark mode', days: 2, sigma: 0.2, value: 3 },
  { id: 'admin', name: 'Admin dashboard', days: 6, sigma: 0.5, value: 12 },
  { id: 'search', name: 'Search', days: 4, sigma: 0.4, value: 15 },
  { id: 'stats', name: 'Analytics', days: 3, sigma: 0.3, value: 7 },
];
export const DEADLINE = 20;
const UNCERTAINTY = (s) => (s >= 0.5 ? 'high' : s >= 0.3 ? 'medium' : 'low');

/** simulatePlan(selectedIds) → { sum, p50, p90, chance, value }. Durations are log-normal: the estimate is the MEDIAN, and the tail is long. */
export function simulatePlan(selected, runs = 4000) {
  let seed = 90210; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed + 1) / 4294967297; };
  const normal = () => Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand());
  const totals = [];
  for (let r = 0; r < runs; r++) {
    let total = 0;
    for (const it of ITEMS) { const z = normal(); if (selected.includes(it.id)) total += it.days * Math.exp(it.sigma * z); }   // z drawn for every item: stable, comparable results
    totals.push(total);
  }
  totals.sort((a, b) => a - b);
  const items = ITEMS.filter((i) => selected.includes(i.id));
  return {
    sum: items.reduce((a, i) => a + i.days, 0), value: items.reduce((a, i) => a + i.value, 0),
    p50: totals[Math.floor(runs * 0.5)], p90: totals[Math.floor(runs * 0.9)], chance: totals.filter((t) => t <= DEADLINE).length / runs,
  };
}

export function mountPlanning(root, { tasks = [], tasksEl = null, onPass = () => {} }) {
  const selected = new Set(['login']);
  const list = el('div', { class: 'plan' });
  const stats = el('div', { class: 'syslab__metrics' });
  const checks = el('ul', { class: 'tasks' });
  root.append(el('p', { class: 'muted' }, 'Team of one pair, working one item after another. Deadline: ' + DEADLINE + ' working days. Each estimate is the "most likely" number; the uncertainty tag says how wild the real time can be.'), list, stats);
  const items = tasks.map((t) => { const li = el('li'); li.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {})); checks.append(li); return li; });
  if (tasksEl && tasks.length) tasksEl.append(checks); else if (tasks.length) root.append(checks);
  let passed = false;

  ITEMS.forEach((it) => {
    const row = el('label', { class: 'plan__row' });
    const cb = el('input', { type: 'checkbox' }); cb.checked = selected.has(it.id); cb.disabled = !!it.must;
    cb.addEventListener('change', () => { if (cb.checked) selected.add(it.id); else selected.delete(it.id); update(); });
    row.append(cb, el('span', { class: 'plan__name' }, it.name + (it.must ? ' (required)' : '')), el('span', { class: 'plan__d' }, it.days + ' d'), el('span', { class: 'plan__u plan__u--' + UNCERTAINTY(it.sigma) }, UNCERTAINTY(it.sigma) + ' uncertainty'), el('span', { class: 'plan__v' }, '+' + it.value + ' value'));
    list.append(row);
  });

  function update() {
    const r = simulatePlan([...selected]);
    stats.replaceChildren();
    const line = (a, b, cls) => { const d = el('div', { class: 'syslab__metric' }); d.append(el('span', {}, a), el('b', { class: cls || '' }, b)); stats.append(d); };
    line('Sum of the estimates', r.sum + ' days (the number a naive plan would quote)');
    line('Realistic finish: half the time by / 9 times in 10 by', r.p50.toFixed(1) + ' / ' + r.p90.toFixed(1) + ' days');
    line('Chance of finishing within ' + DEADLINE + ' days', Math.round(r.chance * 100) + '%', r.chance >= 0.85 ? 'ok' : r.chance >= 0.6 ? 'warn' : 'bad');
    line('Value delivered if you finish', String(r.value));
    let all = tasks.length > 0;
    tasks.forEach((t, i) => { const res = t.check(r, selected); items[i].classList.toggle('done', res.ok); items[i].lastChild.textContent = t.label + (res.note ? '  →  ' + res.note : ''); if (!res.ok) all = false; });
    if (all && !passed) { passed = true; onPass(); }
  }
  update();
}

// ---------------------------------------------------------------------------------------------
// 3. Hard conversations
// ---------------------------------------------------------------------------------------------
export function mountScenarios(root, { scenarios, onPass = () => {} }) {
  const done = new Set(); let passed = false;
  scenarios.forEach((sc, i) => {
    const card = el('div', { class: 'sqlcard' });
    const title = el('div', { class: 'sqlcard__q' });
    title.append(el('span', { class: 'box', 'aria-hidden': 'true' }, '✓'), el('span', {}, sc.title));
    const story = el('p', {}, sc.situation);
    const opts = el('div', { class: 'q__opts' }); const out = el('div');
    sc.options.forEach((o) => {
      const b = el('button', { class: 'q__opt', type: 'button' }, o.text);
      b.addEventListener('click', () => {
        out.replaceChildren();
        const label = { best: 'Best approach', okay: 'Understandable, but with costs', poor: 'This goes badly' }[o.rating];
        out.append(el('div', { class: 'status status--' + { best: 'good', okay: 'info', poor: 'bad' }[o.rating] }, label), el('p', { class: 'muted' }, o.outcome));
        if (o.rating === 'best') { done.add(i); title.classList.add('done'); }
        if (done.size === scenarios.length && !passed) { passed = true; onPass(); }
      });
      opts.append(b);
    });
    card.append(title, story, opts, out); root.append(card);
  });
}
