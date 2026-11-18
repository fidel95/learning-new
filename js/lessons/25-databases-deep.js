// Lesson 25 — Databases in depth: indexes, query plans, transactions and isolation, locking, migrations.
import { mountQuiz } from '../workbench.js';
import { mountSqlChallenge } from '../sqllab.js';
import { mountIsolationLab } from '../isolab.js';
import { mountOrdering } from '../orderlab.js';

const ORDERS_SEED = `CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, status TEXT, created_day INTEGER, total REAL);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 100000)
INSERT INTO orders SELECT i, (i * 7919) % 20000, CASE WHEN i % 10 = 0 THEN 'open' ELSE 'done' END, (i * 31) % 365, (i % 500) + 0.5 FROM n;`;
const SEAT_SEED = `CREATE TABLE seats (id INTEGER PRIMARY KEY, holder TEXT);
INSERT INTO seats VALUES (11, NULL), (12, NULL), (13, 'zoe');
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price INTEGER, version INTEGER);
INSERT INTO products VALUES (1, 'Lamp', 100, 3), (2, 'Desk', 400, 7);
CREATE TABLE stock (id INTEGER PRIMARY KEY, qty INTEGER);
INSERT INTO stock VALUES (1, 1);`;
const idxCount = (cols) => `SELECT COUNT(*) FROM pragma_index_list('orders') il WHERE (SELECT group_concat(name) FROM (SELECT name FROM pragma_index_info(il.name) ORDER BY seqno)) = '${cols}'`;

const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';
const done = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };

export const lesson = {
  id: 'l25',
  title: 'Lesson 25 · Databases in depth',
  spreads: [
    // ───────────────────────── Spread 1: indexes (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Databases · speed</p>
        <h1>Indexes and the query plan</h1>
        <p>Lesson 8 taught you to ask a database questions. Now: <b>how does it answer fast?</b> Without help, to find the orders of customer 77 it must read <b>every row</b> (a <i>full table scan</i>): O(n). With an <b>index</b> it jumps straight to them: O(log n).</p>
        <h2>What an index is</h2>
        <p>A separate, sorted copy of one or more columns, stored as a <b>B-tree</b>: a shallow, wide tree where each node holds hundreds of keys. A table of a billion rows needs only 3 to 5 levels, so a lookup touches 3 to 5 pages. It is the same idea as binary search (lesson 19), built for disks. The index stores the key plus a pointer to the row.</p>
        <h2>Ask the database what it will do</h2>
        <pre><code>EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 77;
-- SCAN orders                                  ← reads all rows (slow)
-- SEARCH orders USING INDEX ix (customer_id=?) ← jumps (fast)</code></pre>
        <p>Postgres and MySQL have <code>EXPLAIN</code> / <code>EXPLAIN ANALYZE</code> with more detail. <b>Never guess; read the plan.</b></p>
        <h2>Rules that decide whether an index helps</h2>
        <ul>
          <li><b>Composite indexes obey the leftmost prefix:</b> an index on <code>(status, created_day)</code> serves <code>WHERE status = ?</code> and <code>WHERE status = ? ORDER BY created_day</code> (already sorted, no sort step), but not <code>WHERE created_day = ?</code> alone.</li>
          <li><b>Selectivity:</b> indexing a column with two values (a yes/no flag) rarely helps; indexing near-unique columns does.</li>
          <li><b>Wrapping a column in a function</b> (<code>WHERE lower(email) = ?</code>) hides it from a plain index.</li>
          <li><b>Indexes are not free:</b> each one costs disk and slows every INSERT/UPDATE/DELETE, because it must be kept in sync. Index for the queries you really run, and drop unused ones.</li>
          <li>Foreign key columns are the classic missing index.</li>
        </ul>
        <div class="senior">"The page is slow" is almost always one of: a missing index, an N+1 query (one query per row in a loop; fetch them together with a JOIN or <code>IN (...)</code>), or fetching far more rows and columns than needed. Find the slow query, run EXPLAIN on <i>production-sized</i> data (a plan on 10 rows lies), fix, and measure again.</div>
        ${back}`,
      right: `<p class="kicker">Lab · 100,000 orders</p><div id="lab"></div>${foot('make both queries use an index to turn the page')}`,
      init(left, right, api) {
        mountSqlChallenge(right.querySelector('#lab'), {
          seed: ORDERS_SEED, hint: 'orders(id, customer_id, status, created_day, total) has 100,000 rows. Try EXPLAIN QUERY PLAN before and after you create the index.',
          onPass: done(right, api, 'queries indexed', 800),
          tasks: [
            { question: 'Customers look up their own orders constantly (WHERE customer_id = ?). Create an index on customer_id.', rows: 3, starter: "EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 77;\n-- now CREATE INDEX ... ON orders(...);", verify: { sql: idxCount('customer_id') }, expected: [[1]] },
            { question: 'The dashboard runs: WHERE status = \'open\' ORDER BY created_day LIMIT 10. Create ONE composite index that serves the filter and the ordering.', rows: 3, starter: "-- column order matters: equality column first, then the sort column\n", verify: { sql: idxCount('status,created_day') }, expected: [[1]] },
          ],
        });
      },
    },

    // ───────────────────────── Spread 2: isolation (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Databases · correctness</p>
        <h1>Transactions and isolation levels</h1>
        <p>A <b>transaction</b> groups statements so they succeed or fail as one. The famous guarantees are <b>ACID</b>: <b>A</b>tomic (all or nothing), <b>C</b>onsistent (constraints hold), <b>I</b>solated (concurrent transactions do not trample each other), <b>D</b>urable (committed means it survives a crash).</p>
        <p>"Isolated" is a spectrum. Perfect isolation (every transaction behaves as if it ran alone, one after another) is <b>serializable</b>, and it is the slowest. So databases offer weaker levels that allow specific <b>anomalies</b> in exchange for speed. These are the races of lesson 24, inside the database.</p>
        <h2>The anomalies</h2>
        <ul>
          <li><b>Dirty read:</b> you read another transaction's uncommitted data (which may be rolled back).</li>
          <li><b>Non-repeatable read:</b> you read a row twice and get different values.</li>
          <li><b>Phantom read:</b> you run the same query twice and new rows appear.</li>
          <li><b>Lost update:</b> two read-modify-writes; one overwrites the other.</li>
          <li><b>Write skew:</b> two transactions read the same facts, make a decision, and write <i>different</i> rows, together breaking a rule neither broke alone. (Last doctor goes off call; two people book the same room.)</li>
        </ul>
        <h2>The levels</h2>
        <p><b>Read committed</b> (default in Postgres): you only see committed data, but each statement sees a fresh view. <b>Repeatable read</b>: you work on a <i>snapshot</i> taken at the start; conflicting writes abort one transaction. <b>Serializable</b>: the database also detects dangerous read patterns and aborts. At the higher levels a transaction can <b>fail with a serialization or conflict error, and your code must retry it</b>.</p>
        <div class="warn">Real databases differ in the details (MySQL's repeatable read is not Postgres's; SQL Server uses locks or snapshots). This lab models the cleanest version. Check your own database's documentation before relying on a level.</div>
        <div class="senior">Most production bugs are not at the "serializable" end: they are an app doing read, think, write at read committed with no lock. The cheapest cures are <b>one atomic statement</b> (next page), a unique constraint, or an explicit lock; reach for serializable when the logic is too complex for those, and keep the retry loop.</div>
        ${back}`,
      right: `<p class="kicker">Lab · the anomaly simulator</p><div id="lab"></div>${foot('fill the cheat sheet correctly to turn the page')}`,
      init(left, right, api) { mountIsolationLab(right.querySelector('#lab'), { onPass: done(right, api, 'isolation mastered', 1100) }); },
    },

    // ───────────────────────── Spread 3: locking (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Databases · concurrency control</p>
        <h1>Atomic updates and optimistic locking</h1>
        <p>You cannot always raise the isolation level, and you often work across several requests (a form open for five minutes). Three practical tools:</p>
        <h2>1. Let one statement do the check and the change</h2>
        <pre><code>-- BAD: SELECT qty (1) ... then in code: UPDATE stock SET qty = 0
-- GOOD: the check is part of the write; the database does it atomically
UPDATE seats SET holder = 'ana' WHERE id = 12 AND holder IS NULL;
-- then ask "how many rows changed?"  1 = you got it, 0 = someone beat you</code></pre>
        <h2>2. Optimistic locking: a version column</h2>
        <p>Assume conflicts are rare. Read the row with its <code>version</code>. When saving, say "update <i>only if</i> the version is still what I read" and bump it:</p>
        <pre><code>UPDATE products SET price = 120, version = version + 1
WHERE id = 1 AND version = 3;   -- 0 rows changed? someone edited it first</code></pre>
        <p>No lock is held while the user thinks. On conflict, tell the user ("this changed, reload") or merge. This is how web apps avoid lost updates across requests, and the same idea as ETags and compare-and-swap.</p>
        <h2>3. Pessimistic locking</h2>
        <p><code>SELECT ... FOR UPDATE</code> (Postgres/MySQL) locks the rows you read until the transaction ends, so others wait. Use it when conflicts are likely or retrying is costly, keep the transaction short, and lock rows in a consistent order (deadlocks, lesson 24).</p>
        <div class="senior">Pick by conflict rate: rare conflicts, optimistic; frequent conflicts or expensive retries, pessimistic; a simple counter or flag, an atomic UPDATE. And always <b>enforce invariants in the database</b> (unique, NOT NULL, CHECK, foreign keys), because application checks have races.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · win the race in SQL</p><div id="lab"></div>${foot('pass all three to turn the page')}`,
      init(left, right, api) {
        mountSqlChallenge(right.querySelector('#lab'), {
          seed: SEAT_SEED, hint: 'Tables: seats(id, holder), products(id, name, price, version), stock(id, qty). Reset the database if you change too much.',
          onPass: done(right, api, 'races won in SQL', 900),
          tasks: [
            { question: 'Seat 12 is free. Ana books it, safely: a single UPDATE that only succeeds if nobody holds it. Then try Bob on the same seat; he must not overwrite her. Finish by running SELECT holder FROM seats WHERE id = 12;', rows: 4, starter: "UPDATE seats SET holder = 'ana' WHERE id = 12 /* add the safety check */;\nSELECT holder FROM seats WHERE id = 12;", expected: [['ana']] },
            { question: 'Optimistic lock: you read the Lamp (id 1) at version 3 and now save price 120. Write the UPDATE (bump the version, check the old one), then SELECT price, version FROM products WHERE id = 1;', rows: 4, starter: "UPDATE products SET price = 120 /* bump version, check version */ WHERE id = 1;\nSELECT price, version FROM products WHERE id = 1;", expected: [[120, 4]] },
            { question: 'A stale editor read the Desk (id 2) at version 5, but it is now at version 7. Run the same kind of guarded UPDATE with version = 5, then SELECT changes(); It must report 0 changed rows.', rows: 4, starter: "UPDATE products SET price = 999 /* the guard goes here */ WHERE id = 2;\nSELECT changes();", expected: [[0]] },
          ],
        });
      },
    },

    // ───────────────────────── Spread 4: migrations (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Databases · change without downtime</p>
        <h1>Migrations on a live system</h1>
        <p>Changing a table that is being used by running servers is one of the riskiest everyday operations. The danger is that during a deploy, <b>old and new versions of the code run at the same time</b> against the <b>same database</b>. Both must work with every intermediate schema.</p>
        <h2>Expand and contract</h2>
        <ol>
          <li><b>Expand:</b> add the new thing in a backward-compatible way (a new nullable column, a new table). Old code ignores it.</li>
          <li><b>Dual-write:</b> deploy code that writes both old and new, and reads the old.</li>
          <li><b>Backfill</b> existing rows in small batches (not one giant locking statement).</li>
          <li><b>Switch reads</b> to the new column. Watch, with a way back.</li>
          <li><b>Stop writing</b> the old column.</li>
          <li><b>Contract:</b> drop the old column, in a later release, once nothing uses it.</li>
        </ol>
        <h2>Rules of thumb</h2>
        <ul>
          <li>Never rename or drop in one step while old code might still use it: that is a copy plus a switch plus a delete.</li>
          <li>Adding a <code>NOT NULL</code> column with a default or an index can lock a big table in some databases. Know your engine (Postgres: <code>CREATE INDEX CONCURRENTLY</code>).</li>
          <li>Keep migrations <b>in version control, small, and tested on production-sized data</b>. Take a backup first; rehearse the restore.</li>
          <li>Prefer <b>forward fixes</b> over "down" migrations that destroy data.</li>
        </ul>
        <div class="senior">The deploy, the migration and the rollback are three separate things, and each needs its own plan. If you cannot roll back the code without a schema change, you have coupled them. Decouple, then both become boring.</div>
        ${back}`,
      right: `<p class="kicker">Lab · rename a column safely</p><div id="lab"></div>${foot('order the steps correctly to turn the page')}`,
      init(left, right, api) {
        mountOrdering(right.querySelector('#lab'), {
          intro: 'Goal: rename users.fullname to users.display_name on a live site with zero downtime. Put the steps in a safe order.',
          steps: ['Add a new nullable column display_name (old code ignores it)', 'Deploy code that writes BOTH columns and still reads fullname', 'Backfill display_name from fullname in small batches', 'Deploy code that reads display_name (fullname still written, so you can roll back)', 'Deploy code that stops writing fullname', 'Drop the fullname column in a later release'],
          explain: 'Every step leaves both the old and the new code working, and you can stop or reverse at each point.',
          onPass: done(right, api, 'migration planned', 900),
        });
      },
    },

    // ───────────────────────── Spread 5: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `<p class="kicker">Check yourself · databases</p><h1>Four judgment calls</h1>
        <p>You can read a query plan, pick an index, name the anomaly, choose between atomic update, optimistic and pessimistic locking, and change a schema without an outage. Next: lesson 26, when the data does not live on one machine at all.</p>${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>A query is slow on production. EXPLAIN shows <code>SCAN orders</code> for <code>WHERE customer_id = ?</code>. What is the first fix to try?</p>',
            options: ['Buy a bigger server', 'Add an index on customer_id and re-check the plan', 'Cache the whole table in the browser', 'Rewrite it in another language'], answer: 1, why: 'A scan on a selective filter is the textbook missing index. Verify with EXPLAIN again.' },
          { prompt: '<p>You have an index on <code>(status, created_day)</code>. Which query can NOT use it efficiently?</p>',
            options: ['WHERE status = \'open\'', 'WHERE status = \'open\' ORDER BY created_day', 'WHERE created_day = 100 (no status condition)', 'WHERE status = \'open\' AND created_day > 50'], answer: 2, why: 'Leftmost prefix: the index is sorted by status first, so created_day alone cannot seek.' },
          { prompt: '<p>Two clerks both read "1 ticket left" and both sell it. Which is the simplest robust fix?</p>',
            options: ['Tell clerks to be careful', 'UPDATE tickets SET qty = qty - 1 WHERE id = ? AND qty > 0, then check rows changed', 'Read twice', 'Sleep 100 ms before writing'], answer: 1, why: 'The check and the write become one atomic step inside the database.' },
          { prompt: '<p>Why do you add a new column, backfill, switch, and only later drop the old one, instead of renaming it in one step?</p>',
            options: ['Renames are not allowed in SQL', 'During a deploy old and new code both run against the same schema, so every intermediate state must work for both', 'It is shorter', 'To use more disk'], answer: 1, why: 'Expand and contract keeps each step backward compatible and reversible.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(800); });
      },
    },
  ],
};
