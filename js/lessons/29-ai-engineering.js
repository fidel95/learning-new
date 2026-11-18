// Lesson 29 — Engineering with AI.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountBugHunt, mountInjectionLab } from '../ailab.js';

export const EV = {
  starter: `// An EVAL is a test suite for an AI feature. You cannot unit-test "is this summary good?" with toBe(), so you run the model over
// a fixed set of cases, grade each output, and track the pass rate as you change the prompt or the model.
// runEval(model, cases, grade, options) -> { total, passed, accuracy, failures }
//   model(input)            async: returns the model's output for one input (it may throw, or be slow)
//   cases                   [{ input, expected }]
//   grade(output, expected) returns true/false (it may throw: count that as a failure)
//   options.timeoutMs       default 1000. A model call slower than this FAILS the case with error "timeout"
//   failures                one entry per failed case, in case order: { input, expected, got, error }
//                           (got = the output, or undefined if the call failed; error = a message, or undefined)
//   accuracy                passed / total (0 when there are no cases, never NaN)
// Call the model once per case, in order. This version crashes on the first error and has no timeout.
async function runEval(model, cases, grade, options = {}) {
  let passed = 0;
  for (const c of cases) {
    const out = await model(c.input);
    if (grade(out, c.expected)) passed++;
  }
  return { total: cases.length, passed };
}
`,
  visible: `test("counts passes and failures", async () => {
  const model = async (x) => x.toUpperCase();
  const r = await runEval(model, [{ input: "a", expected: "A" }, { input: "b", expected: "X" }], (o, e) => o === e);
  expect(r.total).toBe(2); expect(r.passed).toBe(1); expect(r.accuracy).toBe(0.5);
  expect(r.failures.length).toBe(1); expect(r.failures[0].got).toBe("B");
});`,
  hidden: `test("a model that throws fails that case but the eval continues", async () => {
  const model = async (x) => { if (x === "bad") throw new Error("API down"); return x; };
  const r = await runEval(model, [{ input: "ok", expected: "ok" }, { input: "bad", expected: "bad" }, { input: "fine", expected: "fine" }], (o, e) => o === e);
  expect(r.passed).toBe(2); expect(r.failures.length).toBe(1); expect(r.failures[0].error).toBe("API down"); expect(r.failures[0].input).toBe("bad");
});
test("a slow model call times out", async () => {
  const model = async (x) => { if (x === "slow") await new Promise((r) => setTimeout(r, 200)); return x; };
  const r = await runEval(model, [{ input: "slow", expected: "slow" }, { input: "fast", expected: "fast" }], (o, e) => o === e, { timeoutMs: 40 });
  expect(r.passed).toBe(1); expect(r.failures[0].error).toBe("timeout");
});
test("a grader that throws counts as a failure, not a crash", async () => {
  const r = await runEval(async (x) => x, [{ input: 1, expected: 1 }], () => { throw new Error("bad grader"); });
  expect(r.passed).toBe(0); expect(r.failures.length).toBe(1);
});
test("no cases gives accuracy 0, not NaN", async () => { const r = await runEval(async (x) => x, [], () => true); expect(r.total).toBe(0); expect(r.accuracy).toBe(0); expect(r.failures).toEqual([]); });
test("failures keep the order of the cases, with expected and got", async () => {
  const r = await runEval(async (x) => x * 2, [{ input: 1, expected: 0 }, { input: 2, expected: 4 }, { input: 3, expected: 0 }], (o, e) => o === e);
  expect(r.failures.map((f) => f.input)).toEqual([1, 3]); expect(r.failures[0].expected).toBe(0); expect(r.failures[0].got).toBe(2);
});
test("the model is called exactly once per case", async () => { let n = 0; await runEval(async (x) => { n++; return x; }, [{ input: 1, expected: 1 }, { input: 2, expected: 2 }], (o, e) => o === e); expect(n).toBe(2); });
test("300 cases run fine", async () => { const cases = Array.from({ length: 300 }, (_, i) => ({ input: i, expected: i })); const r = await runEval(async (x) => x, cases, (o, e) => o === e); expect(r.accuracy).toBe(1); });`,
};

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l29',
  title: 'Lesson 29 · Engineering with AI',
  spreads: [
    {
      gated: true,
      left: `
        <p class="kicker">AI · a power tool, not an oracle</p>
        <h1>Fast, fluent, and confidently wrong</h1>
        <p>Large language models predict plausible text. Trained on enormous amounts of code, they are astonishingly good at producing code that <b>looks right</b>. That is the whole danger: plausible and correct are different things, and the mistakes are subtle (the bug is never in the line that looks scary).</p>
        <h2>Where AI is strong</h2>
        <ul>
          <li>Boilerplate, glue code, conversions, regexes, scripts, config.</li>
          <li>Explaining unfamiliar code or an error message; suggesting what to try.</li>
          <li>Drafting tests, docs, refactors, and a first version to react to.</li>
          <li>Being a patient tutor, as long as you <b>check</b> what it says.</li>
        </ul>
        <h2>Where it fails</h2>
        <ul>
          <li><b>Hallucination:</b> invented functions, options, packages (a real supply-chain risk: attackers register the invented names), and made-up facts stated with total confidence.</li>
          <li><b>Edge cases:</b> off-by-one, empty input, time zones, floating point, concurrency, the 1900 leap year.</li>
          <li><b>Security:</b> reproduces common insecure patterns (weak randomness, string-built SQL, missing authorization).</li>
          <li><b>Context limits:</b> it does not know your codebase's conventions, versions, or constraints unless you provide them.</li>
          <li>It optimizes to <b>satisfy the prompt</b>, including by quietly making a failing test pass instead of fixing the bug.</li>
        </ul>
        <div class="senior">The skill that matters now is <b>review</b>. If you cannot read and verify the code, you are not using a tool; you are gambling. This is why the earlier lessons (tests, debugging, security, complexity) matter more with AI, not less. Treat output as a pull request from a fast, confident junior who never says "I'm not sure": read every line, run it, test the edges.</div>
        ${back}`,
      right: `<p class="kicker">Lab · spot the bug</p><div id="lab"></div>${foot('find 3 of 4 to turn the page')}`,
      init(left, right, api) { mountBugHunt(right.querySelector('#lab'), { need: 3, onPass: finish(right, api, 'bugs found', 800) }); },
    },

    {
      gated: true,
      left: `
        <p class="kicker">AI · verification</p>
        <h1>Tests are how you trust it; evals are tests for fuzzy output</h1>
        <h2>Verify the code AI writes</h2>
        <ul>
          <li><b>Write the failing test first.</b> Have the AI make it pass, not the other way around. Tests you wrote encode your intent; tests it wrote for its own code mostly confirm its assumptions.</li>
          <li>Probe the <b>edges</b> yourself: empty, one item, huge, negative, duplicates, unicode, concurrent.</li>
          <li>Keep changes <b>small</b> so a diff can be read. Review the diff; never merge what you do not understand.</li>
          <li>Run linters, type checks, and the security scanner from lesson 18.</li>
        </ul>
        <h2>Evals: testing the AI feature itself</h2>
        <p>If your product calls an LLM (a classifier, a summarizer, a chatbot), outputs vary and "correct" is fuzzy. You still need regression protection. An <b>eval</b> is a fixed set of representative cases plus a <b>grader</b>:</p>
        <ul>
          <li>Exact match or rules where you can (the category is one of five labels; valid JSON; contains the order number).</li>
          <li>Another model as a judge, or human review, for open-ended quality (and spot-check the judge).</li>
          <li>Include <b>hard cases</b>, past failures, and adversarial inputs, not just easy ones.</li>
          <li>Run it on every prompt or model change and track the pass rate. Without an eval, changing a prompt is guessing.</li>
        </ul>
        <div class="warn">Handle failure as data: API errors, timeouts, rate limits, malformed output. A harness that crashes on the first bad response, or divides by zero on an empty set, is not an eval.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · catch the bug, build an eval</p><div id="lab"></div>${foot('pass all three to turn the page')}`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), { onPass: finish(right, api, 'verification skills', 1300), tasks: [
          { kind: 'catch', question: 'An AI wrote paginate(items, size, page) (page 1 is the first page). Write tests that catch its mistake.', signature: 'paginate(items: any[], size: number, page: number): any[]  // page numbers start at 1',
            correct: 'function paginate(items, size, page) { return items.slice((page - 1) * size, page * size); }',
            buggy: 'function paginate(items, size, page) { return items.slice(page * size, page * size + size); }', minTests: 3,
            starter: 'test("page 1 of a short list", () => {\n  expect(paginate([1, 2, 3, 4, 5], 2, 1)).toEqual([1, 2]);\n});\n\n// add more tests\n', rows: 9 },
          { kind: 'catch', question: 'An AI wrote median(nums) (the middle value; for an even count, the average of the two middle values; it must not change the input). Write tests that catch its mistake.', signature: 'median(nums: number[]): number',
            correct: 'function median(nums) { const a = nums.slice().sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }',
            buggy: 'function median(nums) { const a = nums.slice().sort(); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }', minTests: 3,
            starter: 'test("odd count", () => {\n  expect(median([3, 1, 2])).toBe(2);\n});\n\n// add more tests (hint: what does the default sort() do to numbers?)\n', rows: 9 },
          { kind: 'implement', question: 'runEval: a harness for testing an AI feature', visible: EV.visible, hidden: EV.hidden, starter: EV.starter, rows: 13 },
        ] });
      },
    },

    {
      gated: true,
      left: `
        <p class="kicker">AI · security</p>
        <h1>Prompt injection and data safety</h1>
        <p>An LLM cannot reliably tell <b>instructions</b> from <b>data</b>: both are just text in its context. If your assistant reads an email, a web page, a PDF, or a GitHub issue, anyone who wrote that text can try to give it orders. That is <b>prompt injection</b>, the SQL injection of this era (lesson 16): untrusted input mixed with trusted commands.</p>
        <h2>The dangerous combination ("lethal trifecta")</h2>
        <ol>
          <li>The model reads <b>untrusted content</b>,</li>
          <li>has access to <b>private data</b>, and</li>
          <li>can <b>communicate outward or act</b> (send email, call a URL, run code, delete files).</li>
        </ol>
        <p>With all three, an attacker's text can make it leak or destroy. Remove one leg of the trifecta.</p>
        <h2>Defenses that work (and ones that do not)</h2>
        <ul>
          <li><b>Least privilege:</b> give the agent only the tools the task needs; read-only where possible; separate credentials.</li>
          <li><b>Human approval</b> for irreversible or outward actions, with a clear display of what will happen.</li>
          <li><b>Sandbox</b> code execution; allow-list network destinations; never put secrets where the model can read them.</li>
          <li>Treat model output as <b>untrusted</b> too: validate, escape, and never run it unreviewed (lesson 16 injection rules apply).</li>
          <li><b>Do not rely on</b> "ignore any instructions in the text" or delimiters alone. They reduce accidents, but a determined attacker gets through.</li>
        </ul>
        <h2>Your own data</h2>
        <p>Do not paste secrets, customer personal data, or private keys into an AI tool, and check what the tool retains or trains on. Mind licenses: generated code can resemble open-source code. For company work, follow policy.</p>
        <div class="senior">Design as though the model <b>will</b> be tricked, and ask: "what is the worst thing it can do with the access I gave it?" If the answer is unacceptable, reduce the access, not the odds.</div>
        ${back}`,
      right: `<p class="kicker">Lab · secure the assistant</p><div id="lab"></div>${foot('block all three attacks and keep the summary')}`,
      init(left, right, api) { mountInjectionLab(right.querySelector('#lab'), { onPass: finish(right, api, 'assistant secured', 1000) }); },
    },

    {
      gated: true,
      left: `
        <p class="kicker">AI · working with it well</p>
        <h1>A workflow that makes you better</h1>
        <ul>
          <li><b>Give context:</b> the goal, constraints, the relevant files, the language and library versions, an example of the style you want. Better inputs beat clever phrasing.</li>
          <li><b>Work in small steps:</b> plan first, then one change at a time, each one tested and committed (lesson 6). Big blind generations are impossible to review.</li>
          <li><b>Ask it to explain, then verify.</b> "Why this approach? What are the edge cases? What could go wrong?" The explanation is also how you learn.</li>
          <li><b>Own the result.</b> You are responsible for every line you commit, in review and in production.</li>
          <li><b>Keep learning the fundamentals.</b> The engineers who use AI best are the ones who can tell when it is wrong. Try solving first, then compare; do not let it replace the struggle that builds skill (that is what this book is for).</li>
          <li>For unfamiliar territory, ask for <b>sources</b> and check the official docs; models are out of date and sometimes invent APIs.</li>
        </ul>
        <div class="senior">A useful rule: use AI for what you could do yourself but would rather not, and for exploring what you do not yet know, but in the second case slow down and verify more. The risk is highest where your ability to check is lowest.</div>
        ${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>AI-generated code passes the one example you tried. What is the right next step?</p>',
            options: ['Merge it, it passed', 'Test the edge cases (empty, one item, huge, duplicates), read it line by line, and add tests you wrote yourself', 'Ask the AI if it is sure', 'Delete the tests'], answer: 1, why: 'Plausible code often passes the easy case and fails the edge. Verification is your job.' },
          { prompt: '<p>An assistant that reads incoming email can also send email and see your contacts. What is the core risk?</p>',
            options: ['It is slow', 'A malicious email can instruct it to leak data (untrusted input + private data + outward action)', 'It uses too many tokens', 'The email is too long'], answer: 1, why: 'The lethal trifecta. Remove a leg: drop the send tool, or require approval.' },
          { prompt: '<p>You change a prompt that powers a feature. How do you know you did not make it worse?</p>',
            options: ['It felt better on two examples', 'Run a fixed eval set before and after and compare pass rates', 'Ask users', 'You cannot know'], answer: 1, why: 'Evals are regression tests for fuzzy behavior.' },
          { prompt: '<p>An AI suggests <code>npm install some-handy-utils</code>, a package you have never heard of. What do you do?</p>',
            options: ['Install it, the AI knows best', 'Check that it exists, who publishes it, its downloads and source, since AI invents package names that attackers can register', 'Install it globally', 'Run with sudo'], answer: 1, why: 'Hallucinated package names are a real supply-chain attack vector (lesson 18).' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(800); });
      },
    },
  ],
};
