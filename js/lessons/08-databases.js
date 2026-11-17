// Lesson 8 — Databases (SQL) and servers.
import { mountQuiz } from '../workbench.js';
import { mountSqlLab, mountSqlChallenge, mountInjectionDemo, mountServerLab } from '../sqllab.js';

// A small shop database used by the SQL pages. (Real SQLite, running in your browser.)
const SHOP_SEED = `
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT, joined TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), item TEXT NOT NULL, price REAL NOT NULL, qty INTEGER NOT NULL);
INSERT INTO customers VALUES (1, 'Ana', 'Louisville', '2024-01-15'), (2, 'Bo', 'Chicago', '2024-03-02'), (3, 'Cy', 'Louisville', '2024-06-20'), (4, 'Di', 'Austin', '2025-02-11');
INSERT INTO orders VALUES (1, 1, 'Keyboard', 49.99, 1), (2, 1, 'Mouse', 19.5, 2), (3, 2, 'Monitor', 189.0, 1), (4, 3, 'Cable', 7.25, 4), (5, 1, 'Webcam', 59.0, 1), (6, 3, 'Desk', 240.0, 1);
`;
const SHOP_SCHEMA = 'customers(id, name, city, joined)\norders(id, customer_id, item, price, qty)   -- customer_id points at customers.id';

const NOTES_SEED = `
CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '');
INSERT INTO notes (title, body) VALUES ('Buy milk', 'two litres'), ('Call mom', 'Sunday'), ('Plan trip', 'check flights');
`;

export const lesson = {
  id: 'l8',
  title: 'Lesson 8 · Databases & servers',
  spreads: [
    // ───────────────────────── Spread 1: SQL basics ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 8 · Where data lives</p>
        <h1>Databases and SQL</h1>
        <p>Apps need to <b>remember</b>: users, orders, messages. A plain file is fragile: two writers corrupt it,
        finding one record means reading everything, and a crash mid-write loses data. A <b>database</b>
        is a program built to store data safely, find it fast, and let many users share it.</p>
        <p>Most apps use a <b>relational database</b>: data lives in <b>tables</b>. A table has <b>columns</b> (the fields,
        each with a type) and <b>rows</b> (one record each). A <b>primary key</b> is a column whose value is unique per row
        (usually <code>id</code>), so any row can be named precisely.</p>
        <p>You talk to it in <b>SQL</b>. It is <i>declarative</i>: you describe <b>what</b> you want, and the database
        decides <b>how</b> to get it. The four everyday operations, often called CRUD:</p>
        <pre><code>SELECT name, city FROM customers WHERE city = 'Louisville' ORDER BY name;   -- Read
INSERT INTO customers (name, city) VALUES ('Eve', 'Boston');                -- Create
UPDATE customers SET city = 'Denver' WHERE name = 'Bo';                     -- Update
DELETE FROM customers WHERE id = 4;                                         -- Delete</code></pre>
        <h2>Filtering and shaping a SELECT</h2>
        <ul>
          <li><code>WHERE</code> with <code>=  &lt;&gt;  &lt;  &gt;  AND  OR  IN (...)</code>, text patterns <code>LIKE 'A%'</code> (% = anything), and <code>IS NULL</code>.</li>
          <li><code>ORDER BY price DESC</code> sorts (DESC = biggest first). <code>LIMIT 3</code> keeps three rows.</li>
          <li><code>SELECT price * qty AS total</code> computes and renames a column.</li>
        </ul>
        <div class="warn"><b>NULL</b> means "unknown / no value". <code>city = NULL</code> is never true, even for NULL
        cities. Write <code>city IS NULL</code>. And <code>UPDATE</code> or <code>DELETE</code> <b>without WHERE</b>
        changes <b>every row</b>. Professionals first run a <code>SELECT</code> with the same WHERE to see exactly which rows they are about to touch.</div>
        <div class="senior">Text in SQL uses <b>single quotes</b>: <code>'Louisville'</code>. Double quotes mean a column name. And never
        guess what a query returns: <i>run it and look</i>. Reading results is the debugger for data.</div>
        <div class="foot"><span></span><span class="hint">query it →</span></div>`,
      right: `
        <p class="kicker">SQL lab · a real SQLite database</p>
        <h2 style="margin-top:0">Ask the shop database questions</h2>
        <p>Try: all orders · orders over 50 · customers whose name starts with a letter (<code>LIKE</code>) ·
        <code>SELECT item, price * qty AS total FROM orders</code>. Then <code>UPDATE</code> something and
        <code>SELECT</code> again. Changes last until you reset.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountSqlLab(right.querySelector('#lab'), { seed: SHOP_SEED, schema: SHOP_SCHEMA, starter: "SELECT name, city FROM customers\nWHERE city = 'Louisville'\nORDER BY name;" });
      },
    },

    // ───────────────────────── Spread 2: relationships, JOIN, aggregates ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 8 · Connecting tables</p>
        <h1>Relationships, JOIN and GROUP BY</h1>
        <p>An order belongs to a customer. Copying the customer's name into every order would waste space and,
        worse, create <b>contradictions</b> (rename Ana in one row and forget another). Instead each order stores
        only <code>customer_id</code>, a <b>foreign key</b> pointing at <code>customers.id</code>. Every fact lives in
        <b>exactly one place</b>. That discipline is called <b>normalization</b>.</p>
        <p>To see names beside orders you <b>JOIN</b> the tables, matching the key:</p>
        <pre><code>SELECT customers.name, orders.item, orders.price
FROM orders
JOIN customers ON customers.id = orders.customer_id;</code></pre>
        <ul>
          <li><code>JOIN</code> (inner): only rows that match on both sides. Customers with no orders vanish.</li>
          <li><code>LEFT JOIN</code>: keeps <b>every</b> row from the left table, filling <code>NULL</code> where nothing matches. Perfect for "customers who never ordered".</li>
        </ul>
        <h2>Summarising: aggregates and GROUP BY</h2>
        <pre><code>SELECT customers.name, COUNT(*) AS orders, SUM(price * qty) AS spent
FROM customers
JOIN orders ON orders.customer_id = customers.id
GROUP BY customers.name
HAVING spent &gt; 100
ORDER BY spent DESC;</code></pre>
        <p><code>COUNT SUM AVG MIN MAX</code> collapse many rows into one number. <code>GROUP BY</code> does it once per group.
        <code>WHERE</code> filters rows <i>before</i> grouping; <code>HAVING</code> filters the groups <i>after</i>.</p>
        <h2>Let the database protect your data</h2>
        <ul>
          <li><b>Constraints</b>: <code>NOT NULL</code>, <code>UNIQUE</code>, <code>FOREIGN KEY</code>. The database refuses bad data even if your app has a bug.</li>
          <li><b>Indexes</b>: like a book's index, they make lookups on a column fast, at the cost of slower writes and extra space.</li>
          <li><b>Transactions</b>: several changes that succeed or fail <i>together</i> (moving money out of one account and into another).</li>
        </ul>
        <div class="senior">Code has bugs; the database is the last line of defense. If "every order has a customer" is a rule,
        make it a <b>constraint</b>, not a hope. Also, for <b>every</b> query that will run often, ask: which column does this filter by,
        and is it indexed? Slow queries are the most common real-world performance problem.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">SQL lab</p>
        <h2 style="margin-top:0">Join and summarise</h2>
        <p>Run the join. Then change <code>JOIN</code> to <code>LEFT JOIN</code> on the customers table and look for Di,
        who has never ordered. Try <code>COUNT</code>, <code>SUM</code>, and remove <code>HAVING</code> to see the difference.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountSqlLab(right.querySelector('#lab'), {
          seed: SHOP_SEED, schema: SHOP_SCHEMA, rows: 8,
          starter: "SELECT customers.name, COUNT(orders.id) AS orders, SUM(orders.price * orders.qty) AS spent\nFROM customers\nLEFT JOIN orders ON orders.customer_id = customers.id\nGROUP BY customers.name\nORDER BY spent DESC;",
        });
      },
    },

    // ───────────────────────── Spread 3: SQL challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge · SQL</p>
        <h1>Six questions for the database</h1>
        <p>Each card has its own editor. The book runs your SQL against a real database and compares the answer
        with the expected one, so <b>columns, rows and order</b> must match. A tick appears when it does.</p>
        <pre><code>customers(id, name, city, joined)
orders(id, customer_id, item, price, qty)</code></pre>
        <div class="senior">Build queries in layers: start with <code>SELECT * FROM orders</code>, add the JOIN, check, add WHERE, check,
        add GROUP BY, check. Experts write queries in small verified steps; they just do it faster.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">SQL challenge</p>
        <div id="cards"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all six to turn the page</span></div>`,
      init(left, right, api) {
        mountSqlChallenge(right.querySelector('#cards'), {
          seed: SHOP_SEED,
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(250); },
          tasks: [
            { question: 'Names of customers who live in Louisville, in alphabetical order.', starter: 'SELECT ', expected: [['Ana'], ['Cy']] },
            { question: 'Item and price of orders priced over 50, most expensive first.', starter: 'SELECT ', expected: [['Desk', 240], ['Monitor', 189], ['Webcam', 59]] },
            { question: 'For each customer who has orders: their name and how many orders they placed, sorted by name.', starter: 'SELECT ', rows: 4, expected: [['Ana', 3], ['Bo', 1], ['Cy', 2]] },
            { question: 'Names of customers who have never placed an order.', starter: 'SELECT ', rows: 4, expected: [['Di']] },
            { question: 'The customer who spent the most overall (sum of price × qty): their name and the total.', starter: 'SELECT ', rows: 5, expected: [['Cy', 269]] },
            { question: 'Change Bo\'s city to Denver (only Bo!) with an UPDATE.', starter: 'UPDATE ', rows: 2,
              verify: { sql: 'SELECT name, city FROM customers ORDER BY id' }, expected: [['Ana', 'Louisville'], ['Bo', 'Denver'], ['Cy', 'Louisville'], ['Di', 'Austin']] },
          ],
        });
      },
    },

    // ───────────────────────── Spread 4: SQL injection ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 8 · The classic attack</p>
        <h1>SQL injection</h1>
        <p>A login form takes a username and password. A careless server builds its query by <b>joining text</b>:</p>
        <pre><code>"SELECT * FROM users WHERE username = '" + u + "' AND password = '" + p + "'"</code></pre>
        <p>That works for honest input. But <code>u</code> and <code>p</code> come from a stranger. If they type
        <code>' OR '1'='1</code> as the password, the finished text becomes:</p>
        <pre><code>... WHERE username = 'x' AND password = '' OR '1'='1'</code></pre>
        <p><code>'1'='1'</code> is always true, so the database returns <b>every user</b>. The attacker's text escaped from "data" and
        became <b>code</b>. Other inputs can comment out the password check (<code>--</code>), or run
        <code>DROP TABLE users</code>. This is <b>SQL injection</b>: for two decades one of the most common ways real
        companies were breached.</p>
        <h2>The fix: never mix code and data</h2>
        <p>Send the query and the values <b>separately</b>. The <code>?</code> is a placeholder; the database treats whatever
        arrives for it as <i>a plain value</i>, no matter what characters it contains:</p>
        <pre><code>db.get("SELECT * FROM users WHERE username = ? AND password = ?", [u, p]);</code></pre>
        <p>This is called a <b>parameterized query</b> (or prepared statement). It is not "escaping quotes yourself":
        that fails in subtle ways. It is the <b>only</b> acceptable way.</p>
        <div class="warn">Parameters protect <i>values</i>, not table or column names. If you ever need a dynamic column (for sorting),
        choose it from a fixed allow-list in your code; never paste user text into the query.</div>
        <div class="senior">Two more habits from this demo: <b>never store passwords as plain text</b> (store a slow salted hash such as
        bcrypt or argon2, so a stolen database does not reveal passwords), and give the database account your app uses
        <b>only the permissions it needs</b>, so that even a successful injection can do limited damage. Security is layers.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Injection lab (harmless: it is a pretend database)</p>
        <h2 style="margin-top:0">Attack it, then fix it</h2>
        <p>In <b>Unsafe</b> mode click <b>Attack 1</b>, <b>Attack 2</b>, then <b>Attack 3</b> and watch the real SQL change. Then switch to
        <b>Safe</b> mode and repeat every attack. The same inputs now just fail to match.</p>
        <div id="demo"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountInjectionDemo(right.querySelector('#demo')); },
    },

    // ───────────────────────── Spread 5: servers (lab) ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 8 · The other side of the request</p>
        <h1>Servers: where requests become answers</h1>
        <p>Last lesson you were the <b>client</b>. Now you write the <b>server</b>: a program that waits for requests, decides
        what to do, talks to the database, and answers. Every request travels the same pipeline:</p>
        <pre><code>request  →  router  →  handler  →  database
                                      ↓
response ←  status + JSON  ←  validate / decide</code></pre>
        <ol>
          <li>The <b>router</b> matches <b>method + path</b> to a function: <code>GET /api/notes/:id</code>. The <code>:id</code> part is a <b>path parameter</b>.</li>
          <li>The <b>handler</b> reads the request, <b>validates</b> it, queries the database, and builds a response.</li>
          <li>The response carries the right <b>status code</b> and, usually, JSON.</li>
        </ol>
        <h2>The toolkit in this lab</h2>
        <pre><code>app.get("/api/notes/:id", (req) =&gt; {
  req.params.id      // from the path
  req.query.search   // from ?search=...
  req.json()         // the JSON body (throws if invalid!)
  db.all(sql, [params])  // many rows (array)
  db.get(sql, [params])  // one row, or null
  db.run(sql, [params])  // INSERT/UPDATE/DELETE: { changes, lastId }
  return json(data, status);
});</code></pre>
        <h2>Rules every good handler follows</h2>
        <ul>
          <li><b>Validate everything</b> from the client (lesson 7: never trust it). Bad input is <b>400</b>, the client's fault.</li>
          <li><b>Missing thing → 404.</b> Created → <b>201</b>. Deleted, nothing to say → <b>204</b>.</li>
          <li><b>Parameterize every query</b> (the injection page).</li>
          <li>An unexpected crash becomes <b>500</b>, and the user sees a generic message. The details go in your <b>log</b>, never in the response (stack traces help attackers).</li>
          <li>Servers are <b>stateless</b>: they forget everything between requests, so anything that must last goes in the database.</li>
        </ul>
        <div class="senior">This is exactly the shape of your CRM at work: Hono routes plus a D1 database (which <i>is</i> SQLite) on
        Cloudflare Workers. Once you have written one by hand, every framework is the same ideas with nicer syntax.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Server lab</p>
        <h2 style="margin-top:0">Run a server you can poke</h2>
        <p>This server has two routes. Start it, then send requests with the chips. Try <b>POST note</b> (what status do you get for a
        route that does not exist yet?) and <b>Get note 99</b>. Edit the code and restart to change its behavior.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountServerLab(right.querySelector('#lab'), {
          seed: NOTES_SEED, viewTable: 'notes', rows: 15,
          code: '// app registers routes, db talks to the database, json builds a response.\n\napp.get("/api/notes", (req) => {\n  const notes = db.all("SELECT id, title FROM notes ORDER BY id");\n  return json(notes);\n});\n\napp.get("/api/notes/:id", (req) => {\n  const note = db.get("SELECT * FROM notes WHERE id = ?", [req.params.id]);\n  if (!note) {\n    return json({ error: "Note not found" }, 404);\n  }\n  return json(note);\n});\n',
          examples: [
            { name: 'List notes', method: 'GET', url: '/api/notes' },
            { name: 'Get note 1', method: 'GET', url: '/api/notes/1' },
            { name: 'Get note 99', method: 'GET', url: '/api/notes/99' },
            { name: 'POST note', method: 'POST', url: '/api/notes', body: '{"title": "Hello"}' },
            { name: 'Unknown route', method: 'GET', url: '/api/users' },
          ],
        });
      },
    },

    // ───────────────────────── Spread 6: API challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge · Build the Notes API</p>
        <h1>Write a real server</h1>
        <p>Complete the routes. After every start the book fires a scripted series of requests at <b>your</b> server (the same way a
        client app or an automated test suite would) and checks the responses. It also tries to attack it.</p>
        <div id="tasks"></div>
        <div class="senior">Helpers you will want: <code>db.run("INSERT INTO notes (title, body) VALUES (?, ?)", [t, b])</code> returns
        <code>{ lastId }</code>. Wrap <code>req.json()</code> in <code>try/catch</code> (invalid JSON is the client's mistake, so 400, not a crash). For search use
        <code>WHERE title LIKE ?</code> with the parameter <code>"%" + text + "%"</code>.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Server lab</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all five to turn the page</span></div>`,
      init(left, right, api) {
        const j = (o) => JSON.stringify(o);
        const requests = [
          { id: 'list', method: 'GET', url: '/api/notes' },
          { id: 'one', method: 'GET', url: '/api/notes/1' },
          { id: 'missing', method: 'GET', url: '/api/notes/999' },
          { id: 'create', method: 'POST', url: '/api/notes', body: j({ title: 'Hello', body: 'x' }) },
          { id: 'blank', method: 'POST', url: '/api/notes', body: j({ title: '   ' }) },
          { id: 'noTitle', method: 'POST', url: '/api/notes', body: j({ body: 'x' }) },
          { id: 'badJson', method: 'POST', url: '/api/notes', body: 'not json at all' },
          { id: 'getNew', method: 'GET', url: '/api/notes/4' },
          { id: 'del', method: 'DELETE', url: '/api/notes/4' },
          { id: 'delAgain', method: 'DELETE', url: '/api/notes/4' },
          { id: 'search', method: 'GET', url: '/api/notes?search=milk' },
          { id: 'inject', method: 'GET', url: "/api/notes?search=" + encodeURIComponent("' OR '1'='1") },
          { id: 'injectPost', method: 'POST', url: '/api/notes', body: j({ title: "x'); DROP TABLE notes; --" }) },
          { id: 'after', method: 'GET', url: '/api/notes' },
        ];
        const tasks = [
          { label: 'GET /api/notes returns all notes as an array. GET /api/notes/:id returns one note, or 404 when it does not exist.',
            check: (r) => r.list.status === 200 && Array.isArray(r.list.body) && r.list.body.length === 3 && r.one.status === 200 && r.one.body && r.one.body.title === 'Buy milk' && r.missing.status === 404 },
          { label: 'POST /api/notes creates a note (201 + the new note with its id). A missing or blank title, or a body that is not valid JSON, answers 400. The note must really be saved.',
            check: (r) => r.create.status === 201 && r.create.body && r.create.body.id >= 4 && r.create.body.title === 'Hello' &&
              r.blank.status === 400 && r.noTitle.status === 400 && r.badJson.status === 400 && r.getNew.status === 200 && r.getNew.body && r.getNew.body.title === 'Hello' },
          { label: 'DELETE /api/notes/:id removes a note (204, no body). Deleting one that does not exist answers 404.',
            check: (r) => r.del.status === 204 && r.delAgain.status === 404 },
          { label: 'GET /api/notes?search=text returns only notes whose title contains the text (use LIKE with a parameter). ?search=milk returns exactly one note.',
            check: (r) => r.search.status === 200 && Array.isArray(r.search.body) && r.search.body.length === 1 && r.search.body[0].title === 'Buy milk' },
          { label: 'Survive the attacks: a search for  \' OR \'1\'=\'1  must return zero notes, and a note titled  x\'); DROP TABLE notes; --  must simply be saved as text. Use parameters everywhere.',
            check: (r) => r.inject.status === 200 && Array.isArray(r.inject.body) && r.inject.body.length === 0 && r.injectPost.status === 201 &&
              r.after.status === 200 && Array.isArray(r.after.body) && r.after.body.some((n) => String(n.title).includes('DROP TABLE')) },
        ];
        mountServerLab(right.querySelector('#lab'), {
          seed: NOTES_SEED, viewTable: 'notes', rows: 22, requests, tasks, tasksEl: left.querySelector('#tasks'),
          code: '// Task 1\napp.get("/api/notes", (req) => {\n  // your code (also handle ?search= in task 4)\n});\n\napp.get("/api/notes/:id", (req) => {\n  // your code\n});\n\n// Task 2\napp.post("/api/notes", (req) => {\n  // your code\n});\n\n// Task 3\napp.delete("/api/notes/:id", (req) => {\n  // your code\n});\n',
          examples: [
            { name: 'List notes', method: 'GET', url: '/api/notes' },
            { name: 'Get note 1', method: 'GET', url: '/api/notes/1' },
            { name: 'POST note', method: 'POST', url: '/api/notes', body: '{"title": "Hello", "body": "from me"}' },
            { name: 'Search', method: 'GET', url: '/api/notes?search=milk' },
            { name: 'Delete note 2', method: 'DELETE', url: '/api/notes/2' },
          ],
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(300); },
        });
      },
    },

    // ───────────────────────── Spread 7: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Four questions on the mistakes that cost real companies data and customers. Try anything you are unsure about in the SQL lab or server lab.</p>
        <div class="senior">The question to ask of every line that touches a database: "what is the worst thing a malicious or merely careless
        input could make this do?" If you can answer that, you design it safely by reflex.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<pre><code>DELETE FROM customers;</code></pre><p>What does this do?</p>',
            options: ['Deletes nothing: it needs a WHERE', 'Deletes every row in the customers table', 'Deletes the table itself', 'Deletes only the first row'], answer: 1,
            why: 'Without WHERE the statement applies to all rows. (DROP TABLE removes the table itself.) Always SELECT with the same WHERE first.' },
          { prompt: '<p>Which is the safe way to look up a user by a name typed into a form?</p>',
            options: ['"... WHERE name = \'" + name + "\'"', '"... WHERE name = ?" with [name] passed separately', 'Remove all single quotes from the input first', 'Check the input on the page with JavaScript'], answer: 1,
            why: 'Parameters keep data and code separate, so input can never become SQL. Stripping quotes is fragile, and page-side checks can be bypassed by anyone sending requests directly.' },
          { prompt: '<p>Di has never placed an order. You want every customer listed, with their orders where they exist (NULL if none). Which join?</p>',
            options: ['JOIN (inner)', 'LEFT JOIN from customers', 'GROUP BY', 'WHERE orders IS NOT NULL'], answer: 1,
            why: 'LEFT JOIN keeps every row of the left table and fills NULL when nothing matches. An inner JOIN would drop Di.' },
          { prompt: '<p>A client sends a request body that is not valid JSON. What should the server answer?</p>',
            options: ['500 Internal Server Error', '200 OK with an error message', '400 Bad Request', '404 Not Found'], answer: 2,
            why: 'The request was malformed, which is the client\'s fault: a 4xx, specifically 400. A 500 would claim the server is broken and trigger false alarms.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(300); });
      },
    },
  ],
};
