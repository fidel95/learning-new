// Lesson 4 — Objects, references, array methods and JSON.
import { mountWorkbench, mountQuiz } from '../workbench.js';

export const lesson = {
  id: 'l4',
  title: 'Lesson 4 · Objects, references & JSON',
  spreads: [
    // ───────────────────────── Spread 1: objects ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 4 · Modelling data</p>
        <h1>Objects: things with named parts</h1>
        <p>An array is a list where position means something. But a <i>person</i> is not "item 0, item 1".
        A person has a <b>name</b>, an <b>age</b>, an <b>email</b>. An <b>object</b> groups values under
        <b>keys</b> (names):</p>
        <pre><code>const user = {
  name: "Ana",
  age: 30,
  admin: false,
};</code></pre>
        <p>Each line is a <b>property</b>: a <code>key: value</code> pair. Read and change with a dot:</p>
        <pre><code>user.name          // "Ana"
user.age = 31;     // update
user.city = "Rome" // add a new property
delete user.admin  // remove one
user["name"]       // same as user.name
Object.keys(user)  // ["name","age","city"]</code></pre>
        <p>Use brackets when the key is stored in a variable:
        <code>const k = "age"; user[k]</code>.</p>
        <h2>Nesting: the shape of real data</h2>
        <p>Values can be anything, including arrays and other objects. Real data, like an order from a shop,
        is nested:</p>
        <pre><code>const order = {
  id: 7,
  customer: { name: "Ana" },
  items: [ { sku: "A1", qty: 2 } ],
};
order.customer.name   // "Ana"
order.items[0].qty    // 2</code></pre>
        <p>Read it left to right: each <code>.</code> or <code>[ ]</code> goes one level deeper. Reading a
        property of <code>undefined</code> crashes with a <code>TypeError</code>, the most common JavaScript
        error in the world.</p>
        <div class="senior">Design your data before your code. Ask: what is one "thing" here, what are its
        properties, and which properties are lists of other things? A good shape makes the code
        almost write itself; a bad one makes every function painful.</div>
        <div class="foot"><span></span><span class="hint">experiment →</span></div>`,
      right: `
        <p class="kicker">Playground</p>
        <h2 style="margin-top:0">Objects in memory</h2>
        <p>Add a property. Delete one. Make <code>pets</code> hold a second animal and watch the table grow.
        Then read something that doesn't exist, like <code>user.phone</code>, and log it.</p>
        <div id="play"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountWorkbench(right.querySelector('#play'), {
          starter: 'const user = {\n  name: "Ana",\n  age: 30,\n};\n\nuser.city = "Rome";\n\nconst pets = [\n  { name: "Rex", kind: "dog" },\n  { name: "Mia", kind: "cat" },\n];\n\nconsole.log(user.name, pets[1].name);',
          autorun: true, rows: 13,
        });
      },
    },

    // ───────────────────────── Spread 2: references ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 4 · How memory really works</p>
        <h1>References: the #1 source of "impossible" bugs</h1>
        <p>Remember: a variable is a <i>label</i> for a value. For <b>primitives</b> (numbers, text, booleans)
        the label holds the value itself, so copying makes an independent copy.</p>
        <p>For <b>objects and arrays</b> the label holds a <b>reference</b>: an address pointing to the object
        that lives elsewhere in memory. Copying the variable copies the <i>address</i>, not the object.</p>
        <pre><code>const a = { n: 1 };
const b = a;       // b points at the SAME object
b.n = 2;
console.log(a.n);  // 2  (!)</code></pre>
        <p>In the memory panel every object gets an identity badge like <b>@1</b>. If two names show the same
        badge, they are two labels on one object. Change it through either label and both see it.</p>
        <h2>Equality compares identity</h2>
        <pre><code>{ n: 1 } === { n: 1 }   // false
const c = a;
c === a                 // true</code></pre>
        <p>Two separate objects with identical contents are <i>not</i> equal. <code>===</code> asks "same object?",
        not "same contents?".</p>
        <h2>Making a real copy</h2>
        <pre><code>const copy = { ...a };           // new object, same properties
const copy2 = { ...a, n: 5 };    // copy, then override n
const list2 = [...list, 4];      // new array with 4 added</code></pre>
        <p>The three dots <b>spread</b> the contents into a new container. This is a <b>shallow</b> copy: nested
        objects inside are still shared. Writing code that returns <i>new</i> objects instead of editing
        existing ones is called <b>immutability</b>.</p>
        <div class="warn"><code>const</code> does not freeze an object. <code>const user = {}</code> only promises the
        label will never point elsewhere. You can still change what is inside. Beginners misread this constantly.</div>
        <div class="senior">Mutating shared objects is behind a huge share of real production bugs: "who changed
        this?" Frameworks like React are designed around never mutating state. Learn the habit now: copy, then change the copy.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Playground</p>
        <h2 style="margin-top:0">Spot the aliases</h2>
        <p>Run it. <code>a</code> and <code>b</code> show the same badge: one object, two labels.
        <code>copy</code> has its own badge. Change <code>b.n</code> and check which names see it.
        Then change <code>b = a</code> to <code>b = { ...a }</code> and watch the badges separate.</p>
        <div id="play"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountWorkbench(right.querySelector('#play'), {
          starter: 'const a = { n: 1 };\nconst b = a;           // alias: same object\nconst copy = { ...a }; // real copy\n\nb.n = 2;\n\nconsole.log("a.n:", a.n);\nconsole.log("copy.n:", copy.n);\nconsole.log("a === b:", a === b);\nconsole.log("a === copy:", a === copy);',
          autorun: true, rows: 11,
        });
      },
    },

    // ───────────────────────── Spread 3: map / filter / reduce + JSON ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 4 · Working with lists</p>
        <h1>map, filter, reduce, and JSON</h1>
        <p>Functions are values too (you saw <code>ƒ</code> in memory). So you can hand a function to another
        function. A short function without a name is an <b>arrow function</b>:</p>
        <pre><code>const double = n =&gt; n * 2;
const add = (a, b) =&gt; a + b;</code></pre>
        <p>Three array methods take such a function (a <b>callback</b>) and replace most loops you wrote last lesson:</p>
        <pre><code>const nums = [1, 2, 3, 4];

nums.map(n =&gt; n * 2)            // [2, 4, 6, 8]   transform each
nums.filter(n =&gt; n % 2 === 0)   // [2, 4]         keep matching
nums.reduce((sum, n) =&gt; sum + n, 0)  // 10        fold into one value</code></pre>
        <ul>
          <li><b>map</b>: same length out, every item transformed.</li>
          <li><b>filter</b>: keeps only items where the callback returns true.</li>
          <li><b>reduce</b>: carries an <b>accumulator</b> (<code>sum</code>) through the list. The <code>0</code> at the end is its starting value. Never forget it.</li>
        </ul>
        <p>None of them change the original array: they return a <b>new</b> one. They chain:
        <code>users.filter(u =&gt; u.age &gt;= 18).map(u =&gt; u.name)</code>.</p>
        <h2>JSON and try / catch</h2>
        <p><b>JSON</b> is plain text that describes data. It is how programs talk over the internet.</p>
        <pre><code>JSON.stringify({ a: 1 })      // '{"a":1}'  object to text
JSON.parse('{"a":1}')         // { a: 1 }   text to object</code></pre>
        <p>Text from outside is untrusted: <code>JSON.parse("oops")</code> <b>throws</b> an error and would crash your program.
        <b>try / catch</b> lets you handle it:</p>
        <pre><code>try {
  const data = JSON.parse(text);
} catch (error) {
  console.log("bad input");
}</code></pre>
        <div class="senior">Never trust input from outside your program: files, users, networks. Assume it is
        missing, malformed or hostile, and decide what happens. That one habit separates toy code from production code.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Playground</p>
        <h2 style="margin-top:0">Chain them together</h2>
        <p>Predict each result before running. Then try: names of only the adults;
        the total age of all people; the oldest person (hint: reduce with a comparison).</p>
        <div id="play"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountWorkbench(right.querySelector('#play'), {
          starter: 'const people = [\n  { name: "Ana", age: 31 },\n  { name: "Bo", age: 15 },\n  { name: "Cy", age: 42 },\n];\n\nconst names = people.map(p => p.name);\nconst adults = people.filter(p => p.age >= 18);\nconst totalAge = people.reduce((sum, p) => sum + p.age, 0);\n\nconst text = JSON.stringify(adults[0]);\nconsole.log(names, totalAge);\nconsole.log(text);',
          autorun: true, rows: 14,
        });
      },
    },

    // ───────────────────────── Spread 4: challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge</p>
        <h1>Five data functions</h1>
        <p>Real-world work is mostly this: take data in, reshape it, hand data out. The book checks your
        results and also that you did not break the rules (like mutating the input).</p>
        <div id="tasks"></div>
        <div class="senior">When you have to change data, return a <i>new</i> value and leave the input alone.
        Callers rarely expect their data to be edited behind their back. The book tests this on task 2.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Workbench</p>
        <div id="bench"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all five to turn the page</span></div>`,
      init(left, right, api) {
        const probes = {
          n1: 'fullName({ first: "Ada", last: "Lovelace" })',
          b1: '(() => { const p = { name: "Sam", age: 30 }; const q = birthday(p); return [p.age, q.age, q.name, p === q]; })()',
          m1: 'JSON.stringify(names([{ name: "A" }, { name: "B" }]))',
          m2: 'JSON.stringify(names([]))',
          a1: 'adultTotal([{ age: 10 }, { age: 20 }, { age: 30 }])',
          a2: 'adultTotal([])',
          j1: 'parseAge(\'{"name":"Ana","age":31}\')',
          j2: 'parseAge("not json")',
          j3: 'parseAge(\'{"name":"Bo"}\')',
        };
        const body = (r, name) => {
          const i = r.source.indexOf('function ' + name);
          if (i < 0) return '';
          const next = r.source.indexOf('function ', i + 9);
          return next < 0 ? r.source.slice(i) : r.source.slice(i, next);
        };
        const tasks = [
          { label: 'fullName(person) returns first and last name joined by a space.   {first:"Ada", last:"Lovelace"} → "Ada Lovelace"',
            check: (r) => r.probes.n1 === 'Ada Lovelace' },
          { label: 'birthday(person) returns a NEW object with age one higher. The original must stay unchanged, and other properties must be kept (hint: spread).',
            check: (r) => Array.isArray(r.probes.b1) && r.probes.b1[0] === 30 && r.probes.b1[1] === 31 && r.probes.b1[2] === 'Sam' && r.probes.b1[3] === false },
          { label: 'names(list) returns an array of each item\'s name, using .map.   [{name:"A"},{name:"B"}] → ["A","B"]',
            check: (r) => r.probes.m1 === '["A","B"]' && r.probes.m2 === '[]' && /\.map\(/.test(body(r, 'names')) },
          { label: 'adultTotal(people) adds up the ages of people who are 18 or older, using .filter and .reduce.   ages 10, 20, 30 → 50; empty list → 0',
            check: (r) => r.probes.a1 === 50 && r.probes.a2 === 0 && /\.filter\(/.test(body(r, 'adultTotal')) && /\.reduce\(/.test(body(r, 'adultTotal')) },
          { label: 'parseAge(text) parses JSON text and returns its age. If the text is not valid JSON, or has no age, return -1. (Use JSON.parse and try/catch.)',
            check: (r) => r.probes.j1 === 31 && r.probes.j2 === -1 && r.probes.j3 === -1 && /JSON\.parse/.test(body(r, 'parseAge')) && /\btry\b/.test(body(r, 'parseAge')) },
        ];
        mountWorkbench(right.querySelector('#bench'), {
          starter: '// Task 1\nfunction fullName(person) {\n  // your code\n}\n\n// Task 2  (do not change person itself!)\nfunction birthday(person) {\n  // your code\n}\n\n// Task 3\nfunction names(list) {\n  // your code\n}\n\n// Task 4\nfunction adultTotal(people) {\n  // your code\n}\n\n// Task 5\nfunction parseAge(text) {\n  // your code\n}\n',
          tasks, tasksEl: left.querySelector('#tasks'), probes, rows: 28,
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(140); },
        });
      },
    },

    // ───────────────────────── Spread 5: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>These four cover the biggest traps in this lesson: shared references, object equality, and how
        <code>reduce</code> carries its accumulator. Answer in your head first.</p>
        <p>Paste any of them into the playground two pages back to see identity badges and results directly.</p>
        <div class="senior">If you can explain <i>why</i> an alias changes both names, you understand more about
        memory than many people who have written code for years.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<pre><code>const a = { n: 1 };\nconst b = a;\nb.n = 2;\nconsole.log(a.n);</code></pre>',
            options: ['1', '2', 'undefined', 'an error'], answer: 1,
            why: 'b is not a copy; it holds the same reference as a. Changing the object through b changes what a sees.' },
          { prompt: '<pre><code>console.log({ a: 1 } === { a: 1 });</code></pre>',
            options: ['true', 'false', 'an error', 'undefined'], answer: 1,
            why: 'Each { } literal creates a brand new object. === compares identity (same object?), not contents.' },
          { prompt: '<pre><code>const r = [1, 2, 3].reduce((s, n) =&gt; s + n, 10);\nconsole.log(r);</code></pre>',
            options: ['6', '10', '16', '[11, 12, 13]'], answer: 2,
            why: 'The accumulator starts at 10, then adds 1, 2 and 3. 10 + 1 + 2 + 3 = 16.' },
          { prompt: '<pre><code>const user = { name: "Ana" };\nconsole.log(user.address.city);</code></pre>',
            options: ['undefined', 'null', 'TypeError (cannot read "city" of undefined)', '"Ana"'], answer: 2,
            why: 'user.address does not exist, so it is undefined. Reading a property of undefined is a TypeError, the classic crash.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(160); });
      },
    },
  ],
};
