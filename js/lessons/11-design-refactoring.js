// Lesson 11 — Design and refactoring: code that is cheap to change.
import { mountQuiz } from '../workbench.js';
import { mountSmellLab, mountRefactor } from '../refactorlab.js';
import { mountTestChallenge } from '../tslab.js';
import { CALC_CASES } from './data/calc-cases.js';

// The messy function used on the first lab page and again in the challenge.
const MESSY_CALC = `function calc(o) {
  let t = 0;
  for (let i = 0; i < o.items.length; i++) {
    t = t + o.items[i].price * o.items[i].qty;
  }
  if (o.coupon === "SAVE10") {
    t = t - t * 0.1;
  } else if (o.coupon === "SAVE20") {
    t = t - t * 0.2;
  } else if (o.coupon === "BIGSALE") {
    t = t - t * 0.25;
  } else if (o.coupon === "VIP") {
    if (o.customer.years > 5) {
      t = t - t * 0.25;
    } else {
      t = t - t * 0.15;
    }
  }
  if (o.country === "US") {
    if (t > 100) {
      t = t + 0;
    } else {
      t = t + 7.5;
    }
  } else if (o.country === "CA") {
    if (t > 150) {
      t = t + 0;
    } else {
      t = t + 12;
    }
  } else {
    t = t + 25;
  }
  t = t + t * 0.08;
  return Math.round(t * 100) / 100;
}`;

const mk = (price, qty, coupon, country, years) => JSON.stringify({ items: [{ price, qty }], coupon, country, customer: { years } });
const CALC_VISIBLE = [
  ['small US order pays shipping', mk(50, 2, null, 'US', 1), 116.1],
  ['big US order ships free', mk(50, 4, null, 'US', 1), 216],
  ['SAVE10 to Canada', mk(100, 2, 'SAVE10', 'CA', 1), 194.4],
  ['long-time VIP discount', mk(40, 1, 'VIP', 'FR', 8), 59.4],
  ['newer VIP discount', mk(40, 1, 'VIP', 'FR', 2), 63.72],
].map(([name, order, e]) => 'test(' + JSON.stringify(name) + ', () => { expect(calc(' + order + ')).toBeCloseTo(' + e + ', 2); });').join('\n');
const CALC_HIDDEN = 'const CASES = ' + JSON.stringify(CALC_CASES) + ';\nCASES.forEach(([order, expected], i) => {\n  test("order #" + (i + 1) + " (" + order.country + ", coupon " + order.coupon + ")", () => {\n    expect(calc(order)).toBeCloseTo(expected, 2);\n  });\n});';

const PRICE_CODE = `function price(type, qty) {
  if (type === "book") {
    if (qty > 10) {
      return qty * 8 * 0.9;
    } else {
      return qty * 8;
    }
  } else if (type === "pen") {
    if (qty > 10) {
      return qty * 2 * 0.9;
    } else {
      return qty * 2;
    }
  } else {
    return qty * 5;
  }
}`;
const PRICE_VISIBLE = 'test("2 books", () => { expect(price("book", 2)).toBeCloseTo(16); });\n' +
  'test("bulk books get 10% off", () => { expect(price("book", 11)).toBeCloseTo(79.2); });\n' +
  'test("bulk pens get 10% off", () => { expect(price("pen", 11)).toBeCloseTo(19.8); });\n' +
  'test("3 pens", () => { expect(price("pen", 3)).toBeCloseTo(6); });\n' +
  'test("other items cost 5 each", () => { expect(price("cup", 3)).toBeCloseTo(15); });';
const PRICE_HIDDEN = 'test("10 books is NOT bulk", () => { expect(price("book", 10)).toBeCloseTo(80); });\n' +
  'test("10 pens is NOT bulk", () => { expect(price("pen", 10)).toBeCloseTo(20); });\n' +
  'test("zero books", () => { expect(price("book", 0)).toBeCloseTo(0); });\n' +
  'test("100 books", () => { expect(price("book", 100)).toBeCloseTo(720); });\n' +
  'test("other items get NO bulk discount (a quirk, but it is the current behavior)", () => { expect(price("cup", 11)).toBeCloseTo(55); });';

export const lesson = {
  id: 'l11',
  title: 'Lesson 11 · Design & refactoring',
  spreads: [
    // ───────────────────────── Spread 1: principles + smell lab ─────────────────────────
    {
      left: `
        <p class="kicker">Part 2 · Design for change</p>
        <h1>What "good design" actually means</h1>
        <p>Code is <b>read about ten times more than it is written</b>, and every working program is <b>changed</b> again and again: new rules, new
        countries, new bugs. So the useful definition of good design is not "elegant" or "clever". It is: <b>cheap and safe to change</b>.</p>
        <h2>The ideas that matter</h2>
        <ul>
          <li><b>Cohesion</b>: things that change together live together. A function (or module) should do <b>one job</b>, so it has <b>one reason to change</b>. This is the "single responsibility" principle.</li>
          <li><b>Coupling</b>: how much one part must know about another. Low coupling means you can change one without breaking five others. Parts should talk through small, stable <b>interfaces</b> and hide their insides (<b>information hiding</b>).</li>
          <li><b>Levels of abstraction</b>: a function should read like an outline at <i>one</i> level: <code>validate(order); applyDiscount(order); addShipping(order);</code>, not mix that with array index arithmetic.</li>
          <li><b>Pure core, thin edges</b>: put decisions in <b>pure functions</b> (same input, same output, no side effects) and push I/O (database, clock, network) to the edges. Pure code is trivial to test.</li>
          <li><b>Names are design</b>: <code>discountedTotal</code> beats <code>t</code>. If you cannot name it, you do not understand it yet.</li>
        </ul>
        <h2>DRY, YAGNI, and the cost of the wrong abstraction</h2>
        <p><b>DRY</b>: every piece of <i>knowledge</i> should have one home, so a rule changes in one place. But <b>two pieces of code that merely look alike are not duplicate knowledge</b>.
        Merging them couples things that may need to diverge, and "the wrong abstraction is far more expensive than duplication". A good rule: wait for the <b>third</b> repetition.
        <b>YAGNI</b>: do not build for needs you only imagine.</p>
        <h2>Smells: signals, not sins</h2>
        <p>Long functions, deep nesting, many decision paths, magic numbers, duplicated code, vague names, long parameter lists. Tools can <b>measure</b> them (try the panel on the right).</p>
        <div class="warn">Metrics find <b>suspects</b>, never proof. Chase the number alone and you get absurd code (Goodhart's law: "when a measure becomes a target, it ceases to be a good measure").
        Use them to decide where to <i>look</i>, then use judgment.</div>
        <div class="senior">The best code review question is not "is this correct?" but <b>"how will this need to change, and what will that cost?"</b> Design is a bet about the future. Keep
        the bet small: simple code, clear names, tests, and no abstraction before you have seen it needed.</div>
        <div class="foot"><span></span><span class="hint">measure some code →</span></div>`,
      right: `
        <p class="kicker">Smell lab · the real syntax tree</p>
        <h2 style="margin-top:0">Measure this function</h2>
        <p>This price calculator works, but how <b>healthy</b> is it? Read the table: red cells are past the rule of thumb. The panel parses real syntax, so it
        counts decisions exactly. Edit the code (rename, extract) and watch the numbers move. This is the function you will refactor in the challenge.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountSmellLab(right.querySelector('#lab'), { starter: MESSY_CALC, rows: 16 }); },
    },

    // ───────────────────────── Spread 2: refactoring techniques + lab ─────────────────────────
    {
      left: `
        <p class="kicker">Part 2 · Changing structure safely</p>
        <h1>Refactoring</h1>
        <p><b>Refactoring</b> means changing the <b>structure</b> of code <b>without changing its behavior</b>, in many small steps. Nothing gets faster, nothing gains a feature: the code just becomes
        easier to understand and change. It is only safe with a <b>safety net of tests</b>: after every small step, run them. Green? Commit. Red? Undo and take a smaller step.</p>
        <p>Wear <b>one hat at a time</b>: either you are adding behavior (and tests change) or you are refactoring (tests must not change). Mixing them is how bugs hide.</p>
        <h2>The core moves</h2>
        <pre><code>// Rename: say what it is.             t → discountedTotal
// Extract function: name a chunk.     const fee = shippingFee(country, total);
// Magic number → named constant:      0.08  →  const TAX_RATE = 0.08;</code></pre>
        <p><b>Guard clauses</b> flatten nesting: handle the odd case first and leave.</p>
        <pre><code>// before                              // after
if (user) {                             if (!user) return "guest";
  if (user.active) {                    if (!user.active) return "inactive";
    return "ok";                        return "ok";
  } else { return "inactive"; }
} else { return "guest"; }</code></pre>
        <p><b>Replace a conditional chain with a lookup table</b>: data instead of branches.</p>
        <pre><code>const RATES = { SAVE10: 0.1, SAVE20: 0.2 };
const rate = RATES[coupon] ?? 0;      // no if / else if needed</code></pre>
        <p>Others: <b>parameter object</b> (group <code>(a, b, c, d, e)</code> into one object), <b>separate calculating from printing</b>, <b>inline</b> a pointless helper.</p>
        <div class="warn">A refactoring keeps <b>every</b> behavior, even the strange ones. In the lab, cups get no bulk discount: it looks like a bug, but changing it is a <i>feature change</i>
        that needs its own decision and its own test, not a quiet side effect of "cleanup". The tests record what the code <i>does</i> today (<b>characterization tests</b>), so you notice if you alter it.</div>
        <div class="senior">When <b>not</b> to refactor: code with no tests (add tests first, even rough ones), code you are about to delete, and the night before a release. Leave code a little better than you found it
        (the "boy scout rule"), and as Kent Beck put it: <b>"make the change easy, then make the easy change."</b> Refactor first, then add the feature.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Refactoring lab</p>
        <h2 style="margin-top:0">Same behavior, better shape</h2>
        <p>Five visible tests and five hidden ones guard the behavior. Make all the goals tick: try a lookup table plus named constants. Press the button after
        every small change, like a real refactoring session.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        const limits = { lines: 10, complexity: 4, depth: 1, params: 3 };
        mountRefactor(right.querySelector('#lab'), {
          code: PRICE_CODE, visible: PRICE_VISIBLE, hidden: PRICE_HIDDEN, limits, rows: 15,
          criteria: [
            { label: 'Behavior unchanged: all tests pass', check: (a, ok) => ok },
            { label: 'No function has more than 4 decision paths', check: (a) => a.functions.length > 0 && a.functions.every((f) => f.complexity <= 4) },
            { label: 'No nesting deeper than 1 level (hint: guard clause, or no if at all)', check: (a) => a.functions.every((f) => f.depth <= 1) },
            { label: 'No magic numbers (name every constant, e.g. BULK_DISCOUNT)', check: (a) => a.magic.length === 0 },
            { label: 'No duplicated statements', check: (a) => a.duplicates.length === 0 },
          ],
        });
      },
    },

    // ───────────────────────── Spread 3: challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge</p>
        <h1>Refactor under a safety net</h1>
        <p><b>Card 1.</b> Refactor the order calculator you measured earlier. The public function must stay <code>calc(order)</code>, and its behavior must stay identical on <b>82 order scenarios</b> (5
        visible, 77 hidden). At the same time the design must meet every goal: short functions, few decisions, shallow nesting, no magic numbers, no duplicates, no vague names.</p>
        <p>Work like a pro: <b>one small step, then press Check</b>. Rename first (safe), then name the constants, then extract <code>discountRate</code>, <code>shippingFee</code>, <code>subtotal</code>…
        Lookup tables and guard clauses will do the heavy lifting.</p>
        <p><b>Card 2.</b> A function that reads the clock is hard to test, because its answer depends on <i>when you run it</i>. Fix that with <b>dependency injection</b>: pass the time in, with a default for production.</p>
        <pre><code>function greeting(now = new Date()) { ... uses now ... }</code></pre>
        <div class="senior">Anything the outside world controls (time, randomness, network, disk) is a <b>dependency</b>. Passing dependencies <i>in</i> instead of reaching <i>out</i> for them is the single
        most useful design trick for testable code. It is how professionals test "what happens at midnight on New Year's Eve" without waiting for it.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Refactoring challenge</p>
        <div class="label">Card 1 · refactor calc</div>
        <div id="a"></div>
        <div class="label" style="margin-top:18px">Card 2 · make greeting testable</div>
        <div id="b"></div>
        <div class="foot"><span class="hint" id="gateHint">complete both cards to turn the page</span></div>`,
      init(left, right, api) {
        let doneA = false, doneB = false;
        const check = () => { if (doneA && doneB) { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(450); } };
        mountRefactor(right.querySelector('#a'), {
          code: MESSY_CALC, visible: CALC_VISIBLE, hidden: CALC_HIDDEN, limits: { lines: 12, complexity: 6, depth: 2, params: 4 }, rows: 24,
          onPass: () => { doneA = true; check(); },
          criteria: [
            { label: 'Behavior unchanged: all 82 tests pass', check: (a, ok) => ok },
            { label: 'No function longer than 12 lines', check: (a) => a.functions.length > 0 && a.functions.every((f) => f.lines <= 12) },
            { label: 'No function with more than 6 decision paths', check: (a) => a.functions.every((f) => f.complexity <= 6) },
            { label: 'No nesting deeper than 2 levels', check: (a) => a.functions.every((f) => f.depth <= 2) },
            { label: 'No magic numbers (named constants or lookup tables: yes, even the 100 in the cents rounding)', check: (a) => a.magic.length === 0 },
            { label: 'No duplicated statements', check: (a) => a.duplicates.length === 0 },
            { label: 'At least 3 functions (extract helpers, keep calc as the entry point)', check: (a) => a.functions.length >= 3 },
            { label: 'Descriptive names: no vague names like o, t, data, tmp', check: (a) => a.vague.length === 0 },
          ],
        });
        mountTestChallenge(right.querySelector('#b'), {
          onPass: () => { doneB = true; check(); },
          tasks: [
            { kind: 'implement', question: 'greeting() uses the real clock, so it cannot be tested. Change it to greeting(now), a Date passed in (default: the current time). Morning before 12:00, afternoon before 18:00, otherwise evening.',
              visible: 'test("9am is morning", () => { expect(greeting(new Date(2026, 0, 1, 9, 0))).toBe("Good morning"); });\ntest("2pm is afternoon", () => { expect(greeting(new Date(2026, 0, 1, 14, 0))).toBe("Good afternoon"); });\ntest("8pm is evening", () => { expect(greeting(new Date(2026, 0, 1, 20, 0))).toBe("Good evening"); });',
              hidden: 'test("midnight is morning", () => { expect(greeting(new Date(2026, 5, 1, 0, 0))).toBe("Good morning"); });\n' +
                'test("11:59 is still morning", () => { expect(greeting(new Date(2026, 5, 1, 11, 59))).toBe("Good morning"); });\n' +
                'test("noon sharp is afternoon", () => { expect(greeting(new Date(2026, 5, 1, 12, 0))).toBe("Good afternoon"); });\n' +
                'test("17:59 is still afternoon", () => { expect(greeting(new Date(2026, 5, 1, 17, 59))).toBe("Good afternoon"); });\n' +
                'test("6pm sharp is evening", () => { expect(greeting(new Date(2026, 5, 1, 18, 0))).toBe("Good evening"); });\n' +
                'test("still works with no argument", () => { expect(typeof greeting()).toBe("string"); });',
              starter: 'function greeting() {\n  const hour = new Date().getHours();\n  if (hour < 12) return "Good morning";\n  if (hour < 18) return "Good afternoon";\n  return "Good evening";\n}', rows: 8 },
          ],
        });
      },
    },

    // ───────────────────────── Spread 4: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Judgment calls</h1>
        <p>Design has few right answers and many <b>trade-offs</b>. These four questions are about choosing well, not about syntax.</p>
        <div class="senior">Juniors ask "what is the correct pattern?" Seniors ask "what are we optimizing for, and what does this cost us later?" Notice how each answer below is about
        <i>cost of change</i>.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Two functions look almost the same, but one applies the <b>tax</b> rule and the other the <b>shipping</b> rule, which change for different reasons. A teammate wants to merge them into one flexible function. Best response?</p>',
            options: ['Merge them: duplication is always bad', 'Leave them separate: similar-looking code can be different knowledge, and merging couples rules that will diverge', 'Delete one of them', 'Copy-paste a third version'], answer: 1,
            why: 'DRY is about knowledge, not about text. Coupling two rules that change independently creates a harder-to-change abstraction than the small duplication it removes.' },
          { prompt: '<p>Which of these is a <b>refactoring</b>?</p>',
            options: ['Adding a discount code feature', 'Extracting a helper function and renaming variables, with all tests still passing and unchanged', 'Fixing a bug in the tax calculation', 'Making the page 30% faster by caching'], answer: 1,
            why: 'Refactoring changes structure only. Features, bug fixes and performance work all change behavior, so they are different kinds of change, with their own tests.' },
          { prompt: '<p>One function validates input, writes to the database, sends an email and formats the receipt. Which principle does it break, and what should you do?</p>',
            options: ['It is fine: all four steps are related', 'Single responsibility: split it so each part has one reason to change, and test each separately', 'DRY: remove the email step', 'YAGNI: delete the receipt'], answer: 1,
            why: 'Four jobs means four reasons to change and one tangled test. Splitting them gives clear names and lets you test the pure parts without a database or email server.' },
          { prompt: '<p>Your team wants to add a new feature to some messy, untested code. According to "make the change easy, then make the easy change", what do you do first?</p>',
            options: ['Add the feature directly, quickly', 'Add characterization tests, refactor until the feature has an easy place to go (tests green), then add the feature', 'Rewrite everything from scratch', 'Add comments explaining the mess'], answer: 1,
            why: 'Pin down current behavior with tests, restructure in small safe steps so the new change is simple, then make it. Rewrites throw away years of hidden bug fixes.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(450); });
      },
    },
  ],
};
