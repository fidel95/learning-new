# Roadmap: Parts 3 to 6

Parts 1 and 2 (lessons 1-15) are done. This plan is written the way I would plan a real curriculum for an engineer I was mentoring: **order by return on investment**, **teach every topic through a lab that grades behavior**, and **tie it to real systems you own** (the company site, the CRM).

Format of every lesson (unchanged): left page explains like a professor and warns like a senior; right page is a lab; a gated challenge checks real behavior (never text); a quiz of judgment questions.

---

## Part 3 · Security (do this first: it protects what you already run)

| # | Lesson | The big idea | Labs (all graded) |
|---|--------|--------------|-------------------|
| 16 | **Threat modeling and the web's classic attacks** | Think like the attacker before you build. OWASP Top 10: XSS, CSRF, broken access control (IDOR), SSRF, injection (revisited), security misconfiguration. | A deliberately vulnerable mini-app in a sandbox: **attack it** (steal a session, read another user's record), then **patch it** and re-run the attacks. STRIDE threat-model worksheet. |
| 17 | **Authentication, passwords and cryptography for engineers** | Hashing vs encryption vs signing. Salts, slow hashes, sessions vs tokens, JWT pitfalls, OAuth/OIDC flow, TLS, key management. | Crack unsalted vs salted vs bcrypt-cost hashes (watch the time grow); build login + session + CSRF token correctly; spot the JWT `alg: none` and weak-secret bugs. |
| 18 | **Secure development and supply chain** | Dependencies are code you did not read. Least privilege, secrets scanning, SAST/DAST, patching cadence, incident response for a leaked key. | Audit a repo: find the committed secret, the vulnerable dependency, the over-permissive role; write the fix PR; rotate the key in the right order. **Real-world capstone: security review of your own CRM and company site.** |

## Part 4 · Algorithms and data structures (the engineer's mental toolkit)

| # | Lesson | The big idea | Labs |
|---|--------|--------------|------|
| 19 | **Complexity and Big-O, honestly** | Measure and reason. Growth rates, amortized cost, why constants and cache effects sometimes win, what input sizes each class can handle in 1 second. | Algorithm race with live operation counters; a growth-curve plotter; "what is the Big-O of this code" graded with timed performance tests. |
| 20 | **Core data structures** | Arrays, linked lists, hash maps, stacks, queues, heaps, sets: what each makes cheap and expensive. | Build a hash map and watch collisions and resizing; implement an **LRU cache** (hash map + list) against hidden tests; heap-based priority queue. |
| 21 | **Searching, sorting, recursion and dynamic programming** | Divide and conquer. Binary search (it is `git bisect`!), merge/quick sort, recursion vs iteration, memoization, the DP recipe. | Sorting visualizer with comparisons counted; recursion trees; DP challenges (coin change, edit distance) with time limits that reject brute force. |
| 22 | **Trees and graphs** | BSTs, tries, heaps; BFS/DFS, shortest paths (Dijkstra), topological sort (how build tools order dependencies), union-find. | Pathfinding on a grid (watch BFS vs Dijkstra explore); dependency resolver; "friends of friends" on a social graph. |
| 23 | **Problem-solving patterns** | Two pointers, sliding window, hash-map lookup, monotonic stack, BFS on states, backtracking. How to attack an unfamiliar problem in 20 minutes and communicate while you do. | A graded problem set (hidden tests + complexity limits) and a "think aloud" rubric. |

## Part 5 · Concurrency and distributed systems (where senior engineers earn their title)

| # | Lesson | The big idea | Labs |
|---|--------|--------------|------|
| 24 | **Concurrency: races, locks and deadlocks** | Two things at once break your mental model. Race conditions, atomicity, mutexes, deadlock, async vs threads. | A bank-transfer simulator that **loses money** from a race; fix it with a lock, then with a database transaction; reproduce and break a deadlock. |
| 25 | **Databases in depth** | Indexes (B-trees), query plans, transaction isolation levels, lost updates, optimistic vs pessimistic locking, migrations at scale. | Run `EXPLAIN` before/after an index on real SQLite; trigger each isolation anomaly; schema-migration with zero downtime. |
| 26 | **Distributed systems** | Time and clocks, replication, consensus intuition (Raft), CAP/PACELC, idempotency, exactly-once as a myth, queues and event streams. | A simulated cluster with delays, drops and partitions: watch replicas diverge, then repair; build an idempotent consumer that survives duplicates. |

## Part 6 · The modern engineer

| # | Lesson | The big idea | Labs |
|---|--------|--------------|------|
| 27 | **Cloud, containers and infrastructure as code** | What a container really is, declarative infra, environments, cost awareness, "cattle not pets". | Write a Dockerfile-like build and see layers/caching; a Terraform-style plan/apply diff simulator. |
| 28 | **Front-end engineering and web performance** | State to UI at scale (the React mental model), rendering cost, Core Web Vitals, accessibility. | Make a janky page fast (measured); fix accessibility failures found by a checker. |
| 29 | **Engineering with AI** | LLMs as a power tool: where they excel, where they confidently fail, verifying output, prompt/context design, evals, security risks (prompt injection). | Spot the subtle bug in AI-written code; write a failing test that exposes it; design a tiny eval for a prompt. |
| 30 | **Open-source capstone** | Reading a codebase you did not write, finding a real issue, sending a real pull request. | A guided repo-reading expedition, then your actual PR (reviewed together). |

---

## Why this order

1. **Security first**: you run a live business site and a CRM with customer data. Lessons 16-18 pay off the same week.
2. **Algorithms next**: the shared language of the profession, and what interviews test. They also make later lessons (indexes, caches, graphs of services) click.
3. **Concurrency and distributed systems**: the hardest ideas, built on everything before. Doing them earlier would mean memorizing; doing them now means understanding.
4. **Modern practice last**: tools change every few years; the foundations do not.

## Upgrades to the book itself (planned alongside)

- **Review mode**: spaced-repetition quizzes drawn from earlier lessons (retrieval practice beats rereading).
- **Boss fights**: a mixed, timed challenge after each Part that combines lessons.
- **Glossary and search** across all lessons; **progress dashboard** (what you have mastered, what is weak).
- **Mobile polish** pass, and an **export**: your solutions and notes as a repo.

## Pace

Each lesson is the same size as the ones you have done (about 1 to 2 hours of real work). Parts 3 to 6 are 15 lessons: roughly 4 to 6 weeks at one lesson every 2 or 3 days.


> **Status 2026-11-17:** Lessons 1-30 are built and live. Remaining ideas: the "Upgrades to the book itself" list above (review mode, boss fights, glossary/search, dashboard, mobile polish, export).
