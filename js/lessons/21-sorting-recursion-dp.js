// Lesson 21 — Recursion, sorting and dynamic programming.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountSortRace } from '../sortlab.js';

export const FL = {
  starter: `// flatten([1, [2, [3, [4]]]]) → [1, 2, 3, 4]. Any depth. Do not mutate the input. Do not use .flat().
// This version only flattens ONE level. Think: what is the base case, and what is the smaller problem?
function flatten(arr) {
  const out = [];
  for (const x of arr) {
    if (Array.isArray(x)) out.push(...x);
    else out.push(x);
  }
  return out;
}
`,
  visible: `test("one level", () => { expect(flatten([1, [2, 3]])).toEqual([1, 2, 3]); });
test("deeper", () => { expect(flatten([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]); });`,
  hidden: `test("empty arrays vanish", () => { expect(flatten([])).toEqual([]); expect(flatten([[], [[]], [[[]]]])).toEqual([]); });
test("non-array values are kept as they are (strings are not split)", () => { expect(flatten(["ab", [null, [{ a: 1 }]]])).toEqual(["ab", null, { a: 1 }]); });
test("order is preserved", () => { expect(flatten([[1, [2]], 3, [[4], 5]])).toEqual([1, 2, 3, 4, 5]); });
test("does not change the input", () => { const a = [1, [2, [3]]]; flatten(a); expect(a).toEqual([1, [2, [3]]]); });
test("does not use the built-in flat()", () => { expect(/\\.flat\\(/.test(flatten.toString())).toBe(false); });
test("very deep nesting (3,000 levels)", () => {
  let a = [42]; for (let i = 0; i < 3000; i++) a = [a];
  expect(flatten(a)).toEqual([42]);
});`,
};

export const PM = {
  starter: `// permutations([1, 2, 3]) → all 6 orderings, as an array of arrays (any order). permutations([]) → [[]].
// Recursive idea: pick each item as the FIRST one, then permute what is left. Do not mutate the input.
function permutations(items) {
  return [items.slice()];   // TODO: only returns one ordering
}
`,
  visible: `test("two items", () => { const r = permutations([1, 2]).map((p) => p.join("")).sort(); expect(r).toEqual(["12", "21"]); });
test("three items", () => { expect(permutations([1, 2, 3]).length).toBe(6); });`,
  hidden: `test("empty and single", () => { expect(permutations([])).toEqual([[]]); expect(permutations([7])).toEqual([[7]]); });
test("all six orderings of three, each exactly once", () => {
  const r = permutations(["a", "b", "c"]).map((p) => p.join("")).sort();
  expect(r).toEqual(["abc", "acb", "bac", "bca", "cab", "cba"]);
});
test("720 distinct permutations of six items", () => {
  const r = permutations([1, 2, 3, 4, 5, 6]); expect(r.length).toBe(720);
  expect(new Set(r.map((p) => p.join(","))).size).toBe(720);
  expect(r.every((p) => p.length === 6 && [...p].sort().join() === "1,2,3,4,5,6")).toBe(true);
});
test("does not change the input", () => { const a = [1, 2, 3]; permutations(a); expect(a).toEqual([1, 2, 3]); });
test("eight items (40,320 results) in reasonable time", () => { expect(permutations([1, 2, 3, 4, 5, 6, 7, 8]).length).toBe(40320); });`,
};

export const MS = {
  starter: `// Sort a copy of arr using MERGE SORT (divide in half, sort each half, merge). cmp(a, b) < 0 means a goes first.
// It must be stable (equal items keep their original order), must not change the input, and must not use .sort().
// This version is bubble sort: O(n²). 200,000 items will not finish.
function mergeSort(arr, cmp = (a, b) => a - b) {
  const a = arr.slice();
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a.length - 1 - i; j++)
      if (cmp(a[j], a[j + 1]) > 0) [a[j], a[j + 1]] = [a[j + 1], a[j]];
  return a;
}
`,
  visible: `test("sorts numbers", () => { expect(mergeSort([3, 1, 2])).toEqual([1, 2, 3]); });
test("accepts a comparator", () => { expect(mergeSort(["bb", "a", "ccc"], (x, y) => y.length - x.length)).toEqual(["ccc", "bb", "a"]); });`,
  hidden: `test("empty and single", () => { expect(mergeSort([])).toEqual([]); expect(mergeSort([5])).toEqual([5]); });
test("negative numbers and duplicates", () => { expect(mergeSort([3, -1, 3, 0, -1, 10, 2])).toEqual([-1, -1, 0, 2, 3, 3, 10]); });
test("is stable", () => {
  const items = []; for (let i = 0; i < 50; i++) items.push({ k: i % 3, i });
  const r = mergeSort(items, (a, b) => a.k - b.k);
  for (let x = 1; x < r.length; x++) { if (r[x - 1].k === r[x].k) expect(r[x - 1].i < r[x].i).toBe(true); }
  expect(r[0].k).toBe(0);
});
test("does not change the input", () => { const a = [3, 1, 2]; mergeSort(a); expect(a).toEqual([3, 1, 2]); });
test("does not cheat with the built-in sort", () => { expect(/\\.sort\\(|\\.toSorted\\(/.test(mergeSort.toString())).toBe(false); });
test("200,000 random numbers (must be O(n log n))", () => {
  const a = []; let s = 7; for (let i = 0; i < 200000; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; a.push(s % 1000000); }
  const want = a.slice().sort((x, y) => x - y); const got = mergeSort(a);
  let bad = 0; for (let i = 0; i < want.length; i++) if (want[i] !== got[i]) bad++;
  expect(bad).toBe(0);
});`,
};

export const CS = {
  starter: `// climbStairs(n): in how many distinct ways can you climb n steps taking 1 or 2 steps at a time?
// Return the answer modulo 1,000,000,007 (the numbers get huge). climbStairs(1)=1, (2)=2, (3)=3, (4)=5 ...
// This recursion recomputes the same sub-answers again and again: O(2ⁿ).
function climbStairs(n) {
  if (n <= 2) return n;
  return (climbStairs(n - 1) + climbStairs(n - 2)) % 1000000007;
}
`,
  visible: `test("small cases", () => { expect(climbStairs(1)).toBe(1); expect(climbStairs(2)).toBe(2); expect(climbStairs(5)).toBe(8); });
test("ten steps", () => { expect(climbStairs(10)).toBe(89); });`,
  hidden: `test("n = 45", () => { expect(climbStairs(45)).toBe(836311896); });
test("n = 5,000 (needs memoization or a loop)", () => {
  let a = 1, b = 2; for (let i = 3; i <= 5000; i++) { const c = (a + b) % 1000000007; a = b; b = c; }
  expect(climbStairs(5000)).toBe(b);
});
test("n = 0 has exactly one way: do nothing", () => { expect(climbStairs(0)).toBe(1); });`,
};

export const CC = {
  starter: `// coinChange(coins, amount): the FEWEST coins that add up to amount, or -1 if impossible. Coins can be reused.
// coinChange([1, 3, 4], 6) → 2 (3+3). A greedy "take the biggest coin" answer gives 3 (4+1+1): wrong!
// This tries every combination: exponential. Build a table: best[a] = fewest coins for amount a.
function coinChange(coins, amount) {
  if (amount === 0) return 0;
  let best = Infinity;
  for (const c of coins) {
    if (c <= amount) { const r = coinChange(coins, amount - c); if (r >= 0 && r + 1 < best) best = r + 1; }
  }
  return best === Infinity ? -1 : best;
}
`,
  visible: `test("simple", () => { expect(coinChange([1, 2, 5], 11)).toBe(3); });
test("impossible", () => { expect(coinChange([2], 3)).toBe(-1); });`,
  hidden: `test("zero amount needs zero coins", () => { expect(coinChange([1, 2], 0)).toBe(0); });
test("greedy fails here: 3+3, not 4+1+1", () => { expect(coinChange([1, 3, 4], 6)).toBe(2); expect(coinChange([9, 6, 5, 1], 11)).toBe(2); });
test("a single coin that divides the amount", () => { expect(coinChange([7], 49)).toBe(7); expect(coinChange([7], 50)).toBe(-1); });
test("no coins", () => { expect(coinChange([], 5)).toBe(-1); });
test("a large amount (100,000) must be fast", () => { expect(coinChange([1, 5, 10, 25, 50], 100000)).toBe(2000); expect(coinChange([186, 419, 83, 408], 6249)).toBe(20); });`,
};

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const challenge = (right, api, tasks, msg, xp) => mountTestChallenge(right.querySelector('#lab'), { tasks, onPass: finish(right, api, msg, xp) });
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l21',
  title: 'Lesson 21 · Recursion, sorting & DP',
  spreads: [
    // ───────────────────────── Spread 1: recursion (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Problem solving · recursion</p>
        <h1>Thinking recursively</h1>
        <p><b>Recursion</b> solves a problem by solving a <b>smaller copy of the same problem</b>. You met the call stack in lesson 2; here you use it as a tool. A recursive function has exactly two parts:</p>
        <ol>
          <li><b>Base case:</b> the smallest problem, answered directly (an empty list, n = 0). Without it, the function never stops and the stack overflows.</li>
          <li><b>Recursive case:</b> reduce the problem, call yourself on the smaller piece, and combine the result.</li>
        </ol>
        <h2>How to design one without getting lost</h2>
        <ul>
          <li><b>Trust the function.</b> Assume <code>f(smaller)</code> already works, then ask only: how do I turn its answer into mine?</li>
          <li><b>Make sure each call gets strictly closer to the base case.</b> That is your proof it terminates.</li>
          <li><b>Draw the call tree</b> for a tiny input. Count how many calls there are: that is the complexity.</li>
        </ul>
        <h2>When recursion is the right tool</h2>
        <ul>
          <li><b>Nested or tree-shaped data:</b> folders, JSON, HTML, the DOM, expressions (lesson 22).</li>
          <li><b>Exploring choices (backtracking):</b> permutations, subsets, solving a maze, sudoku.</li>
          <li><b>Divide and conquer:</b> merge sort, binary search.</li>
        </ul>
        <div class="warn">Each call uses stack memory. JavaScript allows roughly 10,000 nested calls, so recursing over a million-item list crashes. For deep linear problems, use a loop (or an explicit stack from lesson 20).</div>
        <div class="senior">The two exercises show two flavors: <b>flatten</b> recurses on <i>structure</i> (depth), <b>permutations</b> recurses on <i>choices</i> (breadth). In permutations, "choose, explore, un-choose" is the shape of all backtracking.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · recursion</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'flatten: any depth, no flat()', visible: FL.visible, hidden: FL.hidden, starter: FL.starter, rows: 10 },
          { kind: 'implement', question: 'permutations: every ordering, once', visible: PM.visible, hidden: PM.hidden, starter: PM.starter, rows: 7 },
        ], 'recursion mastered', 900);
      },
    },

    // ───────────────────────── Spread 2: sort race ─────────────────────────
    {
      left: `
        <p class="kicker">Problem solving · sorting</p>
        <h1>Why there are so many sorting algorithms</h1>
        <p>Sorting is the most studied problem in computing because <b>sorted data makes everything else cheaper</b>: binary search, finding duplicates, merging, grouping. In practice you call the built-in <code>sort</code>. You study the algorithms to learn the <i>ideas</i>, and to know what the built-in promises.</p>
        <h2>The families</h2>
        <ul>
          <li><b>Simple, O(n²):</b> bubble, selection, insertion. Fine for tiny arrays; insertion sort is excellent on nearly-sorted data (O(n) best case), so real sorts use it for small pieces.</li>
          <li><b>Divide and conquer, O(n log n):</b>
            <ul>
              <li><b>Merge sort:</b> split in half, sort each, merge. Always n log n, <b>stable</b>, needs extra memory.</li>
              <li><b>Quicksort:</b> pick a pivot, partition smaller/larger, recurse. Fastest on average and in place, but a bad pivot choice gives O(n²).</li>
            </ul>
          </li>
          <li><b>Hybrid in real life:</b> JavaScript, Python and Java use <b>Timsort</b> (merge + insertion, exploiting existing order); C++ uses <b>introsort</b> (quicksort that falls back to heapsort).</li>
        </ul>
        <h2>The properties that matter</h2>
        <ul>
          <li><b>Stable:</b> equal items keep their original order. Essential when you sort by one column after another (sort by name, then by team).</li>
          <li><b>In place:</b> uses O(1) extra memory.</li>
          <li><b>Lower bound:</b> any comparison sort needs Ω(n log n) comparisons. Faster results (counting or radix sort) work only by not comparing, using knowledge of the keys.</li>
        </ul>
        <div class="senior">Experiment on the right: run "already sorted" and watch the naive quicksort explode while insertion sort sleeps. <b>Input shape matters.</b> Always ask what real data looks like: it is rarely random.</div>
        ${back}`,
      right: `<p class="kicker">Lab · sorting race</p><div id="lab"></div><div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountSortRace(right.querySelector('#lab')); },
    },

    // ───────────────────────── Spread 3: merge sort (gated) ─────────────────────────
    {
      left: `
        <p class="kicker">Problem solving · divide and conquer</p>
        <h1>Write merge sort</h1>
        <p>Merge sort is the cleanest example of <b>divide and conquer</b>: split the problem, solve the halves recursively, combine. Its cost comes out neatly:</p>
        <ul>
          <li>Splitting in half repeatedly gives <b>log₂ n levels</b>.</li>
          <li>Merging the pieces at any level touches all <b>n</b> items once.</li>
          <li>Total: <b>n × log n</b>.</li>
        </ul>
        <h2>The merge step is where the care goes</h2>
        <ol>
          <li>Keep one pointer into each sorted half.</li>
          <li>Repeatedly take the smaller front item. <b>On a tie take the LEFT one: that is what makes it stable.</b></li>
          <li>When one half runs out, copy the rest of the other.</li>
        </ol>
        <div class="warn">The hidden tests check stability, that the input is not changed, that you did not call <code>.sort()</code>, and that 200,000 items finish quickly. Bugs usually hide in the tie case and in slicing off-by-ones.</div>
        <div class="senior">Divide and conquer reappears everywhere: binary search, quicksort, Karatsuba multiplication, and <b>MapReduce</b> (split data across machines, process, merge). Learning to see "split, solve, combine" is a transferable problem-solving skill.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · mergeSort</p><div id="lab"></div>${foot('pass every test to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [{ kind: 'implement', question: 'Replace bubble sort with a stable merge sort', visible: MS.visible, hidden: MS.hidden, starter: MS.starter, rows: 10 }], 'merge sort done', 1000);
      },
    },

    // ───────────────────────── Spread 4: dynamic programming (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Problem solving · dynamic programming</p>
        <h1>Dynamic programming: never solve the same thing twice</h1>
        <p>Look at the starter for <code>climbStairs</code>: <code>f(5)</code> calls <code>f(4)</code> and <code>f(3)</code>; <code>f(4)</code> calls <code>f(3)</code> again. The same sub-problems are solved over and over, which is why it is O(2ⁿ). <b>Dynamic programming (DP)</b> fixes this by <b>remembering answers</b>.</p>
        <h2>When DP applies</h2>
        <ul>
          <li><b>Overlapping sub-problems:</b> the recursion revisits the same inputs.</li>
          <li><b>Optimal substructure:</b> the best answer is built from best answers to smaller pieces.</li>
        </ul>
        <h2>Two ways to do it</h2>
        <ul>
          <li><b>Top-down (memoization):</b> keep the recursion, add a cache (a hash map from input to answer). Easiest to write.</li>
          <li><b>Bottom-up (tabulation):</b> fill a table from the smallest sub-problem upward with loops. No recursion limit, and often space can shrink to a couple of variables.</li>
        </ul>
        <h2>The recipe</h2>
        <ol>
          <li>Define the <b>state</b>: what do you need to know to describe a sub-problem? (<code>amount</code>)</li>
          <li>Write the <b>transition</b>: how does a state's answer come from smaller states? (<code>best[a] = 1 + min(best[a − coin])</code>)</li>
          <li>Set the <b>base case</b> (<code>best[0] = 0</code>), choose an <b>order</b>, return the target state.</li>
        </ol>
        <div class="warn">Coin change shows why greedy fails: with coins 1, 3, 4 and amount 6, "take the biggest" gives 4+1+1 (3 coins) but 3+3 is 2. DP checks every option cheaply. Greedy is only valid when you can <i>prove</i> it is.</div>
        <div class="senior">DP is the technique people fear most and need least often, but the habit behind it is everyday: <b>cache expensive results</b> (memoization is the LRU cache from lesson 20 applied to a function). Recognize repeated work, then store it.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · two DP problems</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'climbStairs: exponential → linear', visible: CS.visible, hidden: CS.hidden, starter: CS.starter, rows: 7 },
          { kind: 'implement', question: 'coinChange: bottom-up table', visible: CC.visible, hidden: CC.hidden, starter: CC.starter, rows: 12 },
        ], 'DP done', 1200);
      },
    },

    // ───────────────────────── Spread 5: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Four design calls</h1>
        <p>Next: trees and graphs, where recursion, stacks, queues and heaps combine into the tools behind file systems, maps and social networks.</p>
        ${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>A recursive function works on small inputs but crashes with "Maximum call stack size exceeded" on a list of one million items. What is the right move?</p>',
            options: ['Increase the memory', 'Convert to a loop (or an explicit stack): each recursive call uses stack space, and the depth is too large', 'Add more base cases', 'Switch to a faster computer'], answer: 1,
            why: 'Depth is proportional to the input. Iteration, or managing your own stack on the heap, removes the limit.' },
          { prompt: '<p>You must sort a table by "team", then by "name" within teams, using two sorts one after the other. What property do you need?</p>',
            options: ['In place', 'Stable: the second sort must not scramble the order the first one established', 'Recursive', 'O(n²)'], answer: 1,
            why: 'Stability lets you sort by the secondary key first, then the primary key, and keep ties in the earlier order.' },
          { prompt: '<p>A recursive function is slow, and its call tree shows <code>f(10)</code> being computed hundreds of times. The fix?</p>',
            options: ['Memoize: cache the result of each input so it is computed once', 'Call it fewer times by hand', 'Use a bigger integer type', 'Sort the input'], answer: 0,
            why: 'Overlapping sub-problems are the signature of DP: remember answers instead of recomputing them.' },
          { prompt: '<p>"Greedy" takes the best-looking choice at each step. Why can it be wrong for coin change with coins [1, 3, 4]?</p>',
            options: ['It is always wrong', 'A locally best choice (the biggest coin) can lead to a worse overall result; some problems need all options considered', 'It is too slow', 'Coins cannot repeat'], answer: 1,
            why: 'Greedy is valid only when the problem has a provable greedy-choice property. Otherwise use DP or search.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(600); });
      },
    },
  ],
};
