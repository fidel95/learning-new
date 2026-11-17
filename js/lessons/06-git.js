// Lesson 6 — The terminal and Git (practised in a safe simulated terminal).
import { mountQuiz } from '../workbench.js';
import { mountTerminal } from '../terminal.js';

export const lesson = {
  id: 'l6',
  title: 'Lesson 6 · The terminal & Git',
  spreads: [
    // ───────────────────────── Spread 1: the terminal ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 6 · Professional tools</p>
        <h1>The terminal: talking to the computer in text</h1>
        <p>Every graphical app is a layer on top of something simpler: you type a <b>command</b>, the computer
        does it and prints the result. That text interface is the <b>terminal</b>, and the program reading
        your commands is the <b>shell</b>. Servers have no mouse or windows; developers live here because
        text can be typed fast, repeated, saved in scripts and combined.</p>
        <h2>Anatomy of a command</h2>
        <pre><code>git commit -m "Add login form"
 │     │     │  └─ argument: the thing to act on
 │     │     └──── option (flag): changes how it behaves
 │     └────────── subcommand
 └──────────────── program</code></pre>
        <h2>Commands you will use daily</h2>
        <ul>
          <li><code>pwd</code> — print where you are.</li>
          <li><code>ls</code> — list the files here.</li>
          <li><code>cat FILE</code> — print a file's contents.</li>
          <li><code>echo "text"</code> — print text. With <code>&gt; FILE</code> it <b>writes</b> the text into a file (replacing it); with <code>&gt;&gt; FILE</code> it <b>appends</b>.</li>
          <li><code>touch FILE</code> — create an empty file.</li>
          <li><code>rm FILE</code> — delete a file. <b>There is no trash can and no undo.</b></li>
        </ul>
        <p>A real computer also has folders: <code>cd folder</code> moves in, <code>cd ..</code> moves up,
        <code>mkdir name</code> makes one, and <code>~</code> means your home folder. A <b>path</b> like
        <code>~/project/app.js</code> is the address of a file. This practice terminal has a single folder
        so you can focus on the ideas.</p>
        <div class="senior">Treat the terminal with respect: <code>rm</code> and its relatives are permanent, and
        a command pasted from the internet runs with <i>all your permissions</i>. Read every command before you
        press Enter, and never run one you do not understand. Curiosity is good. Blind pasting is how people lose data.</div>
        <div class="foot"><span></span><span class="hint">type some commands →</span></div>`,
      right: `
        <p class="kicker">Practice terminal</p>
        <h2 style="margin-top:0">Your safe sandbox</h2>
        <p>Click the black box and type. Try, in order: <code>ls</code> · <code>echo "hello" &gt; a.txt</code> ·
        <code>ls</code> · <code>cat a.txt</code> · <code>echo "world" &gt;&gt; a.txt</code> · <code>cat a.txt</code> ·
        <code>rm a.txt</code>. Use the Up arrow to repeat commands. Nothing here can touch your real computer.</p>
        <div id="term"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountTerminal(right.querySelector('#term'), { preset: 'empty', view: 'none', welcome: 'Practice terminal ready. Type  help  for the list of commands.' });
      },
    },

    // ───────────────────────── Spread 2: Git's model ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 6 · Version control</p>
        <h1>Git: a time machine for your project</h1>
        <p>Without version control you end up with <code>final.js</code>, <code>final2.js</code>,
        <code>final-REAL.js</code>. <b>Git</b> replaces that with a complete, searchable history, and lets
        many people work on the same code without overwriting each other. Almost every software team on Earth uses it.</p>
        <h2>A commit is a snapshot</h2>
        <p>A <b>commit</b> saves a snapshot of every tracked file at one moment, plus a <b>message</b>
        saying what and why, plus a pointer to its <b>parent</b> (the previous commit). Each gets a unique id,
        a <b>hash</b> like <code>3f9a1c2</code>. Chained together, commits form your project's history.</p>
        <h2>Three places, not two</h2>
        <ol>
          <li><b>Working folder</b>: the files you edit.</li>
          <li><b>Staging area</b> (the "index"): a draft of the <i>next</i> commit. <code>git add</code> copies files here.</li>
          <li><b>Repository</b>: the permanent history. <code>git commit</code> turns the staging area into a snapshot.</li>
        </ol>
        <p>Why a middle step? You may have changed ten files but want the commit to hold only the three that
        belong together. The staging area lets you choose.</p>
        <pre><code>git init                    # start tracking this folder
git status                  # where do things stand?
git add notes.txt           # stage a file  (or: git add .)
git commit -m "Add notes"   # snapshot what is staged
git log --oneline           # the history
git diff                    # what changed since staging?</code></pre>
        <div class="warn"><b>History is forever.</b> If you commit a password or API key and later delete it, it is
        still in the old commits, and anyone who ever copied the repository has it. Never commit secrets
        (put them in a <code>.gitignore</code>d file like <code>.env</code>). If one leaks, <b>revoke and replace the key at once</b>.</div>
        <div class="senior">Make small commits that do <b>one thing</b>, and write messages as commands that finish the
        sentence "This commit will…": <i>"Fix crash when cart is empty"</i>, not <i>"stuff"</i>. Six months from now,
        the message is the only explanation you will have.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Practice terminal</p>
        <h2 style="margin-top:0">Watch the three places</h2>
        <p>Run, one at a time: <code>git init</code> · <code>echo "hi" &gt; a.txt</code> · <code>git status</code> ·
        <code>git add a.txt</code> · <code>git status</code> · <code>git commit -m "Add a"</code> · <code>git log --oneline</code>.
        After each, look at the three boxes below. Then edit the file again and run <code>git diff</code>.</p>
        <div id="term"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountTerminal(right.querySelector('#term'), { preset: 'empty', view: 'areas', welcome: 'A fresh, empty folder. Start with:  git init' });
      },
    },

    // ───────────────────────── Spread 3: branches & merging ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 6 · Working in parallel</p>
        <h1>Branches and merging</h1>
        <p>A <b>branch</b> is just a movable <i>label</i> pointing at a commit. Creating one costs nothing: no files
        are copied. It gives you a private line of work where you can experiment without disturbing <code>main</code>.</p>
        <p><b>HEAD</b> means "where you are now": it points at your current branch. A new commit moves
        that branch's label forward.</p>
        <pre><code>git switch -c idea     # create branch "idea" and move onto it
git switch main        # go back
git branch             # list branches (* marks the current one)</code></pre>
        <h2>Merging two lines of work</h2>
        <p>When the idea is ready: switch to the branch you want to <i>receive</i> the work and merge:</p>
        <pre><code>git switch main
git merge idea</code></pre>
        <ul>
          <li><b>Fast-forward</b>: if <code>main</code> did not move since you branched, Git just slides the label forward. No new commit.</li>
          <li><b>Merge commit</b>: if both moved, Git combines the changes and makes a commit with <b>two parents</b>.</li>
          <li><b>Conflict</b>: if both sides changed the <i>same lines</i>, Git cannot choose for you.</li>
        </ul>
        <h2>Resolving a conflict</h2>
        <p>Git stops and writes both versions into the file:</p>
        <pre><code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD
your side (the branch you are on)
=======
their side (the branch you merged)
&gt;&gt;&gt;&gt;&gt;&gt;&gt; idea</code></pre>
        <ol>
          <li>Open the file. Decide what the final text should be (yours, theirs, or both).</li>
          <li>Delete the three marker lines, leaving only the final text.</li>
          <li><code>git add FILE</code>, then <code>git commit</code> to finish.</li>
        </ol>
        <p>Changed your mind mid-merge? <code>git merge --abort</code> puts everything back.</p>
        <div class="senior">Conflicts are not failures; they are Git being honest that two humans made
        competing decisions. They are rarer when branches are short-lived and when you pull the latest
        <code>main</code> often. A conflict you resolve by deleting someone's work without reading it is a bug you shipped.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Practice terminal</p>
        <h2 style="margin-top:0">Grow a branching history</h2>
        <p>Try: <code>git init</code>, make a file and commit. Then <code>git switch -c idea</code>, add a commit.
        <code>git switch main</code> (notice the file reverts!), add a different commit there too, then
        <code>git merge idea</code>. Watch the graph fork and join.</p>
        <div id="term"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountTerminal(right.querySelector('#term'), { preset: 'empty', view: 'both', welcome: 'Fresh folder. Start with:  git init' });
      },
    },

    // ───────────────────────── Spread 4: undoing mistakes ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 6 · Fixing mistakes</p>
        <h1>Undo: the right tool for each mistake</h1>
        <p>Beginners fear Git because they once lost work. Professionals relax because they know that
        <b>committed work is very hard to lose</b>. Pick the tool by <i>where</i> the mistake is:</p>
        <ul>
          <li><b>Edited a file badly, not staged:</b> <code>git restore FILE</code> throws the edits away (they are gone).</li>
          <li><b>Staged something by accident:</b> <code>git restore --staged FILE</code> unstages it, keeping your edits.</li>
          <li><b>Last commit was wrong, only on your machine:</b> <code>git reset --hard HEAD~1</code> moves the branch label back one commit and resets your files to match. <code>HEAD~1</code> means "one commit before HEAD".</li>
          <li><b>A bad commit that other people already have:</b> <code>git revert HASH</code> adds a <i>new</i> commit that does the opposite. History stays honest and nobody's copy breaks.</li>
        </ul>
        <div class="warn"><code>reset --hard</code> also deletes your uncommitted changes. And never rewrite history that
        others already have: it forces everyone to untangle their copies. When in doubt, <code>revert</code>.</div>
        <h2>The safety net: reflog</h2>
        <p>After <code>reset --hard</code> the "lost" commit still exists; nothing points at it any more.
        <code>git reflog</code> lists everywhere HEAD has been recently (for about 90 days in real Git). Find the
        hash, then <code>git reset --hard HASH</code> brings it back. You will do exactly that in the next challenge.</p>
        <h2>Beyond your machine</h2>
        <p>Everything so far is local. A <b>remote</b> (like GitHub) is just another copy of the repository.
        <code>git push</code> sends your commits there, <code>git pull</code> brings others' commits in,
        and a <b>pull request</b> asks teammates to review a branch before it is merged into <code>main</code>.
        You already use this: your learning-new repo lives on GitHub. The practice terminal omits remotes
        because they need a network, but every idea here applies unchanged.</p>
        <div class="senior">Teams protect <code>main</code>: nobody commits to it directly. Work happens on a branch,
        gets reviewed in a pull request, passes automated tests, then merges. That workflow catches mistakes
        before they reach customers.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Practice terminal</p>
        <h2 style="margin-top:0">Break things on purpose</h2>
        <p>Make two commits. Then <code>git reset --hard HEAD~1</code> and watch one disappear from the history.
        Run <code>git reflog</code>, copy the hash of the lost commit, and <code>git reset --hard HASH</code> to
        resurrect it. Then try <code>git revert HEAD</code> and compare how the graph differs.</p>
        <div id="term"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountTerminal(right.querySelector('#term'), { preset: 'empty', view: 'graph', welcome: 'Fresh folder. Start with:  git init' });
      },
    },

    // ───────────────────────── Spread 5: Lab A (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge · Lab A</p>
        <h1>Run a whole workflow</h1>
        <p>Start from an empty folder. The book watches the repository itself (not your typing), so
        any correct route works. Boxes tick the moment you achieve each goal.</p>
        <div id="tasks"></div>
        <div class="senior">Hints: <code>git add</code> before every <code>git commit</code>. To get a change on a
        branch, make it <i>after</i> switching to that branch. Use <code>git status</code> and the
        picture to check where you are before every step. Pros check constantly.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Practice terminal</p>
        <div id="term"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all five goals to turn the page</span></div>`,
      init(left, right, api) {
        const head = (s) => s._headId();
        const tasks = [
          { label: 'Initialize a repository, create a file, and make the first commit on main.',
            check: (s) => s.inited && s.tip('main') && Object.keys(s.commits[s.tip('main')].tree).length >= 1 },
          { label: 'Create a branch named feature and make at least one commit on it (one that main does not have).',
            check: (s) => { const f = s.tip('feature'), m = s.tip('main'); return f && m && f !== m && !s.isAncestor(f, m) && s.commits[f].parents.length > 0; } },
          { label: 'Merge feature into main so main now contains the feature commit.',
            check: (s) => { const f = s.tip('feature'), m = s.tip('main'); return f && m && s.commits[f].parents.length > 0 && s.isAncestor(f, m); } },
          { label: 'Make a commit with the message exactly  oops  then undo it so it is no longer on your branch (git reset --hard HEAD~1).',
            check: (s) => { const o = s.order.find((id) => s.commits[id].message === 'oops'); const h = head(s); return o && h && !s.isAncestor(o, h); } },
          { label: 'Rescue the lost oops commit: find it with git reflog and bring it back with git reset --hard HASH.',
            check: (s) => { const o = s.order.find((id) => s.commits[id].message === 'oops'); const h = head(s);
              return o && h && s.isAncestor(o, h) && s.history.some((x) => /git reflog/.test(x)) && s.history.some((x) => /reset --hard HEAD/.test(x)); } },
        ];
        mountTerminal(right.querySelector('#term'), {
          preset: 'empty', view: 'graph', tasks, tasksEl: left.querySelector('#tasks'),
          welcome: 'Empty folder. Goal list is on the left page.',
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(150); },
        });
      },
    },

    // ───────────────────────── Spread 6: Lab B conflict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge · Lab B</p>
        <h1>Resolve a real merge conflict</h1>
        <p>A restaurant menu file was edited on two branches. On <code>main</code> someone wrote
        "pizza with cheese". On <code>feature</code> someone else wrote "pizza with hot sauce". Both edits are valuable.</p>
        <div id="tasks"></div>
        <div class="senior">To write the resolved file use <code>echo "your final text" &gt; menu.txt</code>. That replaces the
        whole file, markers included. Then <code>git add menu.txt</code> and <code>git commit</code>. Use
        <code>cat menu.txt</code> first to read both sides, like a careful engineer.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Practice terminal</p>
        <div id="term"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all three goals to turn the page</span></div>`,
      init(left, right, api) {
        const tasks = [
          { label: 'Start the merge: from main, run git merge feature. (A conflict is expected, and that is the point.)',
            check: (s) => s.history.some((x) => /^git merge feature/.test(x)) },
          { label: 'Resolve it: menu.txt must keep BOTH the cheese and the hot sauce, with no <<<<<<< ======= >>>>>>> marker lines left. Finish with git add + git commit.',
            check: (s) => { const t = s.commits[s.tip('main')]; const f = t && t.tree['menu.txt'];
              return t && t.parents.length === 2 && f && /cheese/.test(f) && /hot sauce/.test(f) && !/(<<<<<<<|=======|>>>>>>>)/.test(f); } },
          { label: 'Look at the result with git log --oneline and find the merge commit.',
            check: (s) => s.commits[s.tip('main')] && s.commits[s.tip('main')].parents.length === 2 && s.history.some((x) => /git log/.test(x)) },
        ];
        mountTerminal(right.querySelector('#term'), {
          preset: 'conflict', view: 'both', tasks, tasksEl: left.querySelector('#tasks'),
          welcome: 'You are on main. A feature branch also exists. Start:  git log --oneline',
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(200); },
        });
      },
    },

    // ───────────────────────── Spread 7: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Four questions on the ideas people most often get wrong. If you are unsure, reproduce the scenario in a
        practice terminal two or three pages back and look at the pictures.</p>
        <div class="senior">Most "Git disasters" come from not knowing which of the three places a change lives in.
        When something looks lost, run <code>git status</code>, <code>git log</code> and <code>git reflog</code> before doing anything drastic.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>You edit <code>a.txt</code>, then run <code>git commit -m "update"</code> without <code>git add</code>. What gets committed?</p>',
            options: ['The edit, since the file is tracked', 'Nothing: commit only takes what is in the staging area', 'Everything in the folder', 'An empty commit with that message'], answer: 1,
            why: 'A commit snapshots the staging area. Without git add, nothing is staged, so Git says there is nothing to commit.' },
          { prompt: '<p>You are on <code>main</code> and run <code>git branch fix</code>. Where are you now?</p>',
            options: ['On fix', 'Still on main: the label was created but you did not move', 'Nowhere: you must commit first', 'On both'], answer: 1,
            why: 'git branch only creates a label. git switch fix (or git switch -c fix) is what moves HEAD onto it.' },
          { prompt: '<p>You branch off <code>main</code>, add commits, and <code>main</code> gets no new commits meanwhile. You merge your branch into main. What kind of merge is it?</p>',
            options: ['Fast-forward: main\'s label just slides forward', 'A merge commit with two parents', 'A conflict', 'It cannot be merged'], answer: 0,
            why: 'When main is a direct ancestor of your branch there is nothing to combine, so Git moves the main label forward. No new commit is created.' },
          { prompt: '<p>You committed an API key, pushed it, then deleted the key in a new commit. Are you safe?</p>',
            options: ['Yes: the latest version no longer has it', 'Yes, as long as the repo is private', 'No: it is still in history, so revoke and replace the key immediately', 'Yes, after running git status'], answer: 2,
            why: 'Old commits keep every version of every file. Assume anyone with access to the repo saw the key, and rotate it. Removing it from the latest commit does not un-leak it.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(200); });
      },
    },
  ],
};
