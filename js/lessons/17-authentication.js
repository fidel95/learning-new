// Lesson 17 — Authentication, passwords and cryptography for engineers.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountCrackLab } from '../authlab.js';

export const HASH_STARTER = `// Store passwords so that a stolen database is NOT a disaster.
// Format your stored string however you like, but it must contain what verify needs
// (algorithm parameters, salt, hash) so you can raise the cost later.
const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hashPassword(password) {
  // Today: one fast hash, no salt. Attackers love this.
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(password)));
}

async function verifyPassword(password, stored) {
  return (await hashPassword(password)) === stored;
}
`;

export const HASH_VISIBLE = `test("a correct password verifies", async () => {
  const stored = await hashPassword("hunter2");
  expect(await verifyPassword("hunter2", stored)).toBe(true);
});
test("a wrong password does not", async () => {
  const stored = await hashPassword("hunter2");
  expect(await verifyPassword("hunter3", stored)).toBe(false);
});`;

export const HASH_HIDDEN = `test("the stored value never contains the password", async () => {
  expect((await hashPassword("S3cretPhrase")).includes("S3cretPhrase")).toBe(false);
});
test("same password twice gives different stored values (salt)", async () => {
  const a = await hashPassword("same-password"), b = await hashPassword("same-password");
  expect(a === b).toBe(false);
});
test("both salted values still verify", async () => {
  const a = await hashPassword("same-password"), b = await hashPassword("same-password");
  expect(await verifyPassword("same-password", a)).toBe(true);
  expect(await verifyPassword("same-password", b)).toBe(true);
});
test("the hash is deliberately slow (key stretching)", async () => {
  const t0 = performance.now(); await hashPassword("timing-check"); const ms = performance.now() - t0;
  expect(ms).toBeGreaterThan(8);
});
test("verify rejects near-miss passwords", async () => {
  const stored = await hashPassword("alpha");
  expect(await verifyPassword("alpha ", stored)).toBe(false);
  expect(await verifyPassword("ALPHA", stored)).toBe(false);
  expect(await verifyPassword("", stored)).toBe(false);
});
test("unicode and long passwords work", async () => {
  const pw = "pässwörd-日本語-" + "x".repeat(200);
  expect(await verifyPassword(pw, await hashPassword(pw))).toBe(true);
});
test("garbage stored values return false instead of throwing", async () => {
  expect(await verifyPassword("x", "")).toBe(false);
  expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  expect(await verifyPassword("x", "$$$$")).toBe(false);
});
test("the stored string carries its own parameters (so cost can be raised later)", async () => {
  const s = await hashPassword("params");
  expect(/\\d{5,}/.test(s) || s.includes("$") || s.includes(":")).toBe(true);
  expect(s.length).toBeGreaterThan(40);
});`;

export const JWT_STARTER = `// An intern wrote this token check. It passes the happy path. Find the holes and close them.
// A token looks like  header.payload.signature  (each part base64url). exp is in SECONDS since 1970.
const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));   // → binary string

async function signHs256(data, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

// Returns the payload object if the token is valid, otherwise null. Must never throw.
async function verifyToken(token, secret) {
  const [h, p, sig] = token.split(".");
  const header = JSON.parse(fromB64url(h));
  const payload = JSON.parse(fromB64url(p));
  if (header.alg !== "none") {
    if (sig != (await signHs256(h + "." + p, secret))) return null;
  }
  return payload;
}
`;

export const JWT_TEST_HELPERS = `const __enc = new TextEncoder();
const __b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
const __j = (o) => __b64(__enc.encode(JSON.stringify(o)));
async function __hmac(data, secret, hash = "SHA-256") {
  const key = await crypto.subtle.importKey("raw", __enc.encode(secret), { name: "HMAC", hash }, false, ["sign"]);
  return __b64(await crypto.subtle.sign("HMAC", key, __enc.encode(data)));
}
const __now = () => Math.floor(Date.now() / 1000);
async function __mint(payload, secret = "s3cret-key-of-decent-length-123456", header = { alg: "HS256", typ: "JWT" }, hash) {
  const body = __j(header) + "." + __j(payload);
  return body + "." + await __hmac(body, secret, hash);
}
`;

export const JWT_VISIBLE = `${JWT_TEST_HELPERS}
const SECRET = "s3cret-key-of-decent-length-123456";
test("a valid token returns its payload", async () => {
  const t = await __mint({ sub: "ana", role: "user", exp: __now() + 600 });
  const p = await verifyToken(t, SECRET);
  expect(p.sub).toBe("ana");
});
test("a token signed with another secret is rejected", async () => {
  const t = await __mint({ sub: "ana", exp: __now() + 600 }, "some-other-secret-value-0000000000");
  expect(await verifyToken(t, SECRET)).toBeNull();
});`;

export const JWT_HIDDEN = `${JWT_TEST_HELPERS}
const SECRET = "s3cret-key-of-decent-length-123456";
test("tampering with the payload breaks the signature", async () => {
  const t = await __mint({ sub: "ana", role: "user", exp: __now() + 600 });
  const [h, , s] = t.split(".");
  const forged = h + "." + __j({ sub: "ana", role: "admin", exp: __now() + 600 }) + "." + s;
  expect(await verifyToken(forged, SECRET)).toBeNull();
});
test('alg "none" (no signature at all) is rejected', async () => {
  const forged = __j({ alg: "none", typ: "JWT" }) + "." + __j({ sub: "admin", role: "admin", exp: __now() + 600 }) + ".";
  expect(await verifyToken(forged, SECRET)).toBeNull();
});
test('alg "None" / "NONE" casing tricks are rejected too', async () => {
  for (const a of ["None", "NONE", "nOnE"]) {
    const forged = __j({ alg: a, typ: "JWT" }) + "." + __j({ sub: "admin", exp: __now() + 600 }) + ".";
    expect(await verifyToken(forged, SECRET)).toBeNull();
  }
});
test("only the algorithm we expect (HS256) is accepted", async () => {
  const t = await __mint({ sub: "ana", exp: __now() + 600 }, SECRET, { alg: "HS512", typ: "JWT" });
  expect(await verifyToken(t, SECRET)).toBeNull();
  const t2 = await __mint({ sub: "ana", exp: __now() + 600 }, SECRET, { typ: "JWT" });
  expect(await verifyToken(t2, SECRET)).toBeNull();
});
test("expired tokens are rejected", async () => {
  expect(await verifyToken(await __mint({ sub: "ana", exp: __now() - 5 }), SECRET)).toBeNull();
});
test("tokens that never expire are rejected (exp is required)", async () => {
  expect(await verifyToken(await __mint({ sub: "ana" }), SECRET)).toBeNull();
});
test("exp must be a number", async () => {
  expect(await verifyToken(await __mint({ sub: "ana", exp: "never" }), SECRET)).toBeNull();
});
test("malformed input returns null and never throws", async () => {
  for (const bad of ["", "abc", "a.b", "a.b.c.d", "...", "%%%.%%%.%%%", __j({ alg: "HS256" }) + ".notjson.sig", null, undefined, 42]) {
    expect(await verifyToken(bad, SECRET)).toBeNull();
  }
});
test("an empty or missing secret never validates anything", async () => {
  const t = await __mint({ sub: "ana", exp: __now() + 600 }, "x");
  expect(await verifyToken(t, "")).toBeNull();
  expect(await verifyToken(t, undefined)).toBeNull();
});
test("a valid token still works after all that", async () => {
  const p = await verifyToken(await __mint({ sub: "bo", role: "user", exp: __now() + 60 }), SECRET);
  expect(p.sub).toBe("bo");
  expect(p.role).toBe("user");
});`;

export const SESS_STARTER = `// Server-side sessions: the browser holds only an opaque id (in an HttpOnly cookie); the server holds the facts.
// This version is how many first apps start. It has real holes. Fix them all.
//   login(username, clientSid?)  → new session id (call AFTER the password has been verified)
//   get(sid)                     → { user } or null
//   logout(sid)                  → destroys the session on the server
//   csrfToken(sid)               → a per-session token the page must send back with every state-changing request
//   checkCsrf(sid, token)        → true only for the matching token
// Rules to enforce: ids unguessable (128+ bits from crypto.getRandomValues), a fresh id at every login (session
// fixation), idle timeout 30 minutes (sliding), absolute lifetime 8 hours, logout really kills it.
function createSessions(now = () => Date.now()) {
  const store = new Map();
  let counter = 1000;
  return {
    login(username, clientSid) {
      const sid = clientSid || String(++counter);
      store.set(sid, { user: username });
      return sid;
    },
    get(sid) { return store.get(sid) || null; },
    logout(sid) {},
    csrfToken(sid) { return ""; },
    checkCsrf(sid, token) { return true; },
  };
}
`;

export const SESS_VISIBLE = `test("login then get returns the user", () => {
  const s = createSessions();
  const sid = s.login("ana");
  expect(s.get(sid).user).toBe("ana");
});
test("unknown sessions return null", () => {
  expect(createSessions().get("nope")).toBeNull();
});`;

export const SESS_HIDDEN = `const MIN = 60 * 1000, HOUR = 60 * MIN;
test("session ids are long and unguessable (not a counter)", () => {
  const s = createSessions();
  const a = s.login("ana"), b = s.login("bo");
  expect(typeof a).toBe("string");
  expect(a.length).toBeGreaterThan(21);
  expect(a === b).toBe(false);
  expect(/^\\d+$/.test(a)).toBe(false);
  expect(a.includes("ana")).toBe(false);
  const ids = new Set(); for (let i = 0; i < 50; i++) ids.add(s.login("u" + i));
  expect(ids.size).toBe(50);
});
test("login ignores an id supplied by the client (session fixation)", () => {
  const s = createSessions();
  const planted = "attacker-chosen-id-0123456789";
  const sid = s.login("ana", planted);
  expect(sid === planted).toBe(false);
  expect(s.get(planted)).toBeNull();
  expect(s.get(sid).user).toBe("ana");
});
test("idle sessions expire after 30 minutes", () => {
  let t = 0; const s = createSessions(() => t);
  const sid = s.login("ana");
  t = 29 * MIN; expect(s.get(sid).user).toBe("ana");
  t = 29 * MIN + 31 * MIN; expect(s.get(sid)).toBeNull();
});
test("activity keeps a session alive (sliding window)", () => {
  let t = 0; const s = createSessions(() => t);
  const sid = s.login("ana");
  for (let i = 1; i <= 6; i++) { t = i * 20 * MIN; expect(s.get(sid).user).toBe("ana"); }
});
test("but never past the 8-hour absolute lifetime", () => {
  let t = 0; const s = createSessions(() => t);
  const sid = s.login("ana");
  for (let i = 1; i <= 24; i++) { t = i * 20 * MIN; s.get(sid); }
  t = 8 * HOUR + MIN; expect(s.get(sid)).toBeNull();
});
test("logout destroys the session on the server", () => {
  const s = createSessions();
  const sid = s.login("ana"); s.logout(sid);
  expect(s.get(sid)).toBeNull();
});
test("each session has its own stable CSRF token", () => {
  const s = createSessions();
  const a = s.login("ana"), b = s.login("bo");
  const ta = s.csrfToken(a), tb = s.csrfToken(b);
  expect(typeof ta).toBe("string");
  expect(ta.length).toBeGreaterThan(21);
  expect(ta === tb).toBe(false);
  expect(s.csrfToken(a)).toBe(ta);
});
test("checkCsrf accepts only the right token for the right session", () => {
  const s = createSessions();
  const a = s.login("ana"), b = s.login("bo");
  const ta = s.csrfToken(a), tb = s.csrfToken(b);
  expect(s.checkCsrf(a, ta)).toBe(true);
  expect(s.checkCsrf(a, tb)).toBe(false);
  expect(s.checkCsrf(a, "")).toBe(false);
  expect(s.checkCsrf(a, undefined)).toBe(false);
  expect(s.checkCsrf("no-such-session", ta)).toBe(false);
});
test("a logged-out or expired session passes no CSRF check", () => {
  let t = 0; const s = createSessions(() => t);
  const a = s.login("ana"), ta = s.csrfToken(a);
  t = 31 * MIN;
  expect(s.checkCsrf(a, ta)).toBe(false);
});`;

export const lesson = {
  id: 'l17',
  title: 'Lesson 17 · Authentication & cryptography',
  spreads: [
    // ───────────────────────── Spread 1: crack lab (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Authentication · what you must never get wrong</p>
        <h1>Passwords, hashes and why leaks happen</h1>
        <p>Lesson 16 asked <i>"what can go wrong?"</i>. The first answer for almost every system is: <b>identity</b>. Authentication answers <b>"who are you?"</b>; authorization (lesson 16) answers <b>"what may you do?"</b>. Get the first wrong and the second is meaningless.</p>
        <h2>Four tools people confuse</h2>
        <ul>
          <li><b>Encoding</b> (Base64, URL-encoding): just a format. <i>No secret. Anyone reverses it.</i> Never a protection.</li>
          <li><b>Hashing</b> (SHA-256, bcrypt, Argon2): a one-way fingerprint. You can check a guess, not decrypt. Used for <b>passwords</b> and integrity.</li>
          <li><b>Encryption</b> (AES, RSA): two-way, needs a key. Used when you must <i>get the data back</i> (files, messages, tokens at rest).</li>
          <li><b>Signing / MAC</b> (HMAC, digital signatures): proves <i>who made it and that it was not changed</i>. Used by JWTs and API webhooks.</li>
        </ul>
        <h2>How passwords are really stolen</h2>
        <p>Databases leak (SQL injection, a bad backup, a rogue employee). So design assuming the <b>table will be stolen</b>. The attacker cannot "reverse" a hash, but can <b>guess</b>: hash popular passwords and compare. Three defenses stack:</p>
        <ol>
          <li><b>Never store the password</b> (or anything reversible). Store a hash.</li>
          <li><b>Salt:</b> a random value per user, stored beside the hash. It makes identical passwords hash differently and kills precomputed "rainbow tables".</li>
          <li><b>Slow on purpose:</b> a fast hash (SHA-256 does billions per second on a GPU) is the <i>wrong tool</i>. Use a <b>password hash</b> built to be expensive: <b>Argon2id</b>, <b>scrypt</b>, <b>bcrypt</b>, or <b>PBKDF2</b> with a high iteration count (600,000+ for PBKDF2-SHA256 today). A login takes 100 ms, a guess-everything attack takes years.</li>
        </ol>
        <p>Run the attack on the right with each method and read the numbers. Your browser has no bcrypt, so the slow hash here is PBKDF2; the principle is identical.</p>
        <div class="senior">The cost factor is a <b>dial</b>, not a constant. Hardware gets faster, so you store the parameters with every hash and quietly <b>re-hash on next login</b> at the current cost. Also: add breach-password checks and rate limiting. Even perfect hashing cannot save "password123" from a dictionary.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Lab · crack the stolen table</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">run all three methods to turn the page</span></div>`,
      init(left, right, api) {
        mountCrackLab(right.querySelector('#lab'), { onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'you have felt the difference'; api.unlock(500); } });
      },
    },

    // ───────────────────────── Spread 2: write the password hasher (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Authentication · build it right</p>
        <h1>Write the password hasher</h1>
        <p>Now you fix the code. The starter is what thousands of real apps shipped: one SHA-256, no salt, a plain <code>===</code>. Your job is to turn it into something that survives a database leak.</p>
        <h2>The recipe (with WebCrypto)</h2>
        <ul>
          <li><b>Salt:</b> <code>crypto.getRandomValues(new Uint8Array(16))</code>, new for every password.</li>
          <li><b>Stretch:</b> <code>crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256)</code> where <code>key</code> comes from <code>importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"])</code>.</li>
          <li><b>Store everything needed to verify:</b> e.g. <code>pbkdf2-sha256$600000$&lt;salt&gt;$&lt;hash&gt;</code>. Then verifying later reads the parameters from the string, and you can raise the cost without breaking old users.</li>
          <li><b>Compare safely:</b> compare the two hashes without stopping at the first differing byte (a <b>timing attack</b> can learn a secret one byte at a time). In Node: <code>crypto.timingSafeEqual</code>. In plain JS, XOR every byte and OR the results together.</li>
          <li><b>Never throw on bad input:</b> a corrupt stored value is "false", not a 500 error that leaks information.</li>
        </ul>
        <div class="warn">The tests include a timing check: if your hash takes under about 8 ms it is not "slow on purpose". But do not overshoot: a login that takes 3 seconds is a denial-of-service gift to attackers. Pick the cost so one hash takes roughly 100 to 300 ms on your production hardware.</div>
        <div class="senior">Rule zero of cryptography for working engineers: <b>do not invent it</b>. Use a vetted library and its defaults (<code>argon2</code>, <code>bcrypt</code>, <code>libsodium</code>). Writing it by hand here teaches you what the library does and why; in production you would call one function.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Challenge · hashPassword / verifyPassword</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">pass every test to turn the page</span></div>`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), {
          tasks: [{ kind: 'implement', question: 'Make stored passwords salted, slow and verifiable', visible: HASH_VISIBLE, hidden: HASH_HIDDEN, starter: HASH_STARTER, rows: 20 }],
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'passwords are safe to store'; api.unlock(800); },
        });
      },
    },

    // ───────────────────────── Spread 3: JWT (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Authentication · tokens</p>
        <h1>JWTs and the bugs behind famous breaches</h1>
        <p>A <b>JSON Web Token</b> is <code>header.payload.signature</code>. The header says how it was signed, the payload holds claims (<code>sub</code>, <code>role</code>, <code>exp</code>), and the signature (usually HMAC-SHA256 with a server secret) proves nobody changed it. The payload is <b>only encoded, not encrypted</b>: anyone can read it, so never put secrets in a JWT.</p>
        <h2>The classic holes</h2>
        <ul>
          <li><b><code>alg: "none"</code>.</b> The token itself declares how to verify it. A naive library says "none? then no signature needed" and the attacker simply writes <code>role: admin</code>. <b>The server decides the algorithm, never the token.</b></li>
          <li><b>Algorithm confusion.</b> Accepting whatever <code>alg</code> is claimed lets an attacker switch an RSA token to HMAC and sign it with the (public!) key.</li>
          <li><b>No expiry.</b> A stolen token that never dies is a permanent key. Require <code>exp</code>, keep it short (minutes), refresh deliberately.</li>
          <li><b>Weak secret.</b> HMAC secrets like <code>"secret"</code> are cracked offline in seconds with a dictionary (the exact attack from the last page, only against a signature). Use 32+ random bytes from a secrets manager.</li>
          <li><b>Non-constant-time compare, crashes on garbage, trusting claims before verifying.</b> Verify the signature <i>first</i>, then use the payload.</li>
        </ul>
        <h2>Should you use JWTs at all?</h2>
        <p>For a normal website, <b>a server-side session</b> (next page) is simpler and safer: it can be revoked instantly. JWTs shine for short-lived, stateless service-to-service calls, but you give up easy revocation and take on all the pitfalls above. "We use JWT because it is modern" is not a design reason.</p>
        <div class="senior">Fix the verifier on the right. Every hidden test is a real attack or edge case seen in the wild. Note the discipline: <b>deny by default</b>, return <code>null</code> on any doubt, and never let a parsing error escape as a crash.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Challenge · fix verifyToken</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">pass every test to turn the page</span></div>`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), {
          tasks: [{ kind: 'implement', question: 'Close every hole in the token verifier', visible: JWT_VISIBLE, hidden: JWT_HIDDEN, starter: JWT_STARTER, rows: 24 }],
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'the forger is locked out'; api.unlock(900); },
        });
      },
    },

    // ───────────────────────── Spread 4: sessions + CSRF (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Authentication · sessions</p>
        <h1>Sessions, cookies and CSRF tokens</h1>
        <p>After the password is checked, the server needs to remember "this browser is ana". The standard answer: a <b>session</b>. The server stores the facts (<code>sid → {user, created, lastSeen}</code>); the browser holds only the unguessable <code>sid</code> in a cookie.</p>
        <h2>Requirements that make it safe</h2>
        <ul>
          <li><b>Unguessable id.</b> At least 128 random bits from a CSPRNG. A counter (1001, 1002…) lets an attacker walk into other people's accounts.</li>
          <li><b>New id at login.</b> If you keep an id the client sent, an attacker can plant a known id in the victim's browser, wait for them to log in, and then use it: <b>session fixation</b>.</li>
          <li><b>Expiry twice.</b> An <b>idle timeout</b> (30 min, sliding) and an <b>absolute lifetime</b> (8 h) so stolen sessions die.</li>
          <li><b>Real logout.</b> Delete it on the server. "Clearing the cookie" does nothing if a copy was stolen.</li>
          <li><b>Cookie flags:</b> <code>HttpOnly</code> (scripts cannot read it), <code>Secure</code> (https only), <code>SameSite=Lax</code> (not sent on cross-site POSTs).</li>
          <li><b>CSRF token</b> for state-changing requests: a second per-session secret the page includes in forms or headers. A forged cross-site request carries the cookie but cannot know the token. SameSite is the first wall; the token is the second.</li>
        </ul>
        <div class="warn">Never use <code>==</code> or <code>===</code> to compare secrets in real code: it can leak through timing. You met the safe compare on the hasher page; use the same habit for tokens.</div>
        <div class="senior">Authentication adds three habits worth stealing: <b>rate-limit and lock out</b> repeated failures, <b>log</b> logins and failures (so you can detect stuffing), and add <b>MFA</b>. Passkeys (WebAuthn) are replacing passwords because there is nothing to phish or leak.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Challenge · session store</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">pass every test to turn the page</span></div>`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), {
          tasks: [{ kind: 'implement', question: 'Build a session store with fixation, expiry and CSRF protection', visible: SESS_VISIBLE, hidden: SESS_HIDDEN, starter: SESS_STARTER, rows: 26 }],
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'sessions are solid'; api.unlock(900); },
        });
      },
    },

    // ───────────────────────── Spread 5: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Four judgment calls</h1>
        <p>These are the questions a security reviewer asks in your first pull request. Pick the answer you could defend aloud.</p>
        <div class="senior">Next up in the roadmap: secure development and supply chain. Your code is only part of your attack surface; the thousand packages you installed are the rest.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>A teammate wants to "encrypt" user passwords with AES so support can recover them for users who forget. What do you say?</p>',
            options: ['Fine: AES is strong', 'No: use a slow salted password hash and offer a reset flow. Reversible storage means one stolen key exposes every password', 'Use Base64 instead, it is lighter', 'Encrypt but keep the key in the same database'], answer: 1,
            why: 'Nobody, including you, should be able to read a password. A reset link is the safe recovery path; reversibility is the vulnerability.' },
          { prompt: '<p>Why is SHA-256 a poor choice for storing passwords even with a salt?</p>',
            options: ['It is too slow', 'It is too fast: attackers can test billions of guesses per second, so you want a deliberately expensive hash like Argon2id, bcrypt or PBKDF2 with a high cost', 'It cannot be salted', 'It produces output that is too short'], answer: 1,
            why: 'Salt stops rainbow tables and cross-user reuse, but the guessing rate is what decides how fast a weak password falls. Cost is the dial.' },
          { prompt: '<p>A JWT\'s header says <code>{"alg":"none"}</code> and your server accepts it as valid. What is the root mistake?</p>',
            options: ['Using JSON', 'Letting the token choose how it is verified: the server must pin the algorithm it expects and reject everything else', 'The token was too long', 'Not using cookies'], answer: 1,
            why: 'The attacker controls the token. Any decision the token makes about its own verification is attacker-controlled.' },
          { prompt: '<p>A user logs out, but their old session id still works if replayed. What was missed?</p>',
            options: ['Nothing: logout only clears the cookie', 'The server never invalidated the session: logout must delete it server-side (and so must password changes)', 'The cookie lacked a path', 'The password was too short'], answer: 1,
            why: 'A cookie is just a copy of a key. If the server still honors the key, anyone holding a copy still has access.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(500); });
      },
    },
  ],
};
