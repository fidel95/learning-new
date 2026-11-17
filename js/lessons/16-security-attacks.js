// Lesson 16 — Threat modeling and the web's classic attacks: attack a vulnerable app, then fix it.
import { mountQuiz } from '../workbench.js';
import { mountDom } from '../dom.js';
import { mountServerLab } from '../sqllab.js';
import { mountThreatModel } from '../securitylab.js';

const SEED = `
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT UNIQUE, role TEXT NOT NULL DEFAULT 'user', display_name TEXT, email TEXT);
INSERT INTO users VALUES (1, 'ana', 'user', 'Ana', 'ana@example.com'), (2, 'bo', 'user', 'Bo', 'bo@example.com'), (3, 'admin', 'admin', 'Admin', 'admin@corp.example');
CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL);
INSERT INTO notes (owner_id, title, body) VALUES (1, 'Diary', 'ana private diary'), (2, 'Shopping', 'milk and eggs'), (1, 'Bank', 'my PIN is 4821');
`;

const VULNERABLE = `// "Notes" app v1. It works... and it is full of holes. You are the security engineer.
// A trusted login system sets the header  x-user  (ana, bo or admin). Pretend it cannot be forged.
// fetchUrl(url) downloads a web page for the preview feature.

const me = (req) => db.get("SELECT * FROM users WHERE name = ?", [req.headers["x-user"]]);

app.get("/api/notes", (req) => {
  const search = req.query.search || "";
  const rows = db.all("SELECT id, title FROM notes WHERE owner_id = " + me(req).id + " AND title LIKE '%" + search + "%'");
  return json(rows);
});

app.get("/api/notes/:id", (req) => {
  const note = db.get("SELECT * FROM notes WHERE id = ?", [req.params.id]);
  return note ? json(note) : json({ error: "not found" }, 404);
});

app.get("/api/profile", (req) => json(me(req)));

app.patch("/api/profile", (req) => {
  const user = me(req);
  const changes = req.json();
  for (const key of Object.keys(changes)) {
    db.run("UPDATE users SET " + key + " = ? WHERE id = ?", [changes[key], user.id]);
  }
  return json(me(req));
});

app.get("/api/admin/users", (req) => {
  return json(db.all("SELECT id, name, role, email FROM users"));
});

app.get("/api/preview", (req) => {
  return json({ html: fetchUrl(req.query.url) });
});

app.post("/api/account/email", (req) => {
  const user = me(req);
  db.run("UPDATE users SET email = ? WHERE id = ?", [req.json().email, user.id]);
  return json({ ok: true });
});
`;

const evil = 'x%\' OR 1=1 --';
const HOSTILE = 'x-user: ana\norigin: https://evil.example\nsec-fetch-site: cross-site';
const GOOD = 'x-user: ana\norigin: https://notes.example\nsec-fetch-site: same-origin';

export const lesson = {
  id: 'l16',
  title: 'Lesson 16 · Security: threats & attacks',
  spreads: [
    // ───────────────────────── Spread 1: threat modeling (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 3 · Security</p>
        <h1>Think like an attacker, build like a defender</h1>
        <p>Security is not a feature you bolt on at the end. It is a <b>property of the whole design</b>, like reliability. And it is asymmetric: you must close <i>every</i> hole; an attacker needs <i>one</i>.
        The good news after twenty years of breaches: almost all of them exploit <b>boring, well-known mistakes</b>, so learning the common ones prevents most harm.</p>
        <h2>The vocabulary</h2>
        <ul>
          <li><b>Assets</b>: what is worth protecting (customer data, money, accounts, uptime, reputation).</li>
          <li><b>Adversaries</b>: automated bots (the vast majority), criminals after money, insiders, competitors, rarely nation-states. Know who you are defending against.</li>
          <li><b>Attack surface</b>: every place input enters or power is held: each endpoint, form, file upload, dependency, admin tool, <i>and person</i> (phishing).</li>
          <li><b>Trust boundary</b>: a line where data crosses from a less trusted zone to a more trusted one (browser → server, user → database, internet → internal network). <b>Everything crossing a boundary must be validated.</b></li>
          <li><b>Risk = likelihood × impact.</b> You cannot fix everything; fix what is likely <i>and</i> damaging first.</li>
        </ul>
        <h2>Principles that outlast every technology</h2>
        <ul>
          <li><b>Defense in depth</b>: several independent layers, because any one will eventually fail.</li>
          <li><b>Least privilege</b>: every user, service and key gets the minimum access needed, so a compromise stays small.</li>
          <li><b>Deny by default / fail secure</b>: when unsure or broken, refuse. Allow-lists beat block-lists.</li>
          <li><b>Never trust the client.</b> Anything from the browser, a header, a cookie value, a file name, can be forged.</li>
          <li><b>Keep it simple</b>: complexity hides bugs, and attackers live in the gaps.</li>
          <li><b>Assume breach</b>: log, monitor, segment, and plan the response.</li>
        </ul>
        <h2>Threat modeling in four questions</h2>
        <p>1. What are we building? 2. <b>What can go wrong?</b> 3. What will we do about it? 4. Did we do a good job? To answer #2 systematically, use <b>STRIDE</b>: <b>S</b>poofing, <b>T</b>ampering, <b>R</b>epudiation,
        <b>I</b>nformation disclosure, <b>D</b>enial of service, <b>E</b>levation of privilege. Walk each box and arrow of your diagram and ask "how could each of these happen here?"</p>
        <div class="senior">Do a threat model in <b>design</b>, on a whiteboard, in 30 minutes. A flaw found there costs a sentence; the same flaw found in production costs an incident, a disclosure letter, and trust. The
        #1 risk on the OWASP Top 10 for years is <b>broken access control</b>: not clever hacking, just "we forgot to check whether this person may do this".</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Threat-modeling lab</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">get at least 14 of 16 right to turn the page</span></div>`,
      init(left, right, api) {
        mountThreatModel(right.querySelector('#lab'), { onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'threat model accepted'; api.unlock(500); } });
      },
    },

    // ───────────────────────── Spread 2: XSS (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 3 · Attack 1: cross-site scripting</p>
        <h1>XSS: when data becomes code</h1>
        <p>In lesson 5 you were warned about <code>innerHTML</code>. Here is why it matters so much. In <b>cross-site scripting (XSS)</b>, an attacker gets <i>their JavaScript to run on your page</i>, in your visitor's browser, with your site's full authority.
        It can read the page, call your API as the user, steal session tokens, log keystrokes, or rewrite the page into a fake login.</p>
        <p><b>Stored XSS</b>: the payload is saved (a comment, a profile name) and attacks everyone who views it. <b>Reflected</b>: it travels in a link. <b>DOM-based</b>: client-side code writes it into the page.</p>
        <h2>The root cause, and the only real fix</h2>
        <p>One mistake in every XSS: <b>untrusted data was interpreted as markup or code</b>. Filtering the input ("remove &lt;script&gt;") fails: attackers have hundreds of tricks (<code>&lt;img onerror=…&gt;</code>, <code>javascript:</code> links, odd encodings). The robust fix is
        <b>output encoding for the context</b>: when you put text into HTML, turn <code>&lt; &gt; &amp; " '</code> into harmless entities, so it is displayed, not executed.</p>
        <pre><code>// Dangerous: the string is parsed as HTML
li.innerHTML = "&lt;b&gt;" + author + "&lt;/b&gt;: " + text;

// Safe: text stays text
const b = document.createElement("b");
b.textContent = author;
li.append(b, ": " + text);</code></pre>
        <p>Modern frameworks (React, Vue) encode by default; the danger is the escape hatches (<code>dangerouslySetInnerHTML</code>, <code>v-html</code>). If you truly must render user HTML (a rich-text editor), pass it through a vetted <b>sanitizer</b>
        such as DOMPurify, never a regex you wrote.</p>
        <h2>Layers behind the fix</h2>
        <ul>
          <li><b>Content-Security-Policy (CSP)</b> header: tells the browser which scripts may run (for example, no inline scripts). A great backstop, not a substitute.</li>
          <li><b>HttpOnly cookies</b>: page JavaScript cannot read them, so an XSS cannot steal the session cookie directly.</li>
          <li>Context matters: HTML text, attributes, URLs and JavaScript each need their own encoding. Never build a <code>javascript:</code> URL or inline handler from user data.</li>
        </ul>
        <div class="senior">Input validation is good hygiene but is <b>not</b> your XSS defense: a comment like <code>I &lt;3 this &amp; that</code> is perfectly legitimate input and must display correctly. Encode at <b>output</b>, every time, at the last moment, for the place it lands.</div>
        <div id="tasks"></div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">XSS lab · the attack is real (in a sandbox)</p>
        <h2 style="margin-top:0">Comment section v1</h2>
        <p>Eve's comment contains an attack that sets <code>window.__hacked</code>. Run it and watch the check fail. Then fix the JavaScript so it stays safe <i>and</i> still shows every comment correctly.</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">fix all three to turn the page</span></div>`,
      init(left, right, api) {
        const tasks = [
          { label: 'The attack is neutralized: Eve\'s payload does not run (window.__hacked never becomes true)',
            test: "await wait(400); return window.__hacked !== true;" },
          { label: 'Comments show their exact text, including special characters like <img ...> and "I <3 this & that"',
            test: "const items = [...document.querySelectorAll('#comments li')]; if (items.length !== 3) return false; return items[1].textContent.includes('<img src=x onerror=') && items[2].textContent.includes('I <3 this & that');" },
          { label: 'Each author name is still shown in bold (a <b> element), like before',
            test: "const items = [...document.querySelectorAll('#comments li')]; return items.length === 3 && items.every((li, i) => li.querySelector('b') && li.querySelector('b').textContent === ['Ana', 'Eve', 'Bo'][i]);" },
        ];
        mountDom(right.querySelector('#lab'), {
          html: '<h3>Comments</h3>\n<ul id="comments"></ul>',
          js: 'const comments = [\n  { author: "Ana", text: "Great article!" },\n  { author: "Eve", text: \'<img src=x onerror="window.__hacked=true">\' },\n  { author: "Bo", text: "I <3 this & that" },\n];\n\nconst list = document.querySelector("#comments");\nfor (const c of comments) {\n  const li = document.createElement("li");\n  li.innerHTML = "<b>" + c.author + "</b>: " + c.text;\n  list.append(li);\n}\n',
          tasks, tasksEl: left.querySelector('#tasks'), rows: 13, showTree: false,
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'XSS fixed'; api.unlock(600); },
        });
        right.querySelectorAll('.tab')[1].click();
      },
    },

    // ───────────────────────── Spread 3: access control, SSRF, CSRF (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 3 · Attacks 2 to 6</p>
        <h1>Broken access control, injection, SSRF and CSRF</h1>
        <h2>Broken access control (OWASP #1)</h2>
        <p><b>Authentication</b> asks "who are you?"; <b>authorization</b> asks "may you do <i>this</i>?" Most breaches fail the second. Check it <b>on the server, on every request</b>, at three levels:</p>
        <ul>
          <li><b>Object level (IDOR)</b>: <code>GET /notes/3</code>: is note 3 <i>yours</i>? Changing an id in the URL must not reveal someone else's data. Random-looking ids help but are not authorization.</li>
          <li><b>Function level</b>: can a normal user call the admin endpoint? Hiding the button is not security: attackers call the API directly.</li>
          <li><b>Field level (mass assignment)</b>: if you copy every field of the request into the database, a user can send <code>"role": "admin"</code>. Accept only an <b>allow-list</b> of fields.</li>
        </ul>
        <p><b>Deny by default</b>: a route with no explicit rule should refuse.</p>
        <h2>Injection (again)</h2>
        <p>Never build a query by joining text (lesson 8). Parameters, always. The same disease affects shell commands, LDAP, templates: <b>separate code from data</b>.</p>
        <h2>SSRF: making your server attack for them</h2>
        <p>A feature that fetches a URL the user supplies (link preview, import-from-URL, webhook test) can be pointed at addresses only <i>your server</i> can reach: internal admin pages, databases, and cloud metadata services
        that hold credentials. This was the root of the 2019 Capital One breach (100 million customers). Defend with an <b>allow-list of hosts</b>, https only, blocking private and link-local addresses, and network segmentation.</p>
        <h2>CSRF: riding the victim's cookie</h2>
        <p>Browsers attach your cookies to <i>every</i> request to a site, even one started by <i>another</i> site. Visit a malicious page and it can make your browser POST "change email" to your bank, logged in as you. Defenses: <b>SameSite cookies</b>
        (<code>Lax</code> or <code>Strict</code>), <b>anti-CSRF tokens</b> that a foreign page cannot read, and checking the <b>Origin</b> header on state-changing requests.</p>
        <div class="senior">Notice the pattern: every attack here works because the server <b>trusted something it should have verified</b> (an id, a field name, a URL, a request's origin). When you design an endpoint, ask of each input: "who controls this, and what is the worst they can make it?"</div>
        <div id="tasks"></div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Attack, then patch</p>
        <h2 style="margin-top:0">Six holes. Close them all.</h2>
        <p>The book attacks your server automatically on every start, and also checks that <b>legitimate use still works</b> (blocking everything does not count). Try attacks yourself too with the chips: send the same request as <code>ana</code>, <code>bo</code> or <code>admin</code>.</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">block all six attacks to turn the page</span></div>`,
      init(left, right, api) {
        const j = (o) => JSON.stringify(o);
        const requests = [
          { id: 'noteOwn', method: 'GET', url: '/api/notes/2', headers: 'x-user: bo' },
          { id: 'idor', method: 'GET', url: '/api/notes/3', headers: 'x-user: bo' },
          { id: 'listOwn', method: 'GET', url: '/api/notes?search=Shop', headers: 'x-user: bo' },
          { id: 'sqli', method: 'GET', url: '/api/notes?search=' + encodeURIComponent(evil), headers: 'x-user: bo' },
          { id: 'adminAttack', method: 'GET', url: '/api/admin/users', headers: 'x-user: bo' },
          { id: 'adminLegit', method: 'GET', url: '/api/admin/users', headers: 'x-user: admin' },
          { id: 'massAttack', method: 'PATCH', url: '/api/profile', headers: 'x-user: bo', body: j({ role: 'admin' }) },
          { id: 'massLegit', method: 'PATCH', url: '/api/profile', headers: 'x-user: bo', body: j({ display_name: 'Bobby' }) },
          { id: 'profile', method: 'GET', url: '/api/profile', headers: 'x-user: bo' },
          { id: 'ssrf1', method: 'GET', url: '/api/preview?url=' + encodeURIComponent('http://169.254.169.254/latest/meta-data/iam'), headers: 'x-user: bo' },
          { id: 'ssrf2', method: 'GET', url: '/api/preview?url=' + encodeURIComponent('http://localhost:8080/admin'), headers: 'x-user: bo' },
          { id: 'ssrfLegit', method: 'GET', url: '/api/preview?url=' + encodeURIComponent('https://example.com/article'), headers: 'x-user: bo' },
          { id: 'csrfAttack', method: 'POST', url: '/api/account/email', headers: HOSTILE, body: j({ email: 'attacker@evil.example' }) },
          { id: 'csrfLegit', method: 'POST', url: '/api/account/email', headers: GOOD, body: j({ email: 'ana2@example.com' }) },
          { id: 'anaProfile', method: 'GET', url: '/api/profile', headers: 'x-user: ana' },
        ];
        const tasks = [
          { label: 'IDOR: bo can no longer read ana\'s note, but still reads his own',
            check: (r) => ({ ok: !(r.idor.raw || '').includes('PIN') && r.noteOwn.status === 200 && r.noteOwn.body && r.noteOwn.body.title === 'Shopping' }) },
          { label: 'SQL injection: a crafted search returns no one else\'s notes, and normal search still works',
            check: (r) => ({ ok: (r.sqli.status === 200 ? Array.isArray(r.sqli.body) && !r.sqli.body.some((n) => n.id === 1 || n.id === 3) : r.sqli.status === 400) && r.listOwn.status === 200 && Array.isArray(r.listOwn.body) && r.listOwn.body.length === 1 && r.listOwn.body[0].id === 2 }) },
          { label: 'Missing function-level check: bo is refused on /api/admin/users, the admin still gets in',
            check: (r) => ({ ok: (r.adminAttack.status === 401 || r.adminAttack.status === 403) && r.adminLegit.status === 200 && Array.isArray(r.adminLegit.body) && r.adminLegit.body.length === 3 }) },
          { label: 'Mass assignment: sending "role": "admin" does not change bo\'s role, but display_name can still be changed',
            check: (r) => ({ ok: r.profile.status === 200 && r.profile.body && r.profile.body.role === 'user' && r.profile.body.display_name === 'Bobby' }) },
          { label: 'SSRF: internal addresses are refused, but https://example.com/article still previews',
            check: (r) => ({ ok: !(r.ssrf1.raw || '').includes('SECRET') && !(r.ssrf2.raw || '').includes('SECRET') && r.ssrfLegit.status === 200 && (r.ssrfLegit.raw || '').includes('public article') }) },
          { label: 'CSRF: a cross-site request cannot change ana\'s email, but her real site still can',
            check: (r) => ({ ok: r.anaProfile.status === 200 && r.anaProfile.body && r.anaProfile.body.email === 'ana2@example.com' && r.csrfAttack.status >= 400 && r.csrfAttack.status < 500 && r.csrfLegit.status === 200 }) },
        ];
        mountServerLab(right.querySelector('#lab'), {
          seed: SEED, code: VULNERABLE, rows: 24, viewTable: ['users', 'notes'], requests, tasks, tasksEl: left.querySelector('#tasks'),
          examples: [
            { name: 'bo reads note 3', method: 'GET', url: '/api/notes/3', headers: 'x-user: bo' },
            { name: 'bo searches', method: 'GET', url: '/api/notes?search=Shop', headers: 'x-user: bo' },
            { name: 'bo → admin list', method: 'GET', url: '/api/admin/users', headers: 'x-user: bo' },
            { name: 'bo makes himself admin', method: 'PATCH', url: '/api/profile', headers: 'x-user: bo', body: '{"role": "admin"}' },
            { name: 'preview internal URL', method: 'GET', url: '/api/preview?url=http://localhost:8080/admin', headers: 'x-user: bo' },
            { name: 'forged cross-site email change', method: 'POST', url: '/api/account/email', headers: HOSTILE, body: '{"email": "attacker@evil.example"}' },
          ],
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all holes closed'; api.unlock(900); },
        });
      },
    },

    // ───────────────────────── Spread 4: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Four security judgment calls</h1>
        <p>Choose the answer a defender would defend in a review. Wrong answers are tempting because they sound like security, but they treat symptoms or hide problems instead of closing them.</p>
        <div class="senior">Security work you did here is directly reusable: the same six holes appear again and again, in code written by good developers under deadline. Next lesson: the cryptography and authentication that sit under all of it.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Your site shows user-submitted comments. What is the correct defense against stored XSS?</p>',
            options: ['Remove the word "script" from comments when saving', 'Encode/escape the comment for its context whenever it is output (e.g. textContent), with CSP as a backstop', 'Validate that comments are under 500 characters', 'Hide the comment box from search engines'], answer: 1,
            why: 'The flaw is interpreting data as code at output time. Encoding at output fixes the cause; filtering input fails against the many ways to smuggle a payload, and length limits are irrelevant.' },
          { prompt: '<p>A user changes <code>/orders/1001</code> to <code>/orders/1002</code> in the address bar and sees a stranger\'s order. What is the bug and the fix?</p>',
            options: ['Weak passwords: enforce stronger ones', 'IDOR (broken access control): check on the server that the logged-in user owns each record', 'XSS: escape the order number', 'The ids are too short: make them random-looking and call it done'], answer: 1,
            why: 'The server answered without asking "does this user own order 1002?". Unpredictable ids make guessing harder, but only an ownership check is actual authorization.' },
          { prompt: '<p>A "link preview" feature fetches whatever URL a user submits. What is the main danger?</p>',
            options: ['It might be slow', 'SSRF: the server can be made to fetch internal-only addresses, such as cloud metadata with credentials', 'It uses too much bandwidth', 'Users may paste invalid links'], answer: 1,
            why: 'The server sits inside your network, so a user-controlled URL becomes a way to reach things the user never could. Allow-list hosts, require https, and block private addresses.' },
          { prompt: '<p>Which cookie attributes best reduce session theft via XSS and cross-site request forgery?</p>',
            options: ['Expires far in the future', 'HttpOnly, Secure and SameSite (Lax or Strict)', 'A longer cookie name', 'Path=/'], answer: 1,
            why: 'HttpOnly keeps scripts from reading it, Secure keeps it off plain http, and SameSite stops the browser sending it on cross-site requests, which blocks most CSRF.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(500); });
      },
    },
  ],
};
