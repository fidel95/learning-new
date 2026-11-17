// Lesson 3 — Decisions, loops and arrays.
import { mountWorkbench, mountQuiz } from '../workbench.js';

export const lesson = {
  id: 'l3',
  title: 'Lesson 3 · Decisions, loops & arrays',
  spreads: [
    // ───────────────────────── Spread 1: decisions ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 3 · Control flow</p>
        <h1>Decisions: if, else, and logic</h1>
        <p>Until now your programs ran top to bottom, every line, every time. Real programs
        <b>choose</b>. Choosing needs a question with a yes/no answer: a <b>boolean</b> expression.</p>
        <h2>Comparisons produce booleans</h2>
        <pre><code>5 &gt; 3        // true
5 &lt;= 3       // false
5 === 5      // true   (exactly equal)
5 !== 6      // true   (not equal)
5 === "5"    // false  (number vs text)</code></pre>
        <p>Always use <code>===</code>, never <code>==</code>. The short <code>==</code> quietly converts types
        before comparing (<code>0 == "0"</code> is <code>true</code>), which hides bugs.</p>
        <h2>if / else if / else</h2>
        <pre><code>if (temp &gt; 85) {
  console.log("hot");
} else if (temp &gt; 60) {
  console.log("nice");
} else {
  console.log("cold");
}</code></pre>
        <p>JavaScript checks from the top and runs <b>only the first</b> branch whose condition is true,
        then skips the rest. So <b>order matters</b>.</p>
        <h2>Combining conditions</h2>
        <ul>
          <li><code>a &amp;&amp; b</code> — AND: true only if both are true</li>
          <li><code>a || b</code> — OR: true if at least one is true</li>
          <li><code>!a</code> — NOT: flips true and false</li>
        </ul>
        <h2>Truthy and falsy</h2>
        <p>Inside an <code>if</code>, JavaScript converts any value to a boolean. Exactly these are
        <b>falsy</b>: <code>false</code>, <code>0</code>, <code>""</code> (empty text), <code>null</code>,
        <code>undefined</code>, <code>NaN</code>. Everything else is <b>truthy</b>, including <code>"0"</code> and
        <code>"false"</code> (non-empty text!).</p>
        <div class="senior">Prefer <b>early returns</b> over deep nesting: handle the bad case first and leave,
        so the main logic stays flat and readable. Code that is indented five levels deep is code nobody
        wants to debug at 2 a.m.</div>
        <div class="foot"><span></span><span class="hint">experiment →</span></div>`,
      right: `
        <p class="kicker">Playground</p>
        <h2 style="margin-top:0">Change the numbers, predict the output</h2>
        <p>Before you edit, say out loud which branch will run. Then change <code>temp</code> to 90, 40, 61.
        Then swap the order of the first two branches and see what breaks.</p>
        <div id="play"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountWorkbench(right.querySelector('#play'), {
          starter: 'let temp = 72;\nconst raining = false;\n\nif (temp > 85) {\n  console.log("hot");\n} else if (temp > 60) {\n  console.log("nice");\n} else {\n  console.log("cold");\n}\n\nif (temp > 60 && !raining) {\n  console.log("go outside");\n}',
          autorun: true, rows: 14,
        });
      },
    },

    // ───────────────────────── Spread 2: loops and arrays ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 3 · Repetition</p>
        <h1>Arrays and loops</h1>
        <p>An <b>array</b> is an ordered list of values in one variable. Each slot has a number called its
        <b>index</b>, and <b>counting starts at 0</b>.</p>
        <pre><code>const prices = [4, 8, 15];
prices[0]        // 4   first item
prices[2]        // 15  last item
prices.length    // 3
prices.push(23); // add to the end</code></pre>
        <p>The last item is always at <code>length - 1</code>. Asking for an index that does not exist
        gives <code>undefined</code>, not an error. That silence causes many bugs.</p>
        <h2>The for loop: three parts</h2>
        <pre><code>for (let i = 0; i &lt; prices.length; i++) {
  total = total + prices[i];
}</code></pre>
        <ol>
          <li><code>let i = 0</code> — runs <b>once</b>, before the first pass.</li>
          <li><code>i &lt; prices.length</code> — checked <b>before every pass</b>. False means stop.</li>
          <li><code>i++</code> — runs <b>after every pass</b>. (Shorthand for <code>i = i + 1</code>.)</li>
        </ol>
        <p>A <b>while</b> loop is the same idea with only the condition:
        <code>while (n &lt; 3) { n++; }</code>. If nothing inside ever makes the condition false you get an
        infinite loop. (The book will stop it after 1.5 seconds.)</p>
        <h2>The two famous mistakes</h2>
        <ul>
          <li><b>Off-by-one:</b> using <code>&lt;=</code> instead of <code>&lt;</code> runs one pass too many and reads
          <code>prices[3]</code>, which is <code>undefined</code>.</li>
          <li><b>Accumulator in the wrong place:</b> <code>let total = 0</code> must be <i>before</i> the loop. Inside, it resets every pass.</li>
        </ul>
        <div class="senior">When a loop misbehaves, do what the table on the right does: write down every
        variable at the start of each pass. This "trace table" is the single most useful debugging habit you can
        build. Debuggers automate it, but you must first be able to do it by hand.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Playground</p>
        <h2 style="margin-top:0">Watch every pass of the loop</h2>
        <p>Run it, then read the table: <code>i</code> climbs, <code>total</code> grows. Yellow = changed.
        Now break it on purpose: change <code>&lt;</code> to <code>&lt;=</code> and see what the last pass does.</p>
        <div id="play"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountWorkbench(right.querySelector('#play'), {
          starter: 'const prices = [4, 8, 15];\nlet total = 0;\n\nfor (let i = 0; i < prices.length; i++) {\n  total = total + prices[i];\n}\n\nconsole.log(total);',
          autorun: true, loops: true, rows: 8,
        });
      },
    },

    // ───────────────────────── Spread 3: challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge</p>
        <h1>Four functions with logic</h1>
        <p>Same rules as before: the book calls your functions with many inputs, including nasty edge cases.
        Passing the obvious input is not enough. Professional tests are written to <b>break</b> your code.</p>
        <div id="tasks"></div>
        <div class="senior">Edge cases to always ask about: zero, negative numbers, a single item, an empty list,
        the very first and very last item. If you handle those, the middle usually takes care of itself.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Workbench</p>
        <div id="bench"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all four to turn the page</span></div>`,
      init(left, right, api) {
        const probes = {
          s1: 'sign(-5)', s2: 'sign(0)', s3: 'sign(9)',
          u1: 'sumTo(4)', u2: 'sumTo(100)', u3: 'sumTo(0)',
          l1: 'largest([3, 9, 2])', l2: 'largest([-5, -2, -9])', l3: 'largest([7])',
          f1: 'fizz(15)', f2: 'fizz(9)', f3: 'fizz(10)', f4: 'fizz(7)', f5: 'fizz(30)',
        };
        // Text of ONE function: from "function name" up to the next "function" keyword (or the end).
        const body = (r, name) => {
          const i = r.source.indexOf('function ' + name);
          if (i < 0) return '';
          const next = r.source.indexOf('function ', i + 9);
          return next < 0 ? r.source.slice(i) : r.source.slice(i, next);
        };
        const tasks = [
          { label: 'sign(n) returns "negative", "zero" or "positive".   sign(-5) → "negative", sign(0) → "zero", sign(9) → "positive"',
            check: (r) => r.probes.s1 === 'negative' && r.probes.s2 === 'zero' && r.probes.s3 === 'positive' },
          { label: 'sumTo(n) adds 1 + 2 + … + n using a LOOP.   sumTo(4) → 10, sumTo(100) → 5050, sumTo(0) → 0',
            check: (r) => r.probes.u1 === 10 && r.probes.u2 === 5050 && r.probes.u3 === 0 && /\b(for|while)\b/.test(body(r, 'sumTo')) },
          { label: 'largest(list) returns the biggest number using a loop (no Math.max).   [3, 9, 2] → 9, [-5, -2, -9] → -2, [7] → 7',
            check: (r) => r.probes.l1 === 9 && r.probes.l2 === -2 && r.probes.l3 === 7 && !/Math\.max/.test(r.source) && /\b(for|while)\b/.test(body(r, 'largest')) },
          { label: 'fizz(n): "FizzBuzz" if n divides by 15, else "Fizz" if by 3, else "Buzz" if by 5, else n itself.   15 → "FizzBuzz", 9 → "Fizz", 10 → "Buzz", 7 → 7',
            check: (r) => r.probes.f1 === 'FizzBuzz' && r.probes.f2 === 'Fizz' && r.probes.f3 === 'Buzz' && r.probes.f4 === 7 && r.probes.f5 === 'FizzBuzz' },
        ];
        mountWorkbench(right.querySelector('#bench'), {
          starter: '// Task 1\nfunction sign(n) {\n  // your code\n}\n\n// Task 2  (hint: start a total at 0, loop from 1 up to n)\nfunction sumTo(n) {\n  // your code\n}\n\n// Task 3  (hint: what should the starting "best so far" be?)\nfunction largest(list) {\n  // your code\n}\n\n// Task 4  (hint: which check must come first?)\nfunction fizz(n) {\n  // your code\n}\n',
          tasks, tasksEl: left.querySelector('#tasks'), probes, rows: 24, loops: true,
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(100); },
        });
      },
    },

    // ───────────────────────── Spread 4: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Trace each program by hand on paper: write the variables, then update them line by line. Only then click.</p>
        <p>If you disagree with the answer, paste the code into the loop playground two pages back and read the trace table.</p>
        <div class="senior">The gap between "I read it and it looked right" and "I traced it and it is right"
        is the gap between guessing and engineering.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<pre><code>const a = [10, 20, 30];\nconsole.log(a[3]);</code></pre>',
            options: ['30', 'an error', 'undefined', '0'], answer: 2,
            why: 'Valid indexes are 0, 1 and 2. Index 3 is past the end; JavaScript returns undefined instead of an error.' },
          { prompt: '<pre><code>console.log(5 &gt; 3 &amp;&amp; 2 &gt; 4);</code></pre>',
            options: ['true', 'false', '2', 'an error'], answer: 1,
            why: 'AND needs both sides true. 5 > 3 is true, but 2 > 4 is false, so the whole thing is false.' },
          { prompt: '<pre><code>let c = 0;\nfor (let i = 0; i &lt; 5; i += 2) {\n  c++;\n}\nconsole.log(c);</code></pre>',
            options: ['2', '3', '5', '6'], answer: 1,
            why: 'i takes the values 0, 2, 4 and then 6 fails the check (6 < 5 is false). Three passes, so c is 3.' },
          { prompt: '<pre><code>if ("0") {\n  console.log("yes");\n} else {\n  console.log("no");\n}</code></pre>',
            options: ['yes', 'no', 'an error', 'nothing prints'], answer: 0,
            why: '"0" is non-empty text, so it is truthy. Only the number 0 (not the text "0") is falsy.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(120); });
      },
    },
  ],
};
