// graphlab.js — lesson 22: watch BFS and DFS explore a grid you can draw walls on.
import { el } from './workbench.js';

const R = 9, C = 16;
export function mountGridExplorer(root) {
  const walls = new Set(['2,5', '3,5', '4,5', '5,5', '6,5', '6,6', '6,7', '2,9', '3,9', '4,9', '5,9', '6,9', '2,10', '2,11']);
  const start = [0, 0], end = [R - 1, C - 1];
  const key = (r, c) => r + ',' + c;
  const algo = el('select', { 'aria-label': 'Algorithm' }); [['bfs', 'Breadth-first (queue)'], ['dfs', 'Depth-first (stack)']].forEach(([v, t]) => algo.append(el('option', { value: v }, t)));
  const btn = el('button', { class: 'btn', type: 'button' }, 'Run'); const clear = el('button', { class: 'link-btn', type: 'button' }, 'clear walls');
  const bar = el('div', { class: 'bar' }); bar.append(algo, btn, clear);
  const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(' + C + ',1fr);gap:2px;max-width:420px;margin:8px 0' });
  const cells = {};
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const d = el('div', { style: 'aspect-ratio:1;border-radius:2px;font:9px system-ui;display:grid;place-items:center;cursor:pointer;user-select:none', role: 'button', 'aria-label': 'cell ' + r + ',' + c });
    d.addEventListener('click', () => { const k = key(r, c); if ((r === start[0] && c === start[1]) || (r === end[0] && c === end[1])) return; walls.has(k) ? walls.delete(k) : walls.add(k); paint(); });
    cells[key(r, c)] = d; grid.append(d);
  }
  const info = el('div', { class: 'status status--warn' }, 'Click cells to add or remove walls, then run.');
  let timer = null;
  function paint(visited = new Map(), path = new Set()) {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const k = key(r, c), d = cells[k]; let bg = '#efe6d2', txt = '';
      if (walls.has(k)) bg = '#4a3a2a'; else if (path.has(k)) bg = '#3c8c46'; else if (visited.has(k)) { bg = 'hsl(30,70%,' + Math.max(45, 85 - visited.get(k) * 0.6) + '%)'; }
      if (r === start[0] && c === start[1]) { bg = '#2a6fb0'; txt = 'S'; } if (r === end[0] && c === end[1]) { bg = '#b43c32'; txt = 'E'; }
      d.style.background = bg; d.style.color = '#fff'; d.textContent = txt;
    }
  }
  function run() {
    clearInterval(timer); info.className = 'status status--warn'; info.textContent = 'exploring…'; const order = []; const prev = new Map(); const seen = new Set([key(...start)]); const frontier = [start]; let found = false;
    while (frontier.length) {
      const [r, c] = algo.value === 'bfs' ? frontier.shift() : frontier.pop();
      order.push([r, c]); if (r === end[0] && c === end[1]) { found = true; break; }
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nr = r + dr, nc = c + dc, k = key(nr, nc); if (nr < 0 || nc < 0 || nr >= R || nc >= C || walls.has(k) || seen.has(k)) continue; seen.add(k); prev.set(k, key(r, c)); frontier.push([nr, nc]); }
    }
    const path = new Set(); if (found) { let k = key(...end); while (k) { path.add(k); k = prev.get(k); } }
    const visited = new Map(); let i = 0;
    timer = setInterval(() => {
      if (i < order.length) { visited.set(key(...order[i]), i); i++; paint(visited); return; }
      clearInterval(timer); paint(visited, path);
      info.className = 'status status--' + (found ? 'good' : 'bad');
      info.textContent = (found ? 'Path of ' + (path.size - 1) + ' steps' : 'No path') + ' · explored ' + order.length + ' cells. ' + (algo.value === 'bfs' ? 'Breadth-first explores in rings, so the first path it finds is the shortest.' : 'Depth-first dives down one branch: it finds a path, but not necessarily the shortest.');
    }, 12);
  }
  btn.addEventListener('click', run); clear.addEventListener('click', () => { walls.clear(); paint(); });
  root.append(el('p', { class: 'muted' }, 'Blue is the start, red the goal. Dark cells are walls (click to toggle). Compare breadth-first and depth-first on the same maze.'), bar, grid, info); paint();
}
