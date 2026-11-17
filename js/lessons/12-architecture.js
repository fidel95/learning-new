// Lesson 12 — Architecture and system design.
import { mountQuiz } from '../workbench.js';
import { mountSystemLab, mountEstimation, simulate } from '../archlab.js';

export const lesson = {
  id: 'l12',
  title: 'Lesson 12 · Architecture & system design',
  spreads: [
    // ───────────────────────── Spread 1: trade-offs and estimation ─────────────────────────
    {
      left: `
        <p class="kicker">Part 2 · The big decisions</p>
        <h1>Architecture: decisions that are expensive to change</h1>
        <p>Code design (last lesson) is about how functions fit together. <b>Architecture</b> is the level above: <i>what the big parts are, how they talk, and where data lives</i>.
        You can rename a function in a minute; moving from one database to another takes months. So architecture is the set of decisions that are
        <b>costly to reverse</b>, and therefore worth thinking about <i>before</i> you build.</p>
        <h2>There are no solutions, only trade-offs</h2>
        <p>Every design buys some qualities by paying with others:</p>
        <ul>
          <li><b>Performance</b>: latency (how long one request takes) and throughput (how many per second).</li>
          <li><b>Scalability</b>: does it keep working as load grows 10×?</li>
          <li><b>Availability</b>: how often is it up? <b>Durability</b>: can it lose data?</li>
          <li><b>Consistency</b>: does everyone see the same data at the same time?</li>
          <li><b>Cost</b>, <b>simplicity</b>, <b>security</b>, <b>operability</b> (can a tired human run it at 3 a.m.?).</li>
        </ul>
        <p>Caching buys speed with <i>staleness</i>. Replication buys availability with <i>complexity and lag</i>. Microservices buy team independence with <i>network failures and operations</i>.
        A good engineer never says "X is better"; they say <b>"X is better for this goal, at this price"</b>.</p>
        <h2>Back-of-the-envelope estimation</h2>
        <p>Before drawing boxes, <b>do the arithmetic</b>: how many requests per second? how much storage per year? Ten minutes of rough math tells you whether one server is plenty or a hundred is not enough,
        and it can kill a doomed design before it costs three months. Rules: <b>state assumptions</b>, <b>round hard</b> (86,400 seconds in a day is ≈ 10<sup>5</sup>), multiply, then sanity-check.</p>
        <pre><code>Latency numbers every engineer should know (approx.)
  read from RAM ................... 100 ns
  read 1 MB from SSD .............. 100 µs ... 1 ms
  round trip inside a data center .. 0.5 ms
  disk seek (spinning) ............. 10 ms
  round trip across a continent .... 150 ms
Seconds: 1 day ≈ 86,400 ≈ 10⁵    1 year ≈ 31.5 million ≈ 3×10⁷</code></pre>
        <div class="senior">You will be wrong by a factor of 2 or 3, and that is fine: the goal is the <b>order of magnitude</b>. If your estimate says 20 requests per second, a laptop is enough.
        If it says 200,000, you need a different architecture. The decision is the same whether the true answer is 150,000 or 300,000.</div>
        <div class="foot"><span></span><span class="hint">estimate some →</span></div>`,
      right: `
        <p class="kicker">Estimation lab</p>
        <h2 style="margin-top:0">Be roughly right</h2>
        <p>Use a calculator or pencil. Answers within about a factor of two count (type <code>23000</code>, <code>23k</code> or <code>2.3e4</code>). When you get it, you see the worked solution.</p>
        <div id="est"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountEstimation(right.querySelector('#est'), {
          questions: [
            { prompt: 'A chat app has 50 million daily active users, each sending about 40 messages a day. About how many messages per second on average?', unit: 'messages/second', answer: 23148, tolerance: 2,
              work: '50,000,000 users × 40 = 2,000,000,000 messages/day\n÷ 86,400 seconds ≈ 23,000 messages/second on average.\n(Peaks are often 3× higher: about 70,000/s. Plan for the peak.)' },
            { prompt: 'A photo app has 10 million daily users. Each uploads on average 0.5 photos a day, at 2 MB per photo. About how many terabytes of new storage per year?', unit: 'TB per year', answer: 3650, tolerance: 2,
              work: '10,000,000 × 0.5 = 5,000,000 photos/day\n× 2 MB = 10,000,000 MB = 10 TB/day\n× 365 days ≈ 3,650 TB ≈ 3.6 PB per year (before backups and copies).' },
            { prompt: 'A 2 MB web page is served 1 million times a day. About how much bandwidth is that on average, in megabits per second?', unit: 'Mbps', answer: 185, tolerance: 2,
              work: '2 MB × 1,000,000 = 2,000,000 MB/day = 2 TB/day\n2×10¹² bytes × 8 bits = 1.6×10¹³ bits ÷ 86,400 s ≈ 185 million bits/s ≈ 185 Mbps.' },
            { prompt: 'One app server handles 400 requests/second, and you do not want any server above 70% busy. How many servers for a 30,000 requests/second peak?', unit: 'servers', answer: 107, tolerance: 1.4,
              work: 'Usable capacity per server = 400 × 0.7 = 280 req/s\n30,000 ÷ 280 ≈ 107 servers.\n(And one more thought: if one dies, the rest must absorb its load. Add a few.)' },
          ],
        });
      },
    },

    // ───────────────────────── Spread 2: building blocks and scaling ─────────────────────────
    {
      left: `
        <p class="kicker">Part 2 · Scaling a system</p>
        <h1>Building blocks, in the order you need them</h1>
        <p>Real systems grow one problem at a time. Add each piece only when a measurement shows you need it:</p>
        <ol>
          <li><b>One server</b> runs the app and the database. Perfect to start.</li>
          <li><b>Stateless app servers</b> behind a <b>load balancer</b>. Because a server keeps nothing between requests (sessions live in a shared store), you can add or kill them freely. This is <b>horizontal scaling</b> (more machines) vs vertical (a bigger machine).</li>
          <li><b>Cache</b> (like Redis) in front of the database: read data from memory instead. Pattern: look in the cache, on a miss read the DB and store it. The hard part is <b>invalidation</b>: when data changes, stale copies must go, or expire after a <b>TTL</b>. If the cache dies, every request hits the database at once (a "stampede").</li>
          <li><b>CDN</b>: copies of images and scripts at servers near each user, so static files never reach you.</li>
          <li><b>Read replicas</b>: copies of the database that serve reads. Copies lag slightly behind, so users can briefly see old data (<b>eventual consistency</b>). A fix: read your <i>own</i> recent writes from the primary.</li>
          <li><b>Queues and workers</b>: instead of doing slow work (sending email, resizing images) inside the request, drop a message on a queue; workers process it later. The queue <b>absorbs traffic spikes</b> and makes retries possible, but handlers must be <b>idempotent</b> (safe to run twice).</li>
          <li><b>Sharding</b> (splitting data across databases) is the last resort: it makes cross-shard queries and transactions painful.</li>
        </ol>
        <h2>Availability is multiplication</h2>
        <pre><code>99%    → 3.7 days of downtime a year
99.9%  → 8.8 hours      ("three nines")
99.99% → 53 minutes
Components in a CHAIN multiply:  0.999 × 0.999 × 0.999 ≈ 99.7%
Redundant copies in PARALLEL:    two 99% servers → 99.99%</code></pre>
        <p>A <b>single point of failure</b> (SPOF) is any part whose death takes everything down. Hunt them: ask of every box, "what if this disappears?"
        Teams set an <b>SLO</b> (a target, like 99.9% of requests succeed) and treat the allowed failures as an <b>error budget</b> to spend on shipping faster.</p>
        <div class="senior"><b>The bottleneck rule:</b> a system is only as fast as its most loaded part. Adding app servers when the database is at 98% changes nothing. Always <b>measure first, find the
        hottest tier, fix that one</b>, then find the next. Optimizing anything else is theater.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">System lab · a teaching model</p>
        <h2 style="margin-top:0">Find the bottleneck, then fix it</h2>
        <p>A social feed is at 3,000 requests/second, 95% reads. Drag the traffic up and watch which box turns red. Then add the <i>right</i> thing: a CDN? more servers? a cache? replicas?
        Notice that fixing one tier simply moves the bottleneck to the next. Also read "if the cache died".</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountSystemLab(right.querySelector('#lab'), { rps: 3000, readShare: 0.95, trafficSlider: true }); },
    },

    // ───────────────────────── Spread 3: challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge</p>
        <h1>Design for the flash sale</h1>
        <p>Your shop runs a flash sale: <b>6,000 requests per second</b> at peak, 95% of them reads (browsing). Half of all requests are images and scripts. Your starting design is two servers and one
        database, which collapses at once. Reconfigure the architecture to meet <b>every goal</b> on the right while staying inside the budget.</p>
        <p>Think like an engineer, not a gambler: <b>read the bottleneck message</b> after each change. It tells you which tier to fix next. Ask what each addition buys and what it costs.</p>
        <ul>
          <li>A CDN removes most of the static traffic: cheap relief for the app servers.</li>
          <li>A cache removes most of the read load from the database: cheaper than many replicas.</li>
          <li>Replicas add read capacity <i>and</i> a database that survives losing the primary.</li>
          <li>Queues smooth write spikes, but this sale is read-heavy: do you need one?</li>
        </ul>
        <div class="senior">There are many valid designs, but few that are <i>efficient</i>. Over-building is a failure too: every extra box is money, complexity and another thing to
        break at 3 a.m. The skill is the smallest design that clearly meets the goals, with some headroom.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">System design challenge</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">meet every goal to turn the page</span></div>`,
      init(left, right, api) {
        mountSystemLab(right.querySelector('#lab'), {
          rps: 6000, readShare: 0.95, trafficSlider: false, start: { apps: 2 },
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'design accepted'; api.unlock(500); },
          targets: [
            { label: 'Fewer than 0.1% of requests fail', check: (c, r) => ({ ok: r.errorRate < 0.001, note: (r.errorRate * 100).toFixed(2) + '% fail' }) },
            { label: 'p95 latency under 250 ms', check: (c, r) => ({ ok: r.p95 < 250, note: Math.round(r.p95) + ' ms' }) },
            { label: 'Survives losing one app server (still under 0.5% errors)', check: (c) => { const l = simulate({ ...c, apps: Math.max(1, c.apps - 1) }); return { ok: c.apps >= 2 && l.errorRate < 0.005, note: 'with one fewer: ' + (l.errorRate * 100).toFixed(1) + '% fail' }; } },
            { label: 'Survives losing the database primary (a replica can take over)', check: (c) => ({ ok: c.replicas >= 1, note: c.replicas + ' replica' + (c.replicas === 1 ? '' : 's') }) },
            { label: 'Costs at most $2,600 per month', check: (c, r) => ({ ok: r.cost <= 2600, note: '$' + r.cost.toLocaleString('en-US') }) },
          ],
        });
      },
    },

    // ───────────────────────── Spread 4: design docs + quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 2 · Deciding in writing</p>
        <h1>Design docs, decision records and judgment</h1>
        <p>Big decisions should be <b>written down before they are built</b>. A one-to-three page <b>design doc</b> forces clear thinking and lets teammates catch mistakes while changes are still cheap:</p>
        <ul>
          <li><b>Context</b>: the problem and why now. <b>Goals</b> and <b>non-goals</b> (what you deliberately will <i>not</i> do).</li>
          <li><b>Proposed design</b> with a simple diagram, and <b>alternatives considered</b> with honest trade-offs.</li>
          <li><b>Risks and open questions</b>, a <b>rollout and rollback plan</b>, and how you will know it worked (metrics).</li>
        </ul>
        <p>After deciding, record it in an <b>ADR</b> (architecture decision record): <i>Title · Status · Context · Decision · Consequences</i>. Years later, people can see <i>why</i> the system looks the way it does.</p>
        <h2>Review questions that find real problems</h2>
        <p>"What happens at 10× the load?" · "What if this component dies?" · "How do we know it is working?" · "How do we undo it?" · "What is the simplest thing that could work?" Attack the idea, never the person.</p>
        <div class="warn"><b>Monolith vs microservices</b> is not "old vs modern". Microservices trade <i>code complexity</i> for <i>distributed-systems complexity</i> (network failures, versioning, observability, consistency).
        A small team should start with a well-organized <b>modular monolith</b> and split a piece off only when a real pain (team independence, scaling a hot part) justifies the cost.
        Likewise "choose boring technology": every exotic tool spends your limited budget for risk.</div>
        <div class="senior">Seniority in architecture is mostly <b>restraint</b>: solving today's measured problem with the simplest design, and leaving cheap room to grow, instead of building for imaginary scale.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Traffic doubles. Your app servers sit at 30% busy, but the database is at 98%. What is the best next step?</p>',
            options: ['Add more app servers', 'Relieve the database: add a cache and/or read replicas, or fix the slow queries', 'Buy bigger load balancers', 'Wait and see'], answer: 1,
            why: 'The system is only as fast as its hottest tier. App servers are not the bottleneck, so adding more changes nothing. Fix the database first.' },
          { prompt: '<p>A user changes their profile photo, reloads the page, and still sees the old one a second later. Your system uses read replicas. Most likely cause?</p>',
            options: ['The CDN is broken', 'Replication lag: the replica has not received the write yet (eventual consistency)', 'The user\'s computer is slow', 'The database lost the data'], answer: 1,
            why: 'Replicas copy data asynchronously. A common fix is "read your own writes": for a short time after a user writes, read their data from the primary.' },
          { prompt: '<p>A request passes through three services in a chain, each 99.9% available. Roughly how available is the whole chain?</p>',
            options: ['99.9%', 'About 99.7%', '99.99%', '100%'], answer: 1,
            why: 'Availabilities in series multiply: 0.999 × 0.999 × 0.999 ≈ 0.997. Every extra dependency in the path lowers availability, which is why fewer moving parts is a feature.' },
          { prompt: '<p>A team of five is starting a brand-new product. What is the sensible default architecture?</p>',
            options: ['Twenty microservices, to be ready for scale', 'A modular monolith, splitting out services only when a measured need appears', 'Serverless everything, no matter what', 'Whatever is newest on the conference circuit'], answer: 1,
            why: 'A monolith is simpler to build, test, deploy and debug. Distribution multiplies operational cost, so pay it only when a concrete problem requires it.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(500); });
      },
    },
  ],
};
