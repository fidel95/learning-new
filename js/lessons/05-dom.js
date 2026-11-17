// Lesson 5 — The DOM, events, and "state → render".
import { mountQuiz } from '../workbench.js';
import { mountDom } from '../dom.js';

export const lesson = {
  id: 'l5',
  title: 'Lesson 5 · The browser: DOM & events',
  spreads: [
    // ───────────────────────── Spread 1: the DOM ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 5 · Programs with a face</p>
        <h1>The DOM: the page is a tree</h1>
        <p>When you open a web page, the browser receives <b>HTML</b>: plain text. It <b>parses</b> that text
        into a tree of objects in memory, the <b>DOM</b> (Document Object Model), and draws the tree on screen.
        JavaScript never edits the text. It edits the tree, and the screen follows.</p>
        <pre><code>&lt;ul id="list"&gt;
  &lt;li class="item"&gt;Milk&lt;/li&gt;
  &lt;li&gt;Eggs&lt;/li&gt;
&lt;/ul&gt;</code></pre>
        <p><code>&lt;li class="item"&gt;</code> is an <b>element</b>: a tag name (<code>li</code>), an
        <b>attribute</b> (<code>class="item"</code>) and content. Elements inside elements form the tree:
        <code>ul</code> is the <b>parent</b>, each <code>li</code> a <b>child</b>. The panel on the right
        draws your page's real tree.</p>
        <h2>Finding elements</h2>
        <pre><code>document.querySelector("#list")    // by id
document.querySelector(".item")    // first match by class
document.querySelectorAll("li")    // ALL matches (a list)</code></pre>
        <p>The selector uses the same syntax as CSS. If nothing matches you get <code>null</code>, and using it
        crashes with a TypeError (lesson 4).</p>
        <h2>Changing the page</h2>
        <pre><code>el.textContent = "Hello";         // replace the text
el.classList.add("done");         // add a CSS class
el.classList.toggle("done");      // add if missing, remove if present
const li = document.createElement("li");
li.textContent = "Bread";
list.append(li);                   // attach to the tree
li.remove();                       // detach</code></pre>
        <div class="warn">Never put user-supplied text into <code>innerHTML</code>. It parses the string <i>as HTML</i>,
        so text like <code>&lt;img src=x onerror=stealCookies()&gt;</code> would <b>run code</b> in your visitor's
        browser. That attack is called <b>XSS</b> (cross-site scripting) and is one of the most common
        security holes on the web. <code>textContent</code> treats everything as plain text and is always safe.</div>
        <div class="foot"><span></span><span class="hint">experiment →</span></div>`,
      right: `
        <p class="kicker">Web page lab</p>
        <h2 style="margin-top:0">Edit HTML and JavaScript, see the tree</h2>
        <p>Use the two tabs. Try: add a third <code>&lt;li&gt;</code> in the HTML and watch the tree grow.
        In the JavaScript tab, change the heading text. Then set an element's <code>textContent</code> to
        <code>"&lt;b&gt;hi&lt;/b&gt;"</code> and see the tags shown literally.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountDom(right.querySelector('#lab'), {
          html: '<h3 id="title">Shopping</h3>\n<ul id="list">\n  <li class="item">Milk</li>\n  <li>Eggs</li>\n</ul>',
          js: 'const title = document.querySelector("#title");\ntitle.textContent = "Shopping list";\n\nconst list = document.querySelector("#list");\nconst bread = document.createElement("li");\nbread.textContent = "Bread";\nlist.append(bread);\n\nconsole.log(document.querySelectorAll("li").length, "items");',
        });
      },
    },

    // ───────────────────────── Spread 2: events ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 5 · Reacting</p>
        <h1>Events: waiting for the user</h1>
        <p>Until now your code ran once, top to bottom, and stopped. Interactive programs instead
        <b>register interest</b> and wait. The browser calls your function when something happens:</p>
        <pre><code>const button = document.querySelector("#go");

button.addEventListener("click", function () {
  console.log("clicked!");
});</code></pre>
        <p><code>addEventListener(kind, handler)</code> means: "when a <b>click</b> happens on this element, call this
        <b>handler</b>". Common kinds: <code>click</code>, <code>input</code> (every keystroke in a field),
        <code>submit</code> (a form), <code>keydown</code>.</p>
        <p>The browser passes your handler an <b>event object</b>:</p>
        <ul>
          <li><code>event.target</code> — the element that was actually clicked.</li>
          <li><code>event.preventDefault()</code> — cancel the browser's built-in action. A form <code>submit</code> normally reloads the page; you almost always cancel that.</li>
          <li>For inputs: <code>input.value</code> is <b>always a string</b>, even for digits. Use <code>Number(input.value)</code> to convert.</li>
        </ul>
        <div class="warn"><code>addEventListener("click", handler())</code> with parentheses <b>calls</b> the function
        immediately and passes its result. Pass the function itself: <code>handler</code>, no parentheses.</div>
        <h2>Bubbling and delegation</h2>
        <p>A click on an <code>li</code> also "bubbles" up to its parent <code>ul</code>, then up to the
        body. So instead of attaching a listener to every item (including items that do not exist yet),
        attach <b>one</b> to the parent and check <code>event.target</code>. That technique is called
        <b>event delegation</b>.</p>
        <div class="senior">Handlers run one at a time on a single thread. If one is slow (a huge loop), the whole page
        freezes: no scrolling, no clicks. Keep handlers short. Long work belongs elsewhere (a later lesson).</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Web page lab</p>
        <h2 style="margin-top:0">Click it, type in it</h2>
        <p>Click the button, type in the box, and watch the console. Then add a <b>Reset</b> button that sets the count back to 0.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountDom(right.querySelector('#lab'), {
          html: '<button id="inc">Clicked 0 times</button>\n<p><input id="box" placeholder="type here"></p>\n<p id="echo"></p>',
          js: 'let count = 0;\nconst inc = document.querySelector("#inc");\nconst box = document.querySelector("#box");\nconst echo = document.querySelector("#echo");\n\ninc.addEventListener("click", () => {\n  count = count + 1;\n  inc.textContent = "Clicked " + count + " times";\n  console.log("count is", count);\n});\n\nbox.addEventListener("input", (event) => {\n  echo.textContent = "You typed: " + event.target.value;\n});',
        });
      },
    },

    // ───────────────────────── Spread 3: state → render ─────────────────────────
    {
      left: `
        <p class="kicker">Lesson 5 · The most important pattern in front-end</p>
        <h1>State, then render</h1>
        <p>Beginners edit the page directly in every handler ("add an li here, remove that one there")
        and soon the screen and the data disagree. Professionals split the job in two:</p>
        <ol>
          <li><b>State</b>: your data in plain variables (arrays, objects). The single source of truth.</li>
          <li><b>render()</b>: one function that draws the screen <i>from the state</i>, from scratch.</li>
        </ol>
        <p>Handlers never touch the screen. They only <b>change the state, then call render()</b>.</p>
        <pre><code>const state = { todos: [] };

function render() {
  list.replaceChildren();               // clear
  for (const t of state.todos) {
    const li = document.createElement("li");
    li.textContent = t.text;
    li.classList.toggle("done", t.done);
    list.append(li);
  }
}

form.addEventListener("submit", (e) =&gt; {
  e.preventDefault();
  state.todos.push({ text: input.value, done: false });
  render();
});</code></pre>
        <p>The screen is now a <b>function of the state</b>: <code>UI = f(state)</code>. If the data is right, the
        screen cannot be wrong. React, Vue, Svelte and every modern framework are this one idea, with a smart
        <code>render()</code> that only redraws what changed.</p>
        <div class="senior">Bugs like "the counter says 3 but the list has 2 items" are almost always two sources
        of truth disagreeing. When you feel the urge to read the value back <i>from the page</i> to make a
        decision, stop: keep it in state.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Web page lab</p>
        <h2 style="margin-top:0">A real working to-do app</h2>
        <p>Add a few tasks, click one to complete it. Open the JavaScript tab and read it: is every handler
        "change state, then render"? Then add a "Clear done" button yourself.</p>
        <div id="lab"></div>
        <div class="foot"><span></span><span class="hint">turn the page ›</span></div>`,
      init(left, right) {
        mountDom(right.querySelector('#lab'), {
          html: '<form id="form"><input id="task" placeholder="new task"> <button>Add</button></form>\n<ul id="list"></ul>',
          js: 'const state = { todos: [] };\nconst form = document.querySelector("#form");\nconst input = document.querySelector("#task");\nconst list = document.querySelector("#list");\n\nfunction render() {\n  list.replaceChildren();\n  state.todos.forEach((todo, i) => {\n    const li = document.createElement("li");\n    li.textContent = todo.text;\n    li.classList.toggle("done", todo.done);\n    li.addEventListener("click", () => {\n      todo.done = !todo.done;\n      render();\n    });\n    list.append(li);\n  });\n}\n\nform.addEventListener("submit", (event) => {\n  event.preventDefault();\n  state.todos.push({ text: input.value, done: false });\n  input.value = "";\n  render();\n});',
          rows: 12,
        });
      },
    },

    // ───────────────────────── Spread 4: challenge (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Challenge</p>
        <h1>Build three small apps</h1>
        <p>The HTML is already written (see the HTML tab). You write the <b>JavaScript</b> tab. The book then
        loads your page, <b>clicks and types for you</b>, and checks what changed, exactly how
        automated browser tests work at real companies.</p>
        <div id="tasks"></div>
        <div class="senior">Task 4 is the security one. Test inputs include text with angle brackets. If your
        code shows it as plain text, you are safe from XSS. If it turns into a real bold element,
        you just wrote the vulnerability that has compromised countless websites.</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `
        <p class="kicker">Web page lab</p>
        <div id="lab"></div>
        <div class="foot"><span class="hint" id="gateHint">complete all four to turn the page</span></div>`,
      init(left, right, api) {
        const tasks = [
          { label: 'Counter: #inc adds 1 to the number in #count and #dec subtracts 1. It starts at 0.',
            test: `const inc = document.querySelector('#inc'), dec = document.querySelector('#dec'), c = document.querySelector('#count');
              if (!inc || !dec || !c) return false;
              if (c.textContent.trim() !== '0') return false;
              inc.click(); inc.click(); inc.click(); dec.click();
              return c.textContent.trim() === '2';` },
          { label: 'Greeter: as you type in #name, the text of #hello becomes "Hello, NAME!". When the box is empty it says "Hello, stranger!". (Use the input event.)',
            test: `const i = document.querySelector('#name'), h = document.querySelector('#hello');
              if (!i || !h) return false;
              i.value = 'Ana'; i.dispatchEvent(new Event('input', { bubbles: true }));
              if (h.textContent.trim() !== 'Hello, Ana!') return false;
              i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true }));
              return h.textContent.trim() === 'Hello, stranger!';` },
          { label: 'To-do: submitting #form adds an <li> with the typed text to #list and clears the input. Blank or spaces-only text is ignored. Clicking an <li> toggles the class "done".',
            test: `const f = document.querySelector('#form'), i = document.querySelector('#task'), l = document.querySelector('#list');
              if (!f || !i || !l) return false;
              const submit = (v) => { i.value = v; f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); };
              submit('Buy milk'); submit('   '); submit('Walk dog');
              const items = l.querySelectorAll('li');
              if (items.length !== 2) return false;
              if (items[0].textContent.trim() !== 'Buy milk' || i.value !== '') return false;
              items[0].click();
              if (!items[0].classList.contains('done')) return false;
              items[0].click();
              return !items[0].classList.contains('done');` },
          { label: 'Safety: a task typed as <b>hi</b> must appear as that exact plain text, not as bold formatting (use textContent, never innerHTML).',
            test: `const f = document.querySelector('#form'), i = document.querySelector('#task'), l = document.querySelector('#list');
              if (!f || !i || !l) return false;
              i.value = '<b>hi</b>'; f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              const last = l.querySelector('li:last-child');
              return !!last && last.textContent === '<b>hi</b>' && !last.querySelector('b');` },
        ];
        mountDom(right.querySelector('#lab'), {
          html: '<h3>1 · Counter</h3>\n<button id="dec">-</button> <span id="count">0</span> <button id="inc">+</button>\n\n<h3>2 · Greeter</h3>\n<input id="name" placeholder="your name">\n<p id="hello"></p>\n\n<h3>3 · To-do</h3>\n<form id="form"><input id="task"> <button>Add</button></form>\n<ul id="list"></ul>',
          js: '// Task 1: counter\n\n\n// Task 2: greeter\n\n\n// Task 3 + 4: to-do list\n\n',
          tasks, tasksEl: left.querySelector('#tasks'), rows: 14, showTree: false,
          onPass: () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'all done'; api.unlock(180); },
        });
        // The challenge opens on the JavaScript tab, since that is where the work is.
        right.querySelectorAll('.tab')[1].click();
      },
    },

    // ───────────────────────── Spread 5: predict (gated) ─────────────────────────
    {
      gated: true,
      left: `
        <p class="kicker">Check yourself</p>
        <h1>Predict, then verify</h1>
        <p>Four questions about the mistakes that cause the most front-end bugs and security holes.</p>
        <p>You can test any snippet in the web page lab two pages back.</p>
        <div class="senior">Security is not a separate subject you study later. It is a way of reading every line:
        "where does this text come from, and what happens if someone malicious wrote it?"</div>
        <div class="foot"><span class="hint">‹ back</span><span></span></div>`,
      right: `<div id="quiz"></div><div class="foot"><span class="hint" id="gateHint">answer all four to finish</span></div>`,
      init(left, right, api) {
        mountQuiz(right.querySelector('#quiz'), [
          { prompt: '<pre><code>const el = document.querySelector("#nope");\nel.textContent = "hi";</code></pre><p>There is no element with id "nope". What happens?</p>',
            options: ['Nothing, silently', 'It creates the element', 'TypeError: cannot set properties of null', 'The page reloads'], answer: 2,
            why: 'querySelector returns null when nothing matches. Setting a property on null is a TypeError.' },
          { prompt: '<pre><code>button.addEventListener("click", save());</code></pre><p>What is wrong?</p>',
            options: ['Nothing, it is correct', 'save() runs immediately; the click does nothing useful', 'It runs on every keystroke', 'It needs a semicolon'], answer: 1,
            why: 'The parentheses call save right now and pass its return value. Pass the function itself: addEventListener("click", save).' },
          { prompt: '<pre><code>const name = userInput;      // typed by a stranger\nbox.innerHTML = name;</code></pre><p>Which input is dangerous?</p>',
            options: ['Ana', '12345', '&lt;img src=x onerror=alert(1)&gt;', 'an empty string'], answer: 2,
            why: 'innerHTML parses HTML, so that image tag with an onerror handler would execute attacker code. Use textContent instead.' },
          { prompt: '<pre><code>input.value = "7";\nconsole.log(input.value + 1);</code></pre>',
            options: ['8', '"71"', 'NaN', 'an error'], answer: 1,
            why: 'input.value is always a string. "7" + 1 joins text into "71". Convert with Number(input.value) first.' },
        ], () => { const h = right.querySelector('#gateHint'); if (h) h.textContent = 'lesson complete'; api.unlock(200); });
      },
    },
  ],
};
