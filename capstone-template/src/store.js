// src/store.js: where your data lives. Start in memory so you can build the first slice fast,
// then swap this file for a real database (SQLite / Cloudflare D1) without touching app.js.
// Keep ALL data access in here: that is the "repository" boundary from lesson 11.

export function createStore() {
  const items = new Map();
  let nextId = 1;
  return {
    create(data) { const item = { id: nextId++, ...data }; items.set(item.id, item); return item; },
    get(id) { return items.get(id) ?? null; },
    list() { return [...items.values()]; },
    remove(id) { return items.delete(id); },
  };
}
