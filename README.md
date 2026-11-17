# The Engineer's Book

An interactive 3D book that teaches software engineering by doing.
Each lesson is a spread: ideas on the left page, a live workbench on the right.

## Run it
    python3 -m http.server 8137 --bind 127.0.0.1
    open http://127.0.0.1:8137/

## Layout
- `index.html`, `css/book.css` — the book and its look
- `js/app.js` — page turning, progress (XP, streak) saved in localStorage
- `js/runner.js` — runs learner code in a Web Worker (infinite loops can't freeze the page)
- `js/workbench.js` — editor, memory diagram, console, checklist, quiz
- `js/lessons/` — one file per lesson

## Lessons
1. Memory, values & variables (done)
