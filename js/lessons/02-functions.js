// Lesson 2 — Functions, scope and the call stack.
import { mountWorkbench, mountQuiz } from '../workbench.js';

export const lesson = {
  id: 'l2',
  title: 'Lesson 2 · Functions, scope & the call stack',
  spreads: [
    // ───────────────────────── Spread 1: ideas + traced playground ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 2 · Reusable logic</p>
        <h1>Functions: named recipes</h1>
        <p>Last lesson you stored <i>data</i>. A <b>function</b> stores <i>instructions</i>: a recipe with a
        name that you can run whenever you want, as often as you want, with different ingredients.</p>
        <pre><code>function double(n) {
  return n * 2;
}
const answer = double(21);   // 42</code></pre>
        <ul>
          <li><code>n</code> is a <b>parameter</b>: a placeholder name inside the recipe.</li>
          <li><code>21</code> is an <b>argument</b>: the real value you hand over when you <b>call</b> the function.</li>
          <li><code>return</code> sends a value back to whoever called, and <b>ends</b> the function immediately.</li>
        </ul>
        <div class="warn"><code>console.log</code> and <code>return</code> are not the same thing.
        <code>console.log</code> only <i>prints</i> for a human. <code>return</code> hands a value to the
        <i>program</i>. A function with no <code>return</code> gives back <code>undefined</code>.
        Beginners print when they should return, and then wonder why the result can't be used.</div>
        <h2>Scope: who can see which names</h2>
        <p>A variable declared inside a function exists only inside it. That region is its <b>scope</b>.
        Code can look <i>outward</i> (a function may read variables of the file around it) but never <i>inward</i>.</p>
        <pre><code>const TAX = 0.25;            // outer scope
function addTax(price) {
  const extra = price * TAX; // can read TAX, sees outward
  return price + extra;
}
// extra does not exist out here</code></pre>
        <p>If an inner name matches an outer one, the inner one wins inside the function. That is <b>shadowing</b>.
        It is legal, and a classic source of confusion, so avoid it.</p>
        <h2>The call stack</h2>
        <p>When function A calls B, A must wait. The computer keeps a pile of "unfinished calls" called the
        <b>call stack</b>. The newest call sits on top and is the only one running. When it returns, it is
        removed and the one beneath continues. Press Step on the right to watch it happen.</p>
        <div class="senior">Every bug report that says "stack trace" is just this pile printed at the moment
        something broke, read from the top: where it died, then who called it, then who called that.
        Infinite recursion means the pile grows until it overflows (<code>RangeError: Maximum call stack size exceeded</code>).</div>
        <div class="foot"><span></span><span class="hint">now step through one →</span></div>`,
      right: `
        <p class="kicker">Playground</p>
        <h2 style="margin-top:0">Watch the stack grow and shrink</h2>
        <p>This program calls <code>square</code> twice from inside <code>sumOfSquares</code>. Press <b>Step ▶</b>.
        Then edit the code (add a third function that calls another) and step again. Tracing works for
        functions written as <code>function name() { }</code>.</p>
        <div id="play"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountWorkbench(right.querySelector('#play'), {
          starter: 'function square(n) {\n  return n * n;\n}\n\nfunction sumOfSquares(a, b) {\n  return square(a) + square(b);\n}\n\nconst result = sumOfSquares(3, 4);\nconsole.log(result);',
          autorun: true, trace: true, rows: 10,
        });
      },
    },

    // ───────────────────────── Spread 2: challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge</p>
        <h1>Four functions to write</h1>
        <p>The book now <b>calls your functions with several inputs</b> and checks what comes back. That is
        exactly what an automated test does at a real company.</p>
        <p style="font-size:14px;color:var(--ink-soft)">New tool: <code>%</code> is the <b>remainder</b> operator.
        <code>7 % 2</code> is <code>1</code> (7 divided by 2 leaves 1). A number is even when dividing by 2 leaves
        remainder <code>0</code>. Also: <code>===</code> asks "are these exactly equal?" and gives <code>true</code> or <code>false</code>.</p>
        <div id="tasks"></div>
        <div class="senior">A function that only <i>returns</i> a value, with no hidden changes elsewhere,
        is called <b>pure</b>. Pure functions are the easiest code in the world to test and to trust.
        Aim to write most of your functions this way.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Workbench</p>
        <div id="bench"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all four to turn the page</span></div>`,
      init(left, right, api) {
        // Each probe is an expression evaluated AFTER your code, using your functions.
        const probes = {
          d1: 'double(4)', d2: 'double(-3)',
          g1: 'greet("Ana")', g2: 'greet("Sam")',
          e1: 'isEven(4)', e2: 'isEven(7)', e3: 'isEven(0)',
          t1: 'addTax(8)', t2: 'addTax(100)',
        };
        const tasks = [
          { label: 'double(n) RETURNS n times 2.   double(4) → 8, double(-3) → -6',
            check: (r) => r.probes.d1 === 8 && r.probes.d2 === -6 },
          { label: 'greet(name) RETURNS (not logs) the text "Hello, " + name + "!".   greet("Ana") → "Hello, Ana!"',
            check: (r) => r.probes.g1 === 'Hello, Ana!' && r.probes.g2 === 'Hello, Sam!' },
          { label: 'isEven(n) returns true or false (a boolean).   isEven(4) → true, isEven(7) → false, isEven(0) → true',
            check: (r) => r.probes.e1 === true && r.probes.e2 === false && r.probes.e3 === true },
          { label: 'addTax(price) returns the price plus tax, reading the OUTER const TAX (0.25) instead of typing 0.25 inside.   addTax(8) → 10',
            check: (r) => r.probes.t1 === 10 && r.probes.t2 === 125 && r.kinds.TAX === 'const' &&
              /\bTAX\b/.test(r.source.slice(r.source.indexOf('function addTax'))) },
        ];
        mountWorkbench(right.querySelector('#bench'), {
          starter: '// Task 1\nfunction double(n) {\n  // your code\n}\n\n// Task 2\nfunction greet(name) {\n  // your code\n}\n\n// Task 3\nfunction isEven(n) {\n  // your code\n}\n\n// Task 4\nconst TAX = 0.25;\nfunction addTax(price) {\n  // your code\n}\n',
          tasks, tasksEl: left.querySelector('#tasks'), probes, rows: 20,
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(80); },
        });
      },
    },

    // ───────────────────────── Spread 3: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Four traps that catch almost every beginner once. Work out the answer on paper first.</p>
        <p>To verify, paste the code into the playground two pages back. It is allowed, and it is exactly what
        a professional does: <b>form a hypothesis, run the experiment</b>.</p>
        <div class="senior">Interviews love scope and return-value questions because they expose whether you
        hold an accurate mental model of the machine or just pattern-match syntax.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<pre><code>function f() {\n  console.log(1);\n}\nconst x = f();\nconsole.log(x);</code></pre>',
            options: ['prints 1 then 1', 'prints 1 then undefined', 'prints undefined only', 'an error'], answer: 1,
            why: 'f prints 1 itself. It has no return, so x holds undefined, which the second log prints.' },
          { prompt: '<pre><code>function f() {\n  const secret = 7;\n}\nf();\nconsole.log(typeof secret);</code></pre>',
            options: ['"number"', 'ReferenceError', '"undefined"', '7'], answer: 2,
            why: 'secret lives only inside f. typeof on a name that does not exist is the one safe case: it returns "undefined" instead of crashing.' },
          { prompt: '<pre><code>const x = 1;\nfunction f() {\n  const x = 2;\n  return x;\n}\nf();\nconsole.log(x);</code></pre>',
            options: ['1', '2', '3', 'undefined'], answer: 0,
            why: 'The inner x is a different variable that shadows the outer one only inside f. The outer x is untouched.' },
          { prompt: '<pre><code>function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2));</code></pre>',
            options: ['2', 'an error', 'NaN', '"2undefined"'], answer: 2,
            why: 'A missing argument becomes undefined. 2 + undefined cannot be computed as a number, so the result is NaN ("not a number").' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(100); });
      },
    },
  ],
};
