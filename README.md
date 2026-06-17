# Subly

Turn a **Japanese-audio video** into a **time-synced English `.srt`** — offline-first
on Apple Silicon (the audio never leaves your Mac; only the small text transcript
is sent to OpenAI to translate).

This repo is a small monorepo with two pieces:

```
subly/
├── cli/             ← the engine: a Python CLI that does the actual work
│                    (ffmpeg → mlx-whisper transcribe → OpenAI translate)
├── desktop/         ← a Mac desktop app (Electron + React) that drives the CLI
│                    and shows a live chunk-by-chunk timeline
└── codebase_course/ ← an interactive course that teaches this codebase
                       (hosted on Vercel — see "Live site" below)
```

The **CLI is the product**; the desktop app is just a friendly front-end that
spawns it. They talk over exactly one seam: the CLI emits one JSON event per line
(`subly run --json`), and the app reads that stream. The contract lives in
[`cli/subly/events.py`](cli/subly/events.py), mirrored in
[`desktop/src/eventsource/types.ts`](desktop/src/eventsource/types.ts) — keep the
two in sync.

---

## Live site

- **https://sublyapp.vercel.app** — project home. For now it **redirects to the
  course**; a proper landing page will live here later.
- **https://sublyapp.vercel.app/course** — the interactive codebase course
  (the `codebase_course/` folder, hosted on Vercel).

Hosting notes: the Vercel project is **`subly`**, with its root directory set to
`codebase_course/`. Every push to `main` auto-deploys. The `/ → /course` redirect
and routing are defined in [`codebase_course/vercel.json`](codebase_course/vercel.json).

---

## Prerequisites (one time)

```bash
brew install ffmpeg uv        # ffmpeg = audio extraction, uv = Python runner
brew install node             # only if you want the desktop app
```

You also need an OpenAI API key for the translation step (see [API key](#api-key)).

---

## Install

```bash
make setup        # installs the CLI deps (cli/) and the desktop deps (desktop/)
```

Or install just one side:

```bash
cd cli     && uv sync         # CLI only
cd desktop && npm install     # desktop only (needs the CLI set up too)
```

> **First CLI run** downloads the Whisper model (~3 GB for `large-v3`) into
> `$HF_HOME` (default `~/.cache/huggingface`) and caches it forever. Don't point
> `HF_HOME` at `/tmp` — it's wiped on reboot and forces a re-download.

---

## Everything you can do

Every `make` target below is just a shortcut. The raw command it runs is shown so
you can drop the wrapper and pass any flag directly.

### Make targets at a glance

| Command | What it does |
|---|---|
| `make help` | List all targets |
| `make setup` | Install CLI + desktop dependencies |
| `make sub VIDEO=path` | Full pipeline: video → English `.srt` |
| `make transcribe VIDEO=path` | Transcribe only → Japanese `.srt` |
| `make translate SRT=path` | Translate an existing Japanese `.srt` → English |
| `make app` | Launch the desktop app (dev) |
| `make test` | Run CLI + desktop tests |
| `make test-cli` | CLI event-contract tests only |
| `make test-desktop` | Desktop tests only (typecheck + node + e2e) |

Pass extra CLI flags through the `ARGS=` variable, e.g.
`make sub VIDEO=v.mp4 ARGS="-w turbo -n 'lecture on calculus'"`.

### 1. Full pipeline — video → English subtitles

```bash
make sub VIDEO="video.mp4"
# runs:  cd cli && uv run subly run "video.mp4"
```

From the repo root without the wrapper, or from anywhere:

```bash
uv run --project cli subly run "video.mp4"
```

From inside `cli/` (shortest):

```bash
cd cli && uv run subly run "video.mp4"
```

Output lands at `<video>.en.srt` next to the input by default.

### 2. Transcribe only (free, local — no OpenAI)

Use this to inspect the Japanese transcript before paying to translate:

```bash
make transcribe VIDEO="video.mp4"
# → video.subly/ja.srt
```

### 3. Translate only (an existing Japanese `.srt`)

```bash
make translate SRT="video.subly/ja.srt"
# → video.subly/ja.en.srt   (or use ARGS="-o out.srt")
```

### 4. Desktop app

```bash
make app
# runs:  cd desktop && npm run dev:electron   (Vite + Electron + real CLI)
```

UI-only in a browser with fixture data (no Electron, no backend):

```bash
cd desktop && npm run dev      # then open http://localhost:5173/?mock
```

Browser URL flags: `?mock` (replay captured events), `?needkey` (force the
API-key onboarding screen).

---

## CLI flag reference

### `run` (full pipeline)

| Flag | Default | Purpose |
|---|---|---|
| `-o, --output PATH` | `<video>.en.srt` | Where to write the English `.srt` |
| `-w, --whisper-model` | `large-v3` | Speech model: `large-v3` \| `turbo` \| `medium` \| `small` |
| `-m, --openai-model` | `gpt-4o` | Translation model (or `$SUBLY_OPENAI_MODEL`) |
| `-n, --notes TEXT` | — | Context (topic, speaker names) — boosts accuracy a lot |
| `-c, --chunk-minutes` | `10.0` | Split long audio into chunks for memory safety; `0` disables |
| `-f, --force` | off | Redo every step, ignore cached files |
| `--keep-japanese` | off | Also save the Japanese `.srt` beside the output |
| `--keep-non-speech` | off | Keep moans/sighs instead of dropping them |
| `--keep-chunks` | off | Keep per-chunk temp files for inspection |
| `--cache-limit-gb` | `2.0` | Cap MLX's reused GPU memory pool; `0` = unlimited |
| `--verbose` | off | Stream raw Whisper decoding output |
| `--json` | off | Emit JSON-lines events on stdout (for GUIs/automation) |
| `--simulate` | off | Replay a fake event stream — no model/API (UI dev/tests) |

### `transcribe`

Same as `run` minus the translation flags: `-w`, `-n`, `-f`, `-c`,
`--keep-chunks`, `--cache-limit-gb`, `--keep-non-speech`, `--verbose`.

### `translate`

`-o, --output` · `-m, --openai-model` · `-n, --notes` · `-f, --force`.

### Examples

```bash
# Fast draft with the turbo model and a context hint
make sub VIDEO="lecture.mp4" ARGS="-w turbo -n 'calculus lecture, teacher Mr. Tanaka'"

# Cheaper translation, keep the Japanese too
make sub VIDEO="talk.mp4" ARGS="-m gpt-4o-mini --keep-japanese"

# Don't chunk (short clip), force a clean re-run
make sub VIDEO="clip.mp4" ARGS="-c 0 --force"

# Two-step: check the Japanese first, then translate it
make transcribe VIDEO="movie.mp4"
make translate  SRT="movie.subly/ja.srt" ARGS="-o movie.en.srt"
```

---

## API key

The translation step calls OpenAI.

- **CLI:** copy `cli/.env.example` → `cli/.env` and set `OPENAI_API_KEY=sk-...`.
- **Desktop app:** on first launch it asks for the key and stores it in the macOS
  **Keychain** (service `subly`); in dev it falls back to `cli/.env`.

Optional: `SUBLY_OPENAI_MODEL` sets the default translation model.

---

## Tests

```bash
make test          # everything
make test-cli      # cd cli && uv run --with pytest pytest   (event-contract)
make test-desktop  # cd desktop && npm test  (typecheck + node + Playwright e2e)
```

---

## Good to know

- **Resumable.** A run caches work in a `<video>.subly/` folder next to the input;
  re-running skips finished steps. `--force` redoes everything. Safe to delete.
- **Audio works too**, not just video (`.mp3`, `.wav`, `.m4a`, …).
- **Privacy & cost.** The heavy transcription is local and free; only a few KB of
  text is sent to OpenAI (~$0.19 to translate a 1-hour video on `gpt-4o`).

Deep dive on how the pipeline works: **[cli/README.md](cli/README.md)**.
Desktop architecture: **[desktop/README.md](desktop/README.md)**.
