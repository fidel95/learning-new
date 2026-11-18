// orderlab.js — put the steps in the right order (used for migrations, deploys, incident response).
import { el } from './workbench.js';

export function mountOrdering(root, { intro, steps, explain = '', onPass = () => {} }) {
  // steps are given in the CORRECT order; we show them shuffled (deterministic, so the book is stable)
  const order = steps.map((_, i) => i); const rot = [3, 0, 5, 2, 6, 1, 4, 7, 8, 9]; const sh = order.slice().sort((a, b) => ((rot[a % 10] * 7 + a * 3) % 11) - ((rot[b % 10] * 7 + b * 3) % 11) || a - b);
  let cur = sh[0] === 0 && sh.length > 1 ? sh.slice(1).concat(sh[0]) : sh;
  root.append(el('p', { class: 'muted' }, intro));
  const list = el('div'), out = el('div'); let passed = false;
  const draw = () => {
    list.replaceChildren();
    cur.forEach((idx, pos) => {
      const row = el('div', { class: 'sqlcard' }); const q = el('div', { class: 'sqlcard__q' }, (pos + 1) + '. ' + steps[idx]);
      const up = el('button', { class: 'link-btn', type: 'button', 'aria-label': 'Move up' }, '↑ up'), dn = el('button', { class: 'link-btn', type: 'button', 'aria-label': 'Move down' }, '↓ down');
      up.disabled = pos === 0; dn.disabled = pos === cur.length - 1;
      up.addEventListener('click', () => { [cur[pos - 1], cur[pos]] = [cur[pos], cur[pos - 1]]; draw(); });
      dn.addEventListener('click', () => { [cur[pos + 1], cur[pos]] = [cur[pos], cur[pos + 1]]; draw(); });
      const bar = el('div', { class: 'bar' }); bar.append(up, dn); row.append(q, bar); list.append(row);
    });
  };
  const btn = el('button', { class: 'btn', type: 'button' }, 'Check the order'); draw(); root.append(list, btn, out);
  btn.addEventListener('click', () => {
    const wrong = cur.filter((idx, pos) => idx !== pos).length; const ok = wrong === 0;
    out.replaceChildren(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, ok ? 'Correct. ' + explain : wrong + ' step' + (wrong === 1 ? ' is' : 's are') + ' out of place. Ask of each step: what must already be true before it is safe?'));
    if (ok && !passed) { passed = true; onPass(); }
  });
}

// A generic "match each item to the right option" lab (pass at `need` correct).
export function mountMatch(root, { intro, options, items, need, onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, intro));
  const sels = items.map((p, i) => {
    const card = el('div', { class: 'sqlcard' }); card.append(el('div', { class: 'sqlcard__q' }, (i + 1) + '. ' + p.q));
    const s = el('select', { 'aria-label': 'Answer for item ' + (i + 1) }); s.append(el('option', { value: '' }, 'Choose…')); options.forEach((n, k) => s.append(el('option', { value: String(k) }, n)));
    card.append(s); root.append(card); return { s, card };
  });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Check my answers'), out = el('div'); root.append(btn, out); let passed = false;
  btn.addEventListener('click', () => {
    let pts = 0; out.replaceChildren();
    items.forEach((p, i) => { const ok = sels[i].s.value === String(p.a); if (ok) { pts++; out.append(el('p', { class: 'muted' }, (i + 1) + '. ' + options[p.a] + ': ' + p.why)); } sels[i].card.classList.toggle('tm--ok', ok); sels[i].card.classList.toggle('tm--bad', !ok && sels[i].s.value !== ''); });
    const ok = pts >= need; out.prepend(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, pts + ' of ' + items.length + ' right' + (ok ? '.' : '. You need ' + need + '.')));
    if (ok && !passed) { passed = true; onPass(); }
  });
}
