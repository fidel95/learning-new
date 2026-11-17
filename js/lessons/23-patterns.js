// Lesson 23 — Problem-solving patterns: sliding window, prefix sums, intervals, monotonic stack, grouping.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountPatternMatch } from '../patternlab.js';

export const LU = {
  starter: `// lengthOfLongestUnique(s): the length of the longest substring with no repeated character. ("abcabcbb" → 3)
// This version restarts from every position and scans forward: O(n²) on long inputs.
// Sliding window: keep a window [left, right]; move right forward; when s[right] repeats inside the window, move left past the old copy.
function lengthOfLongestUnique(s) {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const seen = new Set();
    for (let j = i; j < s.length; j++) {
      if (seen.has(s[j])) break;
      seen.add(s[j]);
      best = Math.max(best, j - i + 1);
    }
  }
  return best;
}
`,
  visible: `test("classic", () => { expect(lengthOfLongestUnique("abcabcbb")).toBe(3); });
test("all the same", () => { expect(lengthOfLongestUnique("bbbb")).toBe(1); });`,
  hidden: `test("empty string", () => { expect(lengthOfLongestUnique("")).toBe(0); });
test("pwwkew", () => { expect(lengthOfLongestUnique("pwwkew")).toBe(3); });
test("a repeat from BEFORE the window must not move left backwards", () => { expect(lengthOfLongestUnique("abba")).toBe(2); expect(lengthOfLongestUnique("tmmzuxt")).toBe(5); });
test("60,000 distinct characters (must be O(n))", () => {
  let s = ""; for (let i = 0; i < 60000; i++) s += String.fromCharCode(0x4e00 + i);
  expect(lengthOfLongestUnique(s)).toBe(60000);
});`,
};

export const MK = {
  starter: `// maxSumK(nums, k): the largest sum of any k CONSECUTIVE numbers. Return null if k <= 0 or k > nums.length.
// This version re-adds k numbers for every window: O(n·k). A sliding window adds the new element and subtracts the one that left.
function maxSumK(nums, k) {
  if (k <= 0 || k > nums.length) return null;
  let best = -Infinity;
  for (let i = 0; i + k <= nums.length; i++) {
    let sum = 0;
    for (let j = i; j < i + k; j++) sum += nums[j];
    best = Math.max(best, sum);
  }
  return best;
}
`,
  visible: `test("basic", () => { expect(maxSumK([1, 4, 2, 10, 2, 3, 1, 0, 20], 4)).toBe(24); });
test("k larger than the array", () => { expect(maxSumK([1, 2], 3)).toBeNull(); });`,
  hidden: `test("all negatives still returns the best (least negative) window", () => { expect(maxSumK([-5, -2, -9, -1], 2)).toBe(-7); });
test("k equals length and k of one", () => { expect(maxSumK([3, 4, 5], 3)).toBe(12); expect(maxSumK([3, 9, 5], 1)).toBe(9); });
test("zero or negative k", () => { expect(maxSumK([1, 2, 3], 0)).toBeNull(); expect(maxSumK([1, 2, 3], -1)).toBeNull(); expect(maxSumK([], 1)).toBeNull(); });
test("200,000 numbers with k = 100,000 (must be O(n))", () => {
  const a = []; for (let i = 0; i < 200000; i++) a.push(i % 7);
  let s = 0; for (let i = 0; i < 100000; i++) s += a[i]; let best = s;
  for (let i = 100000; i < 200000; i++) { s += a[i] - a[i - 100000]; if (s > best) best = s; }
  expect(maxSumK(a, 100000)).toBe(best);
});`,
};

export const RS = {
  starter: `// rangeSums(nums, queries): each query is [l, r] (inclusive, 0-based). Return the array of sums nums[l] + ... + nums[r].
// This version adds up the range for every query: O(n) per query. Precompute PREFIX SUMS once: prefix[i] = sum of the first i items,
// so any range sum is prefix[r + 1] - prefix[l].
function rangeSums(nums, queries) {
  return queries.map(([l, r]) => { let s = 0; for (let i = l; i <= r; i++) s += nums[i]; return s; });
}
`,
  visible: `test("basic", () => { expect(rangeSums([1, 2, 3, 4, 5], [[0, 2], [1, 3]])).toEqual([6, 9]); });
test("single element", () => { expect(rangeSums([7, 8], [[1, 1]])).toEqual([8]); });`,
  hidden: `test("whole array and no queries", () => { expect(rangeSums([1, 2, 3], [[0, 2]])).toEqual([6]); expect(rangeSums([1, 2, 3], [])).toEqual([]); });
test("negative numbers", () => { expect(rangeSums([-1, 5, -3, 2], [[0, 3], [2, 2], [1, 2]])).toEqual([3, -3, 2]); });
test("does not modify the input", () => { const a = [1, 2, 3]; rangeSums(a, [[0, 2]]); expect(a).toEqual([1, 2, 3]); });
test("200,000 numbers and 200,000 queries (must be O(n + q))", () => {
  const n = 200000, a = []; for (let i = 0; i < n; i++) a.push((i * 37) % 101 - 50);
  const pre = [0]; for (let i = 0; i < n; i++) pre.push(pre[i] + a[i]);
  const qs = []; let s = 5; for (let i = 0; i < 200000; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const l = s % n; s = (s * 1103515245 + 12345) & 0x7fffffff; const r = l + (s % (n - l)); qs.push([l, r]); }
  const got = rangeSums(a, qs); let bad = 0; for (let i = 0; i < qs.length; i++) if (got[i] !== pre[qs[i][1] + 1] - pre[qs[i][0]]) bad++;
  expect(bad).toBe(0);
});`,
};

export const MI = {
  starter: `// mergeIntervals(intervals): intervals are [start, end]. Merge every overlapping or touching pair ([1,2] and [2,3] touch) and return
// the merged intervals sorted by start. Do not modify the input. This version returns them unchanged.
// Pattern: SORT by start, then SWEEP once, extending the last merged interval while the next one starts at or before its end.
function mergeIntervals(intervals) {
  return intervals;
}
`,
  visible: `test("overlapping", () => { expect(mergeIntervals([[1, 3], [2, 6], [8, 10]])).toEqual([[1, 6], [8, 10]]); });
test("touching ends merge", () => { expect(mergeIntervals([[1, 2], [2, 3]])).toEqual([[1, 3]]); });`,
  hidden: `test("empty", () => { expect(mergeIntervals([])).toEqual([]); });
test("unsorted input", () => { expect(mergeIntervals([[8, 10], [1, 3], [2, 6]])).toEqual([[1, 6], [8, 10]]); });
test("one interval swallows the rest", () => { expect(mergeIntervals([[1, 10], [2, 3], [4, 5], [6, 7]])).toEqual([[1, 10]]); });
test("a chain of overlaps", () => { expect(mergeIntervals([[1, 4], [4, 5], [5, 9], [10, 11]])).toEqual([[1, 9], [10, 11]]); });
test("does not modify the input or its pairs", () => { const a = [[3, 4], [1, 2], [2, 3]]; const copy = JSON.stringify(a); mergeIntervals(a); expect(JSON.stringify(a)).toBe(copy); });
test("200,000 intervals (must be O(n log n))", () => {
  const a = []; for (let i = 0; i < 200000; i++) a.push([i * 3, i * 3 + 2]);
  expect(mergeIntervals(a).length).toBe(200000);
  const b = []; for (let i = 0; i < 200000; i++) b.push([i, i + 2]);
  expect(mergeIntervals(b)).toEqual([[0, 200001]]);
});`,
};

export const DT = {
  starter: `// dailyTemperatures(temps): for each day, how many days until a STRICTLY warmer temperature? 0 if there never is one.
// [73,74,75,71,69,72,76,73] → [1,1,4,2,1,1,0,0]
// This version scans ahead from every day: O(n²). Use a MONOTONIC STACK of days still waiting for a warmer one.
function dailyTemperatures(temps) {
  const out = new Array(temps.length).fill(0);
  for (let i = 0; i < temps.length; i++)
    for (let j = i + 1; j < temps.length; j++)
      if (temps[j] > temps[i]) { out[i] = j - i; break; }
  return out;
}
`,
  visible: `test("example", () => { expect(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73])).toEqual([1, 1, 4, 2, 1, 1, 0, 0]); });`,
  hidden: `test("empty and single", () => { expect(dailyTemperatures([])).toEqual([]); expect(dailyTemperatures([50])).toEqual([0]); });
test("equal temperatures are not warmer", () => { expect(dailyTemperatures([70, 70, 71])).toEqual([2, 1, 0]); });
test("strictly increasing and decreasing", () => { expect(dailyTemperatures([1, 2, 3, 4])).toEqual([1, 1, 1, 0]); expect(dailyTemperatures([4, 3, 2, 1])).toEqual([0, 0, 0, 0]); });
test("200,000 decreasing days (the worst case for scanning ahead)", () => {
  const t = []; for (let i = 0; i < 200000; i++) t.push(300000 - i);
  const r = dailyTemperatures(t); let nz = 0; for (const x of r) if (x) nz++; expect(nz).toBe(0);
});
test("200,000 sawtooth days", () => {
  const t = []; for (let i = 0; i < 200000; i++) t.push(i % 1000);
  const r = dailyTemperatures(t); expect(r[0]).toBe(1); expect(r[999]).toBe(0);
});`,
};

export const GA = {
  starter: `// groupAnagrams(words): group words that are anagrams of each other ("eat","tea","ate" go together). Return an array of groups.
// Any order is fine. This version compares each word to every existing group: O(n²).
// Key idea: two words are anagrams exactly when their sorted letters are equal. Use that as a hash-map KEY.
function groupAnagrams(words) {
  const groups = [];
  for (const w of words) {
    const key = w.split("").sort().join("");
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(w); else groups.push({ key, items: [w] });
  }
  return groups.map((g) => g.items);
}
`,
  visible: `const norm = (g) => g.map((x) => x.slice().sort()).sort((a, b) => a.join().localeCompare(b.join()));
test("groups anagrams", () => { expect(norm(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))).toEqual([["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]); });`,
  hidden: `const norm = (g) => g.map((x) => x.slice().sort()).sort((a, b) => a.join().localeCompare(b.join()));
test("empty list and empty strings", () => { expect(groupAnagrams([])).toEqual([]); expect(norm(groupAnagrams(["", ""]))).toEqual([["", ""]]); });
test("duplicates stay in the group", () => { expect(norm(groupAnagrams(["a", "a", "b"]))).toEqual([["a", "a"], ["b"]]); });
test("case matters", () => { expect(groupAnagrams(["Ab", "ab"]).length).toBe(2); });
test("100,000 words (must be about O(n·k log k))", () => {
  const words = []; let s = 2463534242;
  for (let i = 0; i < 100000; i++) { let w = ""; for (let k = 0; k < 8; k++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; w += String.fromCharCode(97 + (s % 26)); } words.push(w); }
  const keys = new Set(words.map((w) => w.split("").sort().join("")));
  const g = groupAnagrams(words); expect(g.length).toBe(keys.size); expect(g.reduce((a, x) => a + x.length, 0)).toBe(100000);
});`,
};

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const challenge = (right, api, tasks, msg, xp) => mountTestChallenge(right.querySelector('#lab'), { tasks, onPass: finish(right, api, msg, xp) });
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l23',
  title: 'Lesson 23 · Problem-solving patterns',
  spreads: [
    // ───────────────────────── Spread 1: method + pattern matching (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Patterns · how experts solve</p>
        <h1>Do not invent: recognize</h1>
        <p>Beginners stare at a new problem and hope for inspiration. Experienced engineers run a <b>procedure</b>, and they have a toolbox of about a dozen <b>patterns</b> that cover most problems. You have met most of the pieces; this lesson turns them into a workflow.</p>
        <h2>The procedure (use it every time)</h2>
        <ol>
          <li><b>Clarify.</b> Restate the problem. Inputs, outputs, sizes, duplicates, empty input, negative numbers? Ask before you code.</li>
          <li><b>Examples.</b> Work two small cases by hand, plus one edge case. If you cannot do it by hand, you cannot code it.</li>
          <li><b>Brute force first.</b> Say the simple, slow answer and its complexity. It is your correctness oracle and your fallback.</li>
          <li><b>Find the waste.</b> Where does brute force recompute or rescan? That repeated work names the pattern.</li>
          <li><b>Optimize,</b> then <b>code</b> in small named steps.</li>
          <li><b>Test</b> against your examples and the brute force; try empty, one item, all equal, huge.</li>
        </ol>
        <h2>The toolbox</h2>
        <ul>
          <li><b>Hash map / set:</b> "have I seen it?", counting, grouping, complements.</li>
          <li><b>Two pointers:</b> sorted data or ends moving inward.</li>
          <li><b>Sliding window:</b> a contiguous range that grows and shrinks.</li>
          <li><b>Prefix sums:</b> many range queries.</li>
          <li><b>Binary search:</b> a monotone yes/no over a sorted or ordered range (also "search the answer").</li>
          <li><b>BFS / DFS:</b> graphs, grids, states. <b>DP:</b> overlapping sub-problems.</li>
          <li><b>Sort + sweep:</b> intervals, closest pairs. <b>Monotonic stack:</b> "next greater". <b>Heap:</b> top-K, schedulers.</li>
        </ul>
        <div class="senior">Brute force first is not a weakness; it is how you avoid being confidently wrong. Many of the best engineers keep a slow, obviously correct version in the tests to check the clever one against (property-based testing, lesson 11).</div>
        ${back}`,
      right: `<p class="kicker">Lab · name the pattern</p><div id="lab"></div>${foot('get 8 of 9 to turn the page')}`,
      init(left, right, api) {
        mountPatternMatch(right.querySelector('#lab'), { onPass: finish(right, api, 'patterns recognized', 700) });
      },
    },

    // ───────────────────────── Spread 2: sliding window (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Patterns · two pointers and sliding window</p>
        <h1>Sliding window: reuse the last answer</h1>
        <p>Many "best contiguous range" problems waste time recomputing the overlap between neighboring ranges. A window shifted by one position shares all but two elements with the previous one. So <b>update</b> instead of recompute.</p>
        <h2>Two flavors</h2>
        <ul>
          <li><b>Fixed-size window</b> (<code>maxSumK</code>): add the element entering on the right, subtract the one leaving on the left. O(n) instead of O(n·k).</li>
          <li><b>Variable-size window</b> (longest unique substring): extend the right edge; when the window becomes invalid, <b>shrink from the left</b> until it is valid again. Each index enters and leaves at most once, so it is O(n) even though there are two loops.</li>
        </ul>
        <h2>The details that trip people</h2>
        <ul>
          <li>Track what the window <b>contains</b> (a set or a map of counts, or last-seen positions).</li>
          <li>For "longest unique", remember each character's <b>last index</b>; when you see it again, move <code>left</code> to <code>max(left, last + 1)</code>. The <code>max</code> is the trap: in "abba", the first <code>a</code> is already outside the window.</li>
          <li>Update the best answer at the <b>right moment</b> (after the window is valid).</li>
        </ul>
        <div class="senior">Two pointers is the cousin: when data is sorted, one pointer at each end can decide, from a comparison, which end to move: pairs summing to a target, palindrome checks, partitioning. Each step discards candidates for certain: <b>that argument is the pattern</b>.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · windows</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'lengthOfLongestUnique: variable window', visible: LU.visible, hidden: LU.hidden, starter: LU.starter, rows: 12 },
          { kind: 'implement', question: 'maxSumK: fixed window', visible: MK.visible, hidden: MK.hidden, starter: MK.starter, rows: 11 },
        ], 'windows slid', 1000);
      },
    },

    // ───────────────────────── Spread 3: prefix sums, intervals (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Patterns · precompute and sweep</p>
        <h1>Prefix sums and interval sweeps</h1>
        <p>Two ideas that cost one cheap preparation step and then make everything else nearly free.</p>
        <h2>Prefix sums</h2>
        <p>Build <code>prefix[i]</code> = sum of the first i items once, in O(n). Then the sum of any range is <code>prefix[r+1] − prefix[l]</code>: O(1) per query. It is the same trade as an index: pay up front for fast reads. It generalizes to 2D (image regions), to counts per category, and to "number of subarrays with sum k" (combine with a hash map).</p>
        <h2>Interval problems: sort, then sweep</h2>
        <ul>
          <li>Meeting rooms, calendar merging, "do these bookings conflict?", "how many rooms are needed?"</li>
          <li><b>Sort by start.</b> Once sorted, overlaps can only involve <i>neighbors</i>, so a single pass suffices: either the next interval starts at or before the current end (merge: extend the end with <code>max</code>) or it does not (close the current one and start a new one).</li>
          <li>Total cost is dominated by the sort: O(n log n).</li>
        </ul>
        <div class="warn">Boundary decisions matter and must be stated: do <code>[1,2]</code> and <code>[2,3]</code> overlap? Here they merge. Ask, because bookings usually say no and ranges often say yes. Also: never mutate the caller's data when copying is cheap.</div>
        <div class="senior">"Preprocess, then answer many queries cheaply" is the heart of database indexing, caching, search engines, and CDNs. Whenever you see <i>many queries over static data</i>, ask what you can compute once.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · prefix sums, intervals</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'rangeSums with prefix sums', visible: RS.visible, hidden: RS.hidden, starter: RS.starter, rows: 8 },
          { kind: 'implement', question: 'mergeIntervals: sort, then sweep', visible: MI.visible, hidden: MI.hidden, starter: MI.starter, rows: 8 },
        ], 'precomputed', 1000);
      },
    },

    // ───────────────────────── Spread 4: monotonic stack, hashing keys (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Patterns · two classics</p>
        <h1>Monotonic stack and canonical keys</h1>
        <h2>Monotonic stack: "next greater element"</h2>
        <p>For each day, find the next warmer day. Scanning ahead from every day is O(n²). Instead, walk once and keep a <b>stack of days still waiting</b> for a warmer one, whose temperatures are non-increasing from bottom to top. When today is warmer than the day on top, that day is resolved: pop it and record <code>today − thatDay</code>. Repeat while it keeps being warmer; then push today.</p>
        <ul>
          <li>Each day is pushed once and popped once: <b>O(n)</b>.</li>
          <li>Same pattern: next greater/smaller element, stock span, largest rectangle in a histogram, matching brackets (lesson 20).</li>
          <li>Store <b>indexes</b>, not values, on the stack so you can compute distances.</li>
        </ul>
        <h2>Canonical keys: group by a fingerprint</h2>
        <p>To group things that are "the same up to rearrangement", compute a <b>canonical form</b> that is identical for all of them and use it as a hash-map key. Anagrams share their sorted letters. The same trick groups files by content hash, URLs by normalized form, and duplicate records by a cleaned key.</p>
        <ul>
          <li>Pick a key that is equal for equivalent items and different for non-equivalent ones. Get this right and the rest is a one-pass map.</li>
          <li>Cost: n words × the cost to compute the key (sorting a word of length k is k log k).</li>
        </ul>
        <div class="senior">Both challenges are "replace a nested scan by remembering something". That one sentence is the best summary of algorithm design: find what you repeatedly search for, and arrange to have it ready.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · stack, keys</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        challenge(right, api, [
          { kind: 'implement', question: 'dailyTemperatures with a monotonic stack', visible: DT.visible, hidden: DT.hidden, starter: DT.starter, rows: 9 },
          { kind: 'implement', question: 'groupAnagrams with a canonical key', visible: GA.visible, hidden: GA.hidden, starter: GA.starter, rows: 12 },
        ], 'patterns applied', 1200);
      },
    },

    // ───────────────────────── Spread 5: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself · end of Part 4</p>
        <h1>Four judgment calls</h1>
        <p>That completes Part 4. You can measure growth, choose and build the core structures, recurse, sort, memoize, search graphs, and map unfamiliar problems to patterns. Part 5 moves to how real systems behave: <b>concurrency</b>, <b>databases in depth</b>, and <b>distributed systems</b>.</p>
        ${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>You are handed an unfamiliar problem. What is the best first move?</p>',
            options: ['Start coding the cleverest version you can think of', 'Clarify, work small examples, and write the brute-force solution so you have a correct baseline', 'Search for the exact answer online and paste it', 'Wait for inspiration'], answer: 1,
            why: 'A correct slow answer is a baseline and a test oracle; the waste in it points to the pattern.' },
          { prompt: '<p>You build <code>prefix[]</code> once and then answer a million range-sum queries. What is the total cost?</p>',
            options: ['O(n × q)', 'O(n + q): one pass to build, then one subtraction per query', 'O(q²)', 'O(2ⁿ)'], answer: 1,
            why: 'Preprocessing is paid once; each query is constant.' },
          { prompt: '<p>In a sliding window over "abba", why must you use <code>left = max(left, last[ch] + 1)</code> instead of just <code>last[ch] + 1</code>?</p>',
            options: ['Style only', 'A character\'s last position may be OUTSIDE the current window; moving left backwards would wrongly re-include old characters', 'Strings are immutable', 'To save memory'], answer: 1,
            why: 'The window only ever moves forward. A stale position must not drag the left edge back.' },
          { prompt: '<p>A function that nests two loops over the same list passes tests with 100 items and times out in production. Which question comes first?</p>',
            options: ['Which language is this?', 'What is repeated or re-scanned, and what can be remembered (a map, prefix sums, a stack) so each element is handled once?', 'Can we add more servers?', 'Can we cache the HTML?'], answer: 1,
            why: 'Hunting the repeated work is the whole method; the pattern follows from what you can remember.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'Part 4 complete'; api.unlock(800); });
      },
    },
  ],
};
