# Subly · Codebase Course

An interactive, **gamified** course that teaches the entire `subly`
codebase — the Python CLI pipeline (ffmpeg → mlx-whisper → OpenAI) and the
Electron + React desktop app — one real file at a time.

Built for a newer programmer: every concept is explained from scratch, and
**every code excerpt is real code lifted from this repo** (with the file path
and line numbers shown), so the course and the codebase never drift apart.

> **Live:** **https://sublyapp.vercel.app/course** — `https://sublyapp.vercel.app`
> redirects here for now (the root is reserved for a future landing page).
> Hosted on Vercel from this folder; every push to `main` auto-deploys.

## What's inside

- **8 modules**, each with several lessons and a checkpoint quiz:
  1. The Big Picture — what it does, the monorepo, the one-seam idea
  2. Stage ① ffmpeg — extracting Whisper-ready audio
  3. Smart Chunking — splitting long audio without slicing words
  4. Stage ② Whisper — on-device speech-to-text on Apple Silicon
  5. Taming Hallucinations — cleaning Whisper's invented text
  6. Stage ③ Translation — JA→EN without breaking timing
  7. The Event Contract — the JSON-lines seam + the simulator
  8. The Desktop App — spawning, the reducer, the live timeline
- **Gamification:** XP, rank-ups, a 10-badge achievement system, per-module
  progress, and sequential unlocks (pass a quiz to open the next module).
- **Polish:** animated backdrop, syntax-highlighted code, confetti, the works.
- Progress is saved in your browser's `localStorage` — close it and come back.

## Two themes

There are two looks for the exact same course — pick whichever you like:

- **Paper** (`index.html`) — "Study Hall": graph-paper background, ink-on-white sticker cards.
- **Blackboard** (`v2/index.html`) — the dark build: chalk-on-slate with neon offset shadows.

Both run on the **same content and the same engine** (`js/content.js` + `js/app.js`),
so they can never drift apart — only the stylesheet differs. They **share one
saved-progress store**, so your XP/lessons/quizzes follow you when you hop between
themes via the topbar link.

## How to run it

It's a static site — no build step, no dependencies. Pick either:

**Option A — just open the file**

```bash
open codebase_course/course/index.html         # paper theme
open codebase_course/course/v2/index.html      # blackboard theme
```

**Option B — serve it (recommended; fonts/route handling behave best)**

```bash
cd codebase_course/course
python3 -m http.server 8000
# paper:      http://localhost:8000
# blackboard: http://localhost:8000/v2/
```

> Needs an internet connection the first time to pull the web fonts
> (Space Grotesk / Inter / JetBrains Mono). Everything else is local.

## Files

```
codebase_course/
├── vercel.json           # hosting config: / → /course redirect + routing
└── course/               # the site Vercel serves under /course
    ├── index.html        # paper theme — shell
    ├── css/styles.css    # "Study Hall" design system (light)
    ├── v2/
    │   ├── index.html    # blackboard theme — shell (reuses ../js)
    │   └── css/board.css # "Blackboard" design system (dark)
    └── js/
        ├── content.js    # all course content + quizzes (the curriculum) — shared
        └── app.js        # router, gamification engine, quiz logic, confetti — shared
```

To tweak or extend the course, edit `course/js/content.js` — it's plain data
(modules → lessons → content blocks → quiz). The renderer in `app.js` turns
those blocks into the page.
