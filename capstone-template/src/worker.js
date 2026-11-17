// src/worker.js: the Cloudflare Workers "edge" (deploy with:  npx wrangler deploy ).
// Same idea as server.js: translate the platform's Request into our plain object, and back.
import { createApp } from "./app.js";

const handle = createApp();

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const response = handle({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers),
      body: await request.text(),
    });
    return new Response(response.body, { status: response.status, headers: response.headers });
  },
};
