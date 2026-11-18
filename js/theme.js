// theme.js: Auto (follows your device, so night = dark) -> Day -> Night. Saved in localStorage.
const KEY = 'learning-new:theme';
const ORDER = ['auto', 'light', 'dark'];
const LABEL = { auto: '◐ Auto', light: '☀ Day', dark: '☾ Night' };
const media = window.matchMedia('(prefers-color-scheme: dark)');

function read() { try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; } }
function apply(pref) {
  const dark = pref === 'dark' || (pref === 'auto' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function initTheme() {
  const btn = document.getElementById('themeBtn');
  let pref = read();
  const paint = () => { apply(pref); btn.textContent = LABEL[pref]; btn.title = 'Theme: ' + pref + ' (click to change)'; };
  btn.addEventListener('click', () => {
    pref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, pref); } catch { /* private mode: still works for this visit */ }
    paint();
  });
  media.addEventListener('change', () => { if (pref === 'auto') paint(); });
  paint();
}
