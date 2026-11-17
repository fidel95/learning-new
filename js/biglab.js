// biglab.js — lesson 19: complexity detective (measured step counts) and the "can it run?" calculator.
import { el } from './workbench.js';

export const CLASSES = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'];

// Each mystery shows its code and can report how many basic steps it takes for a given n.
export const MYSTERIES = [
  { code: 'function f(arr) {\n  return arr[0] + arr[arr.length - 1];\n}', ns: [10, 100, 1000, 10000], answer: 0, why: 'Two array reads, however long the array is. Constant.', steps: () => 2 },
  { code: 'function f(n) {\n  let steps = 0;\n  while (n > 1) { n = Math.floor(n / 2); steps++; }\n  return steps;\n}', ns: [10, 100, 1000, 10000], answer: 1, why: 'Halving each time: doubling n adds just one more step. This is the shape of binary search.', steps: (n) => { let s = 0; while (n > 1) { n = Math.floor(n / 2); s++; } return s; } },
  { code: 'function f(arr) {\n  let total = 0;\n  for (const x of arr) total += x;\n  return total;\n}', ns: [10, 100, 1000, 10000], answer: 2, why: 'One pass: ten times the data, ten times the work.', steps: (n) => n },
  { code: 'function f(arr) {\n  for (const x of arr) use(x);\n  for (const y of arr) use(y);\n}', ns: [10, 100, 1000, 10000], answer: 2, why: 'Two passes is 2n steps. Constants are dropped: still linear.', steps: (n) => 2 * n },
  { code: 'function f(arr) {\n  for (let i = 0; i < arr.length; i++)\n    for (let j = 0; j < arr.length; j++)\n      compare(arr[i], arr[j]);\n}', ns: [10, 100, 1000, 10000], answer: 4, why: 'A loop inside a loop: n × n. Ten times the data, a hundred times the work.', steps: (n) => n * n },
  { code: 'function f(arr) {\n  for (let i = 0; i < arr.length; i++)\n    for (let j = 0; j < i; j++)\n      compare(arr[i], arr[j]);\n}', ns: [10, 100, 1000, 10000], answer: 4, why: 'About n²/2 steps. The one-half is a constant, so it is still quadratic.', steps: (n) => (n * (n - 1)) / 2 },
  { code: 'function f(arr) {          // sorting, e.g. merge sort\n  // split in half (log n levels),\n  // and each level touches all n items\n}', ns: [10, 100, 1000, 10000], answer: 3, why: 'log n levels × n work per level. The best general-purpose comparison sorts.', steps: (n) => Math.round(n * Math.log2(n)) },
  { code: 'function fib(n) {\n  if (n < 2) return n;\n  return fib(n - 1) + fib(n - 2);\n}', ns: [10, 15, 20, 25], answer: 5, why: 'Every call makes two more calls. Each +1 in n multiplies the work by about 1.6. Exponential, and unusable past n ≈ 40.', steps: (n) => { let c = 0; const g = (k) => { c++; if (k >= 2) { g(k - 1); g(k - 2); } }; g(n); return c; } },
];

export function mountDetective(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'Each function was run for growing n and its steps were counted. Look at how the count grows, not the exact numbers, and name the class.'));
  const sels = [];
  MYSTERIES.forEach((m, i) => {
    const card = el('div', { class: 'sqlcard' });
    card.append(el('pre', { class: 'raw' }, m.code));
    card.append(el('div', { class: 'muted' }, 'n → steps:   ' + m.ns.map((n) => n.toLocaleString() + ' → ' + m.steps(n).toLocaleString()).join('   ·   ')));
    const s = el('select', { 'aria-label': 'Complexity of function ' + (i + 1) }); s.append(el('option', { value: '' }, 'Complexity…'));
    CLASSES.forEach((c, ci) => s.append(el('option', { value: String(ci) }, c)));
    card.append(s); root.append(card); sels.push({ s, card });
  });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Check my answers'); const out = el('div'); root.append(btn, out);
  let passed = false;
  btn.addEventListener('click', () => {
    let pts = 0; out.replaceChildren();
    MYSTERIES.forEach((m, i) => {
      const ok = sels[i].s.value === String(m.answer); if (ok) pts++;
      sels[i].card.classList.toggle('tm--ok', ok); sels[i].card.classList.toggle('tm--bad', !ok && sels[i].s.value !== '');
      if (!ok && sels[i].s.value !== '') out.append(el('p', { class: 'muted' }, 'Function ' + (i + 1) + ': check how steps change when n grows tenfold.'));
      if (ok) out.append(el('p', { class: 'muted' }, 'Function ' + (i + 1) + ' (' + CLASSES[m.answer] + '): ' + m.why));
    });
    const ok = pts === MYSTERIES.length;
    out.prepend(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, pts + ' of ' + MYSTERIES.length + ' correct' + (ok ? '. You can read growth rates.' : '. All of them must be right.')));
    if (ok && !passed) { passed = true; onPass(); }
  });
}

// "Can it run?" calculator: operations and wall time at one billion simple steps per second.
export function mountCalculator(root) {
  const slider = el('input', { type: 'range', min: '1', max: '9', step: '0.1', value: '5', 'aria-label': 'log10 of n' });
  const label = el('div', { class: 'label' });
  const table = el('div');
  const fmt = (x) => x >= 1e21 ? '10^' + Math.round(Math.log10(x)) : x >= 1e9 ? x.toExponential(1) : Math.round(x).toLocaleString();
  const time = (s) => { if (s < 0.001) return 'instant'; if (s < 1) return Math.round(s * 1000) + ' ms'; if (s < 60) return s.toFixed(1) + ' seconds'; if (s < 3600) return Math.round(s / 60) + ' minutes'; if (s < 86400) return Math.round(s / 3600) + ' hours'; if (s < 3.15e7) return Math.round(s / 86400) + ' days'; if (s < 3.15e12) return Math.round(s / 3.15e7).toLocaleString() + ' years'; return 'longer than the universe has existed'; };
  const FNS = [(n) => 1, (n) => Math.log2(n), (n) => n, (n) => n * Math.log2(n), (n) => n * n, (n) => Math.pow(2, Math.min(n, 1100))];
  function draw() {
    const n = Math.round(Math.pow(10, Number(slider.value)));
    label.textContent = 'n = ' + n.toLocaleString() + ' items';
    table.replaceChildren();
    CLASSES.forEach((c, i) => {
      const ops = FNS[i](n), sec = ops / 1e9;
      const row = el('div', { class: 'testrow testrow--' + (sec < 1 ? 'pass' : sec < 3600 ? 'warn' : 'fail') }, (sec < 1 ? ' ✓ ' : sec < 3600 ? ' ~ ' : ' ✗ ') + c.padEnd(11) + fmt(ops).padStart(10) + ' steps  ·  ' + time(sec));
      table.append(row);
    });
  }
  slider.addEventListener('input', draw);
  root.append(el('p', { class: 'muted' }, 'Drag n from 10 to a billion. Time assumes a fast computer doing one billion simple steps per second. Green means "under a second".'), label, slider, table, el('p', { class: 'muted' }, 'Rule of thumb: at n = 100,000 an O(n²) algorithm is already about ten seconds; at n = 1,000,000 it is nearly twenty minutes. This is why complexity decides what ships.'));
  draw();
}
