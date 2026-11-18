// clusterlab.js — lesson 26: a 3-replica cluster you can break, and a quorum calculator.
import { el } from './workbench.js';

const newer = (a, b) => a.c > b.c || (a.c === b.c && a.n > b.n);   // (counter, node id): a total order, "last write wins"

export function mountCluster(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'Three replicas of one value. A write is acknowledged by the node you send it to, then copied to the others by messages that take time. Break the network and watch what happens.'));
  let nodes, queue, cut, acked, wn, sawDiverged, passed = false;
  const reset = () => { nodes = [1, 2, 3].map((n) => ({ n, val: '—', ver: { c: 0, n: 0 } })); queue = []; cut = false; acked = []; wn = 0; sawDiverged = false; };
  reset();
  const view = el('div'), bar = el('div', { class: 'bar' }), bar2 = el('div', { class: 'bar' }), log = el('div', { class: 'muted' }), msg = el('div');
  const blocked = (a, b) => cut && ((a === 3) !== (b === 3));
  const agree = () => nodes.every((x) => x.val === nodes[0].val);
  const draw = () => {
    const t = el('table', { class: 'looptable' }); const h = el('tr'); ['node', 'value', 'version'].forEach((x) => h.append(el('th', {}, x))); t.append(h);
    nodes.forEach((x) => { const tr = el('tr'); tr.append(el('td', {}, 'n' + x.n + (cut && x.n === 3 ? '  (cut off)' : '')), el('td', {}, x.val), el('td', {}, x.ver.c + '.' + x.ver.n)); t.append(tr); });
    const a = agree(); if (!a) sawDiverged = true;
    view.replaceChildren(t, el('div', { class: 'status status--' + (a ? 'good' : 'warn') }, (a ? 'Replicas agree.' : 'Replicas DISAGREE: a read now depends on which node you ask.') + '  In flight: ' + queue.length + ' message' + (queue.length === 1 ? '' : 's') + '.'));
    log.textContent = acked.length ? 'Acknowledged writes: ' + acked.map((w) => w.v + '@n' + w.n).join(', ') : 'No writes yet.';
  };
  const write = (n) => { const x = nodes[n - 1]; wn++; const v = 'w' + wn; x.val = v; x.ver = { c: x.ver.c + 1, n }; acked.push({ v, n }); nodes.forEach((o) => { if (o.n !== n) queue.push({ to: o.n, from: n, val: v, ver: { ...x.ver } }); }); draw(); };
  const deliver = () => { let dropped = 0; queue.forEach((m) => { if (blocked(m.from, m.to)) { dropped++; return; } const o = nodes[m.to - 1]; if (newer(m.ver, o.ver)) { o.val = m.val; o.ver = { ...m.ver }; } }); queue = []; msg.textContent = dropped ? dropped + ' message(s) were lost in the partition.' : ''; draw(); };
  const repair = () => { for (const a of nodes) for (const b of nodes) if (a !== b && !blocked(a.n, b.n) && newer(a.ver, b.ver)) { b.val = a.val; b.ver = { ...a.ver }; } queue = queue.filter((m) => blocked(m.from, m.to)); msg.textContent = 'Anti-entropy: reachable nodes compared versions and copied the newest.'; draw(); check(); };
  const check = () => {
    const lost = acked.filter((w) => !nodes.some((x) => x.val === w.v));
    if (agree() && sawDiverged && !cut) {
      msg.textContent = (lost.length ? 'Converged, but ' + lost.length + ' acknowledged write(s) are GONE: ' + lost.map((w) => w.v).join(', ') + '. Last-write-wins silently threw them away.' : 'Converged.') + ' You made replicas diverge and then repaired them.';
      if (!passed) { passed = true; onPass(); }
    }
  };
  [1, 2, 3].forEach((n) => { const b = el('button', { class: 'btn', type: 'button' }, 'Write at n' + n); b.addEventListener('click', () => write(n)); bar.append(b); });
  const bd = el('button', { class: 'btn', type: 'button' }, 'Deliver messages'); bd.addEventListener('click', () => { deliver(); check(); });
  const bp = el('button', { class: 'btn', type: 'button' }, 'Cut n3 off'); bp.addEventListener('click', () => { cut = !cut; bp.textContent = cut ? 'Heal the network' : 'Cut n3 off'; msg.textContent = cut ? 'Network partition: n3 cannot talk to n1 or n2 (but clients can still reach it!).' : 'Network healed. Messages dropped earlier are gone; use repair.'; draw(); });
  const br = el('button', { class: 'btn', type: 'button' }, 'Repair (anti-entropy)'); br.addEventListener('click', repair);
  const bz = el('button', { class: 'link-btn', type: 'button' }, 'reset'); bz.addEventListener('click', () => { reset(); bp.textContent = 'Cut n3 off'; msg.textContent = ''; draw(); });
  bar2.append(bd, bp, br, bz);
  root.append(view, bar, bar2, msg, log, el('p', { class: 'muted' }, 'Try: cut n3 off, write at n1 AND at n3, deliver, heal, then repair. Which write survived?')); draw();
}

export function mountQuorum(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'N replicas store each item. A write must be acknowledged by W of them; a read asks R and takes the newest answer. If R + W > N every read overlaps every write, so reads see the latest data.'));
  const mk = (label, lo, hi, val) => { const s = el('select', { 'aria-label': label }); for (let i = lo; i <= hi; i++) s.append(el('option', { value: String(i) }, label + ' = ' + i)); s.value = String(val); return s; };
  const N = mk('N', 3, 7, 3), R = mk('R', 1, 7, 1), W = mk('W', 1, 7, 1);
  const info = el('div'), list = el('div');
  const tasks = [
    ['N = 3: strongly consistent, and both reads and writes survive ONE node being down.', (n, r, w) => n === 3 && r + w > n && n - r >= 1 && n - w >= 1],
    ['N = 5: strongly consistent, with the FASTEST possible reads (R = 1).', (n, r, w) => n === 5 && r === 1 && r + w > n],
    ['N = 5: strongly consistent, and writes survive TWO nodes being down.', (n, r, w) => n === 5 && r + w > n && n - w >= 2],
    ['N = 3: the fastest and cheapest setting (R = 1, W = 1). What do you give up?', (n, r, w) => n === 3 && r === 1 && w === 1],
  ];
  let passedQ = false; const ok = tasks.map(() => false); const rows = tasks.map(([q]) => { const d = el('div', { class: 'sqlcard' }); d.append(el('div', { class: 'sqlcard__q' }, q)); return d; });
  const sync = () => {
    const n = +N.value, r = Math.min(+R.value, n), w = Math.min(+W.value, n); const strong = r + w > n;
    info.replaceChildren(el('div', { class: 'status status--' + (strong ? 'good' : 'warn') }, strong ? 'R + W = ' + (r + w) + ' > N: reads always see the latest write (strong).' : 'R + W = ' + (r + w) + ' ≤ N: a read can miss the latest write (eventual consistency, stale reads).'),
      el('p', { class: 'muted' }, 'Reads survive ' + (n - r) + ' node failure(s); writes survive ' + (n - w) + '. Larger R or W means slower, because you wait for more nodes.'));
    tasks.forEach(([, f], i) => { if (f(n, r, w)) ok[i] = true; rows[i].classList.toggle('tm--ok', ok[i]); });
    if (ok.every(Boolean) && !passedQ) { passedQ = true; onPass(); }
  };
  [N, R, W].forEach((s) => s.addEventListener('change', sync));
  root.append(N, R, W, info, ...rows); sync();
}
