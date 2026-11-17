# The Engineer's Book

An interactive 3D book that teaches software engineering by doing.
Each lesson is a spread: ideas on the left page, a live workbench on the right.

## Run it
    python3 -m http.server 8137 --bind 127.0.0.1
    open http://127.0.0.1:8137/

## Layout
- `index.html`, `css/book.css` — the book and its look
- `js/app.js` — page turning, progress (XP, streak) saved in localStorage
- `js/runner.js` — runs learner code in a Web Worker (infinite loops can't freeze the page)
- `js/workbench.js` — editor, memory diagram, console, checklist, quiz
- `js/gitsim.js` — a small simulated shell + Git (no browser code, testable in Node)
- `js/terminal.js` — practice terminal UI, three-areas view, commit graph
- `js/mockserver.js` — a pretend web server (api.learn.test) with realistic status codes
- `js/httplab.js` — request builder + async API lab with network log
- `js/db.js` — real SQLite (sql.js, in `vendor/`) in a Web Worker, plus a tiny route framework
- `js/sqllab.js` — SQL playground, SQL challenge, injection demo, server lab
- `js/tsworker.js`, `js/tscheck.js`, `js/testworker.js`, `js/tslab.js` — the real TypeScript compiler (`vendor/`) and a Jest-style test runner, in workers
- `js/debuglab.js` — bisect lab and production-incident lab
- `js/refactorlab.js` — design metrics (from the TypeScript parser) and the refactoring lab
- `js/archlab.js` — system-design simulator (teaching model) and estimation practice
- `js/opslab.js`, `js/reslabworker.js` — deployment, resilience (failure injection) and alert-tuning labs
- `js/peoplelab.js` — PR review lab, scope-planning simulator, scenario lab
- `js/capstone.js` — capstone workbench (chooser, design doc, milestones, finish line)
- `capstone-template/` — starter repo: pure-core app, tests, CI, design doc, ADR, runbook, security checklist
- `js/dom.js` — web page lab: sandboxed iframe, live DOM tree, automated click/type tests
- `js/lessons/` — one file per lesson

## Lessons
1. Memory, values & variables (done)
2. Functions, scope & the call stack (done)
3. Decisions, loops & arrays (done)
4. Objects, references & JSON (done)
5. The browser: DOM & events (done)
6. The terminal & Git (done)
7. HTTP, APIs & async (done)
8. Databases & servers (done)
9. TypeScript & testing (done)

### Part 2: software engineering (the practice, not just the syntax)
10. Debugging & incidents (done): method, git bisect lab, production incident lab, regression tests
11. Design & refactoring (done): smell analyzer on the real syntax tree, refactoring under a test safety net, dependency injection
12. Architecture & system design (done): estimation lab, scalable-system simulator with a bottleneck finder, design docs
13. Reliability & operations (done): deploy-strategy lab, failure lab (timeouts/retries/circuit breaker), alert tuning lab
14. Working with people (done): code-review lab, planning under uncertainty (Monte Carlo), hard-conversation scenarios
15. Capstone (done): project chooser, design-doc builder, milestone tracker, ship checklist; starter code in `capstone-template/`
