# jap-video-sub

Turn a **Japanese-audio video** (lectures, talks, anime, long-form — up to 2+ hours)
into a **time-synced English `.srt`** — offline-first, on Apple Silicon.

```
video.mp4
   │  ① ffmpeg        16kHz mono WAV            (local, fast)
   ▼
audio.wav
   │  ② mlx-whisper   Japanese SRT + timing     (local, M1-native, large-v3)
   │                  · split into chunks (memory-safe, resumable)
   │                  · word-level sync + hallucination cleanup
   ▼
ja.srt
   │  ③ OpenAI        context-aware JA→EN        (only tiny text leaves the Mac)
   ▼
video.en.srt   ← final English subtitles
```

**The big media file never leaves your machine.** Transcription is 100% local.
Only the small text transcript (a few KB) is sent to OpenAI for translation, and
every timestamp from Whisper is preserved exactly.

## Setup

```bash
cd jap_video_sub
uv sync
cp .env.example .env        # then add your OPENAI_API_KEY
```

Requires `ffmpeg` (`brew install ffmpeg`). The Whisper model (~1.5 GB for
`large-v3`) downloads once on first run and is cached.

## Usage

Full pipeline (per-chunk transcribe → translate, with live progress):

```bash
uv run jap-video-sub run video.mp4
# → video.en.srt   (jap_video_sub also works as the command name)
```

Useful options:

```bash
uv run jap-video-sub run video.mp4 \
  -o subs.srt \                  # output path
  -w turbo \                     # Whisper model: large-v3 | turbo | medium | small
  -m gpt-4o \                    # OpenAI model (or set JVS_OPENAI_MODEL)
  -n "context: topic + names" \  # improves accuracy/consistency
  -c 10 \                        # chunk length in minutes (0 = no chunking)
  --cache-limit-gb 2 \           # cap MLX GPU memory pool (eases pressure)
  --keep-non-speech \            # keep moaning/non-speech cues (default: drop)
  --keep-japanese \              # also write the Japanese .srt next to output
  --keep-chunks \                # keep per-chunk intermediates
  --force                        # redo everything, ignore caches
```

Run the stages separately (e.g. verify the Japanese before paying to translate):

```bash
uv run jap-video-sub transcribe video.mp4         # → video.jvs/ja.srt
uv run jap-video-sub translate  video.jvs/ja.srt  # → ...en.srt
```

## How it handles long videos

For anything longer than `--chunk-minutes` (default 10), the audio is split into
chunks **at silence points** (so no word is cut mid-boundary), and each chunk is
transcribed → translated in turn. You get:

- **Per-chunk progress** — stage (`[1/2] transcribing`, `[2/2] translating`),
  per-stage timing, peak memory, and an overall progress % + ETA.
- **Bounded memory** — each chunk is small and the MLX GPU cache is cleared
  between chunks, so a 2-hour file runs on 16 GB without swapping.
- **Resumability** — every chunk's `ja.srt`/`en.srt` is cached in
  `<video>.jvs/chunks/`. If a run is interrupted (crash, OOM, Ctrl-C), re-running
  skips finished chunks and continues where it stopped.

## Accuracy & cleanup

- **Word-level sync** — cues snap to actual spoken word boundaries and split at
  pauses, so subtitles line up tightly with the audio.
- **Hallucination cleanup** — Whisper invents tokens on non-speech audio
  (repeated names, climbing numbers, endless vowels). This is suppressed two ways:
  `condition_on_previous_text=False` breaks the self-reinforcing loops at the
  source, and a post-filter (before translation, so no wasted API cost) drops
  sub-150 ms artifacts, collapses identical runs, and removes non-lexical moans.
  Real short interjections (はい/うん/いや…) are preserved.
- **Robust translation** — batched with rolling context for consistent
  names/tone; runaway repetition is collapsed; truncated/oversized batches are
  auto-split and retried so one bad batch never crashes the run.
- **`--notes` helps** — a one-line topic/character description improves both
  transcription and translation consistency.

## Memory control

`large-v3` needs ~2.9 GB resident, but MLX hoards freed GPU buffers on top
(observed ~7 GB on a long run). `--cache-limit-gb 2` caps that pool, cutting the
footprint roughly in half **with no effect on accuracy** (it only limits idle,
reusable memory). Each chunk prints its peak memory so you can see it holding.

## Performance & cost (Apple M1, 16 GB)

- Transcription: roughly **real-time to ~1.5×** per chunk with `large-v3`
  (`turbo` is several times faster, small accuracy hit). A 2-hour video ≈ ~70 min.
- Memory: stays flat (no swap) with the default cache cap.
- Translation: a few seconds per chunk. **~$0.19 for a 1-hour video** on `gpt-4o`
  (~$2.50/1M input, $10/1M output). `gpt-4o-mini` is ~18× cheaper if you want.
