// authlab.js — the "steal a password table and crack it" lab for lesson 17.
import { el } from './workbench.js';

const WORKER_URL = new URL('./authworker.js', import.meta.url);

function human(seconds) {
  if (seconds < 1) return 'under a second';
  const units = [['year', 31557600], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  for (const [n, s] of units) if (seconds >= s) { const v = seconds / s; return (v >= 1e6 ? v.toExponential(1) : Math.round(v).toLocaleString()) + ' ' + n + (Math.round(v) === 1 ? '' : 's'); }
  return '';
}

export function mountCrackLab(root, { onPass = () => {} }) {
  const mode = el('select', { 'aria-label': 'How the site stores passwords' });
  [['unsalted', 'SHA-256 of the password (no salt)'], ['salted', 'SHA-256 of salt + password'], ['pbkdf2', 'PBKDF2-SHA256 (slow, salted)']].forEach(([v, t]) => mode.append(el('option', { value: v }, t)));
  const iters = el('select', { 'aria-label': 'PBKDF2 iterations' });
  [['1000', '1,000 iterations (old default)'], ['100000', '100,000 iterations'], ['600000', '600,000 iterations (current advice)']].forEach(([v, t]) => iters.append(el('option', { value: v }, t)));
  iters.value = '100000'; iters.hidden = true;
  mode.addEventListener('change', () => { iters.hidden = mode.value !== 'pbkdf2'; });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Attack (5 s)');
  const bar = el('div', { class: 'bar' }); bar.append(mode, iters, btn);
  const out = el('div'); const prog = el('div', { class: 'muted' }, 'Run all three storage methods to compare. Hashes are really computed in your browser.');
  root.append(el('p', { class: 'muted' }, 'You are the attacker. Eight users\' password hashes just leaked. Your dictionary has 440 popular guesses. Pick how the site stored them, attack, and compare.'), bar, out, prog);
  const seen = new Set(); let passed = false;

  btn.addEventListener('click', () => {
    btn.disabled = true; out.replaceChildren(el('div', { class: 'muted' }, 'attacking…'));
    const m = mode.value, n = Number(iters.value);
    const w = new Worker(WORKER_URL);
    const stop = setTimeout(() => { w.terminate(); btn.disabled = false; out.replaceChildren(el('div', { class: 'status status--bad' }, 'The attack worker did not answer in time.')); }, 15000);
    w.onmessage = (e) => {
      clearTimeout(stop); w.terminate(); btn.disabled = false;
      const { rows, hashes, ms, timedOut, words } = e.data;
      const cracked = rows.filter((r) => r.cracked).length;
      const rate = hashes / (ms / 1000);
      out.replaceChildren();
      const t = el('div', { class: 'tm' });
      rows.forEach((r) => t.append(el('div', { class: 'testrow testrow--' + (r.cracked ? 'fail' : 'pass') }, (r.cracked ? ' ✗ ' : ' ✓ ') + r.name.padEnd(4) + ' ' + (r.salt ? r.salt.slice(0, 6) + '… · ' : '') + r.hash.slice(0, 14) + '…  ' + (r.cracked ? 'CRACKED: "' + r.cracked + '"' : 'safe'))));
      out.append(t);
      out.append(el('div', { class: 'status status--' + (cracked <= 2 ? 'good' : 'bad') }, cracked + ' of 8 passwords cracked · ' + hashes.toLocaleString() + ' hashes in ' + Math.round(ms) + ' ms (' + Math.round(rate).toLocaleString() + ' guesses/second)' + (timedOut ? ' · ran out of time' : '')));
      const space = Math.pow(36, 8);
      out.append(el('p', { class: 'muted' }, 'Brute-forcing a truly random 8-character lowercase+digit password (2.8 trillion guesses) at this rate: ' + human(space / rate) + ' on one browser thread. A GPU rig makes that roughly a million times faster for a fast hash, far less for a slow one.' + (m === 'unsalted' ? ' Also notice ana and bo share one hash: an unsalted table reveals who reuses passwords.' : '')));
      seen.add(m === 'pbkdf2' ? (n >= 100000 ? 'pbkdf2' : 'weak') : m);
      prog.textContent = 'Tried: ' + [...seen].join(', ') + (seen.has('unsalted') && seen.has('salted') && seen.has('pbkdf2') ? '' : ' (need: unsalted, salted, and PBKDF2 with 100,000+ iterations)');
      if (seen.has('unsalted') && seen.has('salted') && seen.has('pbkdf2') && !passed) { passed = true; onPass(); }
    };
    w.onerror = () => { clearTimeout(stop); btn.disabled = false; out.replaceChildren(el('div', { class: 'status status--bad' }, 'Worker error: your browser could not run the attack.')); };
    w.postMessage({ mode: m, iterations: n, budgetMs: 5000 });
  });
}
