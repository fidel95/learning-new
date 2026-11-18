// Lesson 27 — Cloud, containers and infrastructure as code.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountLayerLab } from '../containerlab.js';
import { mountOrdering } from '../orderlab.js';

export const PL = {
  starter: `// Infrastructure as code: you DECLARE what should exist (desired), and a tool compares it with what DOES exist (current)
// and prints a plan. Both are objects: { name: { type, region, size, ... } }.
//
// plan(current, desired, immutable = ["type", "region"]) returns { create, update, replace, destroy }, each a SORTED array of names:
//   create   in desired, not in current
//   destroy  in current, not in desired
//   replace  in both, but an IMMUTABLE attribute differs (it cannot be changed in place: destroy and rebuild)
//   update   in both, no immutable change, but any other attribute differs (added, removed or changed)
// A name with no differences appears nowhere. Never modify the inputs.
// This version recreates everything, every time.
function plan(current, desired, immutable = ["type", "region"]) {
  return { create: Object.keys(desired).sort(), update: [], replace: [], destroy: [] };
}
`,
  visible: `test("nothing to do when they match", () => { const s = { web: { type: "vm", region: "eu", size: "s" } }; expect(plan(s, s)).toEqual({ create: [], update: [], replace: [], destroy: [] }); });
test("a new resource is created", () => { expect(plan({}, { db: { type: "sql", region: "eu" } }).create).toEqual(["db"]); });`,
  hidden: `const empty = { create: [], update: [], replace: [], destroy: [] };
test("a resource that disappeared from the config is destroyed", () => { expect(plan({ a: { type: "vm" }, b: { type: "vm" } }, { a: { type: "vm" } })).toEqual({ ...empty, destroy: ["b"] }); });
test("changing a normal attribute is an update", () => { expect(plan({ w: { type: "vm", region: "eu", size: "s" } }, { w: { type: "vm", region: "eu", size: "l" } })).toEqual({ ...empty, update: ["w"] }); });
test("changing an immutable attribute is a replace, NOT also an update", () => { expect(plan({ w: { type: "vm", region: "eu", size: "s" } }, { w: { type: "vm", region: "us", size: "l" } })).toEqual({ ...empty, replace: ["w"] }); });
test("adding or removing an attribute is an update", () => { expect(plan({ w: { type: "vm" } }, { w: { type: "vm", tags: "x" } }).update).toEqual(["w"]); expect(plan({ w: { type: "vm", tags: "x" } }, { w: { type: "vm" } }).update).toEqual(["w"]); });
test("key order inside a resource does not matter", () => { expect(plan({ w: { type: "vm", region: "eu", size: "s" } }, { w: { size: "s", region: "eu", type: "vm" } })).toEqual(empty); });
test("results are sorted and all four lists work together", () => {
  const cur = { z: { type: "vm", size: "s" }, m: { type: "vm", region: "eu" }, k: { type: "vm" }, d: { type: "db" } };
  const des = { z: { type: "vm", size: "m" }, m: { type: "vm", region: "us" }, c: { type: "cache" }, a: { type: "cache" }, d: { type: "db" } };
  expect(plan(cur, des)).toEqual({ create: ["a", "c"], update: ["z"], replace: ["m"], destroy: ["k"] });
});
test("a custom immutable list is respected", () => { expect(plan({ w: { type: "vm", size: "s" } }, { w: { type: "vm", size: "l" } }, ["size"]).replace).toEqual(["w"]); });
test("inputs are not modified", () => { const cur = { w: { type: "vm", size: "s" } }, des = { w: { type: "vm", size: "l" }, x: { type: "vm" } }; const a = JSON.stringify(cur), b = JSON.stringify(des); plan(cur, des); expect(JSON.stringify(cur)).toBe(a); expect(JSON.stringify(des)).toBe(b); });
test("20,000 resources (must be one pass)", () => {
  const cur = {}, des = {}; for (let i = 0; i < 20000; i++) { cur["r" + i] = { type: "vm", size: "s", region: "eu" }; des["r" + i] = { type: "vm", size: i % 100 === 0 ? "l" : "s", region: "eu" }; }
  expect(plan(cur, des).update.length).toBe(200);
});`,
};

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l27',
  title: 'Lesson 27 · Cloud & containers',
  spreads: [
    {
      gated: true,
      left: `
        <p class="kicker">Cloud · containers</p>
        <h1>It works on my machine, so ship the machine</h1>
        <p>"Works on my laptop" fails because the server has a different OS, library versions, and settings. A <b>container</b> packages your app with <i>exactly</i> its dependencies and runs it in an isolated process on a shared kernel. It is not a virtual machine (no second operating system): it is a normal Linux process with a restricted view of files, processes, network and memory (<b>namespaces</b> and <b>cgroups</b>). That makes it small, fast to start, and identical everywhere.</p>
        <h2>Image vs container</h2>
        <ul>
          <li><b>Image:</b> an immutable, layered recipe result (like a class). Built from a <b>Dockerfile</b>, stored in a <b>registry</b>, identified by a tag or a digest.</li>
          <li><b>Container:</b> a running instance of an image (like an object). Disposable: anything it writes inside is lost when it is removed. Persistent data goes in a <b>volume</b> or an external database.</li>
        </ul>
        <h2>Layers and the cache</h2>
        <p>Each Dockerfile instruction makes a <b>layer</b>. If an instruction and all before it are unchanged, Docker reuses the cached layer. So order matters: put things that <b>change rarely first</b> (OS, dependencies) and things that <b>change often last</b> (your source). A wrong order turns a 3-second rebuild into a 90-second one, hundreds of times a week.</p>
        <h2>Good image habits</h2>
        <ul>
          <li>Small, pinned base images (<code>node:20-slim</code>, not <code>latest</code>); multi-stage builds so compilers do not ship to production.</li>
          <li><b>Run as a non-root user</b>; never bake secrets into an image (they stay in the layers); add a <code>.dockerignore</code>.</li>
          <li>One process per container; log to stdout; handle SIGTERM for graceful shutdown.</li>
        </ul>
        <div class="senior">Treat servers as <b>cattle, not pets</b>: never hand-edit a running machine ("snowflake"). If it breaks, kill it and start a fresh one from the image. This only works if everything needed is in the image or in config you pass in.</div>
        ${back}`,
      right: `<p class="kicker">Lab · the layer cache</p><div id="lab"></div>${foot('make a source edit rebuild in 5 s or less')}`,
      init(left, right, api) { mountLayerLab(right.querySelector('#lab'), { onPass: finish(right, api, 'cache ordered', 900) }); },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Cloud · infrastructure as code</p>
        <h1>Describe the servers, do not click them</h1>
        <p>Clicking around a cloud console builds infrastructure nobody can reproduce, review, or undo. <b>Infrastructure as code</b> (Terraform, Pulumi, CloudFormation, Kubernetes manifests) writes it as <b>declarative</b> files in git: you state <i>what should exist</i>, and the tool works out <i>how</i> to get there.</p>
        <h2>The plan / apply loop</h2>
        <ol>
          <li>Edit the desired state in a pull request (reviewed like code).</li>
          <li><b>Plan:</b> the tool reads the real world (the <b>state</b>), diffs it with your files, and shows <code>+ create</code>, <code>~ update in place</code>, <code>-/+ replace</code>, <code>- destroy</code>.</li>
          <li><b>Read the plan carefully</b> (a "replace" on a database means deleting your data), then <b>apply</b>.</li>
        </ol>
        <p>It is idempotent: apply twice and the second plan is empty. That is the property you will implement.</p>
        <h2>Why it matters</h2>
        <ul>
          <li><b>Reproducible:</b> rebuild an environment (or a disaster-recovery copy) from the repo.</li>
          <li><b>Reviewable and auditable:</b> who changed the firewall, when, why.</li>
          <li><b>Drift detection:</b> a plan on an unchanged repo that shows changes means someone edited production by hand.</li>
        </ul>
        <div class="warn">The state file is sensitive (it can hold secrets) and shared: store it remotely with locking (so two people cannot apply at once, lesson 24). Protect stateful resources (databases, buckets) with <code>prevent_destroy</code> and backups, and review every destroy.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · write the planner</p><div id="lab"></div>${foot('pass to turn the page')}`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), { tasks: [{ kind: 'implement', question: 'plan(current, desired): the heart of Terraform', visible: PL.visible, hidden: PL.hidden, starter: PL.starter, rows: 13 }], onPass: finish(right, api, 'planner built', 1200) });
      },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Cloud · running it for real</p>
        <h1>Environments, pipelines, cost</h1>
        <h2>Environments and configuration</h2>
        <ul>
          <li>Keep <b>dev, staging and production</b> as alike as possible (same image, same IaC), differing only in <b>configuration</b>: URLs, credentials, sizes.</li>
          <li><b>Config in the environment,</b> not in code or the image (the twelve-factor app). The same artifact moves through every stage: <b>build once, deploy many</b>.</li>
          <li>Secrets live in a secrets manager and are injected at run time, and rotated (lesson 18).</li>
        </ul>
        <h2>Where to run it</h2>
        <ul>
          <li><b>Serverless / edge functions</b> (Cloudflare Workers, Lambda): no servers to manage, pay per request, scale to zero. Limits on run time and state. Your CRM runs this way.</li>
          <li><b>Containers on a managed service</b> (Cloud Run, ECS, Fly): more control, steady workloads.</li>
          <li><b>Kubernetes:</b> orchestrates many containers (scheduling, restarts, rollouts, service discovery). Powerful and complex; do not adopt it for one small app.</li>
          <li><b>Plain VMs:</b> maximum control and maintenance.</li>
        </ul>
        <h2>Cost is a design constraint</h2>
        <p>Cloud bills grow quietly: always-on instances nobody uses, <b>egress</b> (data leaving the cloud is billed), logs kept forever, a runaway loop calling a paid API. Set <b>budgets and alerts</b> on day one, tag resources by owner, delete what you do not use, and know the free tier limits. A bill you did not predict is an incident.</p>
        <div class="senior">The deploy pipeline is a safety system: each stage exists to catch a class of error before users do. Skipping a stage "this once" is how outages are born.</div>
        ${back}`,
      right: `<p class="kicker">Lab · order the pipeline</p><div id="lab"></div>${foot('order the pipeline to turn the page')}`,
      init(left, right, api) {
        mountOrdering(right.querySelector('#lab'), {
          intro: 'A change is merged. Put the release pipeline in a safe order.',
          steps: ['Run unit tests and the security scan on the commit', 'Build ONE container image and tag it with the commit id', 'Push the image to the registry', 'Deploy that same image to staging with staging config', 'Run smoke tests against staging', 'Deploy that same image to production gradually (canary)', 'Watch error rate and latency; roll back automatically if they worsen'],
          explain: 'Tests before building, one artifact promoted through environments, and a gradual rollout with a way back.',
          onPass: finish(right, api, 'pipeline ordered', 900),
        });
      },
    },

    {
      gated: true,
      left: `<p class="kicker">Check yourself · cloud</p><h1>Four judgment calls</h1><p>You can package an app, describe its infrastructure as code, and release it safely. Next: the part of the system that users actually touch, <b>the front end</b>.</p>${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Your Dockerfile copies all source, then runs <code>npm install</code>. Every code edit reinstalls everything. The fix?</p>',
            options: ['Skip tests', 'Copy only package*.json first, run install, then copy the rest of the source', 'Use a bigger machine', 'Install at container start'], answer: 1, why: 'Layers are cached in order. Dependencies change rarely, so they must come before the frequently changing source.' },
          { prompt: '<p>A Terraform plan shows <code>-/+ replace</code> on your production database. What do you do?</p>',
            options: ['Apply it, plans are always right', 'Stop: replacement destroys the data. Find out why, protect the resource, and plan a migration with a backup', 'Delete the state file', 'Run apply twice'], answer: 1, why: 'Read the plan. A replace on a stateful resource is a data-loss event unless you planned it.' },
          { prompt: '<p>"Build once, deploy many" means:</p>',
            options: ['Run the build on every server', 'The same image that passed staging is promoted to production, with only configuration different', 'Rebuild for production with different flags', 'Copy the source to prod'], answer: 1, why: 'What you tested must be what you ship. A rebuild is a different artifact.' },
          { prompt: '<p>Which is a cost trap that surprises new cloud users?</p>',
            options: ['Writing comments', 'Always-on resources nobody uses, data egress, and unbounded logs, with no budget alert', 'Using git', 'Tagging resources'], answer: 1, why: 'Set budgets and alerts early; idle and outbound data quietly add up.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(800); });
      },
    },
  ],
};
