// Lesson 15 — The capstone: design, build and ship your own application.
import { mountProjectChooser, mountDesignDoc, mountMilestones, mountShip, store } from '../capstone.js';

export const lesson = {
  id: 'l15',
  title: 'Lesson 15 · Capstone project',
  spreads: [
    // ───────────────────────── Spread 1: choose (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Capstone · from idea to scope</p>
        <h1>Now you build something real</h1>
        <p>Fourteen lessons gave you the toolkit. A <b>capstone</b> is where it becomes <b>yours</b>: a small application that you design, build, test, deploy and defend, using everything, not as exercises but as
        a working engineer would. You build it in <b>your own repository</b>, on your own machine. This book is your plan, checklists and reviewer; the work happens in your editor.</p>
        <h2>Scope is the hardest design decision</h2>
        <ul>
          <li><b>Small enough to finish.</b> The goal is 2 to 4 weeks of evenings. A finished small thing teaches ten times more than an abandoned big one.</li>
          <li><b>Real enough to be interesting.</b> It needs a problem, data that must persist, users who must not see each other's data, and something that can fail.</li>
          <li><b>A thin vertical slice first.</b> Do not build "all the database, then all the API, then all the screens". Build one tiny feature through <i>every</i> layer, deploy it, then widen it (a <b>walking skeleton</b>).</li>
          <li><b>Cut.</b> Every feature you do not build is a bug you do not have. Write down what you will <i>not</i> do (non-goals) and defend it.</li>
        </ul>
        <h2>The rules of the capstone</h2>
        <ol>
          <li>It must meet the <b>eight engineering requirements</b> listed on the right, whatever you build. That is what makes it an engineering project and not just an app.</li>
          <li>Design on paper <b>first</b> (next page), then build milestone by milestone with a <b>definition of done</b> for each.</li>
          <li>Work in <b>small commits and pull requests</b>, with tests, from day one.</li>
          <li>When you want an expert review, bring the real repository to Claude in your terminal and say: <i>"Review my capstone at ~/path like a senior engineer."</i> You will get real, specific feedback on your code and decisions.</li>
        </ol>
        <div class="senior">Choose the idea that <b>you</b> care about enough to finish. The technology matters far less than the discipline: write the design doc, keep the slices thin, test as you go, deploy early.
        Most people's first project dies at "I will add that feature first". Yours will not, because you will have a written list of what is out of scope.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Project chooser</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">choose a project to turn the page</span></div>`,
      init(left, right, api) {
        const unlock = () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'project chosen'; api.unlock(300); };
        mountProjectChooser(right.querySelector('#lab'), { onChosen: unlock });
        if (store.load().project) unlock();
      },
    },

    // ───────────────────────── Spread 2: design doc (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Capstone · design before code</p>
        <h1>Write the design doc</h1>
        <p>You met design docs in lesson 12. Now you write one. It is not paperwork: it is the cheapest place to find that your plan is wrong. An hour spent here routinely saves a week of rework.</p>
        <h2>What a reviewer looks for</h2>
        <ul>
          <li><b>A real problem.</b> Can someone who has never heard of your idea understand who hurts and why?</li>
          <li><b>Checkable goals, explicit non-goals.</b> "Users can log a habit in under 2 clicks" is checkable; "good UX" is not. Non-goals are the shield against scope creep.</li>
          <li><b>A design that follows from the problem:</b> the endpoints, the tables and how they relate, who may access what.</li>
          <li><b>Alternatives with honest trade-offs.</b> "I considered SQLite vs a document store; I chose SQLite because my data is relational, at the cost of a fixed schema." If you cannot name an alternative you have not understood your choice.</li>
          <li><b>Risks and unknowns</b>, each with a plan: "payments API untested: I will prototype it in week 1".</li>
          <li><b>How you will know it works</b>, in numbers.</li>
        </ul>
        <p>The panel on the right checks each section against a bar and tells you what is missing. It saves as you type, and you can copy it as Markdown to paste into your repo as <code>DESIGN.md</code>.
        (The capstone template has the same structure.)</p>
        <div class="warn">Do not write fiction. A design doc that describes a system you will not build is worse than none. Write what you will really do, and plan to <b>update it</b> as you learn: the final milestone includes making it match reality.</div>
        <div class="senior">Good design docs are written to be <b>attacked</b>. Ask yourself: "what is the weakest assumption here?" and write it down under Risks. Seniors are not people who have no doubts; they are people who have
        listed their doubts and have a plan for each.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Design doc builder</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">complete every section to turn the page</span></div>`,
      init(left, right, api) {
        mountDesignDoc(right.querySelector('#lab'), { onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'design doc complete'; api.unlock(700); } });
      },
    },

    // ───────────────────────── Spread 3: build plan ─────────────────────────
    {
      left: `
        <p class="kicker">Capstone · build</p>
        <h1>Build it in vertical slices</h1>
        <p>This page is your project plan. Work through the milestones <b>in order</b>. Each has a <b>definition of done</b>: do not move on until every box is truly true. Your progress saves in this browser.</p>
        <h2>Start from the template</h2>
        <p>This repository contains a ready-to-use starter in <code>capstone-template/</code> (browse it at
        <b>github.com/fidel95/learning-new/tree/main/capstone-template</b>). It has the whole skeleton:</p>
        <pre><code>src/app.js      pure request handler (your logic)
src/store.js    all data access, swappable for a real DB
src/server.js   Node adapter   src/worker.js  Cloudflare adapter
test/           node:test examples (npm test, no installs)
.github/workflows/ci.yml   tests on every push
DESIGN.md  docs/adr/  docs/RUNBOOK.md  SECURITY-CHECKLIST.md</code></pre>
        <p>Create a <b>new empty repository</b>, copy the folder's contents into it (including hidden files), run <code>npm test</code>, then follow <code>START-HERE.md</code>. Every design idea in it comes from the lessons:
        a pure core with thin edges (11), dependency injection for testability (11), a store boundary (8), and CI from the first commit (13).</p>
        <h2>Habits that make it work</h2>
        <ul>
          <li><b>Deploy on day 2.</b> A live "hello" beats a perfect local app. Deploying late is where projects die.</li>
          <li><b>Test as you go</b> (write the failing test first when you can). Untested code is a debt you pay with interest.</li>
          <li><b>Small commits, one idea each,</b> with messages that say <i>why</i>. Merge by pull request and read your own diff as a reviewer would.</li>
          <li><b>Write an ADR when you decide</b> something with a real trade-off, while the reasons are fresh.</li>
          <li><b>Stuck for 30 minutes?</b> Write down the question as in lesson 14 (what I tried, expected, got), take a break, then ask: me, a search, or a friend.</li>
        </ul>
        <div class="senior">When the plan and reality disagree (they will), change the <b>scope</b>, not the quality bar, and write it down. Cutting a feature is a normal, healthy engineering decision. Shipping a smaller thing that works and is tested is a success.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Milestone tracker</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) { mountMilestones(right.querySelector('#lab')); },
    },

    // ───────────────────────── Spread 4: ship and defend (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Capstone · ship it</p>
        <h1>Ship, defend, reflect</h1>
        <p>You are done when a stranger could use it, understand it and trust it. Before you finish, try to <b>defend</b> your project against the questions a senior reviewer would ask. Answer them aloud (or in writing):</p>
        <ol>
          <li>What problem does it solve, and for whom? What did you deliberately leave out?</li>
          <li>Walk me through one request from the network to the database and back.</li>
          <li>Why this database and this data model? What would break at 100x the data?</li>
          <li>Show me where untrusted input is validated, and where a user's access is checked.</li>
          <li>What happens when the database is slow or an external service is down?</li>
          <li>How do I know it is working right now? What would page you?</li>
          <li>How did you decide it was safe to deploy? How do you roll back?</li>
          <li>What are the two biggest risks left? What is the next thing you would build, and the next thing you would delete?</li>
        </ol>
        <h2>Get a real review</h2>
        <p>Open Claude in your terminal inside your repo and say: <i>"Review this capstone like a senior engineer: architecture, tests, security, error handling, and the design doc. Be specific and critical."</i>
        Then fix what it finds. That loop (build, review, improve) is the job.</p>
        <h2>What next?</h2>
        <p>You now have the foundations and the working habits. Good next directions: <b>algorithms and data structures</b> (interview-style problem solving), <b>deeper security</b>, <b>distributed systems</b> (queues, consensus, consistency),
        <b>cloud and infrastructure as code</b>, <b>front-end frameworks</b>, and above all <b>contributing to open source</b>: reading a real codebase and sending a real pull request is the best education there is.</p>
        <div class="senior">Ship the capstone, then write the retrospective honestly. The point of a project is not the project: it is the engineer you became while building it. Keep that engineer's habits (design first, test, deploy early, write
        things down, ask for review) and you will be better than most.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Finish line</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">complete every check to finish the book</span></div>`,
      init(left, right, api) {
        mountShip(right.querySelector('#lab'), {
          onDone: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = '🎓 capstone complete'; api.unlock(2000); const box = right.querySelector('#lab'); if (!box.querySelector('.grad')) { const g = document.createElement('div'); g.className = 'status status--good grad'; g.textContent = '🎓 Congratulations. You finished the book and shipped a real project. Now go and build the next one.'; box.append(g); } },
        });
      },
    },
  ],
};
