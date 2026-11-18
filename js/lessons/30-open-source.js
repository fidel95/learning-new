// Lesson 30 — The open-source capstone: read a real codebase, send a real pull request.
import { mountExpedition, mountPRWriter, mountOssTracker } from '../oslab.js';
import { mountOrdering } from '../orderlab.js';

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l30',
  title: 'Lesson 30 · Open-source capstone',
  spreads: [
    {
      gated: true,
      left: `
        <p class="kicker">Open source · reading code you did not write</p>
        <h1>Real engineers read more than they write</h1>
        <p>Almost every job is a codebase that already exists, written by people who have left, in a style you would not have chosen. Reading it quickly is the skill that separates people who can contribute in a week from people who cannot in a year. Open source is the best practice ground: the code is public, the maintainers are strangers, and a merged pull request is proof anyone can verify.</p>
        <h2>How to enter an unfamiliar repository</h2>
        <ol>
          <li><b>README:</b> what is it, how do I run it and its tests?</li>
          <li><b>CONTRIBUTING, CODE_OF_CONDUCT, issue and PR templates:</b> the rules of the house. Following them is half of getting merged.</li>
          <li><b>Run the tests</b> before touching anything. If they fail on a fresh clone, you have found your first contribution, or a setup problem.</li>
          <li><b>Find the entry point</b> (<code>main</code> in package.json, the server file, the CLI) and follow <i>one</i> path through the code, not all of it.</li>
          <li><b>Search, do not browse:</b> <code>grep -rn "functionName"</code>, your editor's "go to definition", and "find references". Let the machine find the code.</li>
          <li><b>Read the tests:</b> they are executable documentation of what each piece should do.</li>
          <li><b>Read the git history</b> of the file (<code>git log -p file</code>, <code>git blame</code>) to learn <i>why</i> it is the way it is. Past issues and PRs show what maintainers accept.</li>
        </ol>
        <div class="senior">Do not try to understand everything. Understand <b>just enough</b> to make one small, correct change, and prove it with a test. You will learn the rest by doing it again.</div>
        ${back}`,
      right: `<p class="kicker">Lab · explore a repository</p><div id="lab"></div>${foot('answer 4 of 5 to turn the page')}`,
      init(left, right, api) { mountExpedition(right.querySelector('#lab'), { need: 4, onPass: finish(right, api, 'repository understood', 1000) }); },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Open source · the contribution workflow</p>
        <h1>Fork, branch, test, fix, propose</h1>
        <p>You cannot push to someone else's repository, so you work on your own copy and <b>propose</b> your change. This is the exact workflow of lesson 6 (branches) and lesson 14 (pull requests), with one extra step.</p>
        <ul>
          <li><b>Fork</b> copies the project to your GitHub account. <b>Clone</b> your fork to your machine. Add the original as <code>upstream</code> so you can pull its newest changes.</li>
          <li>Work on a <b>branch</b>, never on <code>main</code>, so your fork stays clean.</li>
          <li><b>Reproduce first.</b> Write a failing test that shows the bug. Now you know you are fixing the right thing, and the maintainer has proof.</li>
          <li><b>Make the smallest fix</b> that works. Resist the urge to reformat or tidy unrelated code: it makes review harder and gets PRs rejected.</li>
          <li><b>Match their style</b> (formatter, naming, comment style) even where you disagree.</li>
          <li><b>Commit with a clear message</b> (and a sign-off if required), push to your fork, and open the PR.</li>
          <li><b>Review is a conversation.</b> Answer every comment, make the changes, say thanks. Maintainers are volunteers; patience and politeness win.</li>
        </ul>
        <div class="warn">Never open a drive-by PR that rewrites a lot, adds a feature nobody asked for, or was clearly generated and not understood by you. It costs maintainers real time. For anything non-trivial, <b>open an issue first</b> and ask. If a project bans AI-generated contributions, respect it.</div>
        ${back}`,
      right: `<p class="kicker">Lab · order the workflow</p><div id="lab"></div>${foot('order the steps to turn the page')}`,
      init(left, right, api) {
        mountOrdering(right.querySelector('#lab'), {
          intro: 'You want to fix a bug in a project you do not own. Put the steps in order.',
          steps: ['Read CONTRIBUTING and comment on the issue to say you are working on it', 'Fork the repository and clone your fork', 'Create a branch such as fix/trailing-dash', 'Run the existing tests to confirm a clean starting point', 'Write a failing test that reproduces the bug', 'Make the smallest change that makes it pass; run all tests', 'Commit with a clear message and push the branch to your fork', 'Open the pull request linking the issue', 'Respond to review comments and update the branch'],
          explain: 'Ask first, reproduce before fixing, change little, then communicate.',
          onPass: finish(right, api, 'workflow ordered', 1000),
        });
      },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Open source · communication</p>
        <h1>A pull request is a letter to a busy stranger</h1>
        <p>The maintainer is reading dozens of these between a job and a life. Your code can be perfect and still be ignored if the PR makes them work to understand it. A good description answers their questions before they ask:</p>
        <ul>
          <li><b>Title:</b> imperative, specific. "Trim trailing dashes in slugify", not "fix bug".</li>
          <li><b>Link the issue</b> (<code>Fixes #12</code>) so GitHub connects and closes it.</li>
          <li><b>What and why:</b> the problem in one or two sentences, and the approach you took.</li>
          <li><b>How you tested it:</b> the new regression test, plus "all existing tests pass".</li>
          <li><b>Scope:</b> say what you did <i>not</i> change, and flag any trade-off or open question.</li>
          <li>Screenshots or output when the change is visible.</li>
        </ul>
        <h2>Receiving review</h2>
        <ul>
          <li>Feedback is about the code, not about you. Assume good intent.</li>
          <li>If you disagree, explain your reasoning calmly, once, and accept the maintainer's decision: it is their project.</li>
          <li>Push fixes as new commits during review; thank people; be patient with slow replies.</li>
          <li>If it is not merged, you still learned, and the next one will go better.</li>
        </ul>
        <div class="senior">The same habits (a clear problem statement, evidence, small scope, humility) make you effective at any company. Reviewers remember the people who made their job easy.</div>
        ${back}`,
      right: `<p class="kicker">Lab · write the PR</p><div id="lab"></div>${foot('satisfy all six checks to turn the page')}`,
      init(left, right, api) { mountPRWriter(right.querySelector('#lab'), { onPass: finish(right, api, 'PR written', 1000) }); },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Finale · your real contribution</p>
        <h1>Now do it for real</h1>
        <p>This is the last lesson and the first real step. Over the next days, send a genuine pull request to a project you use. It can be small: <b>a typo, a documentation fix, a missing test, a clarifying error message, a small bug</b>. Small and merged beats ambitious and abandoned.</p>
        <h2>How to find something</h2>
        <ul>
          <li>Start with a tool you already use and are annoyed by, or a project whose docs confused you (you are the best person to fix the docs).</li>
          <li>Search GitHub for issues labelled <b>good first issue</b> or <b>help wanted</b> in languages you know (JavaScript, SQL, Python).</li>
          <li>Pick active projects: recent commits, maintainers who reply, a CONTRIBUTING file.</li>
          <li>Your own repositories count for practice: send yourself a PR and review it as a stranger would.</li>
        </ul>
        <h2>Get a review from me</h2>
        <p>Open Claude in your terminal in the cloned repo and say: <i>"Review my branch like a senior engineer and a maintainer of this project would: is the change minimal, tested, in their style, and is the PR description clear?"</i> Fix what it finds, then submit.</p>
        <h2>What you have built</h2>
        <p>Thirty lessons: how computers store and run programs, the web, data, version control, testing, debugging, design, reliability, security, algorithms, concurrency, databases, distributed systems, the cloud, the front end, AI, and how to join the profession's shared work. Keep the habits: <b>design first, test, deploy early, write things down, ask for review, read the code, stay curious.</b></p>
        <div class="senior">You are not "done learning": nobody is. But you now have the map, the vocabulary and the habits, and you know how to find and verify what you do not know. That is what 20 years of experience mostly is. Go build things, and help someone else do the same.</div>
        ${back}`,
      right: `<p class="kicker">Finish line · your pull request</p><div id="lab"></div>${foot('tick 6 of 7 steps to finish the book')}`,
      init(left, right, api) {
        mountOssTracker(right.querySelector('#lab'), { onDone: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = '🎓 open-source capstone complete'; api.unlock(3000); const box = right.querySelector('#lab'); if (!box.querySelector('.grad')) { const g = document.createElement('div'); g.className = 'status status--good grad'; g.textContent = '🎓 You read a real codebase and sent a real pull request. Welcome to the community. Now go and build the next thing.'; box.append(g); } } });
      },
    },
  ],
};
