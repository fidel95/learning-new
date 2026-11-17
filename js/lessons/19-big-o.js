// Lesson 19 — Big-O: how work grows with input size.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountDetective, mountCalculator } from '../biglab.js';

export const T1 = {
  starter: `// Does the array contain any value twice?
// This version compares every pair. Fine for 10 items, a disaster for 200,000.
function hasDuplicate(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) return true;
    }
  }
  return false;
}
`,
  visible: `test("finds a duplicate", () => { expect(hasDuplicate([1, 2, 3, 2])).toBe(true); });
test("no duplicate", () => { expect(hasDuplicate([1, 2, 3])).toBe(false); });`,
  hidden: `test("empty and single arrays", () => { expect(hasDuplicate([])).toBe(false); expect(hasDuplicate([7])).toBe(false); });
test("works on strings too", () => { expect(hasDuplicate(["a", "b", "a"])).toBe(true); expect(hasDuplicate(["a", "b"])).toBe(false); });
test("200,000 distinct numbers (must be fast: roughly O(n))", () => {
  const a = []; for (let i = 0; i < 200000; i++) a.push(i * 3);
  expect(hasDuplicate(a)).toBe(false);
});
test("200,000 numbers with a duplicate at the very end", () => {
  const a = []; for (let i = 0; i < 200000; i++) a.push(i); a.push(5);
  expect(hasDuplicate(a)).toBe(true);
});`,
};

export const T2 = {
  starter: `// Find two DIFFERENT positions whose values add up to target. Return [i, j] (i < j), or null.
// This version tries every pair: O(n²).
function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return null;
}
`,
  visible: `test("finds the pair", () => { const r = twoSum([2, 7, 11, 15], 9); expect(r).toEqual([0, 1]); });
test("returns null when there is none", () => { expect(twoSum([1, 2, 3], 100)).toBeNull(); });`,
  hidden: `test("the same element cannot be used twice", () => { expect(twoSum([3, 5], 6)).toBeNull(); });
test("equal values at different positions are fine", () => { expect(twoSum([3, 3], 6)).toEqual([0, 1]); });
test("negative numbers and zero", () => {
  const r = twoSum([-4, 0, 9, 4], 0); expect(r === null).toBe(false);
  expect([-4, 0, 9, 4][r[0]] + [-4, 0, 9, 4][r[1]]).toBe(0); expect(r[0] < r[1]).toBe(true);
});
test("200,000 numbers, the answer is at the end (must be roughly O(n))", () => {
  const a = []; for (let i = 0; i < 200000; i++) a.push(i * 2);
  a.push(1000001); a.push(1000003);
  const r = twoSum(a, 2000004);
  expect(r === null).toBe(false);
  expect(a[r[0]] + a[r[1]]).toBe(2000004); expect(r[0] < r[1]).toBe(true);
});
test("200,000 numbers, no answer", () => {
  const a = []; for (let i = 0; i < 200000; i++) a.push(i * 2);
  expect(twoSum(a, 1)).toBeNull();
});`,
};

export const T3 = {
  starter: `// sorted is in ascending order. Return the index of the FIRST element that is >= x
// (sorted.length if there is none). This scans from the left: O(n) per query.
function lowerBound(sorted, x) {
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= x) return i;
  }
  return sorted.length;
}
`,
  visible: `test("basic", () => { expect(lowerBound([1, 3, 5, 7], 5)).toBe(2); expect(lowerBound([1, 3, 5, 7], 4)).toBe(2); });
test("past the end", () => { expect(lowerBound([1, 3], 10)).toBe(2); });`,
  hidden: `test("empty array", () => { expect(lowerBound([], 3)).toBe(0); });
test("smaller than everything", () => { expect(lowerBound([5, 6, 7], 1)).toBe(0); });
test("duplicates: the FIRST one", () => { expect(lowerBound([1, 2, 2, 2, 3], 2)).toBe(1); expect(lowerBound([4, 4, 4, 4], 4)).toBe(0); });
test("one million items, two hundred thousand queries (must be O(log n) each)", () => {
  const a = new Array(1000000); for (let i = 0; i < a.length; i++) a[i] = i * 2;
  let bad = 0;
  for (let q = 0; q < 200000; q++) { const x = (q * 7) % 2000001; const want = Math.ceil(x / 2); if (lowerBound(a, x) !== want) bad++; }
  expect(bad).toBe(0);
});`,
};

export const lesson = {
  id: 'l19',
  title: 'Lesson 19 · Big-O & performance',
  spreads: [
    // ───────────────────────── Spread 1: detective (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Algorithms · Part 4 begins</p>
        <h1>How work grows: Big-O</h1>
        <p>"My code is fast" means nothing until you say <b>fast for how much data</b>. A function that takes a millisecond on 100 items can take a year on a million. <b>Big-O</b> describes how the number of steps <b>grows as the input size n grows</b>, ignoring the machine.</p>
        <h2>The six shapes you will meet</h2>
        <ul>
          <li><b>O(1) constant:</b> array index, hash lookup. Same cost at any size.</li>
          <li><b>O(log n):</b> halving each step: binary search. A billion items need about 30 steps.</li>
          <li><b>O(n) linear:</b> one pass: sum, search an unsorted list.</li>
          <li><b>O(n log n):</b> good sorting (merge sort, the sort inside your language).</li>
          <li><b>O(n²) quadratic:</b> a loop inside a loop over the same data. The most common real-world slowdown.</li>
          <li><b>O(2ⁿ) exponential:</b> trying every subset or a naive recursion. Dies around n = 40.</li>
        </ul>
        <h2>How to read code for complexity</h2>
        <ol>
          <li>Count how many times the <b>innermost work</b> runs as a function of n.</li>
          <li><b>Drop constants:</b> 2n and 100n are both O(n). Big-O is about <i>shape</i>, and shape is what dominates at scale.</li>
          <li><b>Keep only the biggest term:</b> n² + n is O(n²).</li>
          <li>Sequential loops <b>add</b>; nested loops <b>multiply</b>.</li>
        </ol>
        <p>On the right the steps were really counted. Identify each growth pattern by what happens when n is multiplied by ten.</p>
        <div class="senior">The professional habit: whenever you write a loop, ask "what is n here, and how big can it get in production?" Most performance bugs are an O(n²) hidden inside code that was tested with 20 rows. (Remember the N+1 query from lesson 8: the same disease.)</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Lab · complexity detective</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">classify all eight correctly</span></div>`,
      init(left, right, api) {
        mountDetective(right.querySelector('#lab'), { onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'growth rates read'; api.unlock(600); } });
      },
    },

    // ───────────────────────── Spread 2: make it fast (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Algorithms · making it fast</p>
        <h1>Trade memory and structure for speed</h1>
        <p>Three of the most valuable optimizations in all of programming are on the right. They share one idea: <b>pay a little extra memory or order up front, so each lookup is cheap</b>.</p>
        <h2>The three moves</h2>
        <ul>
          <li><b>Remember what you have seen (hash set / map).</b> "Have I seen this value?" is O(1) with a <code>Set</code>. Turns the nested loop of <code>hasDuplicate</code> into one pass: O(n²) → O(n).</li>
          <li><b>Look up the complement instead of searching for it (hash map).</b> For two-sum, for each value ask "have I already seen <code>target − value</code>?" and store each value's index as you go.</li>
          <li><b>Exploit sorted order (binary search).</b> Look at the middle; the answer is in one half; discard the other. Repeat. The classic is full of off-by-one bugs, so test the edges (empty, first, last, duplicates).</li>
        </ul>
        <h2>The trade-off</h2>
        <p>The fast versions use <b>O(n) extra memory</b> (the set or map). Complexity has two axes: <b>time</b> and <b>space</b>. Choosing between them is an engineering decision, not a rule.</p>
        <div class="warn">Each hidden test uses 200,000 or 1,000,000 elements. The slow starter will time out, which is the point: you will <i>feel</i> why Big-O matters. If a test times out, you still have a nested loop or a linear scan somewhere.</div>
        <div class="senior">Premature optimization is the root of much evil, but <b>choosing a sensible data structure is not premature</b>; it is design. Measure before micro-tuning, but never ship an O(n²) over data that grows.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Challenge · three speed-ups</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">pass all three to turn the page</span></div>`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), {
          tasks: [
            { kind: 'implement', question: 'hasDuplicate: O(n²) → O(n)', visible: T1.visible, hidden: T1.hidden, starter: T1.starter, rows: 11 },
            { kind: 'implement', question: 'twoSum: O(n²) → O(n)', visible: T2.visible, hidden: T2.hidden, starter: T2.starter, rows: 12 },
            { kind: 'implement', question: 'lowerBound: O(n) → O(log n) with binary search', visible: T3.visible, hidden: T3.hidden, starter: T3.starter, rows: 10 },
          ],
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'fast'; api.unlock(1200); },
        });
      },
    },

    // ───────────────────────── Spread 3: calculator ─────────────────────────
    {
      left: `
        <p class="kicker">Algorithms · intuition</p>
        <h1>Which complexity can you afford?</h1>
        <p>Engineers estimate before they build. The calculator on the right turns Big-O into <b>wall-clock time</b>. Play with it until the numbers feel real.</p>
        <h2>Things Big-O does not say</h2>
        <ul>
          <li><b>It is not exact time.</b> O(n) with a slow step can lose to O(n log n) with a fast one at small n. Big-O wins as n grows.</li>
          <li><b>Best, average and worst case differ.</b> Quicksort averages O(n log n) but can hit O(n²). Hash lookups are O(1) on average, O(n) if everything collides. Interviews and incident reports both care about the <i>worst</i> case.</li>
          <li><b>Amortized cost.</b> Appending to a dynamic array is occasionally expensive (it must resize) but averages O(1) per append over many appends.</li>
          <li><b>Space matters too.</b> A solution that needs 40 GB of memory is not "fast".</li>
          <li><b>Real systems hide constants:</b> disk and network are a million times slower than memory. An O(n) loop that makes a network call per item is a disaster.</li>
        </ul>
        <h2>Back-of-envelope rules</h2>
        <ul>
          <li>About 10⁸ to 10⁹ simple steps per second in a fast language.</li>
          <li>n up to ~10: anything works, even O(2ⁿ).</li>
          <li>n up to ~5,000: O(n²) is fine.</li>
          <li>n up to ~10⁶: you need O(n log n) or better.</li>
          <li>n of 10⁹ and up: O(n) is the limit, and you probably need to distribute or sample.</li>
        </ul>
        <div class="senior">When someone says "it is slow", ask three questions before touching code: <b>what is n, which operation grows with it, and what does a profiler say?</b> Guessing the bottleneck is wrong more often than right.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Calculator · can it run?</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountCalculator(right.querySelector('#lab')); },
    },

    // ───────────────────────── Spread 4: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Four estimation calls</h1>
        <p>Next lesson: the data structures themselves (arrays, linked lists, hash maps, stacks, queues, heaps) and why each has the costs it has.</p>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>A report page works with 200 rows in testing and takes minutes with 100,000 rows in production. The code has a loop over rows that calls <code>list.includes(x)</code> on a growing array inside. What is the likely cost and fix?</p>',
            options: ['O(n); buy a faster server', 'O(n²) hidden in includes(); use a Set for O(1) membership', 'O(log n); it is fine', 'O(1); the network is slow'], answer: 1,
            why: 'includes() scans the array, so a loop that calls it is a nested loop. A Set makes the membership test constant time.' },
          { prompt: '<p>Which is the best description of why we drop constants in Big-O (O(3n) = O(n))?</p>',
            options: ['Constants never matter in practice', 'Big-O describes growth shape as n becomes large; a constant factor cannot change which curve eventually wins', 'Computers ignore constants', 'It is a convention with no reason'], answer: 1,
            why: 'Constants matter for tuning at a fixed size, but over growth, an n² curve always overtakes any 100n line. Big-O answers the scaling question.' },
          { prompt: '<p>n = 5 million records. Which approach is realistic in about a second?</p>',
            options: ['O(n²) comparing every pair', 'O(2ⁿ) brute force', 'O(n log n) sort, then a linear scan', 'None, it is impossible'], answer: 2,
            why: 'n log n is about 10⁸ steps. n² is about 2.5×10¹³, which is hours. Sorting first is a classic way to avoid the nested loop.' },
          { prompt: '<p>What is the main price of the Set-based <code>hasDuplicate</code> compared with the nested loop?</p>',
            options: ['It is slower', 'It uses O(n) extra memory', 'It cannot handle strings', 'It changes the array'], answer: 1,
            why: 'You traded space for time. Knowing which resource you can spend is the heart of design.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(500); });
      },
    },
  ],
};
