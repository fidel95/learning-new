# <Your app name>

One sentence: what it does and for whom.

**Live:** <https://your-app.example>  ·  **Design doc:** [DESIGN.md](DESIGN.md)  ·  **Decisions:** [docs/adr](docs/adr)

## Run it locally
```
npm test        # run the tests
npm start       # start the server on http://localhost:3000
```

## Architecture
(Paste a diagram here. Even ASCII art works.)

```
client ──► API (src/app.js) ──► store (src/store.js) ──► database
```

## Project layout
- `src/app.js`: the pure request handler (all your logic)
- `src/store.js`: all data access
- `src/server.js`, `src/worker.js`: thin adapters for Node and Cloudflare Workers
- `test/`: automated tests (run in CI on every push)
- `docs/`: ADRs (why we decided things) and the runbook

## Deploying
Describe the steps, or better, link the workflow that does it automatically.
