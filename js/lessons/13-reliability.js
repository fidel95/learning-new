// Lesson 13 — Reliability and operations: shipping safely, surviving failure, knowing when it breaks.
import { mountQuiz } from '../workbench.js';
import { mountDeployLab, mountResilienceLab, mountAlertLab } from '../opslab.js';

const RES_STARTER = `// callService() makes ONE attempt at the dependency. It returns a promise that may:
//   - resolve quickly with { ok: true, data: ... }
//   - reject with an error
//   - or take a very long time
// sleep(ms) waits. Return the result, or { fallback: true } when you cannot get one. Never throw.

async function resilientCall(callService) {
  return await callService();
}
`;

export const lesson = {
  id: 'l13',
  title: 'Lesson 13 · Reliability & operations',
  spreads: [
    // ───────────────────────── Spread 1: CI/CD and deployment ─────────────────────────
    {
      left: `
        <p class="kicker">Part 2 · Shipping safely</p>
        <h1>CI/CD: making releases boring</h1>
        <p>Writing code is half the job. The other half is getting it to users <b>without breaking things</b>, again and again. Teams that ship well do it <i>often</i> and make each release
        small and dull. That is what <b>CI/CD</b> automates.</p>
        <h2>Continuous Integration (CI)</h2>
        <p>Everyone merges small changes into the main branch many times a day, and <b>every push is automatically checked</b> on a clean machine: lint, type check, unit tests, build, integration tests, a
        security scan. Fast feedback (under ten minutes) keeps developers in flow, and a rule keeps <code>main</code> <b>always green</b>. A clean environment also kills "works on my machine".</p>
        <h2>Continuous Delivery / Deployment (CD)</h2>
        <p>Every green change is <i>deployable</i> and a pipeline does the deploying. <b>Build once</b>, then promote the <i>same artifact</i> through staging to production (never rebuild per environment).
        Configuration and infrastructure live in code (<b>infrastructure as code</b>), and secrets in a secret manager, never in the repo.</p>
        <p>Teams track four numbers (the <b>DORA metrics</b>): deployment frequency, lead time for changes, <b>change failure rate</b>, and time to restore service. Fast teams are <i>also</i> the stable ones,
        because small changes are easy to understand, test and undo.</p>
        <h2>Deployment strategies = different blast radii</h2>
        <ul>
          <li><b>Big bang</b>: replace everything at once. Simple, and the whole world sees any bug.</li>
          <li><b>Rolling</b>: update a few servers at a time.</li>
          <li><b>Blue/green</b>: run the new version beside the old, switch traffic all at once, and switch back instantly if needed.</li>
          <li><b>Canary</b>: send a small slice (say 5%) to the new version, compare its error rate and latency to the old, and roll out (or back) automatically.</li>
          <li><b>Feature flags</b>: ship code switched <i>off</i>, then turn it on for 1%, 10%, 100% of users, and off again in seconds, with no deploy.</li>
        </ul>
        <div class="warn">Database changes are the dangerous part, because you cannot instantly "roll back" data. Use <b>expand → migrate → contract</b>: first add the new column (old code still works),
        then switch code to use it, and only later remove the old one. Every step is backward-compatible.</div>
        <div class="senior">The goal is to make the <b>cost of being wrong small and the recovery fast</b>. You will ship bugs; every team does. What separates good teams is how few users see them and
        how quickly they are undone. Rehearse rollbacks: an untested rollback is a hope.</div>
        <div class="foot"><span></span><span class="hint">release a bad version →</span></div>`,
      right: `
        <p class="kicker">Deploy lab</p>
        <h2 style="margin-top:0">Ship a release with a bug. How many users get hurt?</h2>
        <p>Pick a strategy and see the error rate over time and the failed requests. Then turn <b>automatic health checks</b> on and off. Switch the bug from
        <b>obvious</b> to <b>subtle</b> and watch which strategy still works. (Hint: a tiny canary may be too small to see a small bug at all.)</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountDeployLab(right.querySelector('#lab')); },
    },

    // ───────────────────────── Spread 2: resilience patterns (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 2 · Surviving failure</p>
        <h1>Reliability patterns</h1>
        <p>In a distributed system <b>something is always failing</b>: a network drops packets, a dependency is slow, a disk fills. You cannot prevent it, so you design for it. The patterns below
        are the standard kit, and you will build them.</p>
        <ul>
          <li><b>Timeouts.</b> Never wait forever. A <i>slow</i> dependency is worse than a dead one: it ties up your threads and connections until <i>you</i> fall over. Pick a timeout a bit above normal latency.</li>
          <li><b>Retries with backoff and jitter.</b> Many failures are momentary, so try again, but wait longer each time (<i>exponential backoff</i>: 100, 200, 400 ms) plus a random bit (<i>jitter</i>) so thousands of clients do not retry in lockstep. Cap the attempts. Retry only <b>idempotent</b> operations.</li>
          <li><b>Circuit breaker.</b> After N failures in a row, <b>stop calling</b> the broken dependency for a while: <i>closed</i> (normal) → <i>open</i> (fail fast, no calls) → <i>half-open</i> (after a pause, let one trial request through; success closes it, failure reopens it). It protects the dependency from your retries while it recovers.</li>
          <li><b>Fallbacks / graceful degradation.</b> If recommendations are down, show popular items; if the price service is down, show a cached price. A degraded page beats an error page.</li>
          <li><b>Bulkheads.</b> Give each dependency its own pool of connections or threads so one failing one cannot drain everything. Like ship compartments.</li>
          <li><b>Load shedding and rate limits.</b> When overloaded, reject some work early and cleanly rather than slowing everyone to a crawl.</li>
        </ul>
        <div class="warn"><b>Tune the breaker.</b> A breaker that trips too easily turns ordinary flakiness into an outage: with a 30%-failure dependency, "3 failures in a row" happens by chance and cuts off a service that is mostly working. Choose a threshold that normal noise rarely reaches, and a pause long enough to help but short enough to recover quickly.</div>
        <div class="warn"><b>Retry storms.</b> If three layers each retry three times, one user click becomes 3 × 3 × 3 = <b>27</b> calls against a dependency that is already struggling, which pushes it over. Retries multiply down the stack: retry in one place, and combine with a circuit breaker.</div>
        <div class="senior">The test of a reliability design is not "does it work when everything is fine?" but <b>"what does the user see when X is down?"</b> Ask it for every dependency. Netflix famously
        turns servers off on purpose (<b>chaos engineering</b>) to prove the answer is "nothing bad".</div>
        <div id="tasks"></div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Failure lab · write resilientCall</p>
        <h2 style="margin-top:0">Make this survive five kinds of trouble</h2>
        <p>Run it first: the naive version only handles the healthy case. Then add a timeout (<code>Promise.race</code> with a <code>setTimeout</code>), retries with a little backoff, and a circuit breaker
        (remember failures in variables outside the function). Each scenario replays 30 to 50 requests.</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">pass all five scenarios to turn the page</span></div>`,
      init(left, right, api) {
        mountResilienceLab(right.querySelector('#lab'), {
          starter: RES_STARTER, rows: 17, tasksEl: left.querySelector('#tasks'),
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(500); },
          tasks: [
            { label: 'Healthy dependency: every request succeeds with exactly one call (no wasteful extra calls).',
              check: (s) => s.healthy.ok === s.healthy.n && s.healthy.calls <= s.healthy.n },
            { label: 'Flaky dependency (30% fail): at least 90% succeed, with at most 1.8 calls per request on average (retry).',
              check: (s) => s.flaky.ok / s.flaky.n >= 0.9 && s.flaky.calls / s.flaky.n <= 1.8 },
            { label: 'Slow dependency (20% of calls hang for 1.5 s): p95 latency under 800 ms and at least 90% succeed (timeout + retry).',
              check: (s) => s.slow.p95Ms < 800 && s.slow.ok / s.slow.n >= 0.9 && s.slow.errors === 0 },
            { label: 'Dead dependency: every request gets { fallback: true } quickly (average under 200 ms) and the dead service receives at most 12 calls in total (circuit breaker).',
              check: (s) => s.down.fallback === s.down.n && s.down.avgMs < 200 && s.down.calls <= 12 },
            { label: 'Recovery: after the dependency comes back, at least 90% of later requests succeed for real, not just with the fallback (half-open probe).',
              check: (s) => s.recovery.lateN > 0 && s.recovery.lateOk / s.recovery.lateN >= 0.9 },
          ],
        });
      },
    },

    // ───────────────────────── Spread 3: observability + alerts (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 2 · Knowing when it breaks</p>
        <h1>Observability and alerting</h1>
        <p>You cannot fix what you cannot see. <b>Observability</b> is how well you can understand what a running system is doing from the outside. Its three kinds of evidence (lesson 10) are
        <b>logs</b> (events), <b>metrics</b> (numbers over time) and <b>traces</b> (one request's path across services). Good teams log <b>structured</b> data (fields, not sentences) and tag every request
        with a <b>correlation id</b> so its trail can be followed through ten services.</p>
        <h2>The four golden signals</h2>
        <p>For any service watch: <b>latency</b> (how slow), <b>traffic</b> (how much), <b>errors</b> (how many fail) and <b>saturation</b> (how full: CPU, memory, queue depth, disk).</p>
        <h2>SLIs, SLOs and the error budget</h2>
        <p>An <b>SLI</b> is a measurement ("fraction of requests that succeed in under 300 ms"); an <b>SLO</b> is the target ("99.9% over 30 days"). The gap, <b>0.1% of requests (about 43 minutes a month)</b>, is your
        <b>error budget</b>: reliability you may "spend" on shipping and experiments. Budget left → move fast. Budget gone → <b>freeze risky releases and fix reliability</b>. It turns the fight between speed and
        stability into a number.</p>
        <h2>Alerting is a design problem</h2>
        <p>A <b>page</b> wakes a human at 3 a.m. so it must be <b>urgent, real and actionable</b>. Alert on <b>symptoms users feel</b> ("checkout errors above 3% for 4 minutes"), not on causes ("CPU is 85%", which may hurt nobody).
        Two knobs trade off: <b>threshold</b> and <b>duration</b>. Too sensitive and you drown in false alarms (<b>alert fatigue</b>: people start ignoring pages, which is how real outages get missed). Too lax and you
        find out from customers. Every alert needs a <b>runbook</b>: what it means and the first things to try.</p>
        <div class="warn">A backup you have never <b>restored</b> is not a backup. Know your <b>RPO</b> (how much data you can afford to lose: the age of the newest backup) and <b>RTO</b> (how long you can be down), and
        practice recovery on a calm day.</div>
        <div class="senior">Treat every page as a bug in your monitoring: if it did not need a human, tune or delete the alert; if a real incident did not page, add one. After each incident ask "how
        did we find out?" The best answer is "our alert", not "a customer tweeted".</div>
        <div id="tasks"></div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Alert lab · you are tuning the pager</p>
        <h2 style="margin-top:0">Catch the real incidents, spare the sleep</h2>
        <p>Here is one day of checkout error rate. The red bands are the two <b>real incidents</b>; the other bumps are harmless blips. Set the threshold and duration so your pager rings for the incidents and
        (almost) never for the blips.</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">meet all three goals to turn the page</span></div>`,
      init(left, right, api) {
        mountAlertLab(right.querySelector('#lab'), {
          tasksEl: left.querySelector('#tasks'),
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(500); },
          tasks: [
            { label: 'Incident 1 (a big outage) pages within 5 minutes', check: (e) => ({ ok: e.detected[0] !== null && e.detected[0] <= 5, note: e.detected[0] === null ? 'missed' : e.detected[0] + ' min' }) },
            { label: 'Incident 2 (a quieter, longer problem) pages within 10 minutes', check: (e) => ({ ok: e.detected[1] !== null && e.detected[1] <= 10, note: e.detected[1] === null ? 'missed' : e.detected[1] + ' min' }) },
            { label: 'At most 1 false alarm all day', check: (e) => ({ ok: e.falsePages <= 1, note: e.falsePages + ' false' }) },
          ],
        });
      },
    },

    // ───────────────────────── Spread 4: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Operate like an engineer</h1>
        <p>Four judgment questions from the world of on-call. The right answers share a theme: <b>limit the blast radius, fail fast, alert on what users feel, and let data decide</b>.</p>
        <div class="senior">Operations is where engineering meets reality. Systems you build will be run at 3 a.m. by tired people, possibly you. Design every release, retry and alert for <i>that</i> person.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Which approach best limits the damage of a bug you have <i>not yet found</i>?</p>',
            options: ['Deploy to everyone at once so it is over quickly', 'Roll out to a small slice or behind a flag, watch the metrics, and expand gradually', 'Skip staging to save time', 'Deploy only on Fridays'], answer: 1,
            why: 'A gradual rollout caps the blast radius: only a few users are exposed, and a rollback or flag-off is quick. That is the whole point of canaries and feature flags.' },
          { prompt: '<p>Service A retries a failing call 3 times. It calls B, which retries 3 times against C, which is down. About how many calls does one request send to C?</p>',
            options: ['3', '9', 'Up to 27 including the originals across the layers', '1'], answer: 2,
            why: 'Retries multiply down the stack (3 × 3 × 3). A struggling dependency gets crushed by its own clients. Retry in one place, with backoff, and use a circuit breaker.' },
          { prompt: '<p>Which alert is better to page a human at night?</p>',
            options: ['CPU on server 12 is above 80%', 'Checkout error rate above 3% for 5 minutes', 'Disk usage on any machine above 60%', 'A deploy happened'], answer: 1,
            why: 'Page on symptoms users actually feel and that need a human. High CPU may hurt no one, and a human cannot act on "a deploy happened". Cause-based alerts create fatigue.' },
          { prompt: '<p>Your 99.9% monthly SLO has used its entire error budget by day 10. What does a mature team do?</p>',
            options: ['Keep shipping features at full speed', 'Pause risky releases and prioritize reliability work until the budget recovers', 'Lower the SLO to 90%', 'Turn off the monitoring'], answer: 1,
            why: 'The error budget is the agreed trade between speed and stability. When it is spent, the team shifts to making the system more reliable instead of taking new risks.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(500); });
      },
    },
  ],
};
