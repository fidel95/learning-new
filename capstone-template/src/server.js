// src/server.js: the Node "edge": turns real HTTP requests into the plain objects handle() expects.
// Run with:  npm start      then open  http://localhost:3000/health
import { createServer } from "node:http";
import { createApp } from "./app.js";

const handle = createApp();

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const request = {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers,
    body: Buffer.concat(chunks).toString("utf8"),
  };
  const response = handle(request);
  res.writeHead(response.status, response.headers);
  res.end(response.body);
}).listen(process.env.PORT || 3000, () => console.log("listening on http://localhost:" + (process.env.PORT || 3000)));
