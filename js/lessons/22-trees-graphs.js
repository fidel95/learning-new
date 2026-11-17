// Lesson 22 — Trees and graphs.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountGridExplorer } from '../graphlab.js';

export const LO = {
  starter: `// A tree node is { value, left, right } (left/right are nodes or null).
// levelOrder(root) → an array of levels, top to bottom: [[1], [2, 3], [4, 5]]. levelOrder(null) → [].
// This version just lists values in a single flat list. Use a QUEUE (breadth-first), one level at a time.
function levelOrder(root) {
  if (!root) return [];
  return [[root.value]];
}
`,
  visible: `const n = (value, left = null, right = null) => ({ value, left, right });
test("a single node", () => { expect(levelOrder(n(1))).toEqual([[1]]); });
test("three levels", () => { expect(levelOrder(n(1, n(2, n(4)), n(3)))).toEqual([[1], [2, 3], [4]]); });`,
  hidden: `const n = (value, left = null, right = null) => ({ value, left, right });
test("empty tree", () => { expect(levelOrder(null)).toEqual([]); });
test("left and right order within a level", () => { expect(levelOrder(n(1, n(2, null, n(5)), n(3, n(6), n(7))))).toEqual([[1], [2, 3], [5, 6, 7]]); });
test("a 50,000-deep chain (use a queue, not recursion)", () => {
  let root = n(0); let cur = root; for (let i = 1; i < 50000; i++) { cur.right = n(i); cur = cur.right; }
  const r = levelOrder(root); expect(r.length).toBe(50000); expect(r[49999]).toEqual([49999]);
});
test("a wide tree", () => {
  const root = n(0); let c = 1;
  let level = [root]; for (let d = 0; d < 10; d++) { const next = []; for (const p of level) { p.left = n(c++); p.right = n(c++); next.push(p.left, p.right); } level = next; }
  const r = levelOrder(root); expect(r.length).toBe(11); expect(r[10].length).toBe(1024);
});`,
};

export const BS = {
  starter: `// A binary search tree: smaller values go left, larger go right, so a lookup discards half the tree each step.
//   insert(x)  (duplicates are ignored)   has(x)   inOrder() → sorted array   height() (empty = 0, one node = 1)   min() → smallest or undefined
// This version keeps a plain array, so inserting and searching are O(n). Build real nodes.
class BST {
  constructor() { this.items = []; }
  insert(x) { if (!this.items.includes(x)) { this.items.push(x); this.items.sort((a, b) => a - b); } }
  has(x) { return this.items.includes(x); }
  inOrder() { return this.items.slice(); }
  height() { return this.items.length; }
  min() { return this.items[0]; }
}
`,
  visible: `test("insert and has", () => { const t = new BST(); [5, 3, 8].forEach((x) => t.insert(x)); expect(t.has(3)).toBe(true); expect(t.has(4)).toBe(false); });
test("in-order is sorted", () => { const t = new BST(); [5, 3, 8, 1].forEach((x) => t.insert(x)); expect(t.inOrder()).toEqual([1, 3, 5, 8]); });`,
  hidden: `test("empty tree", () => { const t = new BST(); expect(t.inOrder()).toEqual([]); expect(t.height()).toBe(0); expect(t.min()).toBeUndefined(); expect(t.has(1)).toBe(false); });
test("duplicates are ignored", () => { const t = new BST(); [2, 2, 2].forEach((x) => t.insert(x)); expect(t.inOrder()).toEqual([2]); expect(t.height()).toBe(1); });
test("height follows the shape of the tree", () => {
  const a = new BST(); [2, 1, 3].forEach((x) => a.insert(x)); expect(a.height()).toBe(2);
  const b = new BST(); [1, 2, 3, 4, 5].forEach((x) => b.insert(x)); expect(b.height()).toBe(5);
});
test("min is the leftmost node", () => { const t = new BST(); [5, 9, 2, 7, 1, 3].forEach((x) => t.insert(x)); expect(t.min()).toBe(1); });
test("negative numbers and zero", () => { const t = new BST(); [0, -5, 5, -1].forEach((x) => t.insert(x)); expect(t.inOrder()).toEqual([-5, -1, 0, 5]); });
test("100,000 random keys: insert and lookup must be about O(log n)", () => {
  const t = new BST(); let s = 99; const keys = [];
  for (let i = 0; i < 100000; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; keys.push(s); t.insert(s); }
  let bad = 0; for (let i = 0; i < 100000; i += 3) if (!t.has(keys[i])) bad++;
  expect(bad).toBe(0); expect(t.has(-1)).toBe(false);
  expect(t.height()).toBeLessThan(80);
});`,
};

export const SP = {
  starter: `// grid is an array of strings: "." open, "#" wall. start and end are [row, col]. Moves: up, down, left, right.
// shortestPath(grid, start, end) → the fewest steps, or -1 if unreachable. start === end → 0.
// This version explores every possible path (exponential). Use breadth-first search: it reaches every cell by its shortest route first.
function shortestPath(grid, start, end) {
  const R = grid.length, C = grid[0].length;
  let best = Infinity;
  const seen = new Set();
  function go(r, c, steps) {
    if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] === "#" || seen.has(r + "," + c)) return;
    if (r === end[0] && c === end[1]) { best = Math.min(best, steps); return; }
    seen.add(r + "," + c);
    go(r + 1, c, steps + 1); go(r - 1, c, steps + 1); go(r, c + 1, steps + 1); go(r, c - 1, steps + 1);
    seen.delete(r + "," + c);
  }
  go(start[0], start[1], 0);
  return best === Infinity ? -1 : best;
}
`,
  visible: `test("straight line", () => { expect(shortestPath(["...."], [0, 0], [0, 3])).toBe(3); });
test("around a wall", () => { expect(shortestPath(["..#.", "..#.", "...."], [0, 0], [0, 3])).toBe(7); });`,
  hidden: `test("start equals end", () => { expect(shortestPath(["."], [0, 0], [0, 0])).toBe(0); });
test("unreachable", () => { expect(shortestPath([".#.", ".#.", ".#."], [0, 0], [0, 2])).toBe(-1); });
test("the goal itself is a wall", () => { expect(shortestPath(["..#"], [0, 0], [0, 2])).toBe(-1); });
test("a winding maze", () => {
  const g = ["..#......", ".##.####.", "....#..#.", "###.#.##.", "....#....", ".####.###", "........."];
  expect(shortestPath(g, [0, 0], [6, 8])).toBe(shortestPath(g, [6, 8], [0, 0]));
  expect(shortestPath(g, [0, 0], [6, 8]) > 0).toBe(true);
});
test("a 1000 x 1000 open grid (a million cells)", () => {
  const row = ".".repeat(1000); const g = []; for (let i = 0; i < 1000; i++) g.push(row);
  expect(shortestPath(g, [0, 0], [999, 999])).toBe(1998);
});`,
};

export const IS = {
  starter: `// grid is an array of strings of "0" (water) and "1" (land). An island is a group of land cells connected up/down/left/right
// (diagonals do NOT connect). countIslands(grid) → how many islands.
// This version counts land cells, which is wrong. Flood-fill each island once (depth-first search) and count the floods.
function countIslands(grid) {
  let n = 0;
  for (const row of grid) for (const ch of row) if (ch === "1") n++;
  return n;
}
`,
  visible: `test("two islands", () => { expect(countIslands(["110", "000", "011"])).toBe(2); });
test("none", () => { expect(countIslands(["000"])).toBe(0); });`,
  hidden: `test("diagonal cells are separate islands", () => { expect(countIslands(["10", "01"])).toBe(2); });
test("one big island", () => { expect(countIslands(["111", "101", "111"])).toBe(1); });
test("empty grid", () => { expect(countIslands([])).toBe(0); });
test("does not change the input", () => { const g = ["11", "00"]; countIslands(g); expect(g).toEqual(["11", "00"]); });
test("1000 x 1000 of land is ONE island (recursion would overflow: use an explicit stack)", () => {
  const row = "1".repeat(1000); const g = []; for (let i = 0; i < 1000; i++) g.push(row);
  expect(countIslands(g)).toBe(1);
});
test("1000 x 1000 checkerboard has 500,000 islands", () => {
  const g = []; for (let r = 0; r < 1000; r++) { let s = ""; for (let c = 0; c < 1000; c++) s += (r + c) % 2 ? "1" : "0"; g.push(s); }
  expect(countIslands(g)).toBe(500000);
});`,
};

export const DJ = {
  starter: `// graph is { node: [[neighbor, weight], ...] } with non-negative weights. dijkstra(graph, source) → { node: shortest distance }.
// Unreachable nodes get Infinity. Include every node that appears anywhere (as a key or as a neighbor).
// This version counts hops and ignores weights. Use Dijkstra: always settle the closest unsettled node (a min-heap makes it fast).
function dijkstra(graph, source) {
  const dist = { [source]: 0 }; const q = [source];
  while (q.length) {
    const u = q.shift();
    for (const [v] of graph[u] || []) if (!(v in dist)) { dist[v] = dist[u] + 1; q.push(v); }
  }
  for (const u of Object.keys(graph)) { if (!(u in dist)) dist[u] = Infinity; for (const [v] of graph[u]) if (!(v in dist)) dist[v] = Infinity; }
  return dist;
}
`,
  visible: `test("weighted shortest path", () => { const g = { A: [["B", 1], ["C", 4]], B: [["C", 2]], C: [] }; expect(dijkstra(g, "A")).toEqual({ A: 0, B: 1, C: 3 }); });`,
  hidden: `test("a longer route can be cheaper", () => {
  const g = { A: [["D", 10], ["B", 1]], B: [["C", 1]], C: [["D", 1]], D: [] };
  expect(dijkstra(g, "A").D).toBe(3);
});
test("unreachable nodes are Infinity, including ones only seen as neighbors", () => {
  const g = { A: [["B", 2]], X: [["Y", 1]] };
  expect(dijkstra(g, "A")).toEqual({ A: 0, B: 2, X: Infinity, Y: Infinity });
});
test("zero-weight edges and a lone source", () => {
  expect(dijkstra({ S: [] }, "S")).toEqual({ S: 0 });
  expect(dijkstra({ A: [["B", 0]], B: [["C", 0]] }, "A")).toEqual({ A: 0, B: 0, C: 0 });
});
test("cycles do not loop forever", () => {
  const g = { A: [["B", 1]], B: [["A", 1], ["C", 5]], C: [["A", 1]] };
  expect(dijkstra(g, "A")).toEqual({ A: 0, B: 1, C: 6 });
});
test("5,000 nodes in a weighted ring with chords", () => {
  const g = {}; for (let i = 0; i < 5000; i++) g["n" + i] = [["n" + ((i + 1) % 5000), 2], ["n" + ((i + 7) % 5000), 11]];
  const d = dijkstra(g, "n0"); expect(d.n1).toBe(2); expect(d.n7).toBe(11); expect(d.n14).toBe(22);
});`,
};

export const BO = {
  starter: `// deps is { task: [prerequisites] }. buildOrder(deps) → an array of ALL tasks (also ones that only appear as prerequisites)
// in an order where every task comes after its prerequisites. If there is a cycle, return null.
// This is how package managers, build systems and CI pipelines decide what to run first (a topological sort).
// This version just lists the keys, ignoring the prerequisites.
function buildOrder(deps) {
  return Object.keys(deps);
}
`,
  visible: `test("prerequisites first", () => {
  const order = buildOrder({ app: ["lib", "util"], lib: ["util"], util: [] });
  expect(order.indexOf("util") < order.indexOf("lib")).toBe(true);
  expect(order.indexOf("lib") < order.indexOf("app")).toBe(true);
});`,
  hidden: `const valid = (deps, order) => { const pos = new Map(order.map((t, i) => [t, i])); for (const t of Object.keys(deps)) for (const p of deps[t]) if (!(pos.get(p) < pos.get(t))) return false; return true; };
test("empty", () => { expect(buildOrder({})).toEqual([]); });
test("includes tasks that only appear as prerequisites, each once", () => {
  const deps = { a: ["x"], b: ["x", "y"] }; const o = buildOrder(deps);
  expect([...o].sort()).toEqual(["a", "b", "x", "y"]); expect(valid(deps, o)).toBe(true);
});
test("a cycle returns null", () => { expect(buildOrder({ a: ["b"], b: ["c"], c: ["a"] })).toBeNull(); });
test("a task that requires itself is a cycle", () => { expect(buildOrder({ a: ["a"] })).toBeNull(); });
test("diamond dependencies", () => {
  const deps = { top: ["l", "r"], l: ["base"], r: ["base"], base: [] }; const o = buildOrder(deps);
  expect(o.length).toBe(4); expect(valid(deps, o)).toBe(true);
});
test("a 50,000-task chain", () => {
  const deps = {}; for (let i = 0; i < 50000; i++) deps["t" + i] = i ? ["t" + (i - 1)] : [];
  const o = buildOrder(deps); expect(o.length).toBe(50000); expect(o[0]).toBe("t0"); expect(o[49999]).toBe("t49999");
});`,
};

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const challenge = (right, api, tasks, msg, xp) => mountTestChallenge(right.querySelector('#lab'), { tasks, onPass: finish(right, api, msg, xp) });
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l22',
  title: 'Lesson 22 · Trees & graphs',
  spreads: [
    // ───────────────────────── Spread 1: trees (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Structures · trees</p>
        <h1>Trees: data with a hierarchy</h1>
        <p>A <b>tree</b> is nodes connected by parent-child links, with one <b>root</b> and no cycles. You already live inside trees: file systems, the DOM (lesson 5), JSON, a company org chart, the Git commit history, the AST your compiler built.</p>
        <h2>Vocabulary</h2>
        <ul>
          <li><b>Root, leaf, parent, child, subtree.</b> The <b>height</b> is the longest root-to-leaf path.</li>
          <li><b>Binary tree:</b> each node has at most two children (left, right).</li>
          <li><b>Binary search tree (BST):</b> everything in the left subtree is smaller, everything in the right is larger. A lookup throws away half the tree at every step: <b>O(log n) if the tree is balanced</b>.</li>
        </ul>
        <h2>The danger: balance</h2>
        <p>Insert 1, 2, 3, 4, 5 in order into a plain BST and you get a <b>chain</b> (height 5): it degrades into a linked list, and lookups become O(n). Real systems use <b>self-balancing</b> trees (AVL, red-black) or <b>B-trees</b>. The index in your database (lesson 8) is a B-tree, which is why indexed lookups are fast.</p>
        <h2>Two ways to walk a tree</h2>
        <ul>
          <li><b>Depth-first:</b> go as deep as possible first (recursion or a stack). <i>In-order</i> (left, node, right) on a BST yields sorted output.</li>
          <li><b>Breadth-first (level order):</b> visit level by level with a <b>queue</b>. Seen in file-explorer "expand all", shortest-hops searches.</li>
        </ul>
        <div class="warn">The deep-chain test (50,000 levels) breaks recursive solutions with a stack overflow: the lesson 21 warning, live. Breadth-first with a queue is naturally iterative.</div>
        <div class="senior">Whenever a problem says "nested", "hierarchy", "parent/child", or "sorted with fast insert and lookup", think tree. Whenever it says "level by level", think queue. And always ask: <b>could my input be a chain?</b></div>
        ${back}`,
      right: `<p class="kicker">Challenge · trees</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'levelOrder: breadth-first with a queue', visible: LO.visible, hidden: LO.hidden, starter: LO.starter, rows: 7 },
          { kind: 'implement', question: 'A real binary search tree', visible: BS.visible, hidden: BS.hidden, starter: BS.starter, rows: 11 },
        ], 'trees grown', 1000);
      },
    },

    // ───────────────────────── Spread 2: graphs BFS/DFS (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Structures · graphs</p>
        <h1>Graphs: things and their connections</h1>
        <p>A <b>graph</b> is nodes (<b>vertices</b>) joined by <b>edges</b>. A tree is a graph with no cycles; a general graph can have cycles, many routes, and one-way edges. Maps, social networks, the web, dependency trees, networks of servers, game levels: all graphs.</p>
        <h2>Representing one</h2>
        <ul>
          <li><b>Adjacency list:</b> each node maps to its neighbors (<code>{ A: ["B","C"] }</code>). Compact; the default.</li>
          <li><b>Adjacency matrix:</b> a V×V table of 0/1. Fast edge check, wasteful for sparse graphs.</li>
          <li><b>An implicit graph:</b> a grid or maze where neighbors are computed (up, down, left, right). No data structure needed.</li>
        </ul>
        <h2>The two searches</h2>
        <ul>
          <li><b>BFS (breadth-first, queue):</b> explores in expanding rings. <b>The first time it reaches a node is by a shortest path</b> (fewest edges). Use for shortest hops, "degrees of separation", nearest anything.</li>
          <li><b>DFS (depth-first, stack):</b> dives down a branch, backs up. Use to explore everything reachable, find connected components, detect cycles, backtrack.</li>
        </ul>
        <p>Both cost <b>O(V + E)</b> if you mark visited nodes. Forgetting the visited set is the classic bug: cycles make the search loop forever.</p>
        <div class="warn">A million-cell grid is the hidden-test size. Recursive DFS overflows the stack on it, so flood fill needs an <b>explicit stack</b>, and BFS needs an efficient queue (an index pointer, not <code>shift()</code> on a huge array).</div>
        <div class="senior">The interview-and-job-relevant skill is <b>modeling</b>: seeing that "minimum moves to solve a puzzle", "fewest hops between two users", and "can the robot reach the goal" are all the same BFS on a graph you never drew.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · BFS and DFS</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'shortestPath in a maze (BFS)', visible: SP.visible, hidden: SP.hidden, starter: SP.starter, rows: 17 },
          { kind: 'implement', question: 'countIslands (flood fill)', visible: IS.visible, hidden: IS.hidden, starter: IS.starter, rows: 8 },
        ], 'search mastered', 1200);
      },
    },

    // ───────────────────────── Spread 3: weighted and ordering (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Structures · weights and order</p>
        <h1>Dijkstra and dependency order</h1>
        <p>BFS counts edges. Real graphs have <b>costs</b>: distance, time, price. Fewest hops is not cheapest route, so we need a smarter search.</p>
        <h2>Dijkstra's algorithm (shortest path, non-negative weights)</h2>
        <ol>
          <li>Give the source distance 0 and every other node Infinity.</li>
          <li>Repeatedly take the <b>unsettled node with the smallest known distance</b> (a <b>min-heap</b>, lesson 20, does this in O(log n)).</li>
          <li>For each neighbor, ask: <i>is going through this node cheaper?</i> If so, update ("relax" the edge).</li>
          <li>A settled node's distance is final, <b>because no later path can be cheaper when weights are not negative</b>. With negative weights use Bellman-Ford.</li>
        </ol>
        <p>Cost: O((V + E) log V) with a heap. It powers map routing, network routing (OSPF), and game pathfinding (A* adds a goal-directed guess).</p>
        <h2>Topological sort: what must come first?</h2>
        <p>In a <b>directed acyclic graph (DAG)</b> of dependencies, a <b>topological order</b> lists every node after what it depends on. It is exactly how <code>npm install</code>, <code>make</code>, CI pipelines, database migrations and spreadsheet recalculation choose an order.</p>
        <ul>
          <li><b>Kahn's algorithm:</b> repeatedly take nodes with no unmet prerequisites (in-degree 0), remove them, and decrement their dependents.</li>
          <li>If you cannot take all nodes, there is a <b>cycle</b>: circular dependencies cannot be ordered. Detecting that is a feature.</li>
        </ul>
        <div class="senior">Both tasks reward a careful <b>interface contract</b>: what about nodes that only appear as neighbors? Unreachable nodes? Self-loops? The hidden tests probe those edges, because production data always contains them.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · weighted paths, ordering</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'dijkstra: cheapest, not fewest-hops', visible: DJ.visible, hidden: DJ.hidden, starter: DJ.starter, rows: 11 },
          { kind: 'implement', question: 'buildOrder: topological sort with cycle detection', visible: BO.visible, hidden: BO.hidden, starter: BO.starter, rows: 8 },
        ], 'graphs conquered', 1400);
      },
    },

    // ───────────────────────── Spread 4: explorer ─────────────────────────
    {
      left: `
        <p class="kicker">Structures · see it</p>
        <h1>Watch the two searches think</h1>
        <p>Draw a maze on the right. Run <b>breadth-first</b>: it floods outward like water, and the orange fades by how late each cell was reached. Run <b>depth-first</b>: it charges down one corridor and only backs up at dead ends.</p>
        <h2>What to try</h2>
        <ul>
          <li>Open the maze fully, then compare the cells explored: BFS explores almost everything before it finds the goal; DFS may stumble onto it fast, but by a winding route.</li>
          <li>Wall off the goal completely: both must explore every reachable cell to be sure there is no path.</li>
          <li>Make a narrow corridor: BFS and DFS now behave almost identically, since there is only one way.</li>
        </ul>
        <h2>Choosing</h2>
        <ul>
          <li><b>Need the shortest path (fewest steps)?</b> BFS.</li>
          <li><b>Need to explore or enumerate everything, or detect cycles?</b> DFS.</li>
          <li><b>Memory:</b> BFS holds a whole "ring" (can be huge when the graph is wide); DFS holds one path (can be deep).</li>
          <li><b>Weighted edges?</b> Dijkstra (or A*), not BFS.</li>
        </ul>
        <div class="senior">Every system that "finds a route" is some flavor of these. The knowledge worth keeping: the <b>data structure decides the behavior</b>. Swap the queue for a stack and BFS becomes DFS. Swap it for a priority queue and it becomes Dijkstra.</div>
        ${back}`,
      right: `<p class="kicker">Lab · maze explorer</p><div id="lab"></div><div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountGridExplorer(right.querySelector('#lab')); },
    },

    // ───────────────────────── Spread 5: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Four modeling calls</h1>
        <p>Next: problem-solving patterns, the small set of reusable ideas (two pointers, sliding window, and more) that turn unfamiliar problems into familiar ones.</p>
        ${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>"What is the fewest number of friend-of-a-friend hops between two users?" Which tool fits?</p>',
            options: ['DFS, because it goes deep', 'BFS on the friendship graph: the first time you reach a user is by the fewest hops', 'Sorting the users', 'A hash map only'], answer: 1,
            why: 'BFS explores in rings of increasing distance, so the first arrival at a node uses the fewest edges.' },
          { prompt: '<p>Your database lookups on an indexed column take milliseconds even with 100 million rows. What structure is most likely behind that?</p>',
            options: ['A linked list', 'A balanced search tree (a B-tree): height grows as log n', 'A plain unsorted array', 'A queue'], answer: 1,
            why: 'Balanced trees keep the height tiny; a B-tree with a wide fan-out reaches any row in a handful of disk reads.' },
          { prompt: '<p>A build system finds that package A needs B, B needs C, and C needs A. What should it do?</p>',
            options: ['Build them in any order', 'Report the circular dependency: no valid order exists (cycle in the graph)', 'Skip all three', 'Build C twice'], answer: 1,
            why: 'A topological order exists only for acyclic graphs. Failing loudly beats building in a guessed order.' },
          { prompt: '<p>Roads have different travel times. Why is plain BFS the wrong tool for the fastest route?</p>',
            options: ['BFS cannot visit all nodes', 'BFS minimizes the number of edges, not the total weight; use Dijkstra (or A*)', 'BFS needs a stack', 'It is too fast'], answer: 1,
            why: 'Two long roads can be faster than one slow one. Weighted shortest paths need a priority queue by distance.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(600); });
      },
    },
  ],
};
