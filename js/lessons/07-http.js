// Lesson 7 — HTTP, APIs and async JavaScript.
import { mountQuiz } from '../workbench.js';
import { mountRequestBuilder, mountApiLab } from '../httplab.js';

export const lesson = {
  id: 'l7',
  title: 'Lesson 7 · HTTP, APIs & async',
  spreads: [
    // ───────────────────────── Spread 1: HTTP ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 7 · How the internet talks</p>
        <h1>HTTP: requests and responses</h1>
        <p>Nearly everything on the web is a conversation between a <b>client</b> (your browser or app) and a
        <b>server</b> (a computer somewhere that answers). The language they speak is <b>HTTP</b>. It is
        plain text, and strictly one question, one answer: a <b>request</b> and a <b>response</b>.</p>
        <h2>Anatomy of a URL</h2>
        <pre><code>https://api.learn.test:443/api/users/2?limit=10#top
└─┬─┘   └────┬─────┘└┬┘└─────┬─────┘└───┬───┘└┬┘
scheme     host    port    path      query  fragment</code></pre>
        <p>The <b>host</b> says which computer (looked up via DNS, the internet's phone book). The <b>path</b>
        says which thing on it. The <b>query</b> adds options. The <b>fragment</b> is never sent to the server.</p>
        <h2>The request</h2>
        <pre><code>POST /api/users HTTP/1.1          ← method, path, version
Host: api.learn.test              ← headers: metadata
Content-Type: application/json

{"name": "Zed"}                   ← body (optional)</code></pre>
        <h2>Methods say what you want</h2>
        <ul>
          <li><b>GET</b> read. Changes nothing ("safe"). Never has a body.</li>
          <li><b>POST</b> create something. Doing it twice creates two things.</li>
          <li><b>PUT / PATCH</b> replace / partly change something that exists.</li>
          <li><b>DELETE</b> remove it. Doing it twice leaves the same end state ("idempotent").</li>
        </ul>
        <h2>The response: a status code first</h2>
        <ul>
          <li><b>2xx success:</b> 200 OK · 201 Created · 204 No Content (success, nothing to send back)</li>
          <li><b>3xx redirect:</b> go look somewhere else</li>
          <li><b>4xx your fault</b> (the client): 400 bad data · 401 not logged in · 403 not allowed · 404 not found · 429 slow down</li>
          <li><b>5xx our fault</b> (the server): 500 bug · 503 unavailable</li>
        </ul>
        <p>Common headers: <code>Content-Type</code> (what format the body is), <code>Authorization</code> (who you are).
        Data usually travels as <b>JSON</b>. Well-designed APIs use <b>nouns in the path</b> and <b>verbs as methods</b>:
        <code>GET /users/2</code>, not <code>/getUser?id=2</code>.</p>
        <div class="senior">The status code is part of the contract. An API that answers <code>200 OK</code> with
        <code>{"error": "not found"}</code> inside breaks every monitor, retry rule and client library that trusts the code.
        Say what happened in the code, and add details in the body.</div>
        <div class="foot"><span></span><span class="hint">send some requests →</span></div>`,
      right: `
        <p class="kicker">Request builder</p>
        <h2 style="margin-top:0">Talk to a real-feeling server</h2>
        <p>This pretend server lives inside the book. Click an example, read the raw request that would travel,
        press Send, then read the raw response. Try them in order, then break things: change the method, the URL,
        remove a header.</p>
        <div id="builder"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountRequestBuilder(right.querySelector('#builder')); },
    },

    // ───────────────────────── Spread 2: async ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 7 · Waiting without freezing</p>
        <h1>Promises and async / await</h1>
        <p>A network request takes time: 50 ms to several seconds. JavaScript has one thread (lesson 5): if it
        <i>stood still</i> waiting, the whole page would freeze. So slow operations are <b>started</b>, the program
        carries on, and it is called back when the answer arrives.</p>
        <p>A <b>Promise</b> is an object standing for a value that is not ready yet. It is <i>pending</i>, then either
        <b>fulfilled</b> (a value) or <b>rejected</b> (an error). <code>fetch()</code> returns a promise of a response.</p>
        <p><code>await</code> pauses <i>this function</i> until the promise settles, while the rest of the page keeps
        running. It only works inside an <code>async function</code> (this lab also allows it at the top level):</p>
        <pre><code>async function getUser(id) {
  const response = await fetch("/api/users/" + id);
  if (!response.ok) {                       // 404, 500... all land here
    throw new Error("HTTP " + response.status);
  }
  return await response.json();              // reading the body is async too
}</code></pre>
        <div class="warn"><b>fetch only rejects when the network itself fails.</b> A <code>404</code> or <code>500</code>
        is a perfectly successful <i>conversation</i>, so <code>fetch</code> resolves normally. Always check
        <code>response.ok</code> (true for 200–299). Forgetting this is the most common fetch bug there is.</div>
        <h2>Handling failure</h2>
        <pre><code>try {
  const user = await getUser(7);
} catch (error) {
  console.log("Could not load:", error.message);
}</code></pre>
        <h2>Sending JSON</h2>
        <pre><code>fetch("/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Zed" }),   // must be text!
});</code></pre>
        <p>Pass an object as <code>body</code> and the server receives the useless text <code>[object Object]</code>.</p>
        <h2>One at a time, or all together?</h2>
        <pre><code>// slow: 3 requests, one after another (~600 ms)
for (const id of ids) { await getUser(id); }

// fast: start all, wait for all (~200 ms)
await Promise.all(ids.map(getUser));</code></pre>
        <div class="senior">Every network call can fail four ways: the network is down, it times out, the server answers an
        error code, or the body is not what you expected. Retry only <b>5xx</b> errors and only for <b>safe or
        idempotent</b> requests (retrying a POST can create duplicates), and never retry a 4xx: the same bad request will fail again.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">API lab</p>
        <h2 style="margin-top:0">Real JavaScript, real async</h2>
        <p>Press Run, then click the rows in the network log. Then change <code>/api/users/1</code> to
        <code>/api/users/99</code> and watch the 404 (no exception!). Next, make the three calls run in
        parallel with <code>Promise.all</code> and compare the timeline bars.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountApiLab(right.querySelector('#lab'), {
          starter: 'async function getUser(id) {\n  const response = await fetch("/api/users/" + id);\n  console.log("status:", response.status, "ok:", response.ok);\n  return await response.json();\n}\n\nconst a = await getUser(1);\nconst b = await getUser(2);\nconst c = await getUser(3);\nconsole.log(a.name, b.name, c.name);',
          rows: 12,
        });
      },
    },

    // ───────────────────────── Spread 3: auth & security ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 7 · Safe by design</p>
        <h1>Identity, secrets and trust</h1>
        <h2>Who are you, and may you?</h2>
        <ul>
          <li><b>Authentication</b>: proving <i>who</i> you are (a password, a token).</li>
          <li><b>Authorization</b>: deciding <i>what</i> that person may do.</li>
        </ul>
        <p>The status codes read confusingly: <b>401</b> ("Unauthorized") really means "I don't know who you are",
        while <b>403 Forbidden</b> means "I know who you are, and the answer is no". Try both on the right.</p>
        <p>After logging in, the client usually sends a <b>token</b> on every request:
        <code>Authorization: Bearer &lt;token&gt;</code>. A token <b>is</b> a password. Do not print it, commit it,
        or put it in a URL (URLs end up in logs and browser history).</p>
        <h2>Everything in the browser is public</h2>
        <p>Open DevTools on any site and you can read all its JavaScript and every request it makes.
        So <b>a secret key inside front-end code is not a secret</b>. Real secrets (database passwords, payment
        keys) live only on <i>your server</i>; the browser talks to your server, and your server talks to the
        other service.</p>
        <h2>HTTPS</h2>
        <p><code>https://</code> encrypts the conversation (TLS) and proves you reached the right server. Over plain
        <code>http://</code> anyone on the same Wi-Fi can read or change what you send, passwords included.
        Never send credentials over http.</p>
        <h2>CORS in one paragraph</h2>
        <p>If JavaScript on <code>a.com</code> tries to read a response from <code>b.com</code>, the <b>browser</b>
        blocks it unless <code>b.com</code> says it allows <code>a.com</code> (via CORS headers). It protects <i>users</i>
        from malicious pages, not servers from requests. The error "blocked by CORS policy" is fixed on the
        <i>server</i>, never by changing front-end code.</p>
        <div class="senior"><b>Never trust the client.</b> Anyone can send any request with any tool, skipping your
        form entirely. Validate and authorize on the server <i>every time</i>. Front-end validation is only a
        courtesy to make the form friendlier. Notice how this pretend server rejected <code>{"name": ""}</code> with a 400 itself.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Request builder</p>
        <h2 style="margin-top:0">Authentication in practice</h2>
        <p>Try in order: <b>Secret (no token)</b> → 401. <b>Secret (token)</b> → 200. <b>Admin (403)</b> → valid token,
        no permission. Then edit the token by one character and send again. Finally try <b>Create (no header)</b>:
        a 415, because the server will not guess the body's format.</p>
        <div id="builder"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountRequestBuilder(right.querySelector('#builder')); },
    },

    // ───────────────────────── Spread 4: challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge</p>
        <h1>Build a small API client</h1>
        <p>Write five <code>async</code> functions against the pretend server. The book calls them, then also
        inspects the <b>network log</b>: it verifies what you actually <i>sent</i>, not only what you returned.
        Hard-coding an answer will not pass.</p>
        <div id="tasks"></div>
        <div class="senior">The token for task 3 is <code>lesson7-token</code> (in real life it would come from a login).
        Click the rows in the network log to see exactly what you sent and what came back. That is how you debug
        any API problem in the real world.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">API lab</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all five to turn the page</span></div>`,
      init(left, right, api) {
        const probes = {
          u1: 'getUserName(1)', u2: 'getUserName(99)',
          c1: 'createUser("Zed")', c2: 'createUser("")',
          s1: 'getSecret()',
          r1: 'fetchWithRetry("/api/flaky?key=t", 3)', r2: 'fetchWithRetry("/api/down", 2)',
          p1: 'loadNames([1, 2, 3])',
        };
        const body = (r, name) => {
          const i = r.source.indexOf('function ' + name);
          if (i < 0) return '';
          const next = r.source.indexOf('function ', i + 9);
          return next < 0 ? r.source.slice(i) : r.source.slice(i, next);
        };
        const sent = (r, f) => r.net.some(f);
        const tasks = [
          { label: 'getUserName(id): GET /api/users/ID and return the name. If the server answers an error status (like 404), return "unknown". Check response.ok or response.status.',
            check: (r) => r.probes.u1 === 'Ana' && r.probes.u2 === 'unknown' && /\.(ok|status)\b/.test(body(r, 'getUserName')) },
          { label: 'createUser(name): POST JSON {name} to /api/users with the right Content-Type header. Return the created user object. If the server rejects it (400), return null.',
            check: (r) => r.probes.c1 && r.probes.c1.name === 'Zed' && r.probes.c1.id >= 4 && r.probes.c2 === null &&
              sent(r, (n) => n.method === 'POST' && n.status === 201 && /application\/json/.test(n.reqHeaders['content-type'] || '')) },
          { label: 'getSecret(): GET /api/secret with the header  Authorization: Bearer lesson7-token  and return the secret text.',
            check: (r) => r.probes.s1 === 'swordfish' && sent(r, (n) => /\/api\/secret$/.test(n.url) && n.status === 200 && n.reqHeaders.authorization === 'Bearer lesson7-token') },
          { label: 'fetchWithRetry(url, tries): GET the url; if the status is 5xx, try again, up to "tries" attempts in total. Return the parsed JSON on success, or null if every attempt failed.',
            check: (r) => r.probes.r1 && r.probes.r1.ok === true && r.probes.r2 === null &&
              r.net.filter((n) => n.url.includes('/api/down')).length === 2 && r.net.filter((n) => n.url.includes('key=t')).length === 3 },
          { label: 'loadNames(ids): fetch every user in the list IN PARALLEL with Promise.all and return an array of names. (It must finish in well under the time of three one-after-another requests.)',
            check: (r) => JSON.stringify(r.probes.p1) === '["Ana","Bo","Cy"]' && r.times.p1 < 450 && /Promise\.all/.test(body(r, 'loadNames')) },
        ];
        mountApiLab(right.querySelector('#lab'), {
          starter: '// Task 1\nasync function getUserName(id) {\n  // your code\n}\n\n// Task 2\nasync function createUser(name) {\n  // your code\n}\n\n// Task 3\nasync function getSecret() {\n  // your code\n}\n\n// Task 4\nasync function fetchWithRetry(url, tries) {\n  // your code\n}\n\n// Task 5\nasync function loadNames(ids) {\n  // your code\n}\n',
          probes, tasks, tasksEl: left.querySelector('#tasks'), rows: 22,
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(250); },
        });
      },
    },

    // ───────────────────────── Spread 5: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Four questions about the traps that break real integrations. Reproduce any of them in the API lab or
        the request builder if you want proof.</p>
        <div class="senior">When an integration "randomly" fails, open the network log first. Nine times out of ten the
        request that was <i>sent</i> is not the one you thought you wrote.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<pre><code>const res = await fetch("/api/users/99");   // server answers 404\nconsole.log(res.ok);</code></pre>',
            options: ['It throws an exception', 'Prints false: fetch resolved normally, with status 404', 'Prints true', 'Prints null'], answer: 1,
            why: 'fetch only rejects when the network fails. A 404 is a normal response, so you must check res.ok yourself.' },
          { prompt: '<p>Your token is valid, but the server refuses because your account may not delete other people\'s data. Which status fits best?</p>',
            options: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '200 OK'], answer: 1,
            why: '401 means "I do not know who you are". 403 means "I know you, and no". The token worked, the permission did not.' },
          { prompt: '<pre><code>fetch("/api/users", {\n  method: "POST",\n  body: { name: "Zed" },\n});</code></pre><p>What does the server receive as the body?</p>',
            options: ['{"name":"Zed"}', 'The text [object Object]', 'Nothing', 'An error is thrown before sending'], answer: 1,
            why: 'Bodies must be text. An object is converted with String(), giving "[object Object]". Use JSON.stringify and a Content-Type: application/json header.' },
          { prompt: '<p>Three independent requests each take about 200 ms. You <code>await</code> them one after another in a loop. About how long does the loop take?</p>',
            options: ['About 200 ms', 'About 600 ms', 'About 100 ms', 'It depends on the server only'], answer: 1,
            why: 'Each await waits for its request to finish before starting the next: 200 + 200 + 200. Promise.all would start all three together, finishing in about 200 ms.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(250); });
      },
    },
  ],
};
