// a11ylab.js — lesson 28: a real accessibility checker (runs on the HTML you edit) and the page it audits.
import { el } from './workbench.js';

const lum = (hex) => { let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const hexIn = (style, prop) => { const m = new RegExp('(?:^|;|\\s)' + prop + '\\s*:\\s*(#[0-9a-fA-F]{3,6})\\b').exec(style || ''); return m ? m[1] : null; };

export function audit(html) {
  const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html'); const issues = [];
  const name = (n) => (n.getAttribute('aria-label') || '').trim() || (n.getAttribute('aria-labelledby') ? 'x' : '') || (n.textContent || '').trim() || [...n.querySelectorAll('img')].map((i) => i.getAttribute('alt') || '').join('').trim();
  doc.querySelectorAll('img').forEach((i) => { if (!i.hasAttribute('alt')) issues.push('An <img> has no alt attribute: screen readers read out the file name. Describe it, or use alt="" if purely decorative.'); });
  doc.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea').forEach((f) => {
    const id = f.getAttribute('id'); const labelled = f.closest('label') || (id && doc.querySelector('label[for="' + id + '"]')) || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby');
    if (!labelled) issues.push('A form field has no label: use <label for="..."> (a placeholder is not a label).');
  });
  doc.querySelectorAll('button, a[href]').forEach((b) => { if (!name(b)) issues.push('A <' + b.tagName.toLowerCase() + '> has no accessible name (an icon-only control needs aria-label or text).'); });
  doc.querySelectorAll('div[onclick], span[onclick]').forEach(() => issues.push('A clickable <div>/<span> cannot be reached by keyboard or announced as a button: use a real <button>.'));
  let prev = 0; doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => { const l = +h.tagName[1]; if (prev && l > prev + 1) issues.push('Heading level jumps from h' + prev + ' to h' + l + ': keep headings in order (they are the page outline).'); prev = l; });
  doc.querySelectorAll('[style]').forEach((n) => { const fg = hexIn(n.getAttribute('style'), 'color'), bg = hexIn(n.getAttribute('style'), 'background(?:-color)?'); if (fg && bg && contrast(fg, bg) < 4.5) issues.push('Low contrast (' + contrast(fg, bg).toFixed(1) + ':1) between ' + fg + ' and ' + bg + ': text needs at least 4.5:1.'); });
  return { issues, doc };
}

export const BAD = `<h1>Coffee club</h1>
<img src="hero.jpg">
<h3>Join us</h3>
<input type="email" placeholder="Your email">
<div onclick="join()" style="color:#999999;background:#ffffff">Sign up</div>
<button><img src="cart.svg" alt=""></button>
<p style="color:#bbbbbb;background:#ffffff">Free beans on your first order.</p>`;

export function mountA11yLab(root, { onPass = () => {} }) {
  root.append(el('p', { class: 'muted' }, 'About 1 in 5 people have a disability, and many more use a keyboard, zoom, or a screen reader (or a phone in sunlight). Edit this HTML until the checker reports zero problems.'));
  const ed = el('textarea', { class: 'editor', spellcheck: 'false', rows: '9', 'aria-label': 'HTML to fix' }); ed.value = BAD;
  const btn = el('button', { class: 'btn', type: 'button' }, 'Run accessibility check'), out = el('div'); let passed = false;
  root.append(ed, btn, out);
  btn.addEventListener('click', () => {
    const { issues, doc } = audit(ed.value);
    if (!doc.querySelector('img') || !doc.querySelector('input') || !doc.querySelector('button') || !doc.querySelector('h1') || !/sign up/i.test(doc.body.textContent)) { out.replaceChildren(el('div', { class: 'status status--warn' }, 'Fix the problems, do not delete the content: keep the image, the email field, the heading, the Sign up control and the cart button.')); return; }
    if (!issues.length) { out.replaceChildren(el('div', { class: 'status status--good' }, 'No problems found. (Automated checks catch roughly a third of real issues, so still test with a keyboard and a screen reader.)')); if (!passed) { passed = true; onPass(); } }
    else { const ul = el('ul'); issues.forEach((i) => ul.append(el('li', {}, i))); out.replaceChildren(el('div', { class: 'status status--warn' }, issues.length + ' problem' + (issues.length === 1 ? '' : 's')), ul); }
  });
}
