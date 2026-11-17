// securitylab.js — the threat-modeling exercise for lesson 16 (classify threats with STRIDE, pick a mitigation).
import { el } from './workbench.js';

export const STRIDE = [
  ['S', 'Spoofing: pretending to be someone else'], ['T', 'Tampering: changing data you should not'], ['R', 'Repudiation: denying an action, with no proof'],
  ['I', 'Information disclosure: seeing what you should not'], ['D', 'Denial of service: making it unavailable'], ['E', 'Elevation of privilege: gaining rights you should not have'],
];

export const THREATS = [
  { text: 'An attacker logs in as a customer using a password leaked from another website.', cat: 'S', fix: 0,
    options: ['Offer multi-factor login and reject passwords found in known breaches', 'Make the session cookie last longer', 'Hide the login page URL'] },
  { text: 'A shopper edits the price field in the request their browser sends, so the cart total becomes $0.01.', cat: 'T', fix: 1,
    options: ['Hide the price field in the page', 'Recompute prices on the server from trusted data and ignore the client\'s numbers', 'Add a warning label to the form'] },
  { text: 'An employee deletes customer records, later claims they never did it, and nothing shows who acted.', cat: 'R', fix: 2,
    options: ['Trust employees more', 'Remove the delete button', 'Keep tamper-resistant audit logs of who did what, and when'] },
  { text: 'Changing the order number in the URL shows another customer\'s order.', cat: 'I', fix: 0,
    options: ['Check on the server that the logged-in user owns the record, on every request', 'Use longer, random-looking order numbers only', 'Add a CAPTCHA'] },
  { text: 'Someone floods the login endpoint with millions of requests and real users cannot get in.', cat: 'D', fix: 1,
    options: ['Add more logging', 'Apply rate limiting and put a CDN or traffic filter in front', 'Ask users to retry later'] },
  { text: 'A normal user adds "role": "admin" to a profile-update request and becomes an administrator.', cat: 'E', fix: 2,
    options: ['Encrypt the profile data', 'Check the role in the browser', 'Accept only an allow-list of editable fields, and enforce roles on the server'] },
  { text: 'A full database backup is accidentally left in a cloud storage bucket that anyone on the internet can read.', cat: 'I', fix: 1,
    options: ['Rename the bucket to something obscure', 'Block public access, encrypt backups, and grant access by least privilege', 'Delete backups after a year'] },
  { text: 'On a public Wi-Fi network, an attacker silently alters the data passing between a customer and your plain-http site.', cat: 'T', fix: 0,
    options: ['Serve everything over HTTPS (TLS) and turn on HSTS', 'Tell customers not to use public Wi-Fi', 'Compress the responses'] },
];

export function mountThreatModel(root, { onPass = () => {} }) {
  const sel = [];
  root.append(el('p', { class: 'muted' }, 'A small shop: browser → web app → API → database, plus a payment provider and staff admin tools. For each threat, name its STRIDE category and choose the best mitigation.'));
  THREATS.forEach((t, i) => {
    const card = el('div', { class: 'sqlcard' });
    card.append(el('div', { class: 'sqlcard__q' }, (i + 1) + '. ' + t.text));
    const cat = el('select', { 'aria-label': 'Category for threat ' + (i + 1) }); cat.append(el('option', { value: '' }, 'Category…')); STRIDE.forEach(([k, l]) => cat.append(el('option', { value: k }, l)));
    const fix = el('select', { 'aria-label': 'Mitigation for threat ' + (i + 1) }); fix.append(el('option', { value: '' }, 'Best mitigation…')); t.options.forEach((o, oi) => fix.append(el('option', { value: String(oi) }, o)));
    const row = el('div', { class: 'tm__row' }); row.append(cat, fix); card.append(row); root.append(card); sel.push({ cat, fix, card });
  });
  const btn = el('button', { class: 'btn', type: 'button' }, 'Check my threat model'); const out = el('div');
  root.append(btn, out);
  let passed = false;
  btn.addEventListener('click', () => {
    let points = 0; out.replaceChildren();
    THREATS.forEach((t, i) => {
      const c = sel[i].cat.value === t.cat, f = sel[i].fix.value === String(t.fix);
      if (c) points++; if (f) points++;
      sel[i].card.classList.toggle('tm--ok', c && f); sel[i].card.classList.toggle('tm--bad', !(c && f) && (sel[i].cat.value || sel[i].fix.value));
      if (!(c && f) && (sel[i].cat.value || sel[i].fix.value)) out.append(el('p', { class: 'muted' }, 'Threat ' + (i + 1) + ': ' + (!c ? 'rethink the category (' + STRIDE.find((s) => s[0] === t.cat)[1].split(':')[0] + '). ' : '') + (!f ? 'The best mitigation is: ' + t.options[t.fix] + '.' : '')));
    });
    const ok = points >= 14;
    out.prepend(el('div', { class: 'status status--' + (ok ? 'good' : 'warn') }, points + ' of 16 correct' + (ok ? '. Threat model accepted: you think like a defender.' : '. You need at least 14.')));
    if (ok && !passed) { passed = true; onPass(); }
  });
}
