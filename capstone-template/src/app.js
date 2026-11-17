// src/app.js: the heart of your app, as ONE pure function.
//
//   handle(request) -> response
//
// request  = { method: "GET", path: "/health", query: {}, headers: {}, body: "" }
// response = { status: 200, headers: {...}, body: "..." }
//
// WHY this shape? The function does not know about Node, Cloudflare, or any framework, so:
//   - tests can call it directly (fast, no server needed),
//   - the same code runs on Node (src/server.js) AND on Cloudflare Workers (src/worker.js).
// This is the "pure core, thin edges" idea from lesson 11.

import { createStore } from "./store.js";

const json = (status, data, headers = {}) => ({
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...headers },
  body: JSON.stringify(data),
});

// Everything the app depends on is passed in (dependency injection), so tests can supply fakes.
export function createApp({ store = createStore(), now = () => new Date() } = {}) {
  return function handle(request) {
    const { method, path } = request;

    if (method === "GET" && path === "/health") {
      return json(200, { status: "ok", time: now().toISOString() });
    }

    // ----- TODO: your routes go here. Pattern for each one:
    //   1. Parse and VALIDATE the input (bad input -> 400, never trust the client)
    //   2. Check who is asking and whether they may (401 / 403)
    //   3. Do the work through the store (parameterized queries only!)
    //   4. Return the right status code (201 created, 204 no content, 404 not found...)

    return json(404, { error: "No such route" });
  };
}
