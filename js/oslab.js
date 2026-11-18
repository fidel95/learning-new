// oslab.js — lesson 30: read an unfamiliar codebase, write a good pull request, track your real contribution.
import { el } from './workbench.js';

export const REPO = {
  'README.md': `# tinyslug

Turn titles into URL-friendly slugs.

    slugify("Hello, World!")   // "hello-world"

## Development
    npm install
    npm test        # runs node --test
`,
  'CONTRIBUTING.md': `# Contributing

Thanks for helping! Please follow these steps:

1. For anything bigger than a typo, OPEN AN ISSUE FIRST so we can agree on the approach.
2. Fork, then create a branch named fix/<short-description>.
3. Every bug fix needs a regression test in test/slugify.test.js.
4. Run npm test; all tests must pass.
5. Keep pull requests small and focused: one change per PR.
6. Sign off your commits (git commit -s).
`,
  'package.json': `{
  "name": "tinyslug",
  "version": "1.2.0",
  "main": "src/slugify.js",
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
`,
  'src/utils.js': `// Helpers used by slugify.

// Replace accented letters with plain ones: "café" -> "cafe".
function removeAccents(text) {
  return text.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
}

// Collapse runs of the same separator.
function collapse(text, sep) {
  return text.split(sep).filter(Boolean).join(sep);
}

module.exports = { removeAccents, collapse };
`,
  'src/slugify.js': `const { removeAccents } = require("./utils");

// Convert a title to a slug.
function slugify(title) {
  let s = removeAccents(String(title));
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  return s;
}

module.exports = { slugify };
`,
  'test/slugify.test.js': `const test = require("node:test");
const assert = require("node:assert");
const { slugify } = require("../src/slugify");

test("lowercases and joins words", () => {
  assert.strictEqual(slugify("Hello World"), "hello-world");
});

test("removes accents", () => {
  assert.strictEqual(slugify("Café Olé"), "cafe-ole");
});
`,
};
const QUESTIONS = [
  { q: 'Which command runs the test suite?', ok: [/npm\s+(run\s+)?test/i], tip: 'Check README.md or the "scripts" in package.json.' },
  { q: 'What is the name of the function that removes accents, and which file is it in? (e.g. name in file)', ok: [/removeAccents/i], need2: /utils/i, tip: 'Use the search box: grep for "accent".' },
  { q: 'Issue #12 says: slugify("Hello, World!") returns "hello-world-" (a trailing dash). On which line of src/slugify.js is the bug? Type the line number.', ok: [/^\s*(line\s*)?[78]\s*$/i], tip: 'Read slugify.js with line numbers. Which line turns the "!" into a dash and then never trims it? Count from line 1.' },
  { q: 'According to CONTRIBUTING.md, what must you do before starting work on anything bigger than a typo?', ok: [/open\s+(an\s+)?issue/i, /issue\s+first/i], tip: 'Read CONTRIBUTING.md step 1.' },
  { q: 'In which file should the regression test for your fix go?', ok: [/test\/slugify\.test\.js/i, /slugify\.test/i], tip: 'Step 3 of CONTRIBUTING.md.' },
];

export function mountExpedition(root, { need = 4, onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'You have cloned a small open-source library you have never seen. Explore it like a maintainer would, then answer the questions. (This is a made-up project.)'));
  const names = Object.keys(REPO); let cur = names[0];
  const tabs = el('div', { class: 'bar' }), view = el('pre', { class: 'raw' }), search = el('input', { class: 'ex__url', type: 'text', placeholder: 'search all files (like grep)…', 'aria-label': 'Search all files' }), hits = el('div', { class: 'muted' });
  const show = () => { view.textContent = REPO[cur].split('\n').map((l, i) => String(i + 1).padStart(2) + '  ' + l).join('\n'); tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('btn', b.dataset.f === cur)); tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('link-btn', b.dataset.f !== cur)); };
  names.forEach((n) => { const b = el('button', { type: 'button', 'data-f': n }, n); b.addEventListener('click', () => { cur = n; show(); }); tabs.append(b); });
  search.addEventListener('input', () => { const q = search.value.trim().toLowerCase(); hits.replaceChildren(); if (q.length < 2) return; names.forEach((n) => REPO[n].split('\n').forEach((l, i) => { if (l.toLowerCase().includes(q)) hits.append(el('div', {}, n + ':' + (i + 1) + '  ' + l.trim())); })); if (!hits.childNodes.length) hits.textContent = 'no matches'; });
  root.append(tabs, view, search, hits); show();
  const inputs = QUESTIONS.map((q, i) => { const card = el('div', { class: 'sqlcard' }); card.append(el('div', { class: 'sqlcard__q' }, (i + 1) + '. ' + q.q)); const inp = el('input', { class: 'ex__url', type: 'text', 'aria-label': 'Answer ' + (i + 1), spellcheck: 'false' }); card.append(inp); root.append(card); return { inp, card }; });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Check my answers'), out = el('div'); root.append(btn, out); let passed = false;
  btn.addEventListener('click', () => {
    let n = 0; out.replaceChildren();
    QUESTIONS.forEach((q, i) => { const v = inputs[i].inp.value; const ok = q.ok.some((r) => r.test(v)) && (!q.need2 || q.need2.test(v)); if (ok) n++; else if (v.trim()) out.append(el('p', { class: 'muted' }, (i + 1) + '. Hint: ' + q.tip)); inputs[i].card.classList.toggle('tm--ok', ok); inputs[i].card.classList.toggle('tm--bad', !ok && v.trim() !== ''); });
    const ok = n >= need; out.prepend(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, n + ' of ' + QUESTIONS.length + ' right' + (ok ? '. That is the whole skill: orient with README, CONTRIBUTING, tests and search, then read the one file that matters.' : '. Need ' + need + '.')));
    if (ok && !passed) { passed = true; onPass(); }
  });
}

export function mountPRWriter(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'You fixed issue #12 in tinyslug (trailing dash). Write the pull request description a maintainer would love to receive. The checker looks for the things reviewers need.'));
  const ta = el('textarea', { class: 'editor', rows: '12', spellcheck: 'false', 'aria-label': 'Pull request description' });
  ta.value = 'Title: \n\n## What and why\n\n\n## How I tested it\n\n\n## Notes for the reviewer\n';
  const btn = el('button', { class: 'btn', type: 'button' }, 'Review my PR description'), out = el('div'); root.append(ta, btn, out); let passed = false;
  const checks = [
    ['A clear title (a short sentence saying what changed)', (t) => /Title:\s*\S.{9,}/.test(t)],
    ['Links the issue ("Fixes #12" or "Closes #12")', (t) => /(fix(es)?|close[sd]?|resolve[sd]?)\s+#12\b/i.test(t)],
    ['Explains WHAT changed and WHY (at least a couple of sentences)', (t) => { const m = /## What and why([\s\S]*?)(##|$)/.exec(t); return !!m && m[1].trim().split(/\s+/).length >= 15; }],
    ['Says how it was tested, and mentions a regression test', (t) => { const m = /## How I tested it([\s\S]*?)(##|$)/.exec(t); return !!m && /test/i.test(m[1]) && m[1].trim().split(/\s+/).length >= 8; }],
    ['Stays small: states there are no unrelated changes (scope)', (t) => /(only|just|no unrelated|single|one change|small)/i.test(t)],
    ['Is polite and does not demand ("please", "happy to", "let me know", "feedback")', (t) => /(please|happy to|let me know|feedback|thanks|thank you)/i.test(t)],
  ];
  btn.addEventListener('click', () => {
    const res = checks.map(([l, f]) => [l, f(ta.value)]); const n = res.filter((r) => r[1]).length; const ul = el('ul');
    res.forEach(([l, ok]) => ul.append(el('li', {}, (ok ? '✓ ' : '✗ ') + l)));
    out.replaceChildren(el('div', { class: 'status status--' + (n === checks.length ? 'good' : 'warn') }, n + ' of ' + checks.length), ul);
    if (n === checks.length && !passed) { passed = true; onPass(); }
  });
}

const KEY = 'learning-new:oss';
const STEPS = [
  'I picked a project I actually use or care about',
  'I read its README and CONTRIBUTING, and I can run its tests locally',
  'I found an issue labelled "good first issue" or "help wanted" (or a typo/doc fix) and commented to say I am working on it',
  'I forked, cloned and created a branch, and reproduced the problem',
  'I wrote a failing test first, then fixed it, and all tests pass',
  'I opened a pull request with a clear description linking the issue',
  'I responded to review feedback politely and made the requested changes',
];
export function mountOssTracker(root, { onDone = () => {} }) {
  let st = { ticks: [], url: '' }; try { st = { ...st, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* storage may be blocked */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
  root.append(el('p', { class: 'muted' }, 'This is the real thing. Work through it over days or weeks, in your own terminal and on GitHub. Progress saves in this browser.'));
  const boxes = STEPS.map((t, i) => { const l = el('label', { class: 'sqlcard' }); const c = el('input', { type: 'checkbox' }); c.checked = !!st.ticks[i]; c.addEventListener('change', () => { st.ticks[i] = c.checked; save(); sync(); }); l.append(c, ' ' + t); root.append(l); return c; });
  const url = el('input', { class: 'ex__url', type: 'text', placeholder: 'https://github.com/owner/repo/pull/123 (optional)', 'aria-label': 'Pull request URL', spellcheck: 'false' }); url.value = st.url || '';
  url.addEventListener('input', () => { st.url = url.value; save(); sync(); });
  const status = el('div'); root.append(el('div', { class: 'label' }, 'Your pull request'), url, status);
  const sync = () => {
    const ticked = boxes.filter((b) => b.checked).length, valid = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+/.test(url.value.trim());
    status.replaceChildren(el('div', { class: 'status status--' + (ticked >= 6 ? 'good' : 'warn') }, ticked + ' of ' + STEPS.length + ' steps' + (valid ? '. PR link looks valid.' : '.')));
    if (ticked >= 6) onDone();
  };
  sync();
}
