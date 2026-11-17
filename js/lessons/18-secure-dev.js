// Lesson 18 — Secure development and the software supply chain.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountDepTriage, mountCodeReview, mountAuditChecklist } from '../appseclab.js';

export const SCAN_STARTER = `// A secret scanner, like the ones that run in CI (gitleaks, GitHub secret scanning).
// files is { "path/to/file": "file text" }. Return one finding per leaked secret:
//   { path, line (1-based), type }
// It must catch real secrets, skip placeholders and environment lookups, and NEVER copy the secret into its output
// (the report itself must not become a second leak).
function scanSecrets(files) {
  const found = [];
  for (const [path, text] of Object.entries(files)) {
    text.split("\\n").forEach((line, i) => {
      if (line.includes("AKIA")) found.push({ path, line: i + 1, type: "aws-key", secret: line });
    });
  }
  return found;
}
`;

const J = `const J = (...a) => a.join("");
const AWS = J("AK", "IA", "QWERTYUIOP123456");
const GH = J("gh", "p_", "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8");
const SLACK = J("xo", "xb-", "123456789012-abcdefABCDEF123456");
const PEM = J("-----BEGIN ", "RSA PRIVATE KEY-----");
`;

export const SCAN_VISIBLE = `${J}
test("finds an AWS access key and its line", () => {
  const r = scanSecrets({ "config.js": "const a = 1;\\nconst b = 2;\\nconst key = '" + AWS + "';" });
  expect(r.length).toBe(1);
  expect(r[0].path).toBe("config.js");
  expect(r[0].line).toBe(3);
});
test("a clean file has no findings", () => {
  expect(scanSecrets({ "a.js": "const x = process.env.KEY;\\nconsole.log(x);" })).toEqual([]);
});`;

export const SCAN_HIDDEN = `${J}
test("finds a private key block", () => {
  const r = scanSecrets({ "deploy/id_rsa": "stuff\\n" + PEM + "\\nMIIE..." });
  expect(r.length).toBe(1); expect(r[0].line).toBe(2);
});
test("finds a GitHub token", () => {
  const r = scanSecrets({ ".env": "TOKEN=" + GH });
  expect(r.length).toBe(1); expect(r[0].path).toBe(".env");
});
test("finds a Slack token", () => {
  const r = scanSecrets({ "bot.py": "x = 1\\nTOKEN = \\"" + SLACK + "\\"" });
  expect(r.length).toBe(1); expect(r[0].line).toBe(2);
});
test("finds hard-coded password literals", () => {
  const r = scanSecrets({ "db.js": "const password = \\"Tr0ub4dor&3xyz\\";\\nconst cfg = { DB_PASSWORD: 'hunter22abc' };" });
  expect(r.length).toBe(2);
  expect(r[0].line).toBe(1); expect(r[1].line).toBe(2);
});
test("ignores environment lookups, empty values and obvious placeholders", () => {
  const text = [
    "const password = process.env.DB_PASSWORD;",
    "password = os.environ['PASSWORD']",
    "const password = \\"\\";",
    "password: \\"changeme\\"",
    "password: \\"<your-password>\\"",
    "PASSWORD=\\"example-password\\"",
    "const password = req.body.password;",
  ].join("\\n");
  expect(scanSecrets({ "safe.js": text })).toEqual([]);
});
test("ignores the AWS documentation example key", () => {
  expect(scanSecrets({ "README.md": "key: AKIAIOSFODNN7EXAMPLE" })).toEqual([]);
});
test("reports several findings across files in order", () => {
  const r = scanSecrets({ "a.js": "x\\n" + AWS, "b.js": "y\\ny\\nz\\n" + GH });
  expect(r.length).toBe(2);
  expect(r[0].path).toBe("a.js"); expect(r[0].line).toBe(2);
  expect(r[1].path).toBe("b.js"); expect(r[1].line).toBe(4);
});
test("a finding has a type string", () => {
  const r = scanSecrets({ "a.js": AWS });
  expect(typeof r[0].type).toBe("string"); expect(r[0].type.length).toBeGreaterThan(2);
});
test("the report never contains the secret itself", () => {
  const out = JSON.stringify(scanSecrets({ "a.js": AWS, "b.js": GH, "c.js": "password = 'Tr0ub4dor&3xyz'", "d": SLACK }));
  for (const s of [AWS, GH, SLACK, "Tr0ub4dor&3xyz"]) expect(out.includes(s)).toBe(false);
});
test("two secrets on one line are both reported", () => {
  const r = scanSecrets({ "a.js": AWS + " " + GH });
  expect(r.length).toBe(2);
});`;

export const lesson = {
  id: 'l18',
  title: 'Lesson 18 · Secure development & supply chain',
  spreads: [
    // ───────────────────────── Spread 1: dependency triage (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Supply chain · code you did not write</p>
        <h1>Your app is 90% other people's code</h1>
        <p>A small web app commonly pulls in <b>hundreds of packages</b> once you count dependencies of dependencies (<b>transitive</b> ones). Every one runs with your app's permissions, and installs can even run scripts on your laptop and your build server. That is the <b>software supply chain</b>, and attackers noticed.</p>
        <h2>How it goes wrong</h2>
        <ul>
          <li><b>Known vulnerabilities (CVEs).</b> Old versions with published exploits. Most breaches use bugs that already had a fix.</li>
          <li><b>Typosquatting.</b> <code>lodahs</code> instead of <code>lodash</code>. One typo, and a stranger's code runs in your build.</li>
          <li><b>Account takeover / maintainer change.</b> A trusted package ships a malicious update (the <i>event-stream</i> incident, <i>xz</i> in 2024).</li>
          <li><b>Install scripts</b> (<code>postinstall</code>) that run before you have read anything.</li>
          <li><b>Unpinned versions.</b> <code>"*"</code> or a missing lockfile means two builds can contain different code.</li>
        </ul>
        <h2>The defenses</h2>
        <ul>
          <li><b>Lockfile committed + <code>npm ci</code></b> in CI: reproducible, reviewable installs.</li>
          <li><b>Fewer dependencies.</b> Every package is a permanent liability. Ask "do I need this for 20 lines?"</li>
          <li><b>Automated audits and updates</b> (<code>npm audit</code>, Dependabot, Renovate), reviewed like any other change.</li>
          <li><b>Triage by reachability and exposure,</b> not by the severity label alone (see the dev-only finding on the right).</li>
          <li><b>Least privilege for CI and for tokens.</b> A build that cannot reach production secrets cannot leak them.</li>
        </ul>
        <div class="senior">Triage is the senior skill. Junior: "the scanner shows 47 issues, panic." Senior: "three are reachable from the internet, one is an active attack, the rest go in the backlog." Fix by <b>risk</b>, communicate by <b>decision and reason</b>.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Lab · dependency triage</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">get 7 of 8 sensible to turn the page</span></div>`,
      init(left, right, api) {
        mountDepTriage(right.querySelector('#lab'), { onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'triage accepted'; api.unlock(600); } });
      },
    },

    // ───────────────────────── Spread 2: secret scanner (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Secure development · secrets</p>
        <h1>Secrets in code, and how to catch them</h1>
        <p>The most common cloud breach is not a clever exploit: it is a key somebody <b>committed to Git</b>. Bots scan public GitHub in seconds. And <b>deleting the file later does not help</b>, because history keeps it.</p>
        <h2>If a secret leaks, in this order</h2>
        <ol>
          <li><b>Revoke / rotate first.</b> Create a new key, switch the app to it, disable the old one. Assume it is already stolen.</li>
          <li><b>Then look:</b> check access logs for use of the old key.</li>
          <li><b>Then clean</b> the history if you want (<code>git filter-repo</code>), knowing it is cosmetic: copies exist.</li>
          <li><b>Then prevent:</b> a pre-commit hook plus CI scanning, and write what happened in a blameless post-mortem.</li>
        </ol>
        <h2>Prevention habits</h2>
        <ul>
          <li>Config via <b>environment variables or a secrets manager</b>; commit only <code>.env.example</code> with placeholders.</li>
          <li><b>Short-lived, narrowly scoped credentials</b> (least privilege: a key that can only read one bucket).</li>
          <li>Put <code>.env</code> in <code>.gitignore</code> from the first commit.</li>
          <li>Scanners match <b>patterns</b> (an AWS key starts with <code>AKIA</code>) and look for suspicious assignments, while ignoring placeholders so people do not learn to ignore alerts.</li>
        </ul>
        <div class="warn">A scanner's own report must not leak: the starter copies the whole line into its output. That is a real bug that has shipped in security tools.</div>
        <div class="senior">Build the scanner on the right. You will balance <b>recall</b> (catch real secrets) against <b>precision</b> (do not flood developers with false alarms). Tools that cry wolf get switched off, which is worse than no tool.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Challenge · scanSecrets</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">pass every test to turn the page</span></div>`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), {
          tasks: [{ kind: 'implement', question: 'Write a secret scanner that is accurate and does not leak', visible: SCAN_VISIBLE, hidden: SCAN_HIDDEN, starter: SCAN_STARTER, rows: 16 }],
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'scanner ready for CI'; api.unlock(900); },
        });
      },
    },

    // ───────────────────────── Spread 3: code review (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Secure development · review</p>
        <h1>Reviewing code like an attacker</h1>
        <p>Security review is a habit you apply to every pull request, not a stage at the end. The question is always the same: <b>"what could an attacker control here, and where does it end up?"</b> (user input → sink).</p>
        <h2>A checklist for reading a diff</h2>
        <ul>
          <li><b>Sources:</b> request body, query, headers, cookies, file names, uploaded files, third-party API replies. All hostile.</li>
          <li><b>Sinks:</b> SQL, shell commands, file paths, HTML output, redirects, outbound URLs, deserialization, logs.</li>
          <li><b>Between them:</b> validation (shape), parameterization (SQL, <code>execFile</code>), encoding (HTML), allow-lists (paths, hosts).</li>
          <li><b>Identity:</b> is login checked? Is <i>ownership</i> checked?</li>
          <li><b>Secrets and data:</b> hard-coded, logged, or over-returned (<code>SELECT *</code>)?</li>
          <li><b>Defaults:</b> CORS, cookie flags, token lifetime, error messages.</li>
        </ul>
        <h2>How to give the review</h2>
        <p>Say <b>what</b> is wrong, <b>how</b> it could be exploited, and the <b>smallest fix</b>. Be precise: a flood of vague comments teaches people to ignore you (the false-alarm penalty on the right models this).</p>
        <div class="senior">There are ten real problems in twenty lines on the right, which is realistic: the code "works" and passes the demo. Almost every line that touches the outside world deserves a second look. Read the sinks first.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Lab · review the pull request</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">find 8 of 10 with at most 1 false alarm</span></div>`,
      init(left, right, api) {
        mountCodeReview(right.querySelector('#lab'), { onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'review accepted'; api.unlock(900); } });
      },
    },

    // ───────────────────────── Spread 4: audit your own (not gated) ─────────────────────────
    {
      left: `
        <p class="kicker">Real-world capstone</p>
        <h1>Audit your own CRM and company site</h1>
        <p>Everything so far was practice. You run <b>real</b> things: a live business website and a CRM holding customer data. This page turns the lessons into an audit you perform on them this week.</p>
        <h2>How to run it</h2>
        <ol>
          <li><b>Open your project in the terminal</b> (the site, then the CRM) and start Claude there.</li>
          <li><b>Paste the review prompt</b> from the right. It asks for severity, location, exploit path and minimal fix, and for a report <i>before</i> any change.</li>
          <li><b>Triage the findings</b> as in the first exercise: exploitable and exposed first, rotate leaked secrets before anything else.</li>
          <li><b>Fix one finding per pull request,</b> with a test that fails before the fix (like your lesson 16 attack requests).</li>
          <li><b>Tick the checklist honestly.</b> Unticked boxes are your backlog.</li>
        </ol>
        <h2>What a good audit report looks like</h2>
        <ul>
          <li>Ranked by <b>impact × likelihood</b>, not by the order you found things.</li>
          <li>Each finding: <i>what, where, how exploited, fix, owner, date</i>.</li>
          <li>A short "what is already good" list. It keeps the team from undoing it.</li>
        </ul>
        <div class="senior">Security is not a state you reach but a <b>cadence</b>: dependency updates monthly, access reviews quarterly, restore tests twice a year, and an incident plan written <i>before</i> the incident. Put those on a calendar. Bring me the findings and I will review the fixes with you.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Your audit checklist</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountAuditChecklist(right.querySelector('#lab')); },
    },

    // ───────────────────────── Spread 5: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Four judgment calls</h1>
        <p>That closes Part 3, security. You can now model threats, recognize the classic attacks, store credentials and sessions safely, and audit code and dependencies. Part 4 moves to the other half of the interview and of daily engineering: <b>algorithms and data structures</b>.</p>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>You find a live API key in a commit from last year. What do you do FIRST?</p>',
            options: ['Delete the file and push a new commit', 'Rewrite git history to remove it', 'Rotate the key: create a new one, switch the app over, revoke the old one. Then check logs and clean up', 'Make the repository private'], answer: 2,
            why: 'Assume the key is already copied. Only revoking it makes it useless. History cleanup and privacy are secondary.' },
          { prompt: '<p>CI runs <code>npm install</code> and the lockfile is not always committed. What is the risk and the fix?</p>',
            options: ['No risk: npm is reliable', 'Builds can silently pull different (possibly compromised) versions. Commit the lockfile and use npm ci', 'The build will be slower', 'Switch to a different language'], answer: 1,
            why: 'Reproducibility is a security property: what you tested must be what you ship.' },
          { prompt: '<p>The audit shows a "high" vulnerability in a package used only by the test runner on your laptop. Best response?</p>',
            options: ['Ignore it forever', 'Assess reachability: not exposed to untrusted input, so schedule it with normal maintenance instead of an emergency', 'Block all releases until fixed', 'Remove the test runner'], answer: 1,
            why: 'Severity labels describe the bug in general. Risk depends on whether an attacker can reach it in your system.' },
          { prompt: '<p>Your secret scanner floods developers with false alarms, so they start ignoring it. What is the engineering lesson?</p>',
            options: ['Developers should try harder', 'Precision matters: tune for few, trustworthy alerts (skip placeholders, tune rules), because an ignored alarm protects nothing', 'Turn the scanner off', 'Make alerts louder'], answer: 1,
            why: 'Alert fatigue is a real failure mode. Security tooling must be accurate enough to be trusted and acted on.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'Part 3 complete'; api.unlock(700); });
      },
    },
  ],
};
