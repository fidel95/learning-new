// appseclab.js — lesson 18 labs: dependency triage, secure code review, and the personal audit checklist.
import { el } from './workbench.js';

// ───────────── 1. Dependency triage ─────────────
export const DEPS = [
  { name: 'express', facts: 'Declared "^4.17.1", lockfile resolves 4.17.1. A known advisory (open redirect and path issues) is fixed in 4.19.2. Used in production.', best: 0,
    options: ['Upgrade to the patched minor version, run the tests, deploy', 'Ignore: it is a famous library so it must be safe', 'Delete the package and write your own server'] },
  { name: 'lodahs', facts: 'Not "lodash". Published 3 days ago, 40 downloads, has a postinstall script that reads environment variables and sends them to an unknown domain.', best: 2,
    options: ['Keep it, it only has 40 downloads', 'Upgrade to the latest version', 'Remove it now, treat every secret in that environment as leaked and rotate them, report the package'] },
  { name: 'tiny-colors', facts: 'Abandoned for 6 years, 50 lines, no known advisories, no install scripts, used only to color terminal output in a dev script.', best: 1,
    options: ['Emergency: delete it today', 'Accept the low risk, keep it, and note it for the next cleanup (or inline the 50 lines)', 'Fork it and publish it under your own name'] },
  { name: 'jsonwebtoken', facts: 'Pinned at 8.5.1 and used for login tokens. An advisory about algorithm handling is fixed in 9.0.0, a major version with breaking changes.', best: 1,
    options: ['Stay on 8.5.1: a major upgrade is risky', 'Upgrade to 9.x deliberately: read the changelog, fix the breaking changes, run the auth tests', 'Disable the advisory warning in CI'] },
  { name: 'analytics-sdk', facts: 'Declared as "*" (any version). There is no lockfile in the repository, and CI runs "npm install".', best: 0,
    options: ['Pin an exact version, commit the lockfile, and make CI use "npm ci"', 'Leave "*": always having the latest is always best', 'Move it to devDependencies'] },
  { name: 'mocha > serialize-javascript', facts: 'High-severity ReDoS advisory in a transitive dependency of the test runner. It runs only in developers\' machines and CI, never in production, and processes only your own test files.', best: 1,
    options: ['Drop everything: it is "high severity"', 'Low practical risk: not reachable from untrusted input. Schedule the upgrade with normal maintenance', 'Remove all tests'] },
  { name: 'stream-utils', facts: 'The long-time maintainer handed the package to a new owner last week. The new version adds an obfuscated network call that was not there before. Your lockfile still pins the old version.', best: 2,
    options: ['Upgrade immediately to get the newest version', 'Ignore it, nothing has broken', 'Keep the old pinned version, review the diff, replace the package if you cannot trust it, and report it'] },
  { name: 'CI: npm install', facts: 'The pipeline runs "npm install" and deploys. A lockfile exists, but developers sometimes forget to commit it with their changes.', best: 1,
    options: ['Nothing to fix', 'Use "npm ci" (fails if the lockfile and package.json disagree) so builds are reproducible and reviewed', 'Add more developers to review'] },
];

export function mountDepTriage(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'Your audit tool printed eight findings. Decide the best response to each. Good triage is not "fix everything": it is fix what is exploitable, quickly, in the right order.'));
  const sels = [];
  DEPS.forEach((d, i) => {
    const card = el('div', { class: 'sqlcard' });
    card.append(el('div', { class: 'sqlcard__q' }, (i + 1) + '. ' + d.name + ' — ' + d.facts));
    const s = el('select', { 'aria-label': 'Response for ' + d.name }); s.append(el('option', { value: '' }, 'Best response…'));
    d.options.forEach((o, oi) => s.append(el('option', { value: String(oi) }, o)));
    card.append(s); root.append(card); sels.push({ s, card });
  });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Check my triage'); const out = el('div'); root.append(btn, out);
  let passed = false;
  btn.addEventListener('click', () => {
    let pts = 0; out.replaceChildren();
    DEPS.forEach((d, i) => {
      const ok = sels[i].s.value === String(d.best); if (ok) pts++;
      sels[i].card.classList.toggle('tm--ok', ok); sels[i].card.classList.toggle('tm--bad', !ok && sels[i].s.value !== '');
      if (!ok && sels[i].s.value !== '') out.append(el('p', { class: 'muted' }, d.name + ': best is "' + d.options[d.best] + '".'));
    });
    const ok = pts >= 7;
    out.prepend(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, pts + ' of 8 sensible' + (ok ? '. Triage accepted.' : '. You need at least 7.')));
    if (ok && !passed) { passed = true; onPass(); }
  });
}

// ───────────── 2. Secure code review ─────────────
export const REVIEW_CODE = [
  'import express from "express";',
  'import { exec } from "node:child_process";',
  'import jwt from "jsonwebtoken";',
  'const SECRET = "dev-secret-123";',
  'const app = express();',
  'app.use(cors({ origin: "*", credentials: true }));',
  'app.post("/login", async (req, res) => {',
  '  const u = await db.query(`SELECT * FROM users WHERE email = \'${req.body.email}\'`);',
  '  if (u && u.password === sha1(req.body.password)) {',
  '    const token = jwt.sign({ id: u.id, role: u.role }, SECRET);',
  '    console.log("login ok", req.body.email, req.body.password);',
  '    res.json({ token });',
  '  } else res.status(401).json({ error: "no account or wrong password for " + req.body.email });',
  '});',
  'app.get("/files/:name", (req, res) => res.sendFile("/srv/uploads/" + req.params.name));',
  'app.post("/convert", (req, res) => {',
  '  exec("convert " + req.body.file + " out.png", () => res.send("ok"));',
  '});',
  'app.get("/users/:id", auth, async (req, res) => res.json(await db.query("SELECT * FROM users WHERE id = $1", [req.params.id])));',
  'app.listen(3000);',
];
export const REVIEW_CATS = ['SQL injection', 'Command injection', 'Path traversal', 'Hardcoded secret', 'Sensitive data leaked (logs/responses)', 'Weak password handling', 'Broken access control', 'Misconfiguration'];
// line number (1-based) → category index
export const REVIEW_ANSWERS = { 4: 3, 6: 7, 8: 0, 9: 5, 10: 7, 11: 4, 13: 4, 15: 2, 17: 1, 19: 6 };
const WHY = {
  4: 'A secret committed to source control is public to everyone with repo access, forever. Load it from the environment or a secrets manager.',
  6: 'Wildcard CORS plus credentials is an invitation to any website. Allow-list exact origins.',
  8: 'String-built SQL: the lesson 16 injection. Use parameters.',
  9: 'Unsalted SHA-1 is crackable instantly (lesson 17), and === is not constant-time. Use Argon2id/bcrypt with a verify function.',
  10: 'A token with no expiry (exp) lives forever once stolen. Add a short lifetime and pin the algorithm.',
  11: 'Passwords in logs: logs are copied, shipped and read by many. Never log credentials.',
  13: 'The message confirms which emails have accounts (user enumeration). Say the same generic thing for both cases.',
  15: '"../../etc/passwd" escapes the uploads folder. Resolve the path and check it stays inside, or serve by id not by name.',
  17: 'User text concatenated into a shell command lets "; rm -rf /" run. Use execFile with an argument array, or avoid the shell.',
  19: 'Any logged-in user can read any user by id (IDOR), and SELECT * returns the password hash too. Check ownership and select only needed columns.',
};

export function mountCodeReview(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'A pull request from a colleague. Flag each line you would block, and name the problem. Flagging safe lines costs you: a reviewer who cries wolf gets ignored.'));
  const box = el('div', { class: 'raw', style: 'padding:6px;overflow-x:auto;max-height:none' }); const sels = [];
  REVIEW_CODE.forEach((code, i) => {
    const row = el('div', { style: 'display:flex;gap:6px;align-items:center;margin:2px 0;font:12px/1.4 ui-monospace,monospace;white-space:pre' });
    row.append(el('span', { style: 'width:22px;text-align:right;opacity:.6' }, String(i + 1)));
    const s = el('select', { 'aria-label': 'Flag line ' + (i + 1), style: 'max-width:96px;font-size:11px' });
    s.append(el('option', { value: '' }, '·')); REVIEW_CATS.forEach((c, ci) => s.append(el('option', { value: String(ci) }, c)));
    row.append(s, el('span', {}, code)); box.append(row); sels.push({ s, row });
  });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Submit review'); const out = el('div'); root.append(box, btn, out);
  let passed = false;
  btn.addEventListener('click', () => {
    let right = 0, falsePos = 0, miss = []; out.replaceChildren();
    REVIEW_CODE.forEach((_, i) => {
      const v = sels[i].s.value, ans = REVIEW_ANSWERS[i + 1];
      sels[i].row.style.background = '';
      if (ans !== undefined) { if (v === String(ans)) { right++; sels[i].row.style.background = 'rgba(60,140,70,.25)'; } else miss.push(i + 1); }
      else if (v !== '') { falsePos++; sels[i].row.style.background = 'rgba(190,60,50,.25)'; }
    });
    const ok = right >= 8 && falsePos <= 1;
    out.append(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, right + ' of 10 problems found with the right label · ' + falsePos + ' false alarm' + (falsePos === 1 ? '' : 's') + (ok ? '. Review accepted.' : '. Need 8+ correct and at most 1 false alarm.')));
    if (!ok && miss.length) out.append(el('p', { class: 'muted' }, 'Still unresolved: ' + miss.length + ' real problem(s) are missing or mislabeled. Re-read each line: what could an attacker control here?'));
    if (ok) { Object.keys(WHY).forEach((k) => out.append(el('p', { class: 'muted' }, 'Line ' + k + ' (' + REVIEW_CATS[REVIEW_ANSWERS[k]] + '): ' + WHY[k]))); if (!passed) { passed = true; onPass(); } }
  });
}

// ───────────── 3. Audit your own projects ─────────────
export const AUDIT = [
  ['Inventory', 'I listed every place my site and CRM run: hosting, domain, database, email, third-party scripts, admin accounts.'],
  ['Secrets', 'I searched the repository and its history for keys, tokens and passwords, and nothing live is committed. Anything found was rotated.'],
  ['Secrets', 'API keys live in environment variables or the platform\'s secret store, not in code or front-end files.'],
  ['Dependencies', 'I ran the audit command (npm audit / composer audit) and triaged the results like the last exercise.'],
  ['Dependencies', 'A lockfile is committed, and builds install from it.'],
  ['Access', 'Every private page and API route checks login AND ownership on the server (I tried the URL-guessing attack).'],
  ['Access', 'Admin and CRM accounts use unique strong passwords and MFA; former helpers and contractors no longer have access.'],
  ['Input', 'Every form, search and URL parameter is validated, and database queries use parameters, never string-building.'],
  ['Output', 'User-supplied text is escaped when shown, and the site sends a Content-Security-Policy and the other security headers.'],
  ['Transport', 'The site is HTTPS only (with HSTS) and cookies are HttpOnly, Secure and SameSite.'],
  ['Data', 'Customer data is backed up, the restore was tested once, and I know what personal data I hold and why.'],
  ['Response', 'If a key leaked tonight, I wrote down the steps: revoke, rotate, check logs, tell people. Contact details are in the runbook.'],
];
export const AUDIT_PROMPT = 'Do a security review of this project like a senior application-security engineer. Check: committed secrets (also in git history), vulnerable or unpinned dependencies, authentication and session handling, authorization on every route (IDOR), input validation and SQL injection, output escaping and XSS, security headers and CSP, CORS, file upload and path handling, logging of sensitive data, and backups. For each finding give severity, the file and line, how an attacker would exploit it, and the minimal fix. Be specific and critical. Do not change files yet; report first.';

export function mountAuditChecklist(root) {
  const KEY = 'learning-new:audit'; let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } };
  const prog = el('div', { class: 'status status--warn' });
  const update = () => { const n = AUDIT.filter((_, i) => state[i]).length; prog.textContent = n + ' of ' + AUDIT.length + ' checked' + (n === AUDIT.length ? '. Excellent: now you know your real exposure.' : ''); prog.className = 'status status--' + (n === AUDIT.length ? 'good' : 'warn'); };
  root.append(el('p', { class: 'muted' }, 'Tick an item only when you have really verified it on your own project. Honest unticked boxes are your to-do list.'));
  AUDIT.forEach(([area, text], i) => {
    const id = 'audit' + i; const row = el('label', { class: 'sqlcard', for: id, style: 'display:flex;gap:8px;align-items:flex-start;cursor:pointer' });
    const cb = el('input', { type: 'checkbox', id }); cb.checked = !!state[i];
    cb.addEventListener('change', () => { state[i] = cb.checked; save(); update(); });
    row.append(cb, el('span', {}, area + ': ' + text)); root.append(row);
  });
  const ta = el('textarea', { class: 'editor', rows: '7', readonly: 'readonly', 'aria-label': 'Review prompt' }); ta.value = AUDIT_PROMPT;
  const copy = el('button', { class: 'btn', type: 'button' }, 'Copy the review prompt');
  copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(AUDIT_PROMPT); copy.textContent = 'Copied'; } catch (e) { ta.select(); copy.textContent = 'Select and copy manually'; } });
  root.append(prog, el('div', { class: 'label' }, 'Ask Claude in your project folder'), ta, copy); update();
}
