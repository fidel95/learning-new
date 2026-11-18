// Lesson 28 — Front-end engineering and web performance.
import { mountQuiz } from '../workbench.js';
import { mountTestChallenge } from '../tslab.js';
import { mountA11yLab } from '../a11ylab.js';
import { mountMatch } from '../orderlab.js';

export const ST = {
  starter: `// createStore(reducer, initialState) is the heart of Redux and the idea behind React: UI = f(state).
//   getState()            the current state
//   dispatch(action)      reducer(state, action) computes the NEXT state (never change the old one)
//                         - throw Error if action is not an object with a "type"
//                         - if the reducer returns the SAME object, nothing changed: do NOT notify anyone
//                         - otherwise save it and call every subscriber (in order) with the new state
//                         - a reducer may not dispatch: throw Error if dispatch is called while a reducer is running
//   subscribe(fn)         returns an unsubscribe function. Unsubscribing inside a listener must not skip other listeners.
// This version always notifies and has no unsubscribe.
function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = [];
  return {
    getState() { return state; },
    dispatch(action) { state = reducer(state, action); listeners.forEach((l) => l(state)); },
    subscribe(fn) { listeners.push(fn); },
  };
}
`,
  visible: `const counter = (s, a) => (a.type === "inc" ? { n: s.n + 1 } : s);
test("dispatch updates the state", () => { const st = createStore(counter, { n: 0 }); st.dispatch({ type: "inc" }); expect(st.getState().n).toBe(1); });
test("subscribers are told about changes", () => { const st = createStore(counter, { n: 0 }); let seen = null; st.subscribe((s) => { seen = s.n; }); st.dispatch({ type: "inc" }); expect(seen).toBe(1); });`,
  hidden: `const counter = (s, a) => (a.type === "inc" ? { n: s.n + 1 } : s);
test("an unchanged state does not notify", () => { const st = createStore(counter, { n: 0 }); let calls = 0; st.subscribe(() => calls++); st.dispatch({ type: "nothing" }); expect(calls).toBe(0); });
test("unsubscribe stops notifications", () => { const st = createStore(counter, { n: 0 }); let calls = 0; const off = st.subscribe(() => calls++); st.dispatch({ type: "inc" }); off(); st.dispatch({ type: "inc" }); expect(calls).toBe(1); });
test("listeners are called in order", () => { const st = createStore(counter, { n: 0 }); const order = []; st.subscribe(() => order.push(1)); st.subscribe(() => order.push(2)); st.dispatch({ type: "inc" }); expect(order).toEqual([1, 2]); });
test("unsubscribing inside a listener does not skip the next one", () => {
  const st = createStore(counter, { n: 0 }); const hit = []; let off1 = st.subscribe(() => { hit.push("a"); off1(); }); st.subscribe(() => hit.push("b"));
  st.dispatch({ type: "inc" }); expect(hit).toEqual(["a", "b"]);
});
test("an action without a type throws", () => { const st = createStore(counter, { n: 0 }); expect(() => st.dispatch({})).toThrow(); expect(() => st.dispatch(null)).toThrow(); });
test("dispatching from inside a reducer throws", () => { let st; const bad = (s, a) => { st.dispatch({ type: "inc" }); return s; }; st = createStore(bad, { n: 0 }); expect(() => st.dispatch({ type: "x" })).toThrow(); });
test("the old state object is never mutated", () => { const st = createStore(counter, { n: 0 }); const before = st.getState(); st.dispatch({ type: "inc" }); expect(before.n).toBe(0); expect(st.getState()).not.toBe(before); });`,
};

export const DB = {
  starter: `// debounce(fn, ms): wait until calls STOP for ms milliseconds, then run fn once with the LAST arguments.
// Use it for search-as-you-type, window resize, autosave. It returns a function that also has .cancel().
// This version delays every call but never cancels the earlier ones, so fn runs once per keystroke.
function debounce(fn, ms) {
  function debounced(...args) {
    setTimeout(() => fn(...args), ms);
  }
  debounced.cancel = () => {};
  return debounced;
}
`,
  visible: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test("five rapid calls make one call with the last arguments", async () => {
  const calls = []; const d = debounce((x) => calls.push(x), 30);
  d(1); d(2); d(3); d(4); d(5); await sleep(80); expect(calls).toEqual([5]);
});`,
  hidden: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test("it waits: nothing happens before the delay", async () => { const calls = []; const d = debounce((x) => calls.push(x), 60); d("a"); await sleep(15); expect(calls.length).toBe(0); await sleep(90); expect(calls).toEqual(["a"]); });
test("each new call restarts the timer", async () => {
  const calls = []; const d = debounce((x) => calls.push(x), 50); d(1); await sleep(30); d(2); await sleep(30); d(3); await sleep(30); expect(calls.length).toBe(0); await sleep(80); expect(calls).toEqual([3]);
});
test("calls separated by more than the delay each run", async () => { const calls = []; const d = debounce((x) => calls.push(x), 20); d("a"); await sleep(60); d("b"); await sleep(60); expect(calls).toEqual(["a", "b"]); });
test("cancel stops the pending call", async () => { const calls = []; const d = debounce((x) => calls.push(x), 30); d(1); d.cancel(); await sleep(70); expect(calls.length).toBe(0); });
test("all arguments are passed through", async () => { let got = null; const d = debounce((...a) => { got = a; }, 10); d(1, "two", [3]); await sleep(50); expect(got).toEqual([1, "two", [3]]); });`,
};

export const VR = {
  starter: `// A "virtual list" draws only the rows you can SEE. Rendering 1,000,000 DOM rows freezes the browser; rendering 30 does not.
// visibleRange(scrollTop, viewportHeight, rowHeight, total, overscan = 3) returns { start, end } (end is EXCLUSIVE):
//   - the first row that is at least partly visible, minus "overscan" extra rows above (so fast scrolling has no white gaps)
//   - the row after the last visible one, plus "overscan" extra rows below
//   - clamp: start >= 0, end <= total, and start <= end (even if scrollTop is beyond the end of the list)
// This version renders everything.
function visibleRange(scrollTop, viewportHeight, rowHeight, total, overscan = 3) {
  return { start: 0, end: total };
}
`,
  visible: `test("top of the list", () => { expect(visibleRange(0, 100, 20, 1000, 0)).toEqual({ start: 0, end: 5 }); });
test("scrolled down", () => { expect(visibleRange(200, 100, 20, 1000, 0)).toEqual({ start: 10, end: 15 }); });`,
  hidden: `test("overscan adds rows on both sides", () => { expect(visibleRange(200, 100, 20, 1000, 2)).toEqual({ start: 8, end: 17 }); });
test("default overscan is 3", () => { expect(visibleRange(200, 100, 20, 1000)).toEqual({ start: 7, end: 18 }); });
test("a partly visible row counts", () => { expect(visibleRange(210, 100, 20, 1000, 0)).toEqual({ start: 10, end: 16 }); });
test("clamped at the top", () => { expect(visibleRange(0, 100, 20, 1000, 5).start).toBe(0); });
test("clamped at the bottom", () => { expect(visibleRange(19900, 100, 20, 1000, 5).end).toBe(1000); });
test("a short list", () => { expect(visibleRange(0, 500, 20, 4, 3)).toEqual({ start: 0, end: 4 }); });
test("an empty list", () => { expect(visibleRange(0, 500, 20, 0)).toEqual({ start: 0, end: 0 }); });
test("scrolled far past the end never gives start > end", () => { const r = visibleRange(99999, 100, 20, 50, 3); expect(r.start <= r.end).toBe(true); expect(r.end).toBe(50); });
test("a million rows still draws only a few", () => { const r = visibleRange(5000000, 600, 24, 1000000); expect(r.end - r.start).toBeLessThan(40); });`,
};

const finish = (right, api, msg, xp) => () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = msg; api.unlock(xp); };
const foot = (hint) => `<div class="foot"><span class="hint" id="gateHint">${hint}</span></div>`;
const back = '<div class="foot"><span class="hint">‹ back</span><span></span></div>';

export const lesson = {
  id: 'l28',
  title: 'Lesson 28 · Front-end & performance',
  spreads: [
    {
      gated: true,
      left: `
        <p class="kicker">Front end · state to screen</p>
        <h1>UI = f(state)</h1>
        <p>In lesson 5 you changed the page by hand: find an element, set its text, remember to update the other three places that show the same number. That does not scale: it makes bugs where the screen disagrees with the data. Modern front-end frameworks (React, Vue, Svelte, Angular) invert it:</p>
        <pre><code>state  →  render(state)  →  what the user sees
You change the STATE. The framework works out the screen.</code></pre>
        <h2>The mental model</h2>
        <ul>
          <li><b>Components:</b> small functions that take data (<i>props</i>) and return a description of UI. They compose like functions (lesson 2).</li>
          <li><b>State</b> lives in one place (a component, or a shared store) and flows <b>down</b>; <b>events</b> flow <b>up</b> (a click calls a handler that changes state).</li>
          <li><b>Immutable updates:</b> never edit the old state; build a new object. Then "did it change?" is a cheap reference comparison (<code>old === new</code>), which is how frameworks skip needless work.</li>
          <li><b>Reconciliation:</b> the framework compares the new description with the old (a "virtual DOM") and changes only what differs. Give list items stable <b>keys</b> so it can tell which is which.</li>
          <li><b>Derived data is computed, not stored.</b> Store the list and the filter; compute the filtered list. Two copies of the same fact will disagree.</li>
          <li><b>Side effects</b> (fetching, timers, subscriptions) are separate from rendering, and must be cleaned up.</li>
        </ul>
        <p>The store you build here is the same pattern as Redux, Zustand and the browser's own event model.</p>
        <div class="senior">Choosing a framework matters far less than keeping state <b>minimal, in one place, and updated immutably</b>. And remember the server: much "state" is really cached server data. Fetch it with a tool that handles caching, loading and errors (TanStack Query, SWR) instead of copying it into your own state.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · build a store</p><div id="lab"></div>${foot('pass to turn the page')}`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), { tasks: [{ kind: 'implement', question: 'createStore: state, dispatch, subscribe', visible: ST.visible, hidden: ST.hidden, starter: ST.starter, rows: 15 }], onPass: finish(right, api, 'store built', 1000) });
      },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Front end · rendering cost</p>
        <h1>The main thread is a single lane</h1>
        <p>The browser runs your JavaScript, handles clicks, computes layout and paints pixels on <b>one thread</b>. A function that takes 200 ms means a frozen page for 200 ms: no scrolling, no typing feedback. At 60 frames per second you have <b>about 16 ms</b> per frame. So front-end performance is mostly: <b>do less work, and do it less often</b>.</p>
        <h2>The usual cures</h2>
        <ul>
          <li><b>Debounce</b> (wait for a pause) and <b>throttle</b> (at most once per interval) for events that fire constantly: typing, scrolling, resizing.</li>
          <li><b>Virtualize long lists:</b> render only the rows in view (plus a few extra). A million-row list becomes thirty DOM nodes.</li>
          <li><b>Avoid layout thrash:</b> reading a size (<code>offsetHeight</code>) right after writing a style forces the browser to recompute layout each time in a loop. Batch reads, then writes.</li>
          <li><b>Memoize</b> expensive computations and skip re-renders when inputs did not change (the cheap <code>===</code> check from the last page).</li>
          <li><b>Move heavy work off the main thread</b> (a Web Worker, as this book does when it runs your code), or split it into small chunks.</li>
          <li><b>Animate with <code>transform</code> and <code>opacity</code></b>: they can run on the GPU without relayout.</li>
        </ul>
        <div class="senior"><b>Measure first.</b> Open the browser's Performance panel, record, and look for long tasks. Developers' guesses about what is slow are wrong more often than right, and an optimization you did not measure is just complexity.</div>
        ${back}`,
      right: `<p class="kicker">Challenge · debounce, virtual list</p><div id="lab"></div>${foot('pass both to turn the page')}`,
      init(left, right, api) {
        mountTestChallenge(right.querySelector('#lab'), { tasks: [
          { kind: 'implement', question: 'debounce: wait for a pause', visible: DB.visible, hidden: DB.hidden, starter: DB.starter, rows: 9 },
          { kind: 'implement', question: 'visibleRange: windowing a huge list', visible: VR.visible, hidden: VR.hidden, starter: VR.starter, rows: 9 },
        ], onPass: finish(right, api, 'fast front end', 1200) });
      },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Front end · for everyone</p>
        <h1>Accessibility is correctness</h1>
        <p><b>Accessibility (a11y)</b> means people with disabilities can use what you build: blind users with screen readers, people who cannot use a mouse, people with low vision or colour blindness, deaf users, people with motor or cognitive differences, and everyone in a bad situation (glare, a broken arm, a noisy bus). It is also law in many places, and it helps SEO and testing.</p>
        <h2>The core rules (WCAG)</h2>
        <ul>
          <li><b>Use the right element.</b> A <code>&lt;button&gt;</code> is focusable, works with Enter and Space, and is announced as a button for free. A <code>&lt;div onclick&gt;</code> has none of that. Semantic HTML (<code>nav, main, h1..h6, ul, label, table</code>) gives structure to assistive tech.</li>
          <li><b>Text alternatives:</b> every informative image needs <code>alt</code> text; decorative ones <code>alt=""</code>.</li>
          <li><b>Every field has a label</b> that is programmatically linked. A placeholder disappears and is not a label.</li>
          <li><b>Contrast:</b> normal text at least 4.5:1 against its background.</li>
          <li><b>Keyboard:</b> everything works with Tab, Enter, Esc and arrows, in a logical order, with a <b>visible focus</b> ring. Never remove <code>outline</code> without a replacement.</li>
          <li><b>Do not rely on colour alone</b> to convey meaning (error = red only).</li>
          <li><b>Headings</b> form an outline; do not skip levels. Respect <code>prefers-reduced-motion</code>.</li>
          <li>ARIA is a last resort: <b>no ARIA is better than bad ARIA</b>. First use the native element.</li>
        </ul>
        <div class="senior">Automated tools (axe, Lighthouse) find about a third of problems. Also: unplug the mouse and do your main task with the keyboard; zoom to 200%; turn on a screen reader for five minutes. You will find real bugs every time.</div>
        ${back}`,
      right: `<p class="kicker">Lab · fix the page</p><div id="lab"></div>${foot('reach zero problems to turn the page')}`,
      init(left, right, api) { mountA11yLab(right.querySelector('#lab'), { onPass: finish(right, api, 'accessible', 1000) }); },
    },

    {
      gated: true,
      left: `
        <p class="kicker">Front end · how users feel speed</p>
        <h1>Core Web Vitals</h1>
        <p>Search engines and real users judge pages by three measurements, taken in the field:</p>
        <ul>
          <li><b>LCP: Largest Contentful Paint.</b> How long until the main content (hero image or headline) is visible. Aim for under 2.5 s.</li>
          <li><b>INP: Interaction to Next Paint.</b> How long the page takes to react to a click or tap. Under 200 ms.</li>
          <li><b>CLS: Cumulative Layout Shift.</b> How much things jump around while loading (the button that moves just as you tap it). Under 0.1.</li>
        </ul>
        <h2>The loading budget</h2>
        <ul>
          <li><b>Ship less:</b> compress and resize images (modern formats, <code>srcset</code>), lazy-load below the fold, split JavaScript by route and drop unused libraries.</li>
          <li><b>Cache and use a CDN:</b> serve static files from near the user with long cache lifetimes and hashed filenames.</li>
          <li><b>Unblock rendering:</b> do not make the first paint wait for big scripts (<code>defer</code>/<code>async</code>, critical CSS first).</li>
          <li><b>Reserve space:</b> give images and embeds a width and height so nothing shifts when they load.</li>
          <li>Test on a <b>mid-range phone on a slow network</b>, not your laptop on fibre.</li>
        </ul>
        <div class="senior">Set a <b>performance budget</b> (for example, under 170 KB of JavaScript, LCP under 2.5 s) and fail the build when you exceed it, the same way tests fail. Performance decays by a thousand small additions unless something enforces it.</div>
        ${back}`,
      right: `<p class="kicker">Lab · diagnose the symptom</p><div id="lab"></div>${foot('get 5 of 6 to turn the page')}`,
      init(left, right, api) {
        mountMatch(right.querySelector('#lab'), {
          intro: 'Match each symptom to the metric or fix that addresses it.',
          options: ['Optimize and preload the hero image', 'Set width/height on images and embeds', 'Break up a long JavaScript task, debounce the handler', 'Virtualize the list', 'Add caching and a CDN for static files', 'Add alt text and labels'],
          items: [
            { q: 'The headline takes 6 seconds to appear because the 4 MB hero image loads first.', a: 0, why: 'This is an LCP problem: shrink, compress and prioritize the largest element.' },
            { q: 'Text jumps down just as the user is about to tap a link, because an ad loads late.', a: 1, why: 'Layout shift (CLS): reserve the space in advance.' },
            { q: 'Clicking "Filter" freezes the page for 400 ms while a big loop runs.', a: 2, why: 'A long main-thread task hurts INP: split it, or move it off the main thread.' },
            { q: 'A table of 50,000 rows makes scrolling stutter and uses 2 GB of memory.', a: 3, why: 'Too many DOM nodes: render only what is visible.' },
            { q: 'Every visit re-downloads the same 800 KB of unchanged JavaScript from a distant server.', a: 4, why: 'Hashed filenames, long cache headers and a CDN make repeat loads nearly free.' },
            { q: 'A screen-reader user hears "button, button, edit text" with no idea what any of them do.', a: 5, why: 'Accessible names: text, aria-label, and associated labels.' },
          ], need: 5, onPass: finish(right, api, 'symptoms diagnosed', 900),
        });
      },
    },

    {
      gated: true,
      left: `<p class="kicker">Check yourself · front end</p><h1>Four judgment calls</h1><p>You have the mental model, the performance habits, and the accessibility basics. Next: the tool that is changing how all of this gets written, <b>AI</b>.</p>${back}`,
      right: `<div id="quiz"></div>${foot('answer all four to finish')}`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<p>Why do front-end frameworks encourage immutable state updates (a new object instead of editing the old)?</p>',
            options: ['Style preference', 'A cheap reference check (old === new) tells the framework what changed, so it can skip unnecessary work', 'Mutation is not possible in JavaScript', 'It makes code longer'], answer: 1, why: 'Immutability makes change detection cheap and prevents hidden shared-state bugs.' },
          { prompt: '<p>Your page feels slow. What do you do first?</p>',
            options: ['Rewrite it in another framework', 'Record a profile and measure what is actually slow', 'Add memoization everywhere', 'Remove all images'], answer: 1, why: 'Measure, find the real bottleneck, change one thing, measure again.' },
          { prompt: '<p>A designer wants a clickable card. The quickest accessible build is:</p>',
            options: ['<div onclick> with a pointer cursor', 'A real <a> or <button> (keyboard, focus and screen-reader support come free)', 'A div with a lot of ARIA', 'An image with the text baked in'], answer: 1, why: 'Native elements give behavior and semantics for free; ARIA on a div tries to rebuild them.' },
          { prompt: '<p>Which change most directly improves Cumulative Layout Shift?</p>',
            options: ['Minify the CSS', 'Give images, ads and embeds explicit dimensions so space is reserved', 'Use a bigger server', 'Add more animations'], answer: 1, why: 'Shift happens when content arrives and pushes things around; reserved space prevents it.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(800); });
      },
    },
  ],
};
