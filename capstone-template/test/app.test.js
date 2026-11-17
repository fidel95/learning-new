// test/app.test.js: run with  npm test   (uses Node's built-in test runner, no installs needed).
// Every route you add should get tests here: the happy path, bad input, and the edges.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

// A fixed clock makes time-dependent code testable (dependency injection).
const fixedNow = () => new Date("2026-01-01T12:00:00Z");
const call = (method, path, body = "") => createApp({ now: fixedNow })({ method, path, query: {}, headers: {}, body });

test("GET /health says ok", () => {
  const res = call("GET", "/health");
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.body), { status: "ok", time: "2026-01-01T12:00:00.000Z" });
});

test("unknown routes answer 404, as JSON", () => {
  const res = call("GET", "/nope");
  assert.equal(res.status, 404);
  assert.equal(JSON.parse(res.body).error, "No such route");
});
