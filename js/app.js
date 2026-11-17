// app.js — the book itself: shows a spread, turns pages, tracks progress.
import { lesson } from './lessons/01-variables.js';

const left = document.getElementById('left');
const right = document.getElementById('right');
const leaf = document.getElementById('leaf');
const xpEl = document.getElementById('xp');
const streakEl = document.getElementById('streak');
document.getElementById('lessonTitle').textContent = lesson.title;

// ---------- Saved progress (localStorage can be blocked, so every access is wrapped) ----------
const KEY = 'learning-new:v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: just don't save */ }
}
const state = Object.assign({ xp: 0, streak: 0, lastDay: '', done: {}, spread: 0 }, load());

// A "streak" = consecutive calendar days you opened the book.
function touchStreak() {
  const today = new Date().toDateString();
  if (state.lastDay === today) return;
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  state.streak = state.lastDay === yesterday ? state.streak + 1 : 1;
  state.lastDay = today;
  save(state);
}
function drawHud() {
  xpEl.textContent = state.xp + ' XP';
  streakEl.textContent = state.streak + '-day streak';
}

// ---------- Showing a spread ----------
let index = Math.min(state.spread, lesson.spreads.length - 1);
let turning = false;

function isUnlocked(i) {              // can we leave spread i going forward?
  const s = lesson.spreads[i];
  return !s.gated || state.done[lesson.id + '-' + i];
}

function render() {
  const spread = lesson.spreads[index];
  left.innerHTML = spread.left;
  right.innerHTML = spread.right;
  left.scrollTop = right.scrollTop = 0;

  // The ‹ back and turn › hints become real buttons.
  const api = {
    unlock(xp) {
      const key = lesson.id + '-' + index;
      if (!state.done[key]) { state.done[key] = true; state.xp += xp; save(state); drawHud(); }
      refreshTurnButton();
    },
  };
  spread.init && spread.init(left, right, api);
  wireFooters();
  state.spread = index; save(state);
}

function wireFooters() {
  // Back button lives in the left page footer, turn button in the right page footer.
  const back = left.querySelector('.foot .hint');
  if (back && index > 0) back.replaceWith(makeLink('‹ back', () => turn(-1)));
  if (index < lesson.spreads.length - 1) {
    const foot = right.querySelector('.foot');
    const gate = foot && foot.querySelector('#gateHint');   // gated pages keep their status text
    const btn = makeLink('turn the page ›', () => turn(1), 'turnBtn');
    if (gate) {
      foot.replaceChildren(gate, btn);
    } else if (foot) {
      const hint = foot.querySelector('.hint');
      if (hint) hint.replaceWith(btn); else foot.append(btn);
    }
    refreshTurnButton();
  }
}
function makeLink(text, onClick, id) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'link-btn'; b.textContent = text;
  if (id) b.id = id;
  b.addEventListener('click', onClick);
  return b;
}
function refreshTurnButton() {
  const b = document.getElementById('turnBtn');
  if (!b) return;
  const open = isUnlocked(index);
  b.disabled = !open;
  b.title = open ? '' : 'Finish this page’s challenge first';
  const hint = right.querySelector('#gateHint');
  if (open && hint) hint.textContent = 'all done';
}

// ---------- Turning ----------
function turn(direction) {
  const next = index + direction;
  if (turning || next < 0 || next >= lesson.spreads.length) return;
  if (direction > 0 && !isUnlocked(index)) return;
  turning = true;
  const small = window.matchMedia('(max-width: 900px)').matches;
  if (small) { index = next; render(); turning = false; return; }

  leaf.className = 'leaf ' + (direction > 0 ? 'is-turning' : 'is-turning-back');
  // Swap the page contents at the halfway point, when the leaf is edge-on.
  setTimeout(() => { index = next; render(); }, 400);
  setTimeout(() => { leaf.className = 'leaf'; turning = false; }, 820);
}

// Left/right arrow keys turn pages, but never while you are typing in the editor.
document.addEventListener('keydown', (e) => {
  if (e.target.matches('textarea, input')) return;
  if (e.key === 'ArrowRight') turn(1);
  if (e.key === 'ArrowLeft') turn(-1);
});

touchStreak();
drawHud();
render();
