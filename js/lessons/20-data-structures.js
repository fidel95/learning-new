// Lesson 20 — Core data structures: stack, queue, hash map, LRU cache, heap. Built by hand, graded by behavior and scale.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';

export const BR = {
  starter: `// isBalanced("([]{})") → true   isBalanced("([)]") → false   Other characters are ignored.
// This version only counts, so it cannot tell "([)]" from "([])". Use a STACK.
function isBalanced(s) {
  let open = 0, close = 0;
  for (const ch of s) { if ("([{".includes(ch)) open++; if (")]}".includes(ch)) close++; }
  return open === close;
}
`,
  visible: `test("balanced", () => { expect(isBalanced("([]{})")).toBe(true); });
test("wrong order", () => { expect(isBalanced("([)]")).toBe(false); });`,
  hidden: `test("empty string is balanced", () => { expect(isBalanced("")).toBe(true); });
test("unclosed and unopened", () => { expect(isBalanced("((")).toBe(false); expect(isBalanced("}{")).toBe(false); expect(isBalanced(")")).toBe(false); });
test("other characters are ignored", () => { expect(isBalanced("a(b)c[d]{e}")).toBe(true); expect(isBalanced("f(x[1)]")).toBe(false); });
test("a closer must match the most recent opener", () => { expect(isBalanced("{[}]")).toBe(false); expect(isBalanced("[{()}]")).toBe(true); });
test("500,000 characters deep (must be linear)", () => { expect(isBalanced("(".repeat(250000) + ")".repeat(250000))).toBe(true); });`,
};

export const QU = {
  starter: `// A queue is first in, first out. enqueue(x) adds at the back, dequeue() removes from the front
// (undefined if empty), peek() looks at the front, size is a getter.
// This version copies the whole array on every dequeue: O(n) each, O(n²) overall.
class Queue {
  constructor() { this.items = []; }
  enqueue(x) { this.items.push(x); }
  dequeue() {
    const v = this.items[0];
    this.items = this.items.slice(1);
    return v;
  }
  peek() { return this.items[0]; }
  get size() { return this.items.length; }
}
`,
  visible: `test("first in, first out", () => { const q = new Queue(); q.enqueue(1); q.enqueue(2); expect(q.dequeue()).toBe(1); expect(q.dequeue()).toBe(2); });
test("size and peek", () => { const q = new Queue(); q.enqueue("a"); expect(q.size).toBe(1); expect(q.peek()).toBe("a"); });`,
  hidden: `test("dequeue on empty returns undefined", () => { const q = new Queue(); expect(q.dequeue()).toBeUndefined(); expect(q.peek()).toBeUndefined(); expect(q.size).toBe(0); });
test("interleaved operations keep order", () => {
  const q = new Queue(); q.enqueue(1); q.enqueue(2); expect(q.dequeue()).toBe(1); q.enqueue(3); expect(q.dequeue()).toBe(2); expect(q.dequeue()).toBe(3); expect(q.size).toBe(0);
});
test("can hold falsy values", () => { const q = new Queue(); q.enqueue(0); q.enqueue(null); q.enqueue(""); expect(q.size).toBe(3); expect(q.dequeue()).toBe(0); expect(q.dequeue()).toBe(null); expect(q.dequeue()).toBe(""); });
test("200,000 enqueues then 200,000 dequeues (must be O(1) each)", () => {
  const q = new Queue(); for (let i = 0; i < 200000; i++) q.enqueue(i);
  let ok = true; for (let i = 0; i < 200000; i++) if (q.dequeue() !== i) ok = false;
  expect(ok).toBe(true); expect(q.size).toBe(0);
});`,
};

export const HM = {
  starter: `// Build a hash map for STRING keys without using Map, Set or a plain object as the dictionary.
//   set(key, value)  get(key) → value or undefined  has(key)  delete(key) → true/false  size (getter)
// Idea: turn the key into a number (hash), use it to pick a "bucket", keep a short list in each bucket.
// This version never grows its table, so buckets get long and everything slows down.
class HashMap {
  constructor() { this.buckets = Array.from({ length: 16 }, () => []); this.count = 0; }
  _hash(key) { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0; return Math.abs(h); }
  _bucket(key) { return this.buckets[this._hash(key) % this.buckets.length]; }
  set(key, value) {
    const b = this._bucket(key);
    for (const pair of b) if (pair[0] === key) { pair[1] = value; return; }
    b.push([key, value]); this.count++;
  }
  get(key) { for (const pair of this._bucket(key)) if (pair[0] === key) return pair[1]; return undefined; }
  has(key) { for (const pair of this._bucket(key)) if (pair[0] === key) return true; return false; }
  delete(key) {
    const b = this._bucket(key);
    for (let i = 0; i < b.length; i++) if (b[i][0] === key) { b.splice(i, 1); this.count--; return true; }
    return false;
  }
  get size() { return this.count; }
}
`,
  visible: `test("set and get", () => { const m = new HashMap(); m.set("a", 1); expect(m.get("a")).toBe(1); expect(m.get("b")).toBeUndefined(); });
test("overwrite keeps size", () => { const m = new HashMap(); m.set("a", 1); m.set("a", 2); expect(m.get("a")).toBe(2); expect(m.size).toBe(1); });`,
  hidden: `test("has and delete", () => {
  const m = new HashMap(); m.set("x", 1);
  expect(m.has("x")).toBe(true); expect(m.delete("x")).toBe(true); expect(m.has("x")).toBe(false);
  expect(m.delete("x")).toBe(false); expect(m.size).toBe(0);
});
test("a stored undefined value still counts as present", () => { const m = new HashMap(); m.set("k", undefined); expect(m.has("k")).toBe(true); expect(m.size).toBe(1); });
test("keys that look alike stay separate (collisions are handled)", () => {
  const m = new HashMap(); const keys = ["Aa", "BB", "AaAa", "BBBB", "AaBB", "BBAa", "", "a", "A"];
  keys.forEach((k, i) => m.set(k, i));
  keys.forEach((k, i) => expect(m.get(k)).toBe(i));
  expect(m.size).toBe(keys.length);
});
test("deleting one key leaves the others", () => {
  const m = new HashMap(); for (let i = 0; i < 100; i++) m.set("k" + i, i);
  m.delete("k50"); expect(m.get("k50")).toBeUndefined(); expect(m.get("k51")).toBe(51); expect(m.size).toBe(99);
});
test("it is really hand-built (no Map, Set or object dictionary inside)", () => {
  const src = HashMap.toString();
  expect(/\\bnew (Map|Set|WeakMap)\\b|Object\\.create|=\\s*\\{\\s*\\}\\s*[;\\n]/.test(src)).toBe(false);
});
test("200,000 keys must stay fast (the table has to grow)", () => {
  const m = new HashMap(); for (let i = 0; i < 200000; i++) m.set("key-" + i, i);
  expect(m.size).toBe(200000);
  let bad = 0; for (let i = 0; i < 200000; i += 97) if (m.get("key-" + i) !== i) bad++;
  expect(bad).toBe(0);
});`,
};

export const LRU = {
  starter: `// An LRU cache keeps the most recently used items and evicts the LEAST recently used when full.
//   new LRUCache(capacity)   get(key) → value or undefined (and marks the key as most recently used)
//   put(key, value)          inserts or updates (most recently used); if over capacity, evicts the oldest-used key
// This version searches an array on every call: O(capacity) each. Make get and put O(1).
class LRUCache {
  constructor(capacity) { this.capacity = capacity; this.list = []; }   // list of [key, value], oldest first
  get(key) {
    const i = this.list.findIndex((p) => p[0] === key);
    if (i === -1) return undefined;
    const pair = this.list.splice(i, 1)[0]; this.list.push(pair);
    return pair[1];
  }
  put(key, value) {
    const i = this.list.findIndex((p) => p[0] === key);
    if (i !== -1) this.list.splice(i, 1);
    this.list.push([key, value]);
    if (this.list.length > this.capacity) this.list.shift();
  }
}
`,
  visible: `test("stores and returns", () => { const c = new LRUCache(2); c.put("a", 1); expect(c.get("a")).toBe(1); expect(c.get("z")).toBeUndefined(); });
test("evicts the least recently used", () => { const c = new LRUCache(2); c.put("a", 1); c.put("b", 2); c.put("c", 3); expect(c.get("a")).toBeUndefined(); expect(c.get("c")).toBe(3); });`,
  hidden: `test("reading a key protects it from eviction", () => {
  const c = new LRUCache(2); c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3);
  expect(c.get("b")).toBeUndefined(); expect(c.get("a")).toBe(1); expect(c.get("c")).toBe(3);
});
test("updating a key refreshes it and does not grow the cache", () => {
  const c = new LRUCache(2); c.put("a", 1); c.put("b", 2); c.put("a", 10); c.put("c", 3);
  expect(c.get("b")).toBeUndefined(); expect(c.get("a")).toBe(10);
});
test("capacity 1", () => { const c = new LRUCache(1); c.put("a", 1); c.put("b", 2); expect(c.get("a")).toBeUndefined(); expect(c.get("b")).toBe(2); });
test("falsy values are real values", () => { const c = new LRUCache(2); c.put("z", 0); expect(c.get("z")).toBe(0); c.put("n", null); expect(c.get("n")).toBe(null); });
test("200,000 operations on a 50,000-entry cache (must be O(1) each)", () => {
  const c = new LRUCache(50000);
  for (let i = 0; i < 100000; i++) c.put("k" + i, i);
  let hits = 0; for (let i = 0; i < 100000; i++) if (c.get("k" + i) !== undefined) hits++;
  expect(hits).toBe(50000);
  expect(c.get("k99999")).toBe(99999); expect(c.get("k49999")).toBeUndefined();
});`,
};

export const HP = {
  starter: `// A min-heap: pop() always returns the SMALLEST value. push(x), pop() (undefined if empty), peek(), size getter.
// This version re-sorts the whole array after every push: O(n log n) per push.
// A binary heap keeps an array where the children of index i are at 2i+1 and 2i+2; push "sifts up", pop "sifts down": O(log n).
class MinHeap {
  constructor() { this.items = []; }
  push(x) { this.items.push(x); this.items.sort((a, b) => a - b); }
  pop() { return this.items.shift(); }
  peek() { return this.items[0]; }
  get size() { return this.items.length; }
}
`,
  visible: `test("pops smallest first", () => { const h = new MinHeap(); [5, 1, 3].forEach((x) => h.push(x)); expect(h.pop()).toBe(1); expect(h.pop()).toBe(3); expect(h.pop()).toBe(5); });
test("peek does not remove", () => { const h = new MinHeap(); h.push(2); h.push(1); expect(h.peek()).toBe(1); expect(h.size).toBe(2); });`,
  hidden: `test("empty heap", () => { const h = new MinHeap(); expect(h.pop()).toBeUndefined(); expect(h.peek()).toBeUndefined(); expect(h.size).toBe(0); });
test("duplicates and negatives", () => { const h = new MinHeap(); [3, -1, 3, 0, -1].forEach((x) => h.push(x)); const out = []; while (h.size) out.push(h.pop()); expect(out).toEqual([-1, -1, 0, 3, 3]); });
test("interleaved push and pop", () => {
  const h = new MinHeap(); h.push(10); h.push(4); expect(h.pop()).toBe(4); h.push(1); h.push(7); expect(h.pop()).toBe(1); expect(h.pop()).toBe(7); expect(h.pop()).toBe(10);
});
test("it is not secretly sorting the whole array on every push", () => { expect(/\\.sort\\(/.test(MinHeap.toString())).toBe(false); });
test("heap-sort 200,000 random numbers (O(log n) per operation)", () => {
  const h = new MinHeap(); const src = []; let s = 12345;
  for (let i = 0; i < 200000; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; src.push(s % 100000); h.push(s % 100000); }
  src.sort((a, b) => a - b);
  let bad = 0; for (let i = 0; i < src.length; i++) if (h.pop() !== src[i]) bad++;
  expect(bad).toBe(0);
});`,
};

const done = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const challenge = (right, api, tasks, msg, xp) => mountTestChallenge(right.querySelector('#lab'), { tasks, onPass: done(right, api, msg, xp) });
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;

export const lesson = {
  id: 'l20',
  title: 'Lesson 20 · Data structures',
  spreads: [
    // ───────────────────────── Spread 1: arrays, stack, queue (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Data structures · why they exist</p>
        <h1>A data structure is a promise about cost</h1>
        <p>A data structure is a way of <b>arranging data in memory so that certain operations are cheap</b>. There is no "best" one: each makes some operations fast and others slow. Picking one is choosing which cost you can afford (lesson 19 gave you the language for it).</p>
        <h2>The two foundations</h2>
        <ul>
          <li><b>Array:</b> items side by side in memory. <b>Index in O(1)</b> (address = start + i × size). Inserting or removing in the <i>middle</i> is O(n) because everything shifts. Cache-friendly, so often the fastest choice in practice.</li>
          <li><b>Linked list:</b> each item points to the next. Inserting after a known node is O(1), but reaching the i-th item is O(n) and memory jumps around. Rarely the right pick on modern hardware, but its pointer idea builds trees, graphs and caches.</li>
        </ul>
        <h2>Two disciplines built on top</h2>
        <ul>
          <li><b>Stack (LIFO):</b> last in, first out. <code>push</code> and <code>pop</code> at one end, both O(1). Powers the <b>call stack</b> (lesson 2), undo, back buttons, and parsing nested things: brackets, HTML, expressions.</li>
          <li><b>Queue (FIFO):</b> first in, first out. Add at the back, remove at the front. Powers task queues, breadth-first search, print spoolers, and message brokers (lesson 26). A queue made from an array with <code>shift()</code> or <code>slice(1)</code> silently turns O(1) into O(n).</li>
        </ul>
        <div class="warn">Both challenges at right use big hidden inputs: a correct but slow answer still fails. That matches reality: "it works on my five test items" is where most structure bugs hide.</div>
        <div class="senior">When you meet a nested or "most recent first" problem, think <b>stack</b>. When you meet "in order of arrival" or "level by level", think <b>queue</b>. Recognizing the shape is the skill; the code is small.</div>
        ${'<div class="foot"><span class="hint">‹ back</span><span></span></div>'}`,
      right: `<p class="kicker">Challenge · stack and queue</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'isBalanced with a stack', visible: BR.visible, hidden: BR.hidden, starter: BR.starter, rows: 8 },
          { kind: 'implement', question: 'A queue with O(1) dequeue', visible: QU.visible, hidden: QU.hidden, starter: QU.starter, rows: 13 },
        ], 'stack and queue built', 900);
      },
    },

    // ───────────────────────── Spread 2: hash map (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Data structures · the most useful one</p>
        <h1>Build a hash map</h1>
        <p>The <b>hash map</b> (object, <code>Map</code>, dictionary, dict) is the most used structure in software. It answers "what is the value for this key?" in <b>O(1) on average</b>, by not searching at all: it <b>computes</b> where the answer lives.</p>
        <h2>How it works</h2>
        <ol>
          <li>A <b>hash function</b> turns a key into a big number. Same key, same number, every time.</li>
          <li>Take it modulo the table size to choose a <b>bucket</b> (an index in an array).</li>
          <li>Different keys can land in the same bucket: a <b>collision</b>. Each bucket keeps a small list, and lookups compare keys within it (<b>chaining</b>). Other designs probe the next free slot (<b>open addressing</b>).</li>
          <li>As the table fills, buckets get long and speed decays to O(n). So when the <b>load factor</b> (items ÷ buckets) passes about 0.75, <b>resize</b>: allocate a bigger array and re-insert everything. Occasional O(n), but amortized O(1) (lesson 19).</li>
        </ol>
        <h2>Why this matters beyond interviews</h2>
        <ul>
          <li>Deduplicating, counting, caching, indexing, joining two lists: nearly every "make it O(n)" trick is a hash map.</li>
          <li>Database indexes (hash indexes), caches (Redis), and language objects all rest on it.</li>
          <li><b>Security link:</b> if an attacker picks keys that all collide, lookups become O(n) and requests become a denial of service. Real hash maps use randomized hashing for this reason.</li>
        </ul>
        <div class="senior">The starter works but never grows its table. 200,000 keys across 16 buckets means chains thousands long. You will add resizing and discover the central trick: <b>the O(1) is a property you maintain, not a gift</b>.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<p class="kicker">Challenge · HashMap</p><div id="lab"></div>${foot('pass every test to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [{ kind: 'implement', question: 'Make the hash map resize as it grows', visible: HM.visible, hidden: HM.hidden, starter: HM.starter, rows: 24 }], 'hash map built', 1000);
      },
    },

    // ───────────────────────── Spread 3: LRU (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Data structures · composing them</p>
        <h1>The LRU cache: two structures, one idea</h1>
        <p>A <b>cache</b> keeps recent answers close so you skip slow work (a database query, a network call). Memory is limited, so when it is full something must go. <b>LRU (least recently used)</b> evicts the item untouched the longest, betting that what you used recently you will use again.</p>
        <h2>The classic design</h2>
        <p>Needs two operations in O(1): <b>find</b> an item by key, and <b>move it to "most recent"</b> / drop the oldest. No single structure does both, so combine them:</p>
        <ul>
          <li>A <b>hash map</b> from key to node: finds an item instantly.</li>
          <li>A <b>doubly linked list</b> ordered by recency: unlinking and relinking a node is O(1) because it knows its neighbors. Head = most recent, tail = next to evict.</li>
        </ul>
        <p>JavaScript's <code>Map</code> <b>remembers insertion order</b>, so one structure can do both jobs: delete a key and re-insert it to make it newest, and <code>map.keys().next().value</code> is the oldest.</p>
        <h2>Cache engineering beyond the code</h2>
        <ul>
          <li><b>Hit rate</b> is the metric that matters. A cache with a 30% hit rate may cost more than it saves.</li>
          <li><b>Invalidation</b> ("there are only two hard things in computer science: cache invalidation and naming things"). Stale data is a correctness bug: use expiry (TTL) and clear on writes.</li>
          <li>Caches can <b>stampede</b>: when a popular key expires, thousands of requests rebuild it at once.</li>
        </ul>
        <div class="senior">Composition is how real systems are built: Redis, CPU caches, browser caches and CDN caches are all this idea with extra policy. The data structure is the mechanism; eviction is the policy. Keep those separate in your head.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<p class="kicker">Challenge · LRUCache</p><div id="lab"></div>${foot('pass every test to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [{ kind: 'implement', question: 'Make get and put O(1)', visible: LRU.visible, hidden: LRU.hidden, starter: LRU.starter, rows: 20 }], 'cache built', 1000);
      },
    },

    // ───────────────────────── Spread 4: heap (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Data structures · always the next best</p>
        <h1>Heaps and priority queues</h1>
        <p>A <b>priority queue</b> hands you the item with the highest priority next, whatever order they arrived in. Think: the next job to run, the nearest unvisited city (lesson 22), the 10 largest values in a stream. The standard implementation is a <b>binary heap</b>.</p>
        <h2>The trick: a tree stored in an array</h2>
        <ul>
          <li>A binary tree where <b>every parent is ≤ its children</b> (a min-heap). So the smallest is always at the root: <code>peek</code> is O(1).</li>
          <li>Stored flat in an array: the children of index <code>i</code> are <code>2i+1</code> and <code>2i+2</code>; the parent of <code>i</code> is <code>⌊(i−1)/2⌋</code>. No pointers.</li>
          <li><b>push:</b> add at the end, then <b>sift up</b> while smaller than the parent. At most log n swaps.</li>
          <li><b>pop:</b> take the root, move the last item to the root, then <b>sift down</b> by swapping with the smaller child. At most log n swaps.</li>
        </ul>
        <h2>Where it shows up</h2>
        <ul>
          <li><b>Top-K problems:</b> keep a heap of size K while streaming: O(n log K).</li>
          <li><b>Schedulers</b> and timers, event simulations, merging K sorted lists.</li>
          <li><b>Dijkstra's shortest path</b> and A* search.</li>
          <li><b>Heapsort:</b> push everything, pop everything: O(n log n), in place.</li>
        </ul>
        <div class="warn">Off-by-one errors in the index arithmetic are the usual bug. Test with 1, 2 and 3 items, then duplicates, then lots. The hidden tests do exactly that.</div>
        <div class="senior">Heap vs sorted array: a sorted array gives O(1) pop of the smallest but O(n) insertion; a heap gives O(log n) for both. When items keep arriving <i>and</i> you keep taking the best, use a heap.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<p class="kicker">Challenge · MinHeap</p><div id="lab"></div>${foot('pass every test to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [{ kind: 'implement', question: 'Replace re-sorting with a real binary heap', visible: HP.visible, hidden: HP.hidden, starter: HP.starter, rows: 12 }], 'heap built', 1000);
      },
    },

    // ───────────────────────── Spread 5: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Choose the structure</h1>
        <p>Matching a problem to a structure is the real exam. Read the requirement, name the operation that must be cheap, and pick.</p>
        <div class="senior">Next: searching, sorting, recursion and dynamic programming, where these structures become the tools of general problem solving.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div>${foot('answer all five to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>You need to count how often each word appears in a 10 GB log, in one pass.</p>',
            options: ['Array, scanning for the word each time', 'Hash map from word to count', 'Stack', 'Sorted array with insertion'], answer: 1,
            why: 'Counting by key is the hash map\'s signature job: O(1) lookup and update per word.' },
          { prompt: '<p>A text editor needs undo: the most recent change is reverted first.</p>',
            options: ['Queue', 'Stack', 'Hash map', 'Heap'], answer: 1,
            why: 'Most recent first is last-in-first-out.' },
          { prompt: '<p>A job scheduler must always run the highest-priority job next, while new jobs keep arriving.</p>',
            options: ['Sorted array, inserting each job in place', 'Heap (priority queue)', 'Queue (first come, first served)', 'Stack'], answer: 1,
            why: 'A heap gives O(log n) insertion and O(log n) extraction of the best. A sorted array pays O(n) per insert; a FIFO queue ignores priority.' },
          { prompt: '<p>You have a product catalog that rarely changes and you need the item at position 5,000 instantly, many times.</p>',
            options: ['Linked list', 'Array: indexing is O(1)', 'Queue', 'LRU cache'], answer: 1,
            why: 'Random access by position is what arrays are built for. A linked list would walk 5,000 nodes.' },
          { prompt: '<p>Your LRU cache starts evicting items you use constantly, and the hit rate is 20%. What is the first thing to question?</p>',
            options: ['The hash function', 'Whether the capacity and the access pattern fit: maybe the cache is too small, or the workload is a long scan LRU handles badly', 'Whether to use a stack', 'The programming language'], answer: 1,
            why: 'Mechanism was correct; policy and sizing decide the hit rate. Measure the workload before changing data structures.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(600); });
      },
    },
  ],
};
