// Lesson 26 — Distributed systems: replication, partitions, time and ordering, quorums, at-least-once delivery.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountCluster, mountQuorum } from '../clusterlab.js';

export const VC = {
  starter: `// Vector clocks track "who has seen what". A clock is an object like { a: 2, b: 1 } (missing nodes count as 0).
// compareClocks(x, y) returns:
//   "equal"       every count is the same
//   "before"      x happened before y (every count in x <= y, and at least one is smaller)
//   "after"       y happened before x
//   "concurrent"  neither saw the other: a conflict that needs resolving
// mergeClocks(x, y) returns a NEW clock holding the larger count for every node (and does not change x or y).
function compareClocks(x, y) {
  return "equal";
}
function mergeClocks(x, y) {
  return x;
}
`,
  visible: `test("one clock is behind the other", () => { expect(compareClocks({ a: 1 }, { a: 2 })).toBe("before"); expect(compareClocks({ a: 2 }, { a: 1 })).toBe("after"); });
test("same clocks are equal", () => { expect(compareClocks({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe("equal"); });`,
  hidden: `test("two replicas each wrote once: concurrent", () => { expect(compareClocks({ a: 1 }, { b: 1 })).toBe("concurrent"); expect(compareClocks({ a: 2, b: 1 }, { a: 1, b: 2 })).toBe("concurrent"); });
test("missing nodes count as zero", () => { expect(compareClocks({}, { a: 1 })).toBe("before"); expect(compareClocks({ a: 1, b: 0 }, { a: 1 })).toBe("equal"); expect(compareClocks({ a: 1, b: 1 }, { a: 1 })).toBe("after"); });
test("a clock that saw everything the other saw, plus more", () => { expect(compareClocks({ a: 1, b: 1 }, { a: 2, b: 1, c: 1 })).toBe("before"); });
test("merge takes the max for every node, including ones only one side knows", () => { expect(mergeClocks({ a: 3, b: 1 }, { a: 1, b: 4, c: 2 })).toEqual({ a: 3, b: 4, c: 2 }); });
test("merge does not change its inputs", () => { const x = { a: 1 }, y = { a: 2, b: 1 }; mergeClocks(x, y); expect(x).toEqual({ a: 1 }); expect(y).toEqual({ a: 2, b: 1 }); });
test("a merged clock is after both inputs when they were concurrent", () => { const x = { a: 1 }, y = { b: 1 }; const m = mergeClocks(x, y); expect(compareClocks(x, m)).toBe("before"); expect(compareClocks(m, y)).toBe("after"); });`,
};

export const CO = {
  starter: `// A queue delivers messages AT LEAST ONCE: you will see duplicates, and messages can arrive out of order.
// createConsumer() returns { handle(msg), balance(acct), pending() } for messages { acct, seq, amount }.
//   - For each account, seq starts at 1 and must be applied IN ORDER (1, 2, 3, ...) exactly once.
//   - A duplicate (a seq already applied, or already waiting) must be ignored.
//   - A message that arrives early (a gap before it) must wait until the gap is filled, then be applied.
//   - balance(acct) is the sum of amounts applied so far (0 for an unknown account). pending() = how many messages are waiting.
// This version applies everything immediately: duplicates double-count and order is ignored.
function createConsumer() {
  const totals = {};
  return {
    handle(msg) { totals[msg.acct] = (totals[msg.acct] || 0) + msg.amount; },
    balance(acct) { return totals[acct] || 0; },
    pending() { return 0; },
  };
}
`,
  visible: `test("in-order messages are applied", () => { const c = createConsumer(); c.handle({ acct: "a", seq: 1, amount: 10 }); c.handle({ acct: "a", seq: 2, amount: 5 }); expect(c.balance("a")).toBe(15); });
test("a duplicate is ignored", () => { const c = createConsumer(); const m = { acct: "a", seq: 1, amount: 10 }; c.handle(m); c.handle(m); expect(c.balance("a")).toBe(10); });`,
  hidden: `test("an early message waits for the gap to fill", () => {
  const c = createConsumer(); c.handle({ acct: "a", seq: 2, amount: 5 }); expect(c.balance("a")).toBe(0); expect(c.pending()).toBe(1);
  c.handle({ acct: "a", seq: 1, amount: 10 }); expect(c.balance("a")).toBe(15); expect(c.pending()).toBe(0);
});
test("a long gap is filled by a late arrival", () => {
  const c = createConsumer(); [4, 3, 2].forEach((s) => c.handle({ acct: "x", seq: s, amount: s })); expect(c.balance("x")).toBe(0);
  c.handle({ acct: "x", seq: 1, amount: 1 }); expect(c.balance("x")).toBe(10);
});
test("a duplicate of a message that is still waiting is ignored too", () => {
  const c = createConsumer(); c.handle({ acct: "a", seq: 3, amount: 7 }); c.handle({ acct: "a", seq: 3, amount: 7 }); c.handle({ acct: "a", seq: 1, amount: 1 }); c.handle({ acct: "a", seq: 2, amount: 2 });
  expect(c.balance("a")).toBe(10);
});
test("accounts are independent", () => { const c = createConsumer(); c.handle({ acct: "a", seq: 2, amount: 9 }); c.handle({ acct: "b", seq: 1, amount: 4 }); expect(c.balance("b")).toBe(4); expect(c.balance("a")).toBe(0); expect(c.balance("zzz")).toBe(0); });
test("50,000 shuffled messages with 20% duplicates still add up exactly", () => {
  const msgs = []; for (let a = 0; a < 500; a++) for (let s = 1; s <= 100; s++) msgs.push({ acct: "u" + a, seq: s, amount: s });
  let r = 2463534242; const rnd = () => { r ^= r << 13; r >>>= 0; r ^= r >>> 17; r ^= r << 5; r >>>= 0; return r; };
  const all = msgs.concat(msgs.filter(() => rnd() % 5 === 0));
  for (let i = all.length - 1; i > 0; i--) { const j = rnd() % (i + 1); [all[i], all[j]] = [all[j], all[i]]; }
  const c = createConsumer(); all.forEach((m) => c.handle(m));
  for (let a = 0; a < 500; a += 50) expect(c.balance("u" + a)).toBe(5050);
  expect(c.pending()).toBe(0);
});`,
};

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l26',
  title: 'Lesson 26 · Distributed systems',
  spreads: [
    {
      gated: true,
      left: `
        <p class="kicker">Distributed systems · why it is hard</p>
        <h1>Many machines, no shared truth</h1>
        <p>One server dies, so you run three. One database is too slow, so you copy it. Now you have a <b>distributed system</b>: several computers cooperating over a network. It buys <b>availability</b> and <b>scale</b>, and it costs you something you have taken for granted: <b>one machine, one clock, one agreed state</b>.</p>
        <h2>The facts of life</h2>
        <ul>
          <li><b>The network is unreliable.</b> Messages are delayed, lost, duplicated, reordered. A request with no reply could mean: lost request, dead server, or lost reply (it <i>did</i> run!). You cannot tell which.</li>
          <li><b>There is no global clock.</b> Machine clocks drift; "who wrote last" by timestamp is a guess.</li>
          <li><b>Parts fail independently</b>, and partly (slow is worse than dead).</li>
        </ul>
        <h2>Replication and the partition</h2>
        <p>Keeping copies (<b>replicas</b>) on several nodes survives failures and spreads reads. But a write must reach every copy. When the network <b>partitions</b> (some nodes cannot reach others), you must choose:</p>
        <ul>
          <li><b>Consistency (C):</b> refuse requests on the cut-off side, so no one sees stale or conflicting data. Some users get errors.</li>
          <li><b>Availability (A):</b> keep serving on both sides, and reconcile later. Replicas can diverge and conflicts must be resolved.</li>
        </ul>
        <p>That is the <b>CAP theorem</b>: during a partition you cannot have both. (Partitions will happen, so the real choice is C or A <i>when they do</i>.) <b>PACELC</b> adds: even without a partition, you trade <b>latency</b> against consistency.</p>
        <div class="senior">"Last write wins" by timestamp is the default in many systems and it <b>silently loses data</b>, as you are about to see. Whenever two copies can be written independently, ask: what is the merge rule, and who loses?</div>
        ${back}`,
      right: `<p class="kicker">Lab · break the cluster</p><div id="lab"></div>${foot('make replicas diverge, then repair them')}`,
      init(left, right, api) { mountCluster(right.querySelector('#lab'), { onPass: finish(right, api, 'diverged and repaired', 900) }); },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Distributed systems · time and order</p>
        <h1>"Before" without a clock</h1>
        <p>If clocks cannot be trusted, how do you say that one event happened before another? By <b>causality</b>: event A <i>happened before</i> B if A could have influenced B (same node, earlier; or A was a message that B received). If neither could influence the other, they are <b>concurrent</b>.</p>
        <h2>Logical clocks</h2>
        <ul>
          <li><b>Lamport clock:</b> one counter per node. Increment on each event; on receiving a message set counter = max(mine, theirs) + 1. If A happened before B then L(A) &lt; L(B), but a smaller number does not prove causality.</li>
          <li><b>Vector clock:</b> a counter per node, kept as a map. Compare two vectors and you can tell <b>before</b>, <b>after</b>, or <b>concurrent</b>. Concurrent writes are exactly the conflicts that last-write-wins hides. Systems like Dynamo and Riak keep both versions (siblings) and ask the app, or merge them with structures designed to merge (CRDTs).</li>
        </ul>
        <h2>The rule for comparing</h2>
        <p>x is <b>before</b> y when every entry of x is ≤ the one in y and at least one is smaller. If some entries are bigger in x and others bigger in y, they are <b>concurrent</b>. To merge, take the max of each entry.</p>
        <div class="senior">Wall-clock time is fine for <i>logs and humans</i>, and dangerous for <i>ordering and expiry across machines</i>. When you need a total order, use a single sequencer (a database sequence, one log partition) or a consensus protocol; when you can live with partial order, use causality.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · vector clocks</p><div id="lab"></div>${foot('pass to turn the page')}`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), { tasks: [{ kind: 'implement', question: 'compareClocks and mergeClocks', visible: VC.visible, hidden: VC.hidden, starter: VC.starter, rows: 14 }], onPass: finish(right, api, 'order understood', 1000) });
      },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Distributed systems · agreement</p>
        <h1>Quorums and consensus</h1>
        <h2>Quorums</h2>
        <p>Instead of all-or-nothing, require a <b>majority-ish</b> overlap. With N replicas, write to W and read from R. If <b>R + W &gt; N</b>, every read set shares at least one node with every write set, so a read always meets the newest value. Tune it: <b>W = N</b> (slow writes, fast reads), <b>R = W = ⌈(N+1)/2⌉</b> (balanced, tolerates a minority failing), <b>R = W = 1</b> (fastest, may read stale).</p>
        <h2>Consensus (Raft in one paragraph)</h2>
        <p>Sometimes all nodes must agree on <b>one</b> answer (who is the leader, what is the next entry in the log). <b>Raft</b> and Paxos do it: nodes elect a <b>leader</b>; clients send writes to the leader; it appends to its log and replicates; an entry is <b>committed</b> once a <b>majority</b> stored it. If the leader dies, a new election happens (a candidate needs a majority of votes). Two leaders can never both have a majority, so there is no split brain. A cluster of 2f+1 nodes tolerates f failures: 3 nodes survive 1, 5 survive 2. That is why you run odd numbers, and why etcd, Consul and ZooKeeper (which hold your cluster's critical state) run 3 or 5.</p>
        <ul><li>Consensus costs latency (a round trip to a majority) and halts without a majority: it chooses <b>C over A</b>.</li><li>You will rarely implement it; you will <b>choose</b> systems built on it and need to know what they promise.</li></ul>
        <div class="senior">A <b>distributed lock</b> is consensus in disguise, and a famously easy place to be wrong: a client can pause (garbage collection, a slow network) after its lease expired and still believe it holds the lock. Use <b>fencing tokens</b> (a number that increases per grant, checked by the resource), or avoid distributed locks by designing idempotent work.</div>
        ${back}`,
      right: `<p class="kicker">Lab · tune a quorum</p><div id="lab"></div>${foot('satisfy all four requirements')}`,
      init(left, right, api) { mountQuorum(right.querySelector('#lab'), { onPass: finish(right, api, 'quorums tuned', 900) }); },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Distributed systems · messaging</p>
        <h1>Queues, events and the myth of exactly-once</h1>
        <p>Services rarely call each other synchronously for everything. They put <b>messages</b> on a <b>queue</b> or <b>event log</b> (SQS, RabbitMQ, Kafka) and move on. Benefits: the sender is not slowed or broken by a slow receiver, spikes are absorbed, and work can be retried.</p>
        <h2>Delivery guarantees</h2>
        <ul>
          <li><b>At-most-once:</b> send and forget. Lost messages are possible; no duplicates.</li>
          <li><b>At-least-once:</b> retry until acknowledged. No loss, but <b>duplicates</b> (a lost acknowledgement means a redelivery). Messages may also arrive out of order.</li>
          <li><b>Exactly-once</b> across a network is impossible in general. What systems offer is at-least-once <b>plus</b> deduplication, which has the same effect.</li>
        </ul>
        <h2>So the consumer must be idempotent and order-aware</h2>
        <ul>
          <li>Give every message an id or a per-entity <b>sequence number</b>; remember what you have applied; ignore repeats.</li>
          <li>If order matters per entity, buffer early arrivals and apply in sequence (or partition the queue by entity key so one consumer sees them in order).</li>
          <li>Store the processed marker <b>in the same transaction</b> as the effect, so a crash cannot apply one without the other (the "outbox" and "inbox" patterns).</li>
          <li>Failed messages go to a <b>dead-letter queue</b> after N tries, so one poison message cannot block the line; and you must alert on that queue.</li>
          <li><b>Backpressure:</b> bound the queue and decide what happens when it fills.</li>
        </ul>
        <div class="senior">Design every handler as if it will run twice and out of order, because one day it will. It is cheaper to build that in on day one than to reconcile a ledger after an incident.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · the resilient consumer</p><div id="lab"></div>${foot('pass to turn the page')}`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), { tasks: [{ kind: 'implement', question: 'createConsumer: dedupe and reorder', visible: CO.visible, hidden: CO.hidden, starter: CO.starter, rows: 13 }], onPass: finish(right, api, 'consumer survives duplicates', 1200) });
      },
    },

    {
      gated: true,
      left: `<p class="kicker">Check yourself · distributed systems</p><h1>Four judgment calls</h1>
        <p>That completes Part 5. You can reason about races, databases, and clusters. Part 6 turns to the modern working environment: <b>cloud and containers</b>, <b>front-end and performance</b>, <b>engineering with AI</b>, and finally <b>an open-source contribution</b>.</p>${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Your request to another service times out. What can you safely conclude?</p>',
            options: ['It did not run, so retrying is safe', 'Nothing: it may have never arrived, run and lost its reply, or still be running. So retries need idempotency', 'The service is down', 'Your clock is wrong'], answer: 1, why: 'A timeout hides which failure happened. Make operations safe to repeat.' },
          { prompt: '<p>A network partition splits your 5-node consensus cluster 3 / 2. What happens?</p>',
            options: ['Both sides keep accepting writes', 'The 3-node side keeps a majority and continues; the 2-node side cannot commit writes', 'Everything stops forever', 'Writes are randomly accepted'], answer: 1, why: 'Only a majority can commit. That is how split brain is prevented (consistency over availability).' },
          { prompt: '<p>Two replicas accepted different writes during a partition. Vector clocks say "concurrent". What does that mean?</p>',
            options: ['One of them is older: drop it', 'Neither saw the other; a real conflict that needs a merge rule or the app\'s decision', 'The clocks are broken', 'Take the larger timestamp'], answer: 1, why: 'Concurrent means no causal order exists. Picking by timestamp would silently lose a write.' },
          { prompt: '<p>Your queue is at-least-once. A "send welcome email" handler occasionally sends two. The right fix is:</p>',
            options: ['Switch to a queue that promises exactly-once and trust it', 'Record a processed message id (or send key) so repeats are ignored, ideally in the same transaction as the effect', 'Send three to be safe', 'Delete the queue'], answer: 1, why: 'Idempotent handling is the dependable way to get exactly-once effects.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'Part 5 complete'; api.unlock(900); });
      },
    },
  ],
};
