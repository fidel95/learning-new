// Lesson 10 — Debugging and incident response: how engineers actually find and fix problems.
import { mountWorkbench, mountQuiz } from '../workbench.js';
import { mountBisect, mountIncident } from '../debuglab.js';
import { mountTestChallenge } from '../tslab.js';

export const lesson = {
  id: 'l10',
  title: 'Lesson 10 · Debugging & incidents',
  spreads: [
    // ───────────────────────── Spread 1: the method ─────────────────────────
    {
      left: `
        <p class="kicker">Part 2 · Software engineering</p>
        <h1>Debugging is a method, not a talent</h1>
        <p>Part 1 taught you to <i>write</i> programs. Professional engineers spend most of their time on something else:
        <b>understanding code that does not do what they expected</b>. A bug is only a gap between your <b>mental model</b> of the program and
        what it really does. Debugging is the disciplined hunt for where the model is wrong.</p>
        <h2>The loop</h2>
        <ol>
          <li><b>Reproduce.</b> Make it fail on demand, with the smallest input you can. A bug you cannot reproduce, you cannot fix, and you cannot know you fixed.</li>
          <li><b>Observe.</b> Read the <i>whole</i> error and the stack trace (from the top: where it died, then who called it). Look at logs and actual values.</li>
          <li><b>Hypothesize.</b> State one specific, <i>testable</i> guess: "count goes up even for negative numbers".</li>
          <li><b>Experiment.</b> Change one thing, or add one log or breakpoint, to prove or kill the guess. Never change five things at once.</li>
          <li><b>Fix the cause, not the symptom.</b> Ask "why?" until you reach something you could prevent (the "5 whys").</li>
          <li><b>Prove and prevent.</b> Add a test that failed before and passes now, so it can never return silently.</li>
        </ol>
        <h2>Your toolbox</h2>
        <ul>
          <li><b>Print and logs</b>: the oldest tool, still the most used. Log <i>values</i>, not "got here".</li>
          <li><b>A debugger</b>: pause at a line, inspect every variable, step one line at a time.</li>
          <li><b>Binary search</b>: cut the problem space in half. Disable half the code. Or search <i>through time</i> with <code>git bisect</code> (next page).</li>
          <li><b>"What changed?"</b> Almost every sudden bug follows a deploy, a config change, new data or a new dependency.</li>
          <li><b>Explain it aloud</b> to a rubber duck. Saying the code line by line exposes the wrong assumption surprisingly often.</li>
        </ul>
        <div class="warn">Do not "try things" at random, do not suspect the compiler or the language first (it is nearly always your code), and do not
        stop at "it works now". If you cannot explain <i>why</i> your change fixed it, you probably have not fixed it.</div>
        <div class="senior">The bug is never where you are looking, because if you believed it was somewhere else you would not have written it. So <b>test what you
        "know" is true</b>: add an assertion or print for the thing you are certain about. The certainty that fails is the bug.</div>
        <div class="foot"><span></span><span class="hint">hunt a bug →</span></div>`,
      right: `
        <p class="kicker">Bug hunt</p>
        <h2 style="margin-top:0">Bug report: "the average is wrong"</h2>
        <p>Expected <code>4</code> (the average of 2, 4 and 6). Actual: <code>2.4</code>. Do not guess. <b>Observe</b>: run it and read the trace table.
        Which variable changes in a way that does not match what you believe? Form a hypothesis, fix one thing, and check the output.</p>
        <div id="play"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountWorkbench(right.querySelector('#play'), {
          starter: '// Bug report #12: averageOfPositives([2, -5, 4, 6, -1]) should be 4, but prints 2.4\nfunction averageOfPositives(numbers) {\n  let total = 0;\n  let count = 0;\n  for (let i = 0; i < numbers.length; i++) {\n    if (numbers[i] > 0) {\n      total = total + numbers[i];\n    }\n    count = count + 1;\n  }\n  return total / count;\n}\n\nconsole.log(averageOfPositives([2, -5, 4, 6, -1]));',
          autorun: true, loops: true, rows: 14,
        });
      },
    },

    // ───────────────────────── Spread 2: bisect (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Debugging through time</p>
        <h1>git bisect: binary search for the bad commit</h1>
        <p>A bug appeared sometime in the last 16 commits. You could read every diff, or you can use the idea from the binary-search
        algorithm: test the <b>middle</b> commit. If it passes, the bug is in the newer half; if it fails, in the older half. Repeat. Each test throws away
        half of what is left.</p>
        <pre><code>git bisect start
git bisect bad              # the current commit is broken
git bisect good a1b2c3d     # this old commit was fine
# Git checks out the middle commit. Run your test, then say:
git bisect good             # or:  git bisect bad
# ...after a few rounds Git prints the first bad commit.
git bisect run npm test     # or let Git run the test for you
git bisect reset            # go back to where you started</code></pre>
        <ul>
          <li><b>16 commits</b> need at most <b>4</b> tests. <b>1,000</b> need about <b>10</b>. A million need 20. That is the power of halving.</li>
          <li>It needs a <b>reliable test</b> (the same result every time) and a known good starting point.</li>
          <li>It works best with <b>small, focused commits</b> (lesson 6). One giant commit named "stuff" tells you where, but not what.</li>
        </ul>
        <div class="senior">Notice the discipline of the lab: you cannot blame a commit by hunch. You must show that <b>it fails and the one before it passes</b>.
        That pair is proof. Engineers who assert causes without evidence are the ones who revert the wrong change at 3 a.m.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Bisect lab</p>
        <h2 style="margin-top:0">Find the commit that broke checkout</h2>
        <p>Tests passed on day 1 and fail on the newest commit. Click a commit, run the tests on it, and narrow the range. The culprit is random each time.
        Try for the optimal 4 runs. (Stuck? Use the hint: it points at the middle of what is still unknown.)</p>
        <div id="bisect"></div>
        <div class="foot"><span></span><span class="hint" id="gateHint">find the first bad commit to turn the page</span></div>`,
      init(left, right, api) {
        mountBisect(right.querySelector('#bisect'), { onSolved: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'found it'; api.unlock(300); } });
      },
    },

    // ───────────────────────── Spread 3: incident (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Debugging in production</p>
        <h1>Incident response: stop the bleeding first</h1>
        <p>When real users are failing, the order of work changes. Debugging <i>in production</i> is not about elegance; it is about <b>restoring service
        fast and safely</b>, then learning.</p>
        <ol>
          <li><b>Mitigate first.</b> Undo the cause of harm before you understand every detail: roll back the deploy, switch off a feature flag, fail over. A rollback takes minutes; a root-cause investigation can take hours.</li>
          <li><b>Communicate.</b> Say what is happening, who owns it, and when you will update next. Silence makes incidents worse.</li>
          <li><b>Investigate with data.</b> Ask <i>what changed?</i> (deploys, config, traffic), <i>who is affected?</i> (group by region, route, version, user type), <i>when did it start?</i> (metrics).</li>
          <li><b>Fix and verify</b> the real cause, then watch the metrics return to normal.</li>
          <li><b>Blameless postmortem.</b> Write the timeline, the cause, and action items that change the <i>system</i>, not "Sam should be careful".</li>
        </ol>
        <h2>Three kinds of evidence</h2>
        <ul>
          <li><b>Logs</b>: what happened in one request (detail, but noisy).</li>
          <li><b>Metrics</b>: numbers over time: error rate, latency, traffic. They tell you <i>when</i> and <i>how big</i>.</li>
          <li><b>Traces</b>: one request's path across many services (where the time went).</li>
        </ul>
        <p>The strongest move in this lab is <b>"group by"</b>: when errors are 100% in one slice and a few percent elsewhere, you have found the correlated
        dimension, and with it the cause. Beware <b>red herrings</b>: real-looking oddities that were there before the incident.</p>
        <div class="senior">Correlation with <b>time</b> (the error rate jumped exactly at the deploy) is your strongest clue; correlation with a <b>field</b> (all
        failures have the same coupon value) is the second. Ask both: what changed, and what do the failures have in common?</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Incident lab · you are on call</p>
        <div id="incident"></div>
        <div class="foot"><span></span><span class="hint" id="gateHint">diagnose it correctly to turn the page</span></div>`,
      init(left, right, api) {
        mountIncident(right.querySelector('#incident'), { onSolved: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'incident resolved'; api.unlock(400); } });
      },
    },

    // ───────────────────────── Spread 4: regression tests (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Prove and prevent</p>
        <h1>Reproduce with a test, then fix</h1>
        <p>The best bug report is a <b>failing test</b>. It reproduces the problem exactly, tells you when you have fixed it, and stays in the suite forever as a
        <b>regression test</b>, a guard against the same bug returning.</p>
        <p>The professional order is:</p>
        <ol>
          <li>Write a test that fails because of the bug.</li>
          <li>Watch it fail <i>for the right reason</i> (a test that fails for another reason proves nothing).</li>
          <li>Fix the code until it passes.</li>
          <li>Keep the test.</li>
        </ol>
        <p>Both cards below start from a <b>bug report</b>. Card 1: write tests that fail on the buggy code and pass on the correct code. Card 2: fix the
        function so the visible and the hidden tests pass.</p>
        <div class="senior">A fix without a test is a loan with interest: the bug will come back, usually on a Friday, usually from someone who never saw the original
        report. Many teams will not merge a bug fix without its regression test. Be that team.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Regression lab</p>
        <div id="cards"></div>
        <div class="foot"><span class="hint" id="gateHint">complete both cards to turn the page</span></div>`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#cards'), {
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(400); },
          tasks: [
            { kind: 'catch', question: 'Bug report #31: "A 120% coupon gives customers money back (the total goes negative)." Write regression tests for applyDiscount(price, percent). Rules: percent above 100 counts as 100, below 0 counts as 0, and the result is rounded to 2 decimals.',
              signature: 'applyDiscount(price: number, percent: number): number',
              correct: 'function applyDiscount(price, percent) { const p = Math.min(100, Math.max(0, percent)); return Math.round(price * (1 - p / 100) * 100) / 100; }',
              buggy: 'function applyDiscount(price, percent) { const p = Math.max(0, percent); return Math.round(price * (1 - p / 100) * 100) / 100; }',
              minTests: 3,
              starter: 'test("10% off 200 is 180", () => {\n  expect(applyDiscount(200, 10)).toBe(180);\n});\n\n// reproduce the bug, then cover the other edges\n', rows: 10 },
            { kind: 'implement', question: 'Bug report #44: "Prices show wrong: 5 cents prints as $0.5, and big amounts have no thousands separator." Fix formatPrice(cents) to return text like $12.50.',
              visible: 'test("formats whole dollars and cents", () => {\n  expect(formatPrice(1250)).toBe("$12.50");\n});\n\ntest("pads single-digit cents", () => {\n  expect(formatPrice(1205)).toBe("$12.05");\n});',
              hidden: 'test("five cents", () => { expect(formatPrice(5)).toBe("$0.05"); });\n' +
                'test("zero", () => { expect(formatPrice(0)).toBe("$0.00"); });\n' +
                'test("exactly one dollar", () => { expect(formatPrice(100)).toBe("$1.00"); });\n' +
                'test("nineteen ninety-nine", () => { expect(formatPrice(1999)).toBe("$19.99"); });\n' +
                'test("thousands separator", () => { expect(formatPrice(123456)).toBe("$1,234.56"); });\n' +
                'test("a million", () => { expect(formatPrice(100000000)).toBe("$1,000,000.00"); });',
              starter: 'function formatPrice(cents) {\n  return "$" + cents / 100;\n}', rows: 6 },
          ],
        });
      },
    },

    // ───────────────────────── Spread 5: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Four judgment questions, the kind asked in senior interviews and answered, under stress, in real incidents. There is no code to run: reason
        from the method.</p>
        <div class="senior">Engineering maturity shows in <i>ordering</i>: stop the harm, then understand, then prevent. Beginners reverse it: they dive into
        the code while the site burns.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Errors spike to 40% two minutes after a deploy. What is the best first move?</p>',
            options: ['Read the code to find the bug first', 'Roll back the deploy, then investigate calmly', 'Restart the servers', 'Wait and watch the graph'], answer: 1,
            why: 'Mitigate before diagnosing. Rolling back undoes the one change that coincides with the damage and restores service in minutes.' },
          { prompt: '<p>A bug "works on my machine" but fails on a teammate\'s. What is the most useful next step?</p>',
            options: ['Tell them to reinstall everything', 'Find what differs (versions, config, data, timing) and make the failure reproducible', 'Add a try/catch to hide it', 'Assume their computer is broken'], answer: 1,
            why: 'Reproduction is step one. Systematically listing differences between the two environments turns a mystery into a short list of suspects.' },
          { prompt: '<p>The bug appeared somewhere in the last 1,000 commits. About how many test runs does <code>git bisect</code> need, at most?</p>',
            options: ['About 10', 'About 100', 'About 500', '1,000'], answer: 0,
            why: 'Each run halves the range: 1000 → 500 → 250 → … → 1 takes about log2(1000) ≈ 10 steps.' },
          { prompt: '<p>You found and fixed a bug. What must you still do before you call it done?</p>',
            options: ['Nothing, the fix is done', 'Add a regression test that fails without the fix, and learn the root cause so the class of bug is prevented', 'Delete the logs', 'Blame whoever wrote the code'], answer: 1,
            why: 'A fix without a test can silently regress, and a fix without a root cause fixes only this instance. Blame prevents learning; blameless review improves the system.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(400); });
      },
    },
  ],
};
