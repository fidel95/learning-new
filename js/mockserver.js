// mockserver.js — a pretend web server that lives inside the book.
//
// It answers HTTP requests for the fake website "https://api.learn.test" with realistic
// status codes, headers and JSON, so you can practise real HTTP with no network and no risk.
//
// IMPORTANT: createServer must stay fully self-contained (it uses nothing from outside itself),
// because the book also copies its source text into the Web Worker that runs your code.
export function createServer() {
  // The "database": it lives only in this server's memory and starts fresh every run.
  const users = [{ id: 1, name: 'Ana' }, { id: 2, name: 'Bo' }, { id: 3, name: 'Cy' }];
  let nextId = 4;
  const flakyCalls = {};                       // how many times each /api/flaky?key=... was called
  const TOKEN = 'lesson7-token';
  const STATUS_TEXT = {
    200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 415: 'Unsupported Media Type', 503: 'Service Unavailable',
  };

  const reply = (status, data, extraHeaders) => ({
    status,
    statusText: STATUS_TEXT[status] || '',
    headers: Object.assign(data === undefined ? {} : { 'content-type': 'application/json; charset=utf-8' }, extraHeaders || {}),
    body: data === undefined ? '' : JSON.stringify(data),
  });

  // req = { method, url, headers (names in lowercase), body (text or '') }
  function handle(req) {
    let u;
    try { u = new URL(req.url, 'https://api.learn.test'); } catch (e) { return { networkError: true, delay: 40 }; }
    // Any other website is "unreachable" in this lab, like being offline.
    if (u.hostname !== 'api.learn.test') return { networkError: true, delay: 250 };

    const method = String(req.method).toUpperCase();
    const path = u.pathname.replace(/\/+$/, '') || '/';
    const h = req.headers || {};
    let r;

    if (path === '/api/users') {
      if (method === 'GET') r = reply(200, users);
      else if (method === 'POST') {
        if (!/application\/json/i.test(h['content-type'] || '')) {
          r = reply(415, { error: 'Send the header  Content-Type: application/json' });
        } else {
          let data = null; let bad = false;
          try { data = JSON.parse(req.body); } catch (e) { bad = true; }
          if (bad || data === null || typeof data !== 'object') r = reply(400, { error: 'Body is not valid JSON' });
          else if (typeof data.name !== 'string' || data.name.trim() === '') r = reply(400, { error: 'name is required' });
          else {
            const user = { id: nextId++, name: data.name.trim() };
            users.push(user);
            r = reply(201, user, { location: '/api/users/' + user.id });
          }
        }
      } else r = reply(405, { error: 'Use GET or POST here' }, { allow: 'GET, POST' });
    } else if (/^\/api\/users\/[^/]+$/.test(path)) {
      const idText = path.split('/')[3];
      const id = Number(idText);
      if (!Number.isInteger(id)) r = reply(400, { error: 'id must be a whole number' });
      else {
        const found = users.find((x) => x.id === id);
        if (method === 'GET') r = found ? reply(200, found) : reply(404, { error: 'User not found' });
        else if (method === 'DELETE') {
          if (!found) r = reply(404, { error: 'User not found' });
          else { users.splice(users.indexOf(found), 1); r = reply(204); }
        } else r = reply(405, { error: 'Use GET or DELETE here' }, { allow: 'GET, DELETE' });
      }
    } else if (path === '/api/secret' || path === '/api/admin') {
      const auth = h['authorization'] || '';
      if (auth !== 'Bearer ' + TOKEN) r = reply(401, { error: 'Missing or invalid token' }, { 'www-authenticate': 'Bearer' });
      else if (path === '/api/admin') r = reply(403, { error: 'Your token is valid, but you are not allowed to do this' });
      else r = reply(200, { secret: 'swordfish' });
    } else if (path === '/api/flaky') {
      const key = u.searchParams.get('key') || 'default';
      flakyCalls[key] = (flakyCalls[key] || 0) + 1;
      r = flakyCalls[key] <= 2
        ? reply(503, { error: 'Temporarily unavailable, try again' }, { 'retry-after': '1' })
        : reply(200, { ok: true, attempts: flakyCalls[key] });
    } else if (path === '/api/down') {
      r = reply(503, { error: 'This service is down' });
    } else if (path === '/api/slow') {
      r = reply(200, { message: 'Sorry for the wait' }); r.delay = 900;
    } else {
      r = reply(404, { error: 'No such route: ' + path });
    }
    if (r.delay === undefined) r.delay = 200;   // every answer takes a pretend 200 ms of network time
    return r;
  }
  return { handle };
}
