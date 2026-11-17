// patternlab.js — lesson 23: match problems to the pattern that cracks them.
import { el } from './workbench.js';

export const PATTERNS = ['Hash map', 'Two pointers', 'Sliding window', 'Prefix sums', 'Binary search', 'BFS', 'Dynamic programming', 'Sort + sweep', 'Monotonic stack', 'Heap (top-K)'];
export const PROBLEMS = [
  { q: 'Given a SORTED array, find two numbers that add up to a target.', a: 1, why: 'One pointer at each end; move the one that brings the sum closer. O(n), no extra memory.' },
  { q: 'Find the longest stretch of a string with no repeated character.', a: 2, why: 'A window that grows on the right and shrinks from the left when a repeat appears.' },
  { q: 'Answer 100,000 queries of the form "what is the sum of items i through j?"', a: 3, why: 'Precompute running totals once; every query is then one subtraction.' },
  { q: 'Find the first broken release among a billion, where each check is a slow test run.', a: 4, why: 'The answer is monotone (good... good, bad... bad), so halve the range each time: about 30 checks.' },
  { q: 'For each day, how many days until a warmer temperature?', a: 8, why: 'Keep a stack of days still waiting for a warmer one; a new temperature resolves everything colder on top.' },
  { q: 'Fewest moves to solve a sliding-tile puzzle.', a: 5, why: 'States are nodes, moves are edges, and unweighted shortest path is breadth-first search.' },
  { q: 'Count the number of ways to make change for an amount.', a: 6, why: 'Overlapping sub-problems with optimal substructure: a table over amounts.' },
  { q: 'Merge a calendar of overlapping meeting times.', a: 7, why: 'Sort by start, then sweep once, extending or closing the current interval.' },
  { q: 'Keep the 10 largest values from a stream of a billion numbers.', a: 9, why: 'A min-heap of size 10: O(n log 10), and never stores the stream.' },
];

export function mountPatternMatch(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'Experts do not invent algorithms from scratch: they recognize a pattern. Name the best pattern for each problem.'));
  const sels = [];
  PROBLEMS.forEach((p, i) => {
    const card = el('div', { class: 'sqlcard' }); card.append(el('div', { class: 'sqlcard__q' }, (i + 1) + '. ' + p.q));
    const s = el('select', { 'aria-label': 'Pattern for problem ' + (i + 1) }); s.append(el('option', { value: '' }, 'Pattern…')); PATTERNS.forEach((n, k) => s.append(el('option', { value: String(k) }, n)));
    card.append(s); root.append(card); sels.push({ s, card });
  });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Check my patterns'); const out = el('div'); root.append(btn, out); let passed = false;
  btn.addEventListener('click', () => {
    let pts = 0; out.replaceChildren();
    PROBLEMS.forEach((p, i) => { const ok = sels[i].s.value === String(p.a); if (ok) { pts++; out.append(el('p', { class: 'muted' }, (i + 1) + '. ' + PATTERNS[p.a] + ': ' + p.why)); } sels[i].card.classList.toggle('tm--ok', ok); sels[i].card.classList.toggle('tm--bad', !ok && sels[i].s.value !== ''); });
    const ok = pts >= 8; out.prepend(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, pts + ' of ' + PROBLEMS.length + ' right' + (ok ? '. You are pattern-matching like an engineer.' : '. You need 8.')));
    if (ok && !passed) { passed = true; onPass(); }
  });
}
