// sortlab.js — lesson 21: race sorting algorithms by counting real comparisons.
import { el } from './workbench.js';

export const SORTS = {
  'Bubble sort': (a, c) => { for (let i = 0; i < a.length; i++) { let sw = false; for (let j = 0; j < a.length - 1 - i; j++) if (c(a[j], a[j + 1]) > 0) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; sw = true; } if (!sw) break; } return a; },
  'Selection sort': (a, c) => { for (let i = 0; i < a.length; i++) { let m = i; for (let j = i + 1; j < a.length; j++) if (c(a[j], a[m]) < 0) m = j; [a[i], a[m]] = [a[m], a[i]]; } return a; },
  'Insertion sort': (a, c) => { for (let i = 1; i < a.length; i++) { const x = a[i]; let j = i - 1; while (j >= 0 && c(a[j], x) > 0) { a[j + 1] = a[j]; j--; } a[j + 1] = x; } return a; },
  'Merge sort': (a, c) => { const ms = (r) => { if (r.length < 2) return r; const m = r.length >> 1, L = ms(r.slice(0, m)), R = ms(r.slice(m)); const o = []; let i = 0, j = 0; while (i < L.length && j < R.length) o.push(c(L[i], R[j]) <= 0 ? L[i++] : R[j++]); while (i < L.length) o.push(L[i++]); while (j < R.length) o.push(R[j++]); return o; }; return ms(a); },
  'Quicksort (first-item pivot)': (a, c) => { const qs = (r) => { if (r.length < 2) return r; const p = r[0], lo = [], hi = []; for (let i = 1; i < r.length; i++) (c(r[i], p) < 0 ? lo : hi).push(r[i]); return [...qs(lo), p, ...qs(hi)]; }; return qs(a); },
};

function makeInput(kind, n) {
  const a = []; let s = 42;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s; };
  for (let i = 0; i < n; i++) a.push(kind === 'sorted' ? i : kind === 'reversed' ? n - i : kind === 'few' ? rnd() % 5 : rnd() % 100000);
  return a;
}

export function mountSortRace(root) {
  const size = el('select', { 'aria-label': 'Array size' }); [50, 200, 800, 2000].forEach((n) => size.append(el('option', { value: String(n) }, n + ' items'))); size.value = '800';
  const kind = el('select', { 'aria-label': 'Input shape' }); [['random', 'random order'], ['sorted', 'already sorted'], ['reversed', 'reverse sorted'], ['few', 'many duplicates']].forEach(([v, t]) => kind.append(el('option', { value: v }, t)));
  const btn = el('button', { class: 'btn', type: 'button' }, 'Race them'); const bar = el('div', { class: 'bar' }); bar.append(size, kind, btn);
  const out = el('div');
  root.append(el('p', { class: 'muted' }, 'Five algorithms sort the same data. The bars count real comparisons (shorter is faster). Try each input shape: the loser changes.'), bar, out);
  function run() {
    const n = Number(size.value), data = makeInput(kind.value, n); out.replaceChildren();
    const results = Object.entries(SORTS).map(([name, fn]) => {
      let count = 0; const cmp = (x, y) => { count++; return x - y; };
      let ok = true; try { const r = fn(data.slice(), cmp); for (let i = 1; i < r.length; i++) if (r[i - 1] > r[i]) ok = false; } catch (e) { count = NaN; ok = false; }
      return { name, count, ok };
    });
    const max = Math.max(...results.filter((r) => r.ok).map((r) => r.count));
    const best = Math.min(...results.filter((r) => r.ok).map((r) => r.count));
    results.forEach((r) => {
      const row = el('div', { style: 'margin:6px 0' });
      row.append(el('div', { class: 'muted' }, r.name + ': ' + (r.ok ? r.count.toLocaleString() + ' comparisons' + (r.count === best ? '  ← fewest' : '') : 'crashed (recursion too deep)')));
      const w = r.ok ? Math.max(2, Math.round((r.count / max) * 100)) : 100;
      row.append(el('div', { style: 'height:12px;border-radius:3px;width:' + w + '%;background:' + (r.ok ? (r.count === best ? '#3c8c46' : '#a8703a') : '#b43c32') }));
      out.append(row);
    });
    out.append(el('p', { class: 'muted' }, 'Notice: insertion sort is nearly instant on sorted data (O(n) best case) but quadratic on reversed. The naive quicksort turns quadratic on sorted input, which is why real quicksorts choose the pivot carefully (middle, random, or median of three).'));
  }
  btn.addEventListener('click', run); run();
}
