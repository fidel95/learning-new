// Lesson 1 — Memory, values and variables.
// A lesson is a list of "spreads" (two facing pages).
//   left / right : the HTML of each page
//   init(left, right, api) : wires up the interactive parts
//   gated : true means you must pass this spread's challenge to turn the page
import { mountWorkbench, mountQuiz } from '../workbench.js';

export const lesson = {
  id: 'l1',
  title: 'Lesson 1 · Memory, values & variables',
  spreads: [
    // ───────────────────────── Spread 1: the ideas + a playground ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 1 · Foundations</p>
        <h1>What a program actually is</h1>
        <p>A program is a list of <b>instructions</b> that a computer follows, one after another, to
        change <b>data</b>. That is the whole job: take data in, transform it, send data out.</p>
        <p>While the program runs, the data has to live somewhere. That place is <b>memory</b>
        (RAM): billions of tiny numbered slots. Writing <code>2000041</code> to talk about slot
        two-million-and-forty-one would be miserable, so languages let us attach a <b>name</b>.</p>
        <h2>Variable = a name for a value</h2>
        <pre><code>let score = 10;</code></pre>
        <ul>
          <li><code>let</code> — "create a new variable" (a keyword the language reserves).</li>
          <li><code>score</code> — the name you chose.</li>
          <li><code>=</code> — <b>assignment</b>, not "equals". Read it as "store the right side into the left name".</li>
          <li><code>10</code> — the value. The right side is always computed <i>first</i>.</li>
        </ul>
        <h2>Every value has a type</h2>
        <p>The type decides what you may do with a value. JavaScript's simple ("primitive") types:</p>
        <ul>
          <li><code>number</code> — <code>42</code>, <code>3.14</code></li>
          <li><code>string</code> — text in quotes: <code>"hello"</code></li>
          <li><code>boolean</code> — only <code>true</code> or <code>false</code></li>
          <li><code>undefined</code> — "a variable exists but nothing was stored"</li>
          <li><code>null</code> — "deliberately empty"</li>
        </ul>
        <div class="senior">Default to <code>const</code>. It means "this name will never point at a different
        value." When you read code later, every <code>const</code> is one less thing that could have changed
        behind your back. Use <code>let</code> only when you truly need to reassign. Avoid <code>var</code>:
        it is the pre-2015 version with confusing scoping rules.</div>
        <div class="warn"><code>"5" + 1</code> is <code>"51"</code>, not <code>6</code>. A string plus a number
        glues text together. Many real bugs are a value having a different <i>type</i> than the developer assumed.</div>
        <div class="foot"><span></span><span class="hint">now play with it →</span></div>`,
      right: `
        <p class="kicker">Playground</p>
        <h2 style="margin-top:0">Type code. Watch memory change.</h2>
        <p>Edit anything. It runs by itself. Notice the <b>type</b> under each value, and what turns yellow when a value changes.</p>
        <div id="play"></div>
        <p style="font-size:14px;color:var(--ink-soft)">Try: change <code>10</code> to <code>"ten"</code>.
        Try: add <code>score = score + 5;</code> Try: make <code>const</code> lines reassign. Read the error aloud.</p>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountWorkbench(right.querySelector('#play'), {
          starter: 'let score = 10;\nconst player = "Ana";\nconst isAlive = true;\nlet bonus;\n\nconsole.log(player, "has", score, "points");',
          autorun: true,
          rows: 7,
        });
      },
    },

    // ───────────────────────── Spread 2: the challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge</p>
        <h1>Four things to build</h1>
        <p>Write code on the right page. Each box ticks only when your code truly does the thing
        (the book runs your code and inspects memory; it never just trusts you).</p>
        <div id="tasks"></div>
        <div class="senior">Why check <i>memory</i> instead of comparing your text to an answer? Because there are
        many correct programs. Real test suites check <b>behavior</b>, not wording. You are practising
        that mindset from day one.</div>
        <p style="font-size:14px;color:var(--ink-soft)">Stuck? Read the red error. Errors are the computer being
        specific about what it could not do. Learning to read them is half of programming.</p>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Workbench</p>
        <div id="bench"></div>
        <div class="foot"><span></span><span class="hint" id="gateHint">complete all four to turn the page</span></div>`,
      init(left, right, api) {
        const tasks = [
          { label: 'Create a variable named city with let or const, storing a non-empty string (like "Louisville").',
            check: (r) => typeof r.values.city === 'string' && r.values.city.length > 0 && /\b(let|const)\s+city\b/.test(r.source) },
          { label: 'Create let score = 0, then change it (reassign it) so it ends as 10. (It must be let: a const cannot change.)',
            check: (r) => r.values.score === 10 && r.kinds.score === 'let' && /score\s*=\s*(?!0\b)/.test(r.source.replace(/let\s+score\s*=\s*0/, '')) },
          { label: 'Create const isReady holding the boolean true (not the string "true").',
            check: (r) => r.values.isReady === true && r.kinds.isReady === 'const' },
          { label: 'Create const price = 12.5 and const quantity = 4, then const total computed FROM them (price times quantity), not typed as 50.',
            check: (r) => r.values.price === 12.5 && r.values.quantity === 4 && r.values.total === 50 &&
              /total\s*=[^;\n]*\bprice\b/.test(r.source) && /total\s*=[^;\n]*\bquantity\b/.test(r.source) },
        ];
        mountWorkbench(right.querySelector('#bench'), {
          starter: '// Task 1\n\n// Task 2\n\n// Task 3\n\n// Task 4\n',
          tasks, tasksEl: left.querySelector('#tasks'), rows: 11,
          onPass: () => { right.querySelector('#gateHint').textContent = 'all done — turn the page ›'; api.unlock(60); },
        });
      },
    },

    // ───────────────────────── Spread 3: predict the output (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Professional engineers read code more than they write it. The skill that matters most is
        running the program <b>in your head</b> and being right.</p>
        <p>Decide your answer <i>before</i> clicking. If you are unsure, paste the code into the
        playground (two pages back) and test your prediction. Being wrong here is the cheapest place to be wrong.</p>
        <div class="senior">Whenever a result surprises you at work, stop and find out <i>why</i> your mental model
        was off. Fixing the model, not just the symptom, is how juniors become seniors.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span></span><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<pre><code>const a = "5";\nconst b = 1;\nconsole.log(a + b);</code></pre>',
            options: ['6', '"51" (the text 51)', 'an error', '5 1'], answer: 1,
            why: 'With a string on one side, + joins text. The number 1 becomes "1" and is glued on.' },
          { prompt: '<pre><code>let x = 3;\nx = x + 2;\nconsole.log(x);</code></pre>',
            options: ['3', '2', '5', 'an error'], answer: 2,
            why: 'The right side is computed first (3 + 2 = 5), then stored back into x.' },
          { prompt: '<pre><code>const n = 1;\nn = 2;</code></pre>',
            options: ['n becomes 2', 'n stays 1, silently', 'TypeError: Assignment to constant variable.', 'undefined'], answer: 2,
            why: 'const forbids re-pointing the name. JavaScript throws an error instead of letting a bug hide.' },
          { prompt: '<pre><code>let y;\nconsole.log(typeof y);</code></pre>',
            options: ['"null"', '"undefined"', '"number"', 'an error'], answer: 1,
            why: 'A variable that was declared but never given a value holds undefined, which is its own type.' },
        ], () => { right.querySelector('#gateHint').textContent = 'lesson complete'; api.unlock(80); });
      },
    },
  ],
};
