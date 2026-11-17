// Lesson 14 — Working with people: code review, estimation, technical debt and hard conversations.
import { mountQuiz } from '../workbench.js';
import { mountReview, mountPlanning, mountScenarios } from '../peoplelab.js';

export const lesson = {
  id: 'l14',
  title: 'Lesson 14 · Working with people',
  spreads: [
    // ───────────────────────── Spread 1: code review (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 2 · Software is a team sport</p>
        <h1>Code review: how teams catch what one person misses</h1>
        <p>Almost no professional code reaches production without a second person reading it. A <b>code review</b> catches bugs and security holes, spreads knowledge ("bus factor": what if only one person
        understands this?), keeps the codebase consistent, and teaches both sides. Done well it is the best learning you will get at work.</p>
        <h2>What to look for, in order of importance</h2>
        <ol>
          <li><b>Does it do the right thing?</b> Read the description first. Is this the right change at all? Does it handle edge cases and failure?</li>
          <li><b>Is it safe?</b> Security (injection, secrets, authorization), data loss, concurrency.</li>
          <li><b>Is the design sound?</b> Fits the architecture, simple, no needless coupling, easy to change (lessons 11 and 12).</li>
          <li><b>Is it tested?</b> New behavior, edge cases, and the bug being fixed.</li>
          <li><b>Is it readable?</b> Names, structure, comments that explain <i>why</i>.</li>
          <li><b>Nits last.</b> Formatting is for a linter, not a human. Mark purely optional things with "nit:".</li>
        </ol>
        <h2>How to write a comment people can use</h2>
        <ul>
          <li>Be <b>specific</b> (point at the line) and say <b>why it matters</b>, then <b>suggest a fix</b>.</li>
          <li>Ask <b>questions</b> instead of issuing verdicts: "What happens if the token is used twice?"</li>
          <li>Critique the <b>code, not the person</b>: "this query is injectable", never "you wrote an injectable query".</li>
          <li>Separate <b>blocking</b> problems (must fix) from <b>suggestions</b>. Praise what is good.</li>
          <li><b>Approve with nits</b> when only optional things remain; do not hold work hostage for taste.</li>
        </ul>
        <h2>For the author</h2>
        <p>Keep PRs <b>small</b> (a big diff gets a shallow review), write a description saying <i>what and why</i>, review your own diff first, add tests, and treat feedback as help, not attack. Respond to every comment.</p>
        <div class="senior">The review is of the <b>change</b>, and the goal is a better product, not winning. A reviewer who finds a serious bug has done their job; an author who thanks them
        has done theirs. Also: "tested manually" in a PR description means "not tested". Ask for the test.</div>
        <div class="foot"><span></span><span class="hint">review a real-looking PR →</span></div>`,
      right: `
        <p class="kicker">Review lab · you are the reviewer</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint" id="gateHint">catch every blocker and decide correctly to turn the page</span></div>`,
      init(left, right, api) {
        mountReview(right.querySelector('#lab'), { onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'review accepted'; api.unlock(500); } });
      },
    },

    // ───────────────────────── Spread 2: estimation and planning (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 2 · Promises about the future</p>
        <h1>Estimation and planning</h1>
        <p>"How long will it take?" is the question engineers fear most, because we are bad at it. We are <b>systematically optimistic</b> (the <b>planning fallacy</b>) and forget the work we did not foresee:
        review, integration, waiting, bugs, meetings, sick days. <b>Hofstadter's law</b>: it always takes longer than you expect, even when you account for Hofstadter's law.</p>
        <h2>Think in ranges, not points</h2>
        <p>Software durations are <b>skewed</b>: a task can take 2× longer but almost never half as long. So a single number ("3 days") hides a long tail. Better to say "most likely 3 days, almost certainly under 6".
        The <b>cone of uncertainty</b>: early in a project estimates can be off by a factor of 4 either way; they narrow only as you learn by building. Uncertain items (new technology, third-party integrations,
        unclear requirements) deserve the widest ranges.</p>
        <p>Ranges <b>add up in a surprising way</b>: the sum of the "most likely" times is <i>not</i> the most likely total. Delays are much more likely than windfalls, so the total drifts late. That is why a plan
        that "fits" with zero slack usually fails.</p>
        <h2>Techniques that work</h2>
        <ul>
          <li><b>Break work down</b> into pieces of a few days; estimates of small, known things are far better.</li>
          <li><b>Compare with past work</b> ("last time something like this took 8 days") instead of guessing from scratch. Track your own error and correct for it.</li>
          <li><b>Estimate as a team</b> (planning poker): disagreement exposes hidden assumptions and unknowns.</li>
          <li><b>Do the risky part first</b>: a quick prototype of the scary integration turns an unknown into a number.</li>
        </ul>
        <h2>The levers and how to say no</h2>
        <p>A project has four levers: <b>scope</b>, <b>time</b>, <b>people</b>, <b>quality</b>. Adding people late slows a project down (Brooks's law: new people must be taught, and communication grows). Cutting quality borrows from the future.
        The healthy lever is <b>scope</b>: rank features (<b>must / should / could / won't</b>) and ship the smaller thing first. Do not answer "no". Answer with <b>options</b>: "Not all of it by Friday. Here is what we
        can deliver Friday, what takes three weeks, and what each choice risks. What matters most?"</p>
        <div class="senior">A date is a <b>promise</b>, an estimate is a <b>forecast</b>. Never turn a forecast into a promise without a buffer, and tell stakeholders about risk <b>early</b>: "no surprises" is the first rule of
        trust. Bad news is cheap on Monday and ruinous on the deadline.</div>
        <div id="tasks"></div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Planning lab</p>
        <h2 style="margin-top:0">Choose scope you can actually deliver</h2>
        <p>Tick the features to build. The simulation replays the project 4,000 times, with each task's real duration drawn from its uncertainty, and reports the <b>chance of finishing on time</b>.
        Notice how a plan whose estimates "fit" in 20 days can still be a coin flip.</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">meet all four goals to turn the page</span></div>`,
      init(left, right, api) {
        mountPlanning(right.querySelector('#lab'), {
          tasksEl: left.querySelector('#tasks'),
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'plan accepted'; api.unlock(500); },
          tasks: [
            { label: 'Include login (required): the product is unusable without it', check: (r, sel) => ({ ok: sel.has('login') }) },
            { label: 'Include Payments: the business cannot launch without revenue', check: (r, sel) => ({ ok: sel.has('pay') }) },
            { label: 'At least an 85% chance of finishing within 20 days', check: (r) => ({ ok: r.chance >= 0.85, note: Math.round(r.chance * 100) + '%' }) },
            { label: 'Deliver at least 60 points of value', check: (r) => ({ ok: r.value >= 60, note: r.value + ' points' }) },
          ],
        });
      },
    },

    // ───────────────────────── Spread 3: tech debt, communication, hard conversations (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Part 2 · The human side</p>
        <h1>Tech debt, communication and hard conversations</h1>
        <h2>Technical debt</h2>
        <p><b>Technical debt</b> is the future cost of shortcuts taken now. Like financial debt, it can be a <b>smart loan</b> (a deliberate, documented shortcut to hit a launch) or <b>careless</b> (a mess nobody chose).
        What hurts is the <b>interest</b>: every feature in that area takes longer and breaks more. So prioritize by <b>pain</b> (how often do we touch it, how much does it slow us or risk outages?), not by how ugly it is.
        Make debt <b>visible</b> (track it), pay it down in small steps <i>alongside</i> features (refactor under tests, lesson 11), and explain it to non-engineers in terms they care about: speed, cost and risk.</p>
        <h2>Communicating well</h2>
        <ul>
          <li><b>Ask good questions</b>: what you are trying to do, what you tried, what you expected, what happened, and a minimal example. Ten minutes of preparation saves a colleague an hour.</li>
          <li><b>Write things down</b>: decisions, designs, status. Clear writing scales; hallway memory does not. Lead with the conclusion.</li>
          <li><b>Escalate early</b>, with facts and a proposal: "this is at risk because X; I suggest Y; I need a decision by Z".</li>
          <li><b>Disagree and commit</b>: argue hard with data before the decision; once it is made, support it fully.</li>
        </ul>
        <h2>Feedback that works</h2>
        <p>Describe the <b>Situation</b>, the specific <b>Behavior</b> and its <b>Impact</b>: "In yesterday's PR (S) there were no tests for the new endpoint (B), so the next refactor could break it unnoticed (I)." Not "you are careless". Do it privately, promptly,
        and ask for their view. When you receive feedback, <b>listen first</b>, ask for examples, and decide later.</p>
        <div class="warn"><b>Mistakes will happen to you.</b> Production bugs, wrong estimates, deleted data. What defines you is how you respond: report quickly and plainly, mitigate, fix, and share what you learned.
        Hiding a mistake turns a small problem into a career problem. Teams where people are safe to admit errors (psychological safety) are measurably safer and faster.</div>
        <div class="senior">Technical skill gets you a seat; <b>trust</b> keeps it. Trust comes from doing what you said, saying early when you cannot, and being the person who makes everyone around them better.
        The best engineers are rarely the cleverest; they are the ones people want to work with and whose word means something.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Scenario lab</p>
        <h2 style="margin-top:0">What do you say?</h2>
        <p>Four real situations. Click any response to see what happens next, then keep going until you find the best approach for each. Exploring the bad options is allowed (and useful).</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint" id="gateHint">find the best response in all four to turn the page</span></div>`,
      init(left, right, api) {
        mountScenarios(right.querySelector('#lab'), {
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all four resolved'; api.unlock(500); },
          scenarios: [
            { title: 'Harsh review', situation: 'A senior colleague reviews your first big PR. Their only comment on your main function is: "This is wrong. Rewrite it."',
              options: [
                { text: 'Reply: "It works fine on my machine. Why is it wrong?"', rating: 'poor', outcome: 'It sounds defensive and escalates. You may be right, but you have started an argument instead of learning something.' },
                { text: 'Rewrite it exactly how you imagine they want, say nothing.', rating: 'okay', outcome: 'You avoid conflict but guess wrong half the time and learn nothing. Next review repeats the problem.' },
                { text: 'Reply: "Thanks. Can you point at what is wrong, or the principle you would apply? Happy to hop on a quick call if easier."', rating: 'best', outcome: 'You assume good intent, ask for specifics, and offer the fastest path. You get the reason (and a lesson), and the relationship improves. If the tone is truly out of line, raise that privately and separately.' },
                { text: 'Complain to the manager that the reviewer is rude.', rating: 'poor', outcome: 'You skipped the direct conversation. Going over their head first damages trust and rarely fixes a terse comment.' },
              ] },
            { title: 'Impossible deadline', situation: 'The product manager asks: "Can we ship the new checkout by Friday?" Your honest estimate for all of it is three weeks.',
              options: [
                { text: '"Sure, no problem." Then work nights.', rating: 'poor', outcome: 'You promise what you cannot deliver. Friday brings a half-built, buggy checkout and a burned-out you. Everyone is surprised and no one trusts the next estimate.' },
                { text: '"No, that is impossible."', rating: 'okay', outcome: 'Honest, but it gives the PM nothing to work with and sounds like an obstacle. You are right and unhelpful.' },
                { text: '"Not all of it by Friday. By Friday I can deliver the core purchase flow; discounts and saved cards need about two more weeks. Which matters most? Here are the risks of each option."', rating: 'best', outcome: 'You offer options tied to scope, name the risks and hand the PM a real decision. That is negotiation done well: honest, early and constructive.' },
                { text: 'Say yes, then quietly cut testing to make it fit.', rating: 'poor', outcome: 'You secretly spent quality to buy time. The bugs arrive after launch, at the worst moment, and they trace back to you.' },
              ] },
            { title: 'You broke production data', situation: 'Thursday evening before a long weekend you realise a change you shipped has been corrupting orders. About 200 are affected so far, and more arrive every hour.',
              options: [
                { text: 'Quietly patch it tonight and hope nobody notices the bad rows.', rating: 'poor', outcome: 'The damaged data stays, support gets confused customers, and when it surfaces the cover-up is worse than the bug.' },
                { text: 'Wait until Monday to fix it properly, so it is not rushed.', rating: 'poor', outcome: 'Four days of corrupted orders. A holiday weekend is the busiest time. The cost grows every hour you wait.' },
                { text: 'Tell the on-call lead right now with the facts, stop the bleeding (roll back or disable the feature), then work with them on fixing the 200 rows and write it up.', rating: 'best', outcome: 'Fast, transparent, mitigate-first. Teams forgive honest mistakes handled well; they remember hidden ones. This is also exactly the incident process from lesson 10.' },
                { text: 'Spend hours finding the exact root cause before telling anyone.', rating: 'okay', outcome: 'Understanding matters, but while you investigate alone, damage grows. Mitigate and escalate first, investigate second.' },
              ] },
            { title: 'No tests, again', situation: 'A teammate keeps opening PRs with no tests. You are the reviewer, and last time you approved to avoid friction.',
              options: [
                { text: 'Approve again; it is not worth the conflict.', rating: 'poor', outcome: 'You teach the team that standards are optional. Bugs reach production and the habit spreads.' },
                { text: 'Block the PR with "needs tests" and nothing else.', rating: 'okay', outcome: 'The standard holds, but with no context it feels like a wall. They may add a token test just to get past you.' },
                { text: 'Comment specifically on the missing cases, offer to pair on the first test, and later suggest the team agree on a "tests required" rule in the PR template.', rating: 'best', outcome: 'Specific, kind, helpful, and it fixes the system as well as the person. A shared written norm is easier to follow than one reviewer\'s mood.' },
                { text: 'Complain about their PRs in the team chat.', rating: 'poor', outcome: 'Public shaming kills trust and psychological safety. Feedback belongs in private first, with the aim of helping.' },
              ] },
          ],
        });
      },
    },

    // ───────────────────────── Spread 4: quiz (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Four more judgment calls</h1>
        <p>Review size, estimation habits, debt and learning from your own numbers. The right answers all treat the team as a <b>system</b> to improve, not a set of people to blame.</p>
        <div class="senior">You now have the full engineer's toolkit: build, debug, design, scale, operate and collaborate. The capstone is next, where you use all of it on something that is yours.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>A teammate sends you a 1,200-line PR touching ten areas of the app. What is the best response?</p>',
            options: ['Skim it and approve; it is too big to review', 'Ask them to split it into smaller, focused PRs that can be reviewed properly', 'Reject it without explanation', 'Review only the first file'], answer: 1,
            why: 'Review quality collapses as diffs grow: people skim, and bugs slip through. Small PRs are reviewed faster, more carefully, and are easier to roll back.' },
          { prompt: '<p>Your last five estimates were each about 40% too low. What should you do for the next one?</p>',
            options: ['Try harder to be accurate', 'Use your own history to calibrate: widen the range and add a correction factor, and break the work down', 'Promise the shortest time to look confident', 'Stop estimating'], answer: 1,
            why: 'Systematic error is data. Calibrating from past results beats willpower. Ranges and decomposition also expose the unknowns that caused the overruns.' },
          { prompt: '<p>The team has a messy module nobody touches and a different, slightly ugly one that every feature touches and that causes frequent bugs. Which tech debt first?</p>',
            options: ['The ugliest code', 'The one with the most interest: the module that slows and breaks work constantly', 'Neither, debt is fine', 'Whichever is newest'], answer: 1,
            why: 'Debt is worth paying when the interest is high. Untouched ugly code costs nothing until you need to change it; the busy, fragile module costs you every sprint.' },
          { prompt: '<p>A stakeholder asks for a date for a large, vague project. What is the most honest and useful reply?</p>',
            options: ['A single confident date', '"We cannot know"', 'A range with the main risks, and an offer to firm it up after a short prototype of the riskiest part', 'The sum of the best-case estimates'], answer: 2,
            why: 'A range acknowledges real uncertainty, naming risks builds trust, and a prototype converts unknowns to facts. A bare date becomes a promise; "cannot know" helps no one.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(500); });
      },
    },
  ],
};
