# jap-video-sub · desktop app

A Mac desktop wrapper around the `jap-video-sub` CLI. Drop a Japanese-audio
video, watch it get transcribed and translated chunk-by-chunk on a live
timeline, and grab the English `.srt`.

> Status: **experimental.** Personal-use build (runs the CLI from this repo via
> `uv`). The architecture is set up so a distributable, self-contained build is a
> later swap-in — see [Architecture](#architecture).

## Run it (dev)

From the repo root, the CLI must work first:

```bash
uv sync                 # installs the Python CLI (see ../README.md)
```

Then the app:

```bash
cd app
npm install
npm run dev:electron     # Vite + Electron, with the real CLI behind it
```

To work on just the UI in a browser with fixture data (no Electron, no backend):

```bash
npm run dev              # then open http://localhost:5173/?mock
```

URL flags for browser mode:
- `?mock` — replay the captured event fixture instead of the real CLI.
- `?needkey` — force the API-key onboarding screen (in-memory stub).

## API key

Translation uses OpenAI. On first launch the app asks for your key and stores it
in the **macOS Keychain** (service `jap-video-sub`, account `openai-api-key`) —
you can inspect or revoke it in Keychain Access. The key is injected into the
CLI's environment at run time; in dev it also falls back to a `.env` in the repo
root.

## Tests

```bash
npm test                 # typecheck + node tests + Playwright e2e
```

What's covered:

| Test | What it proves |
|---|---|
| `tests/buildArgs.test.mjs` | UI settings map to the correct CLI flags |
| `tests/keychain.test.mjs` | Keychain store → read → update → delete round-trip |
| `tests/bridge.test.mjs` | Spawns the **real CLI** (`--json --simulate`) and parses its event stream — the exact main-process bridge logic |
| `tests/e2e/bridge.spec.ts` | Full setup → running → done flow + the timeline (Playwright, mock source) |
| `tests/e2e/gate.spec.ts` | API-key onboarding gate blocks until a valid key is entered |

The Python side has its own event-contract tests: `uv run pytest` in the repo
root (`tests/test_events.py`).

## Architecture

The UI talks to the pipeline through exactly **one seam**: a subprocess that
emits JSON-lines events (`jap-video-sub run --json`). Everything else is built on
that contract.

```
┌────────────────────────┐  spawn   ┌──────────────────────────┐
│ Electron + React (UI)   │ ───────▶ │ jap-video-sub run --json │
│ reducer → timeline/views│ ◀─────── │ 1 JSON event per line     │
└────────────────────────┘  stdout  └──────────────────────────┘
        │ EventSource seam
        ├── ElectronEventSource → real CLI via IPC (production)
        └── MockEventSource     → replays a captured fixture (browser + tests)
```

Key files:

- `electron/main.js` — spawns the CLI, line-buffers stdout, forwards parsed
  events to the renderer over IPC. The **only** place that knows how the
  pipeline is launched. Today: `uv run` in this repo. "Ship to others": swap this
  for a bundled runtime — the renderer doesn't change.
- `electron/buildArgs.js` — RunOptions → CLI argv (unit-tested).
- `electron/keychain.js` — OpenAI key in the Keychain via the `security` CLI.
- `electron/preload.js` — the `contextBridge` exposing a small `window.jvs` API.
- `src/eventsource/` — the `EventSource` seam: `types.ts` (the contract, mirrors
  Python `events.py`), `electron.ts`, `mock.ts`.
- `src/useJob.ts` — reducer that turns the event stream into `JobState`. Every
  view reads from this, never from raw events.
- `src/components/Timeline.tsx` — the signature two-stage chunk timeline.
- `src/fixtures/simulate.jsonl` — captured real `--simulate` output; the mock and
  browser dev replay it, so they stay faithful to the contract.

The event contract itself is defined and documented in the CLI:
`../jap_video_sub/events.py`.

## Not done yet (the "ship to others" path)

This build assumes `uv` + `ffmpeg` are installed and runs the CLI from the repo.
To distribute to non-developers, the remaining work is packaging, not UI:

- bundle Python + `mlx-whisper` (PyInstaller / relocatable uv env)
- bundle a static `ffmpeg` binary
- a first-run model-download progress screen
- code signing + notarization
