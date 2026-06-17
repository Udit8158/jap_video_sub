# Subly

Turn a **Japanese-audio video** (lectures, talks, anime, long-form — even 2+ hours)
into a **time-synced English `.srt` subtitle file**.

It runs **offline-first on Apple Silicon**: the listening-and-transcribing part
happens 100% on your Mac. Only the small text transcript (a few KB) is sent to
OpenAI to be translated. **Your video file never leaves your machine.**

```
 video.mp4
    │
    │  ①  ffmpeg          rip a clean 16kHz audio track          (local, instant)
    ▼
 audio.wav
    │
    │  ②  mlx-whisper     listen → Japanese subtitles + timing   (local, on-device)
    │                     · long videos are split into chunks
    │                     · timestamps snapped to each spoken word
    │                     · Whisper's "hallucinations" cleaned up
    ▼
 ja.srt
    │
    │  ③  OpenAI          translate Japanese → English           (only text leaves)
    │                     · timestamps copied over untouched
    ▼
 video.en.srt   ←  your finished English subtitles
```

---

## 1. Setup

You need three things: this repo, `ffmpeg`, and an OpenAI API key.

### Step 1 — Install ffmpeg (one time)

`ffmpeg` is the tool that reads your video and pulls the audio out of it.

```bash
brew install ffmpeg
```

(Don't have Homebrew? Install it from https://brew.sh first.)

### Step 2 — Install the project

This uses [`uv`](https://docs.astral.sh/uv/), a fast Python package manager.
If you don't have it: `brew install uv`.

```bash
cd subly/cli      # the CLI lives in the cli/ package
uv sync                   # creates a virtual env and installs everything
```

### Step 3 — Add your OpenAI API key

The translation step calls OpenAI, so it needs a key. Get one at
https://platform.openai.com/api-keys, then:

```bash
cp .env.example .env       # make your own .env file
```

Open `.env` in any editor and paste your key in:

```
OPENAI_API_KEY=sk-your-key-here
```

That's it. You're ready.

> **First run note:** the speech model (`large-v3`, ~1.5 GB) downloads
> automatically the first time and is cached forever after. So your *first*
> run is a bit slower while it grabs the model — every run after is fast.

---

## 2. How to use it

### The simplest possible use

Point it at a video and walk away:

```bash
uv run subly run video.mp4
```

When it finishes you get **`video.en.srt`** sitting right next to your video.
Drop that into VLC, YouTube, Premiere, or any player and the English subtitles
appear in sync. Done.

While it runs, it shows you live progress: which chunk it's on, how long each
step took, memory used, and an overall % with an ETA.

### Useful options (mix and match)

Every option is optional. Here they are with what each one is *for*:

```bash
uv run subly run video.mp4 \
  -o subs.srt                    # where to save the result (default: <video>.en.srt)
  -w turbo                       # which speech model to use (see below)
  -m gpt-4o                      # which OpenAI model translates (see below)
  -n "Lecture on calculus; teacher is Mr. Tanaka" \
                                 # a hint about the video — boosts accuracy a LOT
  -c 10                          # split videos into 10-minute chunks (0 = don't split)
  --keep-japanese                # also save the Japanese .srt, not just English
  --keep-non-speech              # keep moans/grunts/sighs instead of dropping them
  --keep-chunks                  # keep the per-chunk temp files for inspection
  --cache-limit-gb 2             # cap how much memory the model is allowed to hoard
  --force                        # ignore all cached work and redo from scratch
```

**`-w` / `--whisper-model`** — picks the local speech-to-text model. Trade-off
is accuracy vs. speed:

| Model      | Accuracy        | Speed              | Use when…                    |
|------------|-----------------|--------------------|------------------------------|
| `large-v3` | best (default)  | ~real-time         | you want the cleanest result |
| `turbo`    | very good       | several × faster   | you want speed, minor errors ok |
| `medium`   | okay            | faster, lighter    | low-RAM machine              |
| `small`    | rough           | fastest, lightest  | quick draft / testing        |

**`-m` / `--openai-model`** — picks the model that translates. `gpt-4o` (default)
is high quality; `gpt-4o-mini` is ~18× cheaper with a small quality dip.

**`-n` / `--notes`** — the single most valuable option. One line of context about
the video (topic, character or speaker names, setting) makes both the
transcription *and* translation noticeably more accurate and consistent. Use it.

### Running the two halves separately

Sometimes you want to **check the Japanese transcript before paying to translate
it**, or you already have a Japanese `.srt` and only need the English. You can
run each stage on its own:

```bash
# Just transcribe (local, free) → produces video.subly/ja.srt
uv run subly transcribe video.mp4

# Just translate an existing Japanese .srt → produces ...en.srt
uv run subly translate video.subly/ja.srt
```

### Good to know

- **It's resumable.** If a run crashes, runs out of memory, or you hit Ctrl-C,
  just run the same command again — it skips everything it already finished and
  picks up where it stopped. (Use `--force` only if you want to redo work.)
- **Where temp files live.** Intermediate files go in a `<video>.subly/` folder
  next to your video. They're what makes resuming possible. Safe to delete.
- **Audio files work too**, not just video — `.mp3`, `.wav`, `.m4a`, etc.

---

## 3. How it actually works (the deep dive)

This section explains the whole pipeline in plain language. No prior knowledge
assumed — if you've never touched speech-to-text before, you'll still follow it.

### The core idea

Subtitling a video is really two different jobs glued together:

1. **Listening** — figure out *what words were said* and *exactly when*. This is
   "speech-to-text" (also called transcription or ASR).
2. **Translating** — turn those Japanese words into English, without messing up
   the timing.

This tool keeps these two jobs separate on purpose, because they have very
different needs. Listening is heavy, slow, and best done privately on your own
machine. Translating is light, fast, and one place where a big cloud model
(OpenAI) genuinely does a better job. So we do each where it shines.

### Stage ① — ffmpeg pulls out the audio

A video file is a big container holding a video track, an audio track, maybe
several. The speech model only cares about audio, and it specifically wants the
audio in a very particular shape: **16,000 samples per second, mono (one
channel), 16-bit**. That's exactly the format Whisper was trained on.

So `ffmpeg` rips the audio out and converts it to that exact format, saving a
small `audio.wav`. Two nice side effects:

- The model never has to resample anything, so it's faster and slightly more
  accurate.
- A stripped-down 16kHz mono WAV is *tiny* compared to the video, so everything
  downstream is cheap to slice and process.

### Stage ② — Whisper listens (this is the heavy part)

**What Whisper is:** Whisper is an open speech-recognition model from OpenAI.
We run it locally using **MLX**, Apple's framework for running models natively
on the Mac's own GPU (the "Apple Silicon" chip). That's why this works offline
and doesn't ship your audio anywhere — the listening happens entirely on your
laptop.

Now, three real-world problems show up with long videos, and most of the code
here exists to solve them:

#### Problem A: long videos blow up memory

If you feed a 2-hour file to the model in one go, memory usage balloons and a
16 GB Mac starts swapping to disk (which makes everything crawl). 

**The fix — chunking.** We split the audio into ~10-minute pieces and process
them one at a time. But you can't just cut every 10 minutes on the dot — you
might slice a word clean in half ("Tana—| —ka"). So instead:

1. We ask ffmpeg to scan the audio and find all the **silent gaps** (using a
   filter called `silencedetect`).
2. Near each 10-minute mark, we look for the closest silence and cut *there*
   instead — in a pause, where no words are being spoken.

Result: clean cuts that never split a word, and memory stays flat because we
only ever hold one small chunk at a time. After each chunk we explicitly tell
MLX to release its memory so it doesn't accumulate.

#### Problem B: subtitles drift out of sync

Whisper's default timestamps are coarse — it tags whole sentences, so a subtitle
can appear a beat early or linger too long. But Whisper can *also* report a
timestamp for **every individual word** if you ask it to (`word_timestamps`).

So we throw away its rough sentence timings and **rebuild each subtitle from the
word-level timings instead**. Each subtitle now starts on the first real word
and ends on the last real word — no silent padding. And if there's a long pause
in the middle of a sentence (someone trailing off, then continuing), we split it
into two subtitles at the pause. The result lines up tightly with the audio.

#### Problem C: Whisper hallucinates on silence and noise

This is the weird one. When Whisper hears non-speech — breathing, music, moaning,
or just silence — it doesn't output nothing. It tends to *invent* text. Classic
failure modes: it repeats a name 50 times, counts upward ("one, two, three…"),
or produces an endless vowel ("aaaaaaaaa"). This happens because by default each
new piece of audio is decoded using the previous text as a hint, so once it
starts repeating, it reinforces its own loop.

We attack this in two places:

- **At the source:** we turn off that "use previous text as a hint" behavior
  (`condition_on_previous_text=False`). That breaks the feedback loop so the
  runaway repetition mostly never starts.
- **After transcribing, before translating** (so we never waste money
  translating junk), a cleanup pass does three safe, mechanical things:
  1. Drops absurdly short cues (under 150 ms — real speech isn't that short).
  2. Collapses identical back-to-back cues (58 copies of "Charlotte" → 1).
  3. Optionally drops pure non-speech moans — but only elongated single-vowel
     sounds (あああ, んんん). It's careful to **keep** real short words like はい
     (yes), うん (yeah), いや (no), so it never eats actual dialogue.

(That last one is what `--keep-non-speech` turns off, if you *want* the moans.)

The output of this whole stage is `ja.srt`: accurate Japanese subtitles with
tight, word-aligned timestamps.

### Stage ③ — OpenAI translates the text

Now we have Japanese text with perfect timing. The *only* thing left is turning
the words into English — and crucially, **without disturbing a single
timestamp.**

Here's the trick that guarantees that: we never ask the model to "produce
subtitles." We hand it the lines as structured data — basically a numbered list
— and require it to return the **same numbers** with English text attached.
Because every line keeps its id, we just paste each translation back onto the
original timestamped slot. The model literally cannot move a timestamp because it
never sees or touches one.

A few more things make the translation good and robust:

- **Consistency across a long video.** Names, tone, and terminology should stay
  the same from start to finish. So as we translate, we feed the model a rolling
  "here's what came just before" tail of recent English lines. That's why a
  character's name doesn't randomly change spelling halfway through.
- **The `--notes` hint flows in here too.** Your one-line description is given to
  the translator as context for names and terminology.
- **It never crashes on one bad batch.** Lines are translated in batches of ~40.
  If a batch fails (bad JSON, the model rambles and hits its output limit, etc.),
  the code automatically splits that batch in half and retries — down to a single
  line if needed. A single stubborn line, worst case, keeps its original text
  rather than blowing up the whole run.
- **Repetition is capped.** If the source still has a runaway "ああああ…", we
  collapse it before sending, so the model can't burn tokens echoing it forever.

The result is `video.en.srt` — every timestamp identical to the Japanese, every
line now in natural English.

### Why this design is nice

- **Private by default.** The big file (your video/audio) never leaves your Mac.
  Only a few KB of text is sent out to be translated.
- **Cheap.** The expensive part (transcription) is free and local. You only pay
  OpenAI for a tiny amount of text. (~$0.19 to translate a 1-hour video on
  `gpt-4o`; far less on `gpt-4o-mini`.)
- **Tough.** Chunking + per-chunk caching means a crash costs you one chunk, not
  the whole video. Re-run and it resumes.
- **Tunable.** Faster model, cheaper translator, bigger/smaller chunks, keep or
  drop non-speech — all one flag away.

---

## Memory control (advanced)

`large-v3` needs roughly 2.9 GB of active memory, but MLX likes to *hold onto*
freed GPU memory to reuse it quickly — on a long run that pool was observed
climbing to ~7 GB. The `--cache-limit-gb 2` flag (on by default) caps that
reuse pool, cutting the footprint roughly in half **with zero effect on
accuracy** — it only limits idle, reusable memory, never the model itself. Each
chunk prints its peak memory so you can watch it stay flat.

## Performance & cost (Apple M1, 16 GB)

- **Transcription:** roughly real-time to ~1.5× with `large-v3` (so a 2-hour
  video ≈ ~70 min). `turbo` is several times faster for a small accuracy hit.
- **Memory:** stays flat, no swapping, thanks to chunking + the cache cap.
- **Translation:** a few seconds per chunk. **~$0.19 for a 1-hour video** on
  `gpt-4o`; `gpt-4o-mini` is ~18× cheaper.
