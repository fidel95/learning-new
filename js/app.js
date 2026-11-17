// app.js — the book itself: shows a spread, turns pages, switches lessons, tracks progress.
import { lesson as lesson1 } from './lessons/01-variables.js';
import { lesson as lesson2 } from './lessons/02-functions.js';
import { lesson as lesson3 } from './lessons/03-control-flow.js';
import { lesson as lesson4 } from './lessons/04-objects.js';
import { lesson as lesson5 } from './lessons/05-dom.js';
import { lesson as lesson6 } from './lessons/06-git.js';
import { lesson as lesson7 } from './lessons/07-http.js';
import { lesson as lesson8 } from './lessons/08-databases.js';
import { lesson as lesson9 } from './lessons/09-typescript-testing.js';
import { lesson as lesson10 } from './lessons/10-debugging.js';
import { lesson as lesson11 } from './lessons/11-design-refactoring.js';
import { lesson as lesson12 } from './lessons/12-architecture.js';
import { lesson as lesson13 } from './lessons/13-reliability.js';
import { lesson as lesson14 } from './lessons/14-teamwork.js';
import { lesson as lesson15 } from './lessons/15-capstone.js';
import { lesson as lesson16 } from './lessons/16-security-attacks.js';

const lessons = [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6, lesson7, lesson8, lesson9, lesson10, lesson11, lesson12, lesson13, lesson14, lesson15, lesson16];       // add each new lesson here, in order

const left = document.getElementById('left');
const right = document.getElementById('right');
const leaf = document.getElementById('leaf');
const xpEl = document.getElementById('xp');
const streakEl = document.getElementById('streak');
const picker = document.getElementById('lessonTitle');

// ---------- Saved progress (localStorage can be blocked, so every access is wrapped) ----------
const KEY = 'learning-new:v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: just don't save */ }
}
const state = Object.assign({ xp: 0, streak: 0, lastDay: '', done: {}, lesson: 0, pos: {} }, load());
if (typeof state.spread === 'number' && state.pos.l1 === undefined) state.pos.l1 = state.spread; // old saves

// A "streak" = consecutive calendar days you opened the book.
function touchStreak() {
  const today = new Date().toDateString();
  if (state.lastDay === today) return;
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  state.streak = state.lastDay === yesterday ? state.streak + 1 : 1;
  state.lastDay = today;
  save();
}
function drawHud() {
  xpEl.textContent = state.xp + ' XP';
  streakEl.textContent = state.streak + '-day streak';
}

// ---------- Which lesson / spread are we on ----------
const current = () => lessons[state.lesson];
const lastSpread = (l) => l.spreads.length - 1;
const finished = (l) => !!state.done[l.id + '-' + lastSpread(l)];      // passed its final challenge
const lessonOpen = (i) => i === 0 || finished(lessons[i - 1]);         // lesson i unlocked?

if (!lessonOpen(state.lesson)) state.lesson = 0;
let index = Math.min(state.pos[current().id] || 0, lastSpread(current()));
let turning = false;

function isUnlocked(i) {              // can we leave spread i going forward?
  const s = current().spreads[i];
  return !s.gated || state.done[current().id + '-' + i];
}

// ---------- Lesson picker in the top bar ----------
function drawPicker() {
  picker.replaceChildren();
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Choose a lesson');
  lessons.forEach((l, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = (lessonOpen(i) ? '' : '🔒 ') + l.title;
    o.disabled = !lessonOpen(i);
    select.append(o);
  });
  select.value = String(state.lesson);
  select.addEventListener('change', () => switchLesson(Number(select.value)));
  picker.append(select);
}

// ---------- Showing a spread ----------
function render() {
  const lsn = current();
  const spread = lsn.spreads[index];
  left.innerHTML = spread.left;
  right.innerHTML = spread.right;
  left.scrollTop = right.scrollTop = 0;

  const api = {
    unlock(xp) {
      const key = lsn.id + '-' + index;
      if (!state.done[key]) { state.done[key] = true; state.xp += xp; save(); drawHud(); drawPicker(); }
      refreshTurnButton();
    },
  };
  spread.init && spread.init(left, right, api);
  wireFooters();
  state.pos[lsn.id] = index; state.lesson = lessons.indexOf(lsn); save();
}

function makeLink(text, onClick, id) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'link-btn'; b.textContent = text;
  if (id) b.id = id;
  b.addEventListener('click', onClick);
  return b;
}

function wireFooters() {
  // ‹ back lives in the left page footer. On the first spread of a lesson, nothing to go back to.
  const back = left.querySelector('.foot .hint');
  if (back && index > 0) back.replaceWith(makeLink('‹ back', () => turn(-1)));

  // Right page footer: "turn the page ›", or "next lesson ›" on a lesson's last spread.
  const foot = right.querySelector('.foot');
  if (!foot) return;
  const isLast = index === lastSpread(current());
  const hasNextLesson = state.lesson < lessons.length - 1;
  if (isLast && !hasNextLesson) return;                    // end of the book (for now)
  const label = isLast ? 'next lesson ›' : 'turn the page ›';
  const action = isLast ? () => switchLesson(state.lesson + 1) : () => turn(1);
  const btn = makeLink(label, action, 'turnBtn');
  const gate = foot.querySelector('#gateHint');            // gated pages keep their status text
  if (gate) foot.replaceChildren(gate, btn);
  else {
    const hint = foot.querySelector('.hint');
    if (hint) hint.replaceWith(btn); else foot.append(btn);
  }
  refreshTurnButton();
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
// Plays the page-turn animation, swapping content at the halfway point.
function animate(direction, swapFn) {
  if (turning) return;
  turning = true;
  if (window.matchMedia('(max-width: 900px)').matches) { swapFn(); turning = false; return; }
  leaf.className = 'leaf ' + (direction > 0 ? 'is-turning' : 'is-turning-back');
  setTimeout(swapFn, 400);
  setTimeout(() => { leaf.className = 'leaf'; turning = false; }, 820);
}

function turn(direction) {
  const next = index + direction;
  if (turning || next < 0 || next >= current().spreads.length) return;
  if (direction > 0 && !isUnlocked(index)) return;
  animate(direction, () => { index = next; render(); });
}

function switchLesson(i) {
  if (turning || i === state.lesson || i < 0 || i >= lessons.length || !lessonOpen(i)) { drawPicker(); return; }
  const direction = i > state.lesson ? 1 : -1;
  animate(direction, () => {
    state.lesson = i;
    index = Math.min(state.pos[lessons[i].id] || 0, lastSpread(lessons[i]));
    drawPicker(); render();
  });
}

// Left/right arrow keys turn pages, but never while you are typing in the editor or picking a lesson.
document.addEventListener('keydown', (e) => {
  if (e.target.matches('textarea, input, select')) return;
  if (e.key === 'ArrowRight') turn(1);
  if (e.key === 'ArrowLeft') turn(-1);
});

touchStreak();
drawHud();
drawPicker();
render();
