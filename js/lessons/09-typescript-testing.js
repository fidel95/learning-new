// Lesson 9 — TypeScript and automated testing.
import { mountQuiz } from '../workbench.js';
import { mountTsLab, mountTsChallenge, mountTestLab, mountTestChallenge } from '../tslab.js';

export const lesson = {
  id: 'l9',
  title: 'Lesson 9 · TypeScript & testing',
  spreads: [
    // ───────────────────────── Spread 1: why types ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 9 · Catching bugs before users do</p>
        <h1>TypeScript: JavaScript with a safety net</h1>
        <p>JavaScript checks types only <i>while the program runs</i>, so a mistake like calling
        <code>.toUpperCase()</code> on a number crashes <b>in front of your user</b>. <b>TypeScript</b> adds a layer of
        <b>types</b> that a program called the <b>compiler</b> checks <i>before</i> anything runs. Mistakes show up as red errors on
        your screen, minutes after you made them instead of weeks later in production.</p>
        <p>Then the compiler <b>deletes the types</b> and outputs ordinary JavaScript. Types exist only while you write.
        Companies like Microsoft, Slack and Airbnb build TypeScript, and your CRM is written in it.</p>
        <h2>The basics</h2>
        <pre><code>let age: number = 30;          // annotation: age is always a number
let name = "Ana";               // inferred: TypeScript works out "string" itself
let scores: number[] = [9, 7];  // an array of numbers
let id: string | number;        // union: either one
let mode: "light" | "dark";     // literal type: only these exact values

function double(n: number): number {   // parameter type, then return type
  return n * 2;
}</code></pre>
        <ul>
          <li><b>Inference</b>: when the type is obvious, do not annotate. Annotate <b>function parameters</b> (the compiler cannot guess them) and exported return types.</li>
          <li><b>Optional</b>: <code>email?: string</code> means "a string or <code>undefined</code>".</li>
          <li><b>strict mode</b>, always on in this book, turns on every safety check, including the most valuable one: <code>null</code> and <code>undefined</code> are not allowed unless the type says so.</li>
        </ul>
        <h2>Reading an error</h2>
        <p><code>line 3:12  Parameter 'n' implicitly has an 'any' type.  TS7006</code>: where, what, and a code you can search for.
        The first error is usually the real one; later ones are often fallout.</p>
        <div class="senior">Types are <b>documentation that cannot lie</b>: out-of-date comments mislead, but the compiler refuses to build if a type is wrong.
        They also make editors smart (autocomplete, safe renaming across 500 files). The cost is a build step and a learning curve, which
        pays back quickly on any project bigger than a weekend.</div>
        <div class="foot"><span></span><span class="hint">try it →</span></div>`,
      right: `
        <p class="kicker">TypeScript lab · the real compiler</p>
        <h2 style="margin-top:0">Make a mistake and read the error</h2>
        <p>The first load downloads the compiler (about 3 MB, once). Then try: pass a <b>string</b> to <code>double</code>.
        Remove the <code>: number</code> from the parameter. Call <code>double()</code> with no argument. Notice the program still
        <i>runs</i>: type errors are warnings to <b>you</b>, which is exactly why you must not ignore them.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountTsLab(right.querySelector('#lab'), { starter: 'function double(n: number): number {\n  return n * 2;\n}\n\nconsole.log(double(21));\nconsole.log(double("21"));\n' });
      },
    },

    // ───────────────────────── Spread 2: object types, narrowing, unions ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 9 · Modelling with types</p>
        <h1>Shapes, unions and narrowing</h1>
        <p>Describe the <b>shape</b> of an object with an <code>interface</code> (or <code>type</code>):</p>
        <pre><code>interface User {
  name: string;
  email?: string;          // optional
  readonly id: number;     // cannot be changed after creation
}</code></pre>
        <h2>null is where most crashes come from</h2>
        <p>Under strict mode, an optional value has type <code>string | undefined</code>, and the compiler refuses to let you treat it
        like a plain string until you <b>narrow</b> it, proving to the compiler what it really is:</p>
        <pre><code>function domain(user: User): string {
  if (user.email === undefined) {
    return "none";                  // handled
  }
  return user.email.split("@")[1];  // here TypeScript KNOWS it is a string
}</code></pre>
        <p>Narrowing tools: <code>typeof x === "string"</code>, <code>x !== undefined</code>, <code>if (x)</code>, <code>"key" in obj</code>.
        Tony Hoare, who invented null references, called them his "billion-dollar mistake"; strict mode is the fix.</p>
        <h2>Discriminated unions: model "one of several things"</h2>
        <pre><code>type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "square": return s.side ** 2;
  }
}</code></pre>
        <p>The shared <code>kind</code> field is the tag. Inside each <code>case</code> the compiler knows exactly which variant it has.
        Add a third shape later and every <code>switch</code> that forgets it becomes a <b>compile error</b>, so the compiler finds every place you must update.</p>
        <h2>Generics: one function, many types</h2>
        <pre><code>function first&lt;T&gt;(items: T[]): T | undefined {
  return items[0];
}
first([1, 2, 3]);      // T is number
first(["a", "b"]);     // T is string</code></pre>
        <p><code>T</code> is a placeholder the compiler fills in for each call, keeping input and output types connected.</p>
        <div class="warn"><b>Do not lie to the compiler.</b> <code>any</code> switches checking off for a value. <code>x as string</code> only <i>claims</i>
        a type; it converts nothing and checks nothing. And remember: <b>types vanish at runtime</b>, so TypeScript cannot validate data arriving
        from a network or file. <code>JSON.parse</code> returns <code>any</code>: treat such data as <code>unknown</code> and verify it with real code.</div>
        <div class="senior">Make <b>illegal states unrepresentable</b>: if a "circle" can never have a <code>side</code>, design the type so it cannot. Bugs you
        cannot express cannot happen.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">TypeScript lab</p>
        <h2 style="margin-top:0">Let the compiler find the bug</h2>
        <p>This program has a hidden crash: the second user has no email. Read the error. Then fix it by handling the missing case.
        After that, add a <code>"triangle"</code> shape to the union and watch the compiler point at every place that needs updating.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountTsLab(right.querySelector('#lab'), {
          rows: 15,
          starter: 'interface User {\n  name: string;\n  email?: string;\n}\n\nfunction domain(user: User): string {\n  return user.email.split("@")[1];\n}\n\nconsole.log(domain({ name: "Ana", email: "ana@example.com" }));\nconsole.log(domain({ name: "Bo" }));\n\ntype Shape =\n  | { kind: "circle"; radius: number }\n  | { kind: "square"; side: number };\n\nfunction area(s: Shape): number {\n  switch (s.kind) {\n    case "circle": return Math.PI * s.radius ** 2;\n    case "square": return s.side ** 2;\n  }\n}\nconsole.log(area({ kind: "square", side: 3 }));\n',
        });
      },
    },

    // ───────────────────────── Spread 3: TS challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge · TypeScript</p>
        <h1>Make the compiler happy, honestly</h1>
        <p>Each card is broken code. Fix it so that:</p>
        <ol>
          <li>the compiler reports <b>zero errors</b> in strict mode, and</li>
          <li>the program prints exactly the expected output, and</li>
          <li>you did <b>not cheat</b>: no <code>any</code>, no <code>@ts-ignore</code>, no <code>as unknown as</code>.</li>
        </ol>
        <div class="senior">The compiler's message is a hint, not a command. The right fix is usually to <b>change the types to match
        reality</b> (or handle the case you forgot), not to silence the message. Silencing it just moves the crash to production.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">TypeScript challenge</p>
        <div id="cards"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all five to turn the page</span></div>`,
      init(left, right, api) {
        mountTsChallenge(right.querySelector('#cards'), {
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(300); },
          tasks: [
            { question: 'Give average its parameter and return types.',
              starter: 'function average(numbers) {\n  let total = 0;\n  for (const n of numbers) {\n    total += n;\n  }\n  return total / numbers.length;\n}\n\nconsole.log(average([2, 4, 6]));\n',
              expect: ['4'] },
            { question: 'domainOf crashes for users without an email. Return the text after the @, or "none" when there is no email.',
              starter: 'interface User {\n  name: string;\n  email?: string;\n}\n\nfunction domainOf(user: User): string {\n  return user.email.split("@")[1];\n}\n\nconsole.log(domainOf({ name: "Ana", email: "ana@example.com" }));\nconsole.log(domainOf({ name: "Bo" }));\n',
              expect: ['example.com', 'none'] },
            { question: 'describe must format numbers with one decimal (toFixed(1)) and return strings unchanged. Narrow the union.',
              starter: 'function describe(value: string | number): string {\n  return value.toFixed(1);\n}\n\nconsole.log(describe(3.14159));\nconsole.log(describe("hello"));\n',
              expect: ['3.1', 'hello'] },
            { question: 'Finish area for all three shapes. The "rectangle" variant (width, height) is missing from the type: add it.',
              starter: 'type Shape =\n  | { kind: "circle"; radius: number }\n  | { kind: "square"; side: number };\n\nfunction area(shape: Shape): number {\n  // your code\n}\n\nconsole.log(area({ kind: "circle", radius: 1 }).toFixed(2));\nconsole.log(area({ kind: "square", side: 3 }));\nconsole.log(area({ kind: "rectangle", width: 2, height: 5 }));\n',
              rows: 13, expect: ['3.14', '9', '10'] },
            { question: 'Make firstOr generic: it returns the first item, or the fallback when the list is empty. The result type must match the items\' type.',
              starter: 'function firstOr(items, fallback) {\n  return items.length > 0 ? items[0] : fallback;\n}\n\nconsole.log(firstOr([1, 2, 3], 0));\nconsole.log(firstOr(["a", "b"], "z"));\nconsole.log(firstOr([], "none"));\n',
              expect: ['1', 'a', 'none'] },
          ],
        });
      },
    },

    // ───────────────────────── Spread 4: testing ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 9 · Proving it works</p>
        <h1>Automated tests</h1>
        <p>Types catch <i>kinds</i> of mistakes. They cannot know that <code>isLeapYear(1900)</code> should be <code>false</code>.
        For <b>behavior</b> you need <b>tests</b>: small programs that call your code and check the answer. They run in seconds, every time
        you change anything, so you can improve code without fear of silently breaking it.</p>
        <h2>Anatomy of a test</h2>
        <pre><code>describe("sum", () =&gt; {
  test("adds numbers", () =&gt; {
    const result = sum([1, 2, 3]);     // Act: run the code
    expect(result).toBe(6);            // Assert: check the answer
  });
});</code></pre>
        <p>Structure each test as <b>Arrange</b> (set up inputs), <b>Act</b> (call the code), <b>Assert</b> (check). A test fails when an
        <code>expect</code> is wrong or the code throws. Common checks: <code>toBe</code> (same value), <code>toEqual</code> (same contents, for
        arrays and objects), <code>toBeTruthy</code>, <code>toThrow</code>, and <code>.not</code> to negate.</p>
        <h2>What to test</h2>
        <ul>
          <li>The <b>normal</b> case, then the <b>edges</b>: zero, empty, one item, negative, the first and last valid value, and just past each limit.</li>
          <li>The <b>errors</b>: what should happen with bad input?</li>
          <li>One reason to fail per test, and a name that says what broke: <i>"empty list gives 0"</i>, not <i>"test 3"</i>.</li>
        </ul>
        <h2>Test-driven development (TDD)</h2>
        <ol>
          <li><b>Red</b>: write a test for the behavior you want. It fails (nothing exists yet).</li>
          <li><b>Green</b>: write the simplest code that makes it pass.</li>
          <li><b>Refactor</b>: clean up while the tests keep you safe. Repeat.</li>
        </ol>
        <div class="warn"><b>Passing tests prove only the cases you wrote.</b> A test suite can be 100% green and still hide bugs. A good check of your own
        tests: deliberately break the code. If no test turns red, your tests are not testing enough. (You will do exactly this in the challenge.)</div>
        <div class="senior">Aim for many fast <b>unit tests</b> (one function), fewer <b>integration tests</b> (pieces together, like your API plus database), and a
        few <b>end-to-end tests</b> (a real browser clicking through). A flaky test (sometimes red for no reason) is worse than none:
        people learn to ignore red. Fix or delete it. Never let a failing build become normal.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Test lab · a tiny Jest-style framework</p>
        <h2 style="margin-top:0">Write a test, break the code, watch it fail</h2>
        <p>Run the tests. Then break <code>sum</code> on purpose (for example, start <code>total</code> at 1) and read the failure
        message. Then add a test for a negative number and a test for a single-item list.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountTestLab(right.querySelector('#lab'), {
          code: 'function sum(numbers) {\n  let total = 0;\n  for (const n of numbers) {\n    total += n;\n  }\n  return total;\n}',
          tests: 'describe("sum", () => {\n  test("adds numbers", () => {\n    expect(sum([1, 2, 3])).toBe(6);\n  });\n\n  test("an empty list gives 0", () => {\n    expect(sum([])).toBe(0);\n  });\n});',
        });
      },
    },

    // ───────────────────────── Spread 5: test challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge · Testing</p>
        <h1>Make tests pass, then make tests that bite</h1>
        <p>Two skills, both essential:</p>
        <ol>
          <li><b>Make hidden tests pass.</b> Card 1 shows a few tests. The book also runs <i>extra edge-case tests you cannot see</i>
          (their names appear when they fail). Real code is judged by cases you did not anticipate.</li>
          <li><b>Write tests that catch a bug.</b> Cards 2 and 3 hide a function that has a bug. The book runs <b>your tests</b> against the
          <i>correct</i> version (they must all pass) and against the <i>faulty</i> version (at least one must fail). Passing on both means your
          tests are too weak to notice the bug.</li>
        </ol>
        <div class="senior">That second exercise is a cheap form of <b>mutation testing</b>: injecting bugs to measure whether tests can detect them.
        Code coverage only says lines ran; this says whether a mistake would be <i>noticed</i>.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Testing challenge</p>
        <div id="cards"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all three to turn the page</span></div>`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#cards'), {
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(350); },
          tasks: [
            { kind: 'implement', question: 'Implement slugify(title): lowercase words joined by single hyphens, safe for a URL.',
              visible: 'test("lowercases and joins words with hyphens", () => {\n  expect(slugify("Hello World")).toBe("hello-world");\n});\n\ntest("keeps numbers", () => {\n  expect(slugify("Top 10 tips")).toBe("top-10-tips");\n});',
              hidden: 'test("collapses repeated spaces", () => { expect(slugify("a   b")).toBe("a-b"); });\n' +
                'test("trims the ends", () => { expect(slugify("  hi  ")).toBe("hi"); });\n' +
                'test("removes punctuation", () => { expect(slugify("Rock & Roll!")).toBe("rock-roll"); });\n' +
                'test("no hyphens at the start or end", () => { expect(slugify("--x--")).toBe("x"); });\n' +
                'test("an empty title gives an empty slug", () => { expect(slugify("")).toBe(""); });\n' +
                'test("leaves an existing slug alone", () => { expect(slugify("a-b")).toBe("a-b"); });\n' +
                'test("collapses a spaced hyphen", () => { expect(slugify("a - b")).toBe("a-b"); });',
              starter: 'function slugify(title) {\n  // your code\n}', rows: 7 },
            { kind: 'catch', question: 'Write tests for isLeapYear(year) that would catch a faulty implementation. (Leap years: divisible by 4, except centuries, unless divisible by 400.)',
              signature: 'isLeapYear(year: number): boolean',
              correct: 'function isLeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }',
              buggy: 'function isLeapYear(y) { return y % 4 === 0; }',
              minTests: 3,
              starter: 'test("2024 is a leap year", () => {\n  expect(isLeapYear(2024)).toBe(true);\n});\n\n// add more tests here\n', rows: 9 },
            { kind: 'catch', question: 'Write tests for clamp(n, min, max), which limits n to the range min..max. Catch the faulty version.',
              signature: 'clamp(n: number, min: number, max: number): number',
              correct: 'function clamp(n, min, max) { if (n < min) return min; if (n > max) return max; return n; }',
              buggy: 'function clamp(n, min, max) { if (n < min) return min; if (n > max) return min; return n; }',
              minTests: 3,
              starter: 'test("a number inside the range is unchanged", () => {\n  expect(clamp(5, 0, 10)).toBe(5);\n});\n\n// add more tests here\n', rows: 9 },
          ],
        });
      },
    },

    // ───────────────────────── Spread 6: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Four questions on what types and tests do, and do <b>not</b>, guarantee. Knowing a tool's limits is what makes you trust it correctly.</p>
        <div class="senior">Types prove the <i>shape</i> of your data. Tests prove <i>behavior</i> in the cases you thought of. Code review and
        careful design cover what is left. No single safety net is enough, and good engineers layer them.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Your TypeScript has a type error, but your build tool compiles it to JavaScript anyway and you run the result. What happens at runtime?</p>',
            options: ['The program refuses to start', 'It runs as ordinary JavaScript: types were deleted, so the error never reaches runtime', 'TypeScript converts the value to the right type', 'It runs slower'], answer: 1,
            why: 'Types exist only for the compiler. Once erased, the JavaScript does whatever JavaScript does, including crashing. That is why you fix errors instead of ignoring them.' },
          { prompt: '<pre><code>const data = JSON.parse(text);\ndata.user.name.toUpperCase();</code></pre><p>Will TypeScript warn you if <code>user</code> is missing in the real data?</p>',
            options: ['Yes, strict mode catches it', 'No: JSON.parse returns any, so nothing is checked. Validate the data at runtime', 'Yes, but only with an interface', 'Only in the editor'], answer: 1,
            why: 'Types cannot see runtime data. JSON.parse returns any, which switches checking off. Treat external data as unknown and verify it before using it.' },
          { prompt: '<p>All 12 of your tests are green. What does that prove?</p>',
            options: ['The code has no bugs', 'Only that those 12 cases behave as expected: bugs can hide in cases you did not test', 'The code is fast', 'The types are correct'], answer: 1,
            why: 'Tests demonstrate presence of correct behavior in the cases you wrote, never the absence of bugs. Edge cases and "break it on purpose" checks widen the net.' },
          { prompt: '<p>In test-driven development, what do you do first?</p>',
            options: ['Write the implementation', 'Write a failing test for the behavior you want', 'Write the documentation', 'Run the type checker'], answer: 1,
            why: 'Red, green, refactor. Starting with a failing test proves the test can fail and pins down exactly what "done" means.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(350); });
      },
    },
  ],
};
