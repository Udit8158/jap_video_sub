/* ============================================================================
 * subly · Codebase Course — CONTENT
 * Every module, lesson, code excerpt and quiz lives here as data.
 * The renderer in app.js turns these "blocks" into the page.
 *
 * Block kinds:
 *   {h:  "..."}                         section heading
 *   {p:  "...(html allowed)..."}        paragraph
 *   {lead:"..."}                        large intro paragraph
 *   {code:"...", lang, file, lines}     code block (file/lines optional caption)
 *   {note:"...", kind, title}           callout  kind: info|key|warn|tip|stage
 *   {list:[...], ordered}               bullet / numbered list
 *   {steps:[{t,d}]}                     numbered "flow" with title + desc
 *   {stat:[{n,label}]}                  stat strip
 *   {quote:"...", cite}                 pull quote
 *   {diagram:"<html>"}                  raw html (ascii diagrams etc.)
 *   {files:[{path,desc}]}               "files in play" table
 *   {q:"...", a:"..."}                  mini self-check (reveal answer)
 * ==========================================================================*/

const COURSE = {
  title: "Subly",
  subtitle: "The Codebase Course",
  tagline: "Build a Japanese-video → English-subtitle engine, one real file at a time.",

  // XP rank ladder. reach `xp` to earn the rank.
  levels: [
    { xp: 0,    rank: "curious://onlooker",   icon: "◔" },
    { xp: 120,  rank: "intern://reads-code",  icon: "◑" },
    { xp: 320,  rank: "junior://ships-it",    icon: "◕" },
    { xp: 600,  rank: "engineer://gets-it",   icon: "●" },
    { xp: 980,  rank: "senior://owns-it",     icon: "✦" },
    { xp: 1500, rank: "core://maintainer",    icon: "✸" },
  ],

  // Achievements. `when` is checked by app.js against progress.
  badges: [
    { id: "first-steps",  name: "Hello, World",       icon: "🌱", desc: "Finish your first module." },
    { id: "audiophile",   name: "Audiophile",         icon: "🎚️", desc: "Master Stage ① — ffmpeg & audio." },
    { id: "the-surgeon",  name: "The Cut Surgeon",    icon: "✂️", desc: "Learn how chunks snap to silence." },
    { id: "on-device",    name: "On-Device",          icon: "🧠", desc: "Understand Whisper on Apple Silicon." },
    { id: "ghostbuster",  name: "Ghostbuster",        icon: "👻", desc: "Tame Whisper's hallucinations." },
    { id: "diplomat",     name: "The Diplomat",       icon: "🗾", desc: "Translate without breaking timing." },
    { id: "contract",     name: "Contract Law",       icon: "📜", desc: "Internalize the event seam." },
    { id: "full-stack",   name: "Full Stack",         icon: "🖥️", desc: "Finish the desktop app module." },
    { id: "flawless",     name: "Flawless",           icon: "💯", desc: "Ace any quiz with a perfect score." },
    { id: "the-engineer", name: "Core Maintainer",    icon: "👑", desc: "Complete every module in the course." },
  ],

  modules: [
    /* =====================================================================
     * MODULE 1 — THE BIG PICTURE
     * ===================================================================*/
    {
      id: "big-picture",
      num: 1,
      title: "The Big Picture",
      tag: "Orientation",
      color: "iris",
      est: "12 min",
      blurb: "What this project actually does, why it's split in two, and the one idea the whole codebase is built around.",
      lessons: [
        {
          id: "what-it-does",
          title: "What are we even building?",
          blocks: [
            { lead: "<b>Subly</b> takes a video with <b>Japanese audio</b> and produces a <b>time-synced English <code>.srt</code> subtitle file</b> — the kind you drop into VLC, YouTube or Premiere and the subtitles just appear, in sync." },
            { p: "The headline trick is <b>privacy + cost</b>: the heavy listening happens 100% on your own Mac, offline. The only thing that ever leaves your machine is a few kilobytes of <i>text</i> sent to OpenAI to be translated. Your actual video file never goes anywhere." },
            { stat: [
              { n: "~$0.19", label: "to translate a 1-hour video (gpt-4o)" },
              { n: "0 bytes", label: "of your video sent to the cloud" },
              { n: "2+ hrs", label: "video it can handle in one run" },
            ]},
            { note: "Subtitling is really <b>two different jobs glued together</b>: (1) <b>listening</b> — figure out what words were said and exactly when, and (2) <b>translating</b> — turn those Japanese words into English without messing up the timing. Hold onto this idea. The entire codebase is shaped by it.", kind: "key", title: "The one big idea" },
            { p: "These two jobs have <i>opposite</i> needs. Listening is heavy, slow, and best done privately on hardware you own. Translating is light, fast, and one of the rare places a big cloud model genuinely wins. So the project does each job where it shines — and keeps them strictly separate." },
          ],
        },
        {
          id: "the-pipeline",
          title: "The pipeline, end to end",
          blocks: [
            { p: "Three stages turn a video into subtitles. Each stage has a clear input, a clear output, and writes its result to disk so it can be skipped next time. We'll spend a whole module on each." },
            { diagram: `<div class="flow-pipe">
              <div class="fp-node fp-cyan"><span class="fp-i">①</span><b>ffmpeg</b><small>rip a clean 16kHz audio track</small><em>local · instant</em></div>
              <div class="fp-arrow">▼ <code>audio.wav</code></div>
              <div class="fp-node fp-coral"><span class="fp-i">②</span><b>mlx-whisper</b><small>listen → Japanese subtitles + timing</small><em>local · on-device GPU</em></div>
              <div class="fp-arrow">▼ <code>ja.srt</code></div>
              <div class="fp-node fp-iris"><span class="fp-i">③</span><b>OpenAI</b><small>translate Japanese → English</small><em>only text leaves your Mac</em></div>
              <div class="fp-arrow">▼</div>
              <div class="fp-out">🎬 <code>video.en.srt</code> — your finished subtitles</div>
            </div>` },
            { note: "Notice the colour code: <span class='chip chip-cyan'>① ffmpeg</span> <span class='chip chip-coral'>② whisper</span> <span class='chip chip-iris'>③ translate</span>. We'll keep these colours for the whole course so you always know which stage you're looking at.", kind: "tip" },
          ],
        },
        {
          id: "monorepo",
          title: "Two products in one repo",
          blocks: [
            { p: "The repository is a small <b>monorepo</b> — one repo holding two related projects that ship and evolve together:" },
            { files: [
              { path: "cli/", desc: "<b>The engine.</b> A Python command-line tool that does the actual work (ffmpeg → whisper → OpenAI). This is the product." },
              { path: "desktop/", desc: "<b>A friendly face.</b> A Mac app (Electron + React + TypeScript) that just <i>drives</i> the CLI and draws a live timeline. It is optional." },
            ]},
            { p: "Read that twice: <b>the CLI is the product; the desktop app is a wrapper.</b> The app doesn't re-implement the pipeline — it launches the CLI as a subprocess and listens to it. That single design choice is what keeps the codebase small and testable." },
            { q: "Why keep the GUI as a thin wrapper instead of porting the pipeline into the app?", a: "So there's exactly one implementation of the hard logic (in Python, where mlx-whisper lives). The app can't drift out of sync with the engine, and the engine stays fully usable — and testable — on its own from a terminal." },
          ],
        },
        {
          id: "one-seam",
          title: "The one seam: a stream of events",
          blocks: [
            { p: "How does a TypeScript app talk to a Python program? Through the narrowest possible interface — <b>one seam</b>. When you run the CLI with <code>--json</code>, it prints <b>one JSON object per line</b> describing what just happened:" },
            { code: `{"type": "chunk_start", "t": 1718370000.12, "index": 3, "total": 12, ...}
{"type": "transcribe_done", "t": 1718370041.5, "index": 3, "lines": 57, ...}`, lang: "json", file: "what the CLI prints with --json" },
            { p: "The desktop app reads that stream line by line and updates its UI. That's the <i>entire</i> contract between the two halves. The Python side defines it in <code>cli/subly/events.py</code>; the TypeScript side mirrors it in <code>desktop/src/eventsource/types.ts</code>. Keep those two in sync and everything works." },
            { note: "A whole module (7) is dedicated to this event contract, because it's the cleverest architectural decision in the project: it lets you build and test the GUI against a <i>fake</i> event stream, with no model and no API calls.", kind: "info", title: "Foreshadowing" },
            { steps: [
              { t: "The CLI is the product", d: "All real logic lives in the Python package. Everything else is a client." },
              { t: "Stages are isolated", d: "ffmpeg, whisper, OpenAI — each with one input, one output, cached to disk." },
              { t: "Communication is a one-way event stream", d: "JSON lines on stdout. Narrow, stable, easy to fake." },
            ]},
          ],
        },
      ],
      quiz: [
        {
          q: "What is the only data that leaves your machine during a run?",
          options: ["The full video file", "The extracted audio.wav", "A few KB of transcribed Japanese text", "Nothing at all — it's fully offline"],
          answer: 2,
          explain: "Transcription is local and free; only the small Japanese text transcript is sent to OpenAI to translate. The video and audio never leave the Mac.",
        },
        {
          q: "The codebase splits the work into two jobs. What are they?",
          options: ["Downloading and uploading", "Listening (speech→text) and translating (JA→EN)", "Encoding and decoding video", "Frontend and backend"],
          answer: 1,
          explain: "Listening is heavy and done locally; translating is light and done in the cloud. Keeping them separate lets each run where it's best.",
        },
        {
          q: "What is the relationship between cli/ and desktop/?",
          options: ["They're unrelated projects", "The desktop app re-implements the pipeline in TypeScript", "The desktop app spawns the CLI and reads its output", "The CLI calls into the desktop app"],
          answer: 2,
          explain: "The CLI is the product. The desktop app is a thin wrapper that launches the CLI as a subprocess and renders its event stream.",
        },
        {
          q: "How do the two halves communicate?",
          options: ["A shared database", "A REST API over HTTP", "One JSON object per line printed on stdout", "Files written to a temp folder"],
          answer: 2,
          explain: "`subly run --json` emits JSON-lines events on stdout. That single stream is the entire seam between Python and TypeScript.",
        },
      ],
    },

    /* =====================================================================
     * MODULE 2 — STAGE ①: FFMPEG & AUDIO
     * ===================================================================*/
    {
      id: "audio",
      num: 2,
      title: "Stage ①: Ripping the Audio",
      tag: "ffmpeg",
      color: "cyan",
      est: "14 min",
      blurb: "A video is a box of tracks. We only want the audio — and in one very specific shape. Meet ffmpeg and audio.py.",
      lessons: [
        {
          id: "why-audio",
          title: "Why we throw the video away",
          blocks: [
            { lead: "A video file is a <b>container</b> — a box holding a video track, one or more audio tracks, maybe subtitles and metadata. The speech model only cares about audio, and it wants that audio in a very particular format." },
            { p: "Whisper was trained on <b>16,000 samples per second, mono (one channel), 16-bit</b> audio. So before anything else, we use <b>ffmpeg</b> to pull the audio out and convert it to exactly that shape, saving a small <code>audio.wav</code>." },
            { list: [
              "<b>16 kHz</b> — exactly Whisper's sample rate, so the model never has to resample (faster, slightly more accurate).",
              "<b>mono</b> — one channel; stereo carries no extra information for speech.",
              "<b>16-bit PCM</b> — uncompressed, so slicing it later is lossless and instant.",
            ]},
            { note: "A stripped-down 16kHz mono WAV is <i>tiny</i> compared to the video. Everything downstream — chunking, slicing, probing — becomes cheap because we're working with this small file, not the original video.", kind: "key" },
          ],
        },
        {
          id: "extract",
          title: "The extraction command",
          blocks: [
            { p: "Here's the real heart of <code>audio.py</code>. It's a thin, careful wrapper around a single ffmpeg command. Read the flags — each one maps directly to a requirement above." },
            { code: `def extract_audio(src: Path, dst: Path) -> Path:
    """Convert \`src\` to 16kHz mono 16-bit PCM WAV at \`dst\`."""
    ensure_ffmpeg()
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",                 # overwrite
        "-i", str(src),
        "-vn",                # drop video
        "-ac", "1",           # mono
        "-ar", "16000",       # 16 kHz
        "-c:a", "pcm_s16le",  # 16-bit PCM
        "-loglevel", "error",
        str(dst),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\\n{proc.stderr.strip()}")
    if not dst.exists() or dst.stat().st_size == 0:
        raise RuntimeError("ffmpeg produced no audio output.")
    return dst`, lang: "python", file: "cli/subly/audio.py", lines: "18–42" },
            { p: "Things a careful engineer notices here:" },
            { list: [
              "<code>-vn</code> means <b>v</b>ideo <b>n</b>one — we explicitly discard the video track. <code>-ac 1</code> = audio channels 1 (mono). <code>-ar 16000</code> = audio rate. <code>-c:a pcm_s16le</code> = the 16-bit codec.",
              "It doesn't just trust the exit code — it also checks the output file <b>exists and isn't empty</b>. ffmpeg can return 0 and still produce nothing on a weird input.",
              "<code>ensure_ffmpeg()</code> runs first and raises a friendly \"install it with <code>brew install ffmpeg</code>\" message instead of a cryptic crash.",
            ]},
            { q: "Why capture stderr and only raise if returncode != 0?", a: "ffmpeg writes diagnostics to stderr even on success. We capture it so that on failure we can show the user the real reason, but we don't treat its presence as an error — only a non-zero exit code is a real failure." },
          ],
        },
        {
          id: "probe",
          title: "Measuring the audio: ffprobe",
          blocks: [
            { p: "Before we can plan how to split a long video, we need to know how long it is. ffmpeg ships with a sibling tool, <code>ffprobe</code>, that reads container metadata. The wrapper asks for exactly one number — the duration in seconds — and nothing else." },
            { code: `def probe_duration(path: Path) -> float:
    """Return media duration in seconds via ffprobe."""
    proc = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True, text=True,
    )
    try:
        return float(proc.stdout.strip())
    except ValueError:
        raise RuntimeError(f"Could not read duration of {path}")`, lang: "python", file: "cli/subly/audio.py", lines: "45–59" },
            { note: "The <code>-of default=noprint_wrappers=1:nokey=1</code> flag tells ffprobe to print just the bare value — so <code>stdout</code> is something like <code>1500.04</code> that we can <code>float()</code> directly. Small detail, but it's why no parsing/regex is needed.", kind: "tip" },
          ],
        },
        {
          id: "shell-out",
          title: "Pattern: shelling out to a trusted tool",
          blocks: [
            { p: "There's no Python audio library here. Every function in <code>audio.py</code> is the same shape: build an argument list, run it with <code>subprocess.run(...)</code>, check the result, parse the output. This is a deliberate, common pattern." },
            { steps: [
              { t: "Build argv as a list", d: "A list of strings — never a single shell string — so there's no shell-injection or quoting surprise with weird file names." },
              { t: "capture_output=True", d: "Grabs stdout and stderr instead of letting them leak onto the user's terminal." },
              { t: "Check, don't assume", d: "Inspect returncode, then validate the output really exists. Fail loudly with a useful message." },
            ]},
            { note: "ffmpeg is decades of battle-tested C. Re-implementing audio decoding in Python would be slower, buggier, and pointless. <b>Lean on the right tool; wrap it cleanly.</b> That judgement — knowing what <i>not</i> to build — is a real engineering skill.", kind: "key", title: "Engineering takeaway" },
          ],
        },
      ],
      quiz: [
        {
          q: "Why does ffmpeg convert the audio to 16 kHz mono specifically?",
          options: ["To make it sound better", "Because that's exactly what Whisper was trained on, avoiding any resampling", "Because mp3 requires it", "To compress it for upload"],
          answer: 1,
          explain: "16 kHz mono 16-bit is Whisper's native input format. Matching it means the model never resamples — faster and slightly more accurate.",
        },
        {
          q: "What does the `-vn` flag do?",
          options: ["Sets the volume", "Enables verbose mode", "Drops the video track (video none)", "Names the output"],
          answer: 2,
          explain: "`-vn` = video none. We only want audio, so we explicitly discard the video stream.",
        },
        {
          q: "After ffmpeg returns, the code checks `dst.exists() and dst.stat().st_size != 0`. Why?",
          options: ["To free disk space", "Because ffmpeg can exit 0 yet produce no/empty output on odd inputs", "To rename the file", "It's required by the WAV format"],
          answer: 1,
          explain: "A zero exit code isn't proof of success on strange inputs. Validating the output file actually exists and has bytes catches silent failures.",
        },
        {
          q: "Why pass the command as a list of strings to subprocess.run instead of one shell string?",
          options: ["It runs faster", "It avoids shell quoting/injection issues with unusual filenames", "Lists are required by Python", "So the output is colored"],
          answer: 1,
          explain: "Passing argv as a list skips the shell entirely, so spaces and special characters in filenames can't break the command or inject anything.",
        },
      ],
    },

    /* =====================================================================
     * MODULE 3 — SMART CHUNKING
     * ===================================================================*/
    {
      id: "chunking",
      num: 3,
      title: "Smart Chunking",
      tag: "Algorithms",
      color: "cyan",
      est: "16 min",
      blurb: "Long audio blows up memory. The fix is to split it — but never in the middle of a word. This is the project's prettiest algorithm.",
      lessons: [
        {
          id: "the-problem",
          title: "Problem A: long videos blow up memory",
          blocks: [
            { lead: "Feed a 2-hour file to the model in one go and memory balloons. A 16 GB Mac starts swapping to disk, and everything crawls to a halt." },
            { p: "The fix is <b>chunking</b>: split the audio into ~10-minute pieces and process them one at a time. We only ever hold one small chunk in memory, so the footprint stays flat no matter how long the video is." },
            { note: "But you can't just cut every 10 minutes on the dot — you might slice a word clean in half: <code>「タナ—| —カ」</code>. A subtitle on either side of that cut would be garbled. We need to cut <b>in the silences between words.</b>", kind: "warn", title: "The catch" },
          ],
        },
        {
          id: "silencedetect",
          title: "Finding the silences",
          blocks: [
            { p: "Step one: ask ffmpeg where the quiet parts are. Its <code>silencedetect</code> filter scans the audio and logs every stretch quieter than a threshold for longer than a minimum duration. We parse those log lines into <code>(start, end)</code> pairs." },
            { code: `def detect_silences(
    wav: Path, noise_db: float = -30.0, min_silence: float = 0.4
) -> list[tuple[float, float]]:
    """Return (start, end) of silent stretches, used to pick clean cut points."""
    cmd = [
        "ffmpeg", "-i", str(wav),
        "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}",
        "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    silences: list[tuple[float, float]] = []
    start: float | None = None
    for line in proc.stderr.splitlines():
        if "silence_start:" in line:
            start = float(line.split("silence_start:")[1].strip())
        elif "silence_end:" in line and start is not None:
            end = float(line.split("silence_end:")[1].split("|")[0].strip())
            silences.append((start, end))
            start = None
    return silences`, lang: "python", file: "cli/subly/audio.py", lines: "62–87 (trimmed)" },
            { list: [
              "<b>noise=-30dB</b> — anything below −30 dB counts as \"silence.\" Lower (e.g. −40) is stricter; higher catches more.",
              "<b>d=0.4</b> — a gap must last at least 0.4s to count, so we don't treat tiny pauses between syllables as cut points.",
              "<b>-f null -</b> — we don't want an output file; we only want ffmpeg's log on <code>stderr</code>, which is where <code>silencedetect</code> prints its findings.",
            ]},
          ],
        },
        {
          id: "plan-chunks",
          title: "The plan_chunks algorithm",
          blocks: [
            { p: "Now the elegant part. We want roughly equal ~10-minute chunks, but each interior cut should snap to the nearest silence. The algorithm:" },
            { steps: [
              { t: "Compute even targets", d: "Divide the duration into N equal pieces (N = ceil(duration / chunk_seconds)). These are the ideal cut points." },
              { t: "Snap each target to a nearby silence", d: "For each target time, search for the silence whose midpoint is closest — but only within a window (default 60s). Cut there instead." },
              { t: "Fall back gracefully", d: "If no silence is near a target, use the hard target time. Better an imperfect cut than no cut." },
              { t: "Drop slivers", d: "Discard any degenerate piece shorter than 0.5s that snapping might create." },
            ]},
            { code: `def plan_chunks(duration, chunk_seconds, silences, search=60.0):
    if duration <= chunk_seconds:
        return [(0.0, duration)]                 # short enough: one chunk

    n = math.ceil(duration / chunk_seconds)
    targets = [duration * i / n for i in range(1, n)]   # even cut points

    cuts = []
    for t in targets:
        best, best_d = None, None
        for s, e in silences:
            mid = (s + e) / 2.0                  # middle of this silence
            d = abs(mid - t)                     # how far from our target?
            if d <= search and (best_d is None or d < best_d):
                best_d, best = d, mid            # keep the closest one
        cuts.append(best if best is not None else t)   # snap, or hard-cut

    points = [0.0] + sorted(cuts) + [duration]
    chunks = []
    for i in range(len(points) - 1):
        if points[i + 1] - points[i] > 0.5:      # drop degenerate slivers
            chunks.append((points[i], points[i + 1]))
    return chunks`, lang: "python", file: "cli/subly/audio.py", lines: "90–122" },
            { diagram: `<div class="ascii">
<b>targets</b>   (even 10-min marks)
  0 ──────────┬──────────┬──────────┬────────── 40:00
            10:00      20:00      30:00
                │ snap each to nearest silence within ±60s
                ▼
<b>cuts</b>      ·····  pause   ·····  pause   ·····  pause
  0 ────────┬────────────┬──────────────┬──────── 40:00
          9:42         20:38          29:55
  └─ chunk 1 ─┘└── chunk 2 ──┘└── chunk 3 ──┘└ chunk 4 ┘
     cut where nobody is speaking — never mid-word
</div>` },
          ],
        },
        {
          id: "slice",
          title: "Slicing losslessly, and resetting memory",
          blocks: [
            { p: "Once we have the plan, each chunk is extracted from the WAV with <code>slice_audio</code>. Because the source is already uncompressed PCM, we can copy the bytes directly — no re-encoding, sample-exact and instant:" },
            { code: `def slice_audio(wav: Path, start: float, end: float, dst: Path) -> Path:
    """Extract [start, end) of a PCM WAV losslessly (sample-exact, instant)."""
    cmd = [
        "ffmpeg", "-y",
        "-ss", f"{start:.3f}", "-t", f"{end - start:.3f}",
        "-i", str(wav),
        "-c", "copy", "-loglevel", "error",
        str(dst),
    ]
    ...`, lang: "python", file: "cli/subly/audio.py", lines: "125–137 (trimmed)" },
            { p: "In the pipeline loop (<code>cli.py</code>), each chunk is transcribed, written to its own little <code>.srt</code>, and then its memory is explicitly released before the next chunk starts. That's what keeps the footprint flat:" },
            { code: `audio_mod.slice_audio(wav, start, end, chunk_wav)
local = _transcribe_chunk(chunk_wav, model, prompt, ...)
# shift chunk-local timestamps to absolute position in the full video
local = [Segment(s.index, s.start + start, s.end + start, s.text)
         for s in local]
srt_mod.write(chunk_ja, local)        # persist for resume on crash/OOM
chunk_wav.unlink(missing_ok=True)     # delete the temp slice
transcribe_mod.clear_cache()          # release MLX's GPU buffers`, lang: "python", file: "cli/subly/cli.py", lines: "244–255 (trimmed)" },
            { note: "Spot the line <code>s.start + start</code>. Each chunk is transcribed as if it started at time 0, so Whisper hands back timestamps local to the chunk. We add the chunk's real <code>start</code> offset to shift every timestamp back to its true position in the full video. Forget this and chunk 2's subtitles all appear at 0:00.", kind: "key", title: "The timestamp shift" },
            { q: "Why does writing each chunk to its own .srt make the whole run resumable?", a: "If the process crashes (or runs out of memory) on chunk 7, chunks 1–6 are already saved to disk. Re-running sees those files and skips straight to chunk 7 instead of redoing everything." },
          ],
        },
      ],
      quiz: [
        {
          q: "Why split long audio into chunks at all?",
          options: ["To make subtitles shorter", "To keep memory flat — a whole 2-hour file at once would swap to disk", "OpenAI requires it", "To parallelize across CPUs"],
          answer: 1,
          explain: "Processing one ~10-min chunk at a time keeps peak memory bounded regardless of total length, avoiding disk swapping.",
        },
        {
          q: "Cuts are snapped to the midpoint of nearby silences. What problem does that solve?",
          options: ["Saves disk space", "Prevents slicing a word in half at a chunk boundary", "Makes ffmpeg faster", "Improves translation cost"],
          answer: 1,
          explain: "Cutting inside a silent gap means no word is split across two chunks, so neither chunk's transcript is garbled at the seam.",
        },
        {
          q: "If no silence is found within the search window of a target, what happens?",
          options: ["The run aborts", "It falls back to a hard cut at the exact target time", "It merges the two chunks", "It waits and retries"],
          answer: 1,
          explain: "`cuts.append(best if best is not None else t)` — when nothing is close enough, it uses the even target time. An imperfect cut beats no cut.",
        },
        {
          q: "Each chunk is transcribed as if it starts at 0:00. How are timestamps fixed?",
          options: ["They aren't — Whisper knows the offset", "Each segment's start/end gets the chunk's real start time added back", "ffmpeg rewrites them", "OpenAI corrects them during translation"],
          answer: 1,
          explain: "`Segment(s.index, s.start + start, s.end + start, ...)` shifts every chunk-local timestamp to its absolute position in the full video.",
        },
        {
          q: "Why can slice_audio use `-c copy` instead of re-encoding?",
          options: ["Because the source WAV is already uncompressed PCM, so bytes can be copied directly", "Because the chunks are tiny", "Because ffmpeg always copies", "To add compression"],
          answer: 0,
          explain: "With raw PCM there's nothing to decode/encode — copying the relevant byte range is lossless, sample-exact, and effectively instant.",
        },
      ],
    },

    /* =====================================================================
     * MODULE 4 — WHISPER ON APPLE SILICON
     * ===================================================================*/
    {
      id: "whisper",
      num: 4,
      title: "Stage ②: Whisper Listens",
      tag: "ML / on-device",
      color: "coral",
      est: "18 min",
      blurb: "The heavy part. What Whisper and MLX are, how we get word-perfect timing, and the clever monkey-patch that powers the live progress bar.",
      lessons: [
        {
          id: "what-is-whisper",
          title: "What Whisper and MLX actually are",
          blocks: [
            { lead: "<b>Whisper</b> is an open speech-recognition model from OpenAI. Give it audio, it gives you text plus timestamps. We run it <b>locally</b> using <b>MLX</b> — Apple's framework for running models natively on the Mac's own GPU (the Apple Silicon chip)." },
            { p: "That combination is the whole reason this tool is private and free: the listening happens entirely on your laptop. Nothing is uploaded. The model weights download once from Hugging Face (~1.5–3 GB depending on size) and are cached forever after." },
            { code: `# Friendly name -> mlx-community HF repo.
# large-v3 = best Japanese accuracy. turbo = ~4x faster, slightly less accurate.
MODELS = {
    "large-v3": "mlx-community/whisper-large-v3-mlx",
    "turbo":    "mlx-community/whisper-large-v3-turbo",
    "medium":   "mlx-community/whisper-medium-mlx",
    "small":    "mlx-community/whisper-small-mlx",
}`, lang: "python", file: "cli/subly/transcribe.py", lines: "26–31" },
            { note: "A <b>model</b> here is just a big file of numbers (weights) plus code to run them. \"Loading the model\" means reading those numbers into memory; \"transcribing\" means feeding audio through them. Bigger model = more accurate but slower and heavier. <code>large-v3</code> is the default; <code>small</code> is a quick rough draft.", kind: "info", title: "Jargon, demystified" },
          ],
        },
        {
          id: "call",
          title: "The transcribe call",
          blocks: [
            { p: "The core call hands the audio to <code>mlx_whisper</code> with a deliberate set of options. Every argument here is a decision worth understanding:" },
            { code: `result = mlx_whisper.transcribe(
    str(audio_path),
    path_or_hf_repo=repo,
    language="ja",                       # we know it's Japanese — don't guess
    task="transcribe",                   # transcribe (JA→JA), not translate
    word_timestamps=True,                # ask for per-word timing (see below)
    initial_prompt=initial_prompt,       # the --notes hint, for names/terms
    condition_on_previous_text=False,    # break hallucination feedback loops
    verbose=verbose,
)`, lang: "python", file: "cli/subly/transcribe.py", lines: "180–189" },
            { list: [
              "<b>language=\"ja\"</b> — we always know the audio is Japanese, so we tell the model instead of letting it auto-detect (faster, no misdetection).",
              "<b>task=\"transcribe\"</b> — Whisper can itself translate to English, but we deliberately <i>don't</i> use that. Its translation is mediocre; we want clean Japanese here and let a dedicated model translate in Stage ③.",
              "<b>word_timestamps=True</b> — the key to tight sync. More on this next.",
              "<b>initial_prompt</b> — your <code>--notes</code> text. Seeding the model with \"calculus lecture, teacher Mr. Tanaka\" measurably improves both spelling of names and overall accuracy.",
              "<b>condition_on_previous_text=False</b> — the single most important flag for robustness. We'll see why in Module 5.",
            ]},
            { q: "Whisper can translate to English by itself. Why not let it?", a: "Its built-in translation is noticeably weaker than a dedicated LLM, and mixing transcription + translation in one step makes both harder to debug and cache. Keeping the stages separate (clean JA here, great EN later) produces a better result." },
          ],
        },
        {
          id: "refine",
          title: "Problem B: word-perfect timing",
          blocks: [
            { p: "Whisper's default timestamps are <b>coarse</b> — it tags whole sentences. A subtitle can pop up a beat early or linger too long. But with <code>word_timestamps=True</code>, Whisper also reports a timestamp for <i>every individual word</i>. So we throw away the rough sentence timings and <b>rebuild each subtitle from the word-level timings.</b>" },
            { code: `def _refine(raw, split_gap):
    out = []
    for seg in raw:
        words = [w for w in (seg.get("words") or []) if w.get("word", "").strip()]
        ...
        cue_words, prev_end = [], None
        for w in words:
            # a long pause inside a sentence? start a new subtitle there.
            if prev_end is not None and float(w["start"]) - prev_end > split_gap:
                out.append(_cue_from_words(cue_words))
                cue_words = []
            cue_words.append(w)
            prev_end = float(w["end"])
        if cue_words:
            out.append(_cue_from_words(cue_words))
    return out`, lang: "python", file: "cli/subly/transcribe.py", lines: "210–237 (trimmed)" },
            { steps: [
              { t: "Each cue starts on a real word", d: "No silent padding before the first word or after the last." },
              { t: "Split on long internal pauses", d: "If someone trails off mid-sentence and resumes after > split_gap (0.8s), that becomes two subtitles, not one long one." },
              { t: "Guard against zero-length cues", d: "_cue_from_words nudges end to start+0.3 if a cue would otherwise have no duration." },
            ]},
            { note: "This is a recurring theme: the model gives you a <i>rough</i> answer with rich underlying data, and the surrounding code refines that data into something production-quality. The model is one ingredient, not the whole dish.", kind: "key" },
          ],
        },
        {
          id: "progress",
          title: "The live progress bar: a monkey-patch",
          blocks: [
            { p: "Here's a genuinely clever bit. We want a live transcription progress bar (and, in JSON mode, <code>transcribe_progress</code> events). But <code>mlx_whisper</code> doesn't expose a progress callback — internally it just drives its own <code>tqdm</code> progress bar as it seeks through the audio." },
            { p: "The solution: <b>temporarily swap out the <code>tqdm</code> class that mlx_whisper uses</b> for our own shim that forwards each update to a callback. This technique — replacing a function/class on another module at runtime — is called <b>monkey-patching</b>." },
            { code: `@contextlib.contextmanager
def _patch_progress(progress_cb):
    if progress_cb is None:
        yield; return

    mwt = sys.modules["mlx_whisper.transcribe"]   # the real submodule

    class _Bar:
        def __init__(self, *a, total=0, **k):
            self.total = int(total or 0); self.n = 0
        def update(self, n=1):
            self.n += n
            if self.total:
                progress_cb(min(self.n, self.total), self.total)   # forward it!
        # tqdm API surface mlx may touch — harmless no-ops:
        def set_description(self, *a, **k): ...
        def close(self): ...
        def __enter__(self): return self
        def __exit__(self, *e): return False

    class _Shim: tqdm = _Bar

    original = mwt.tqdm           # save the real one
    mwt.tqdm = _Shim             # swap in ours
    try:
        yield
    finally:
        mwt.tqdm = original      # ALWAYS restore — even on error`, lang: "python", file: "cli/subly/transcribe.py", lines: "96–145 (trimmed)" },
            { list: [
              "It's a <b>context manager</b> (<code>@contextlib.contextmanager</code> + <code>try/finally</code>) so the original <code>tqdm</code> is <i>always</i> put back, even if transcription throws.",
              "The shim implements just enough of tqdm's API (<code>update</code>, <code>set_description</code>, <code>close</code>, enter/exit) to be a drop-in replacement — the extras are harmless no-ops.",
              "<code>progress_cb(self.n, self.total)</code> is the bridge: mlx's internal progress becomes <i>our</i> progress bar or JSON events.",
            ]},
            { note: "Monkey-patching is powerful but sharp. It works here because the patch is narrow, scoped to a single call, and guaranteed to be undone. Used carelessly it makes code impossible to reason about. Note the discipline: save → swap → <code>try/finally</code> → restore.", kind: "warn", title: "With great power…" },
          ],
        },
        {
          id: "memory",
          title: "Keeping memory flat",
          blocks: [
            { p: "MLX likes to <i>hold onto</i> freed GPU memory to reuse it quickly. Over a long run that pool was observed climbing to ~7 GB. The code caps it — which roughly halves the footprint with zero effect on accuracy, because it only limits idle, reusable memory, never the model itself." },
            { code: `def set_cache_limit(gb: float) -> None:
    """Cap MLX's reuse pool of freed buffers (gb<=0 leaves it unlimited)."""
    if gb <= 0: return
    import mlx.core as mx
    mx.set_cache_limit(int(gb * 1024**3))

def clear_cache() -> None:
    """Release MLX's GPU buffer cache between chunks to keep memory bounded."""
    import mlx.core as mx
    mx.clear_cache()`, lang: "python", file: "cli/subly/transcribe.py", lines: "34–58 (trimmed)" },
            { p: "Combined with chunking from Module 3, this is why a 2-hour video runs on a 16 GB Mac without swapping. Each chunk even prints its peak memory so you can watch it stay flat (<code>peak 2.8 GB</code>, <code>peak 2.8 GB</code>, …)." },
          ],
        },
      ],
      quiz: [
        {
          q: "What is MLX's role here?",
          options: ["It's the translation API", "Apple's framework for running models on the Mac's GPU — lets Whisper run locally", "A subtitle file format", "A silence detector"],
          answer: 1,
          explain: "MLX runs the Whisper model natively on Apple Silicon, which is why transcription is local, offline and free.",
        },
        {
          q: "Why pass `task=\"transcribe\"` instead of letting Whisper translate to English itself?",
          options: ["Translation is illegal", "Whisper's built-in translation is weaker; we want clean Japanese and translate it well in Stage ③", "It's faster", "OpenAI requires Japanese input"],
          answer: 1,
          explain: "Keeping a clean Japanese transcript and translating it with a dedicated model in Stage ③ gives a much better final result than Whisper's mediocre built-in translation.",
        },
        {
          q: "Why does the code rebuild subtitles from `word_timestamps` instead of using Whisper's segments?",
          options: ["To save memory", "Word-level timing gives tight sync — cues start/end on real words, with splits on long pauses", "Because segments are in the wrong language", "To reduce cost"],
          answer: 1,
          explain: "Sentence-level timestamps are coarse and drift. Rebuilding from per-word timings makes each cue start on the first word and end on the last, with internal-pause splits.",
        },
        {
          q: "What is the `_patch_progress` context manager doing?",
          options: ["Downloading the model", "Monkey-patching mlx_whisper's internal tqdm so progress updates flow to a callback", "Splitting the audio", "Caching the result"],
          answer: 1,
          explain: "mlx_whisper has no progress callback, so the code swaps the tqdm class it uses for a shim that forwards each update — then restores the original in a finally block.",
        },
        {
          q: "Why is the patch wrapped in try/finally?",
          options: ["For speed", "To always restore the original tqdm, even if transcription raises an error", "To retry on failure", "It's required by mlx"],
          answer: 1,
          explain: "Monkey-patching must be undone reliably. try/finally guarantees the real tqdm is put back regardless of success or exception, so nothing leaks into later calls.",
        },
      ],
    },

    /* =====================================================================
     * MODULE 5 — CLEANING HALLUCINATIONS
     * ===================================================================*/
    {
      id: "clean",
      num: 5,
      title: "Taming Hallucinations",
      tag: "Data cleaning",
      color: "coral",
      est: "13 min",
      blurb: "On silence and noise, Whisper invents text — repeated names, climbing numbers, endless vowels. Here's how clean.py fights back.",
      lessons: [
        {
          id: "problem-c",
          title: "Problem C: Whisper hallucinates",
          blocks: [
            { lead: "When Whisper hears non-speech — breathing, music, moaning, or just silence — it doesn't output nothing. It tends to <b>invent</b> text." },
            { list: [
              "It repeats a name 50 times (<code>Charlotte. Charlotte. Charlotte…</code>).",
              "It counts upward (<code>one, two, three…</code>).",
              "It produces an endless vowel (<code>あああああああ…</code>).",
            ]},
            { p: "Why? By default, each new piece of audio is decoded using the previous text as a hint (<code>condition_on_previous_text</code>). Once it starts repeating, it reinforces its own loop — a self-feeding hallucination." },
            { note: "We attack this in <b>two places</b>: at the source (prevent the loop) and after the fact (clean what slips through). Defense in depth.", kind: "key" },
          ],
        },
        {
          id: "at-source",
          title: "Fix 1 — break the loop at the source",
          blocks: [
            { p: "Remember this flag from Module 4? Setting <code>condition_on_previous_text=False</code> tells Whisper to decode each window <i>fresh</i>, without feeding it its own previous output. That breaks the feedback loop, so the runaway repetition mostly never starts." },
            { code: `result = mlx_whisper.transcribe(
    ...,
    condition_on_previous_text=False,  # break hallucination feedback loops
)`, lang: "python", file: "cli/subly/transcribe.py" },
            { p: "There's a small cost — losing cross-window context can slightly hurt coherence — but for this use case (lots of pauses, music, ambient noise) the trade is clearly worth it. The model stops eating its own tail." },
          ],
        },
        {
          id: "three-passes",
          title: "Fix 2 — three deterministic cleanup passes",
          blocks: [
            { p: "After transcribing but <b>before translating</b> (so we never pay to translate junk), <code>clean_segments</code> runs three safe, mechanical passes over the Japanese cues:" },
            { code: `def clean_segments(segments, min_duration=0.15, drop_nonspeech=True):
    # 1. drop micro-cues (hallucination artifacts; real speech isn't this short)
    out = [s for s in segments if (s.end - s.start) >= min_duration]

    # 2. collapse identical adjacent cues (58x "Charlotte" -> 1, moan runs -> 1)
    collapsed = []
    for s in out:
        if collapsed and collapsed[-1].text.strip() == s.text.strip():
            collapsed[-1].end = max(collapsed[-1].end, s.end)   # just extend it
        else:
            collapsed.append(Segment(0, s.start, s.end, s.text))

    # 3. optionally drop non-lexical moans
    if drop_nonspeech:
        collapsed = [s for s in collapsed if not _is_nonspeech_sound(s.text)]

    for i, s in enumerate(collapsed, start=1):
        s.index = i
    return collapsed`, lang: "python", file: "cli/subly/clean.py", lines: "49–71" },
            { steps: [
              { t: "Drop micro-cues", d: "Anything under 150 ms. Real spoken words aren't that short, so these are artifacts." },
              { t: "Collapse identical neighbours", d: "58 back-to-back \"Charlotte\" cues become one cue spanning the whole range — instead of 58 subtitles." },
              { t: "Drop pure non-speech moans", d: "Optional (off via --keep-non-speech). And carefully scoped — see next lesson." },
            ]},
            { note: "Why run this <i>before</i> translation? Because translation is the part that costs money and tokens. Cleaning first means we never send 58 copies of \"Charlotte\" to OpenAI. Order matters.", kind: "tip", title: "Order of operations" },
          ],
        },
        {
          id: "vowel-norm",
          title: "The careful part: never eat real words",
          blocks: [
            { p: "Pass 3 drops \"moans\" — but it has to be <b>surgical</b>. Japanese has plenty of short, real interjections it must <i>never</i> delete: はい (yes), うん (yeah), いや (no), ええ, いい (good). So the detector only fires on <b>elongated single-vowel sounds</b> of length 3+." },
            { code: `# Normalize small/katakana vowels to canonical hiragana so
# "あぁぁ", "アアア", "ああ" all compare equal.
_NORM = str.maketrans({"ぁ":"あ","ァ":"あ","ア":"あ", "ぃ":"い","ィ":"い","イ":"い", ...})
_STRIP = re.compile(r"[\\s、。,.!?！？…ー〜~・「」『』ッっ]")
_VOWELS = set("あいうえおん")

def _is_nonspeech_sound(text: str) -> bool:
    """True for elongated single-vowel moans (あああ, んんん, あ、あ、あ).
    Requires 3+ identical vowel sounds, so real short interjections —
    はい, うん, いや, ええ, いい — are never matched."""
    s = _STRIP.sub("", text).translate(_NORM)
    if len(s) < 3:
        return False                          # too short to be a sustained moan
    chars = set(s)
    return len(chars) == 1 and next(iter(chars)) in _VOWELS`, lang: "python", file: "cli/subly/clean.py", lines: "21–46 (trimmed)" },
            { list: [
              "<b>Normalize first.</b> <code>str.maketrans</code> maps small kana (ぁ), katakana (ア) and variants all to one canonical vowel (あ), so spelling variations of the same moan compare equal.",
              "<b>Strip noise.</b> Punctuation, spaces and the long-vowel mark ー are removed before judging, so <code>あ、あ、あ</code> reduces to <code>あああ</code>.",
              "<b>Require length ≥ 3 and a single distinct vowel.</b> はい has two different characters → never matches. ああ is only length 2 → never matches. あああ is one vowel, length 3 → matched.",
            ]},
            { q: "Why normalize katakana and small kana to hiragana before comparing?", a: "Because the same moan can be written many ways (あぁぁ, アアア, ああ). Collapsing them to a single canonical form means one simple rule catches every spelling instead of needing dozens of special cases." },
            { note: "This is what careful data-cleaning looks like: aggressive enough to kill the junk, conservative enough to never touch real dialogue, and <b>deterministic</b> — same input, same output, no model guessing. You can read it and know exactly what it will and won't delete.", kind: "key", title: "The craft" },
          ],
        },
      ],
      quiz: [
        {
          q: "Why does Whisper hallucinate repeated text on silence/noise?",
          options: ["A bug in MLX", "By default it conditions on its own previous output, so a repeat reinforces itself into a loop", "The audio is corrupted", "OpenAI injects it"],
          answer: 1,
          explain: "`condition_on_previous_text` feeds prior output back in as context. On non-speech, that creates a self-reinforcing repetition loop.",
        },
        {
          q: "What is the first line of defense against hallucinations?",
          options: ["Deleting the audio", "Setting condition_on_previous_text=False to break the feedback loop", "Using a bigger model", "Translating twice"],
          answer: 1,
          explain: "Decoding each window fresh, without conditioning on prior text, stops most runaway loops from ever starting.",
        },
        {
          q: "Why does clean_segments run BEFORE translation?",
          options: ["It must run last", "So we never spend money/tokens translating hallucinated junk", "Translation deletes the cues", "It doesn't matter"],
          answer: 1,
          explain: "Cleaning first means garbage like 58× \"Charlotte\" is collapsed/dropped before any of it is sent to the paid translation step.",
        },
        {
          q: "The moan detector requires 3+ identical vowels. Why that rule specifically?",
          options: ["To match emojis", "So real short interjections like はい, うん, いや are never deleted", "Because Whisper outputs triples", "To save memory"],
          answer: 1,
          explain: "Requiring length ≥ 3 and a single distinct vowel surgically targets sustained moans (あああ) while preserving genuine two-character or mixed words.",
        },
        {
          q: "Why normalize katakana/small kana to canonical hiragana before checking?",
          options: ["To translate them", "So all spellings of the same moan (あぁぁ, アアア, ああ) collapse to one form and a single rule catches them", "To sort alphabetically", "It's required by SRT"],
          answer: 1,
          explain: "Normalization turns many spelling variants into one canonical vowel, so one comparison handles every variation instead of dozens of special cases.",
        },
      ],
    },

    /* =====================================================================
     * MODULE 6 — TRANSLATION
     * ===================================================================*/
    {
      id: "translate",
      num: 6,
      title: "Stage ③: Translating",
      tag: "LLM / OpenAI",
      color: "iris",
      est: "17 min",
      blurb: "Turn Japanese into English without disturbing a single timestamp. The id trick, rolling context, and code that refuses to crash.",
      lessons: [
        {
          id: "the-constraint",
          title: "The one rule: never move a timestamp",
          blocks: [
            { lead: "We now have Japanese text with <b>perfect timing</b> from Stage ②. The only job left is turning the words into English — and crucially, <b>without disturbing a single timestamp.</b>" },
            { p: "If you naively asked a model to \"translate these subtitles,\" it might merge lines, split lines, reorder them, or drop one — and now your timing is wrecked. The fix is a beautiful constraint: <b>the model never sees a timestamp at all.</b>" },
            { note: "We hand the model the lines as <b>structured data — a numbered list</b> — and require it to return the <b>same numbers</b> with English attached. Because every line keeps its id, we paste each translation back onto its original timestamped slot. The model literally <i>cannot</i> move a timestamp, because it never touches one.", kind: "key", title: "The id trick" },
          ],
        },
        {
          id: "the-prompt",
          title: "The system prompt & the JSON contract",
          blocks: [
            { p: "The instructions to the model are explicit, and the output format is locked to JSON keyed by id:" },
            { code: `SYSTEM_PROMPT = """\\
You are a professional Japanese-to-English subtitle translator.
Translate each Japanese subtitle line into natural, fluent, concise English
suitable for on-screen subtitles. Rules:
- Preserve meaning and tone; do not add or omit information.
- Keep it idiomatic English, not word-for-word.
- One translation per input line; never merge or split lines.
- Keep proper nouns/names consistent across lines.
- If a line is a non-verbal sound (moaning, laughing) repeated many times,
  render it BRIEFLY. Never repeat a sound more than a few times.
- Return ONLY valid JSON of the form: {"lines": [{"id": <int>, "en": "<text>"}]}.
- Include every id you were given, exactly once."""`, lang: "python", file: "cli/subly/translate.py", lines: "22–34" },
            { p: "And the API call pins the behavior down hard:" },
            { code: `resp = client.chat.completions.create(
    model=model,
    temperature=0.2,                              # low = consistent, not creative
    max_tokens=MAX_TOKENS,                        # 4096 — bounds runaway cost
    response_format={"type": "json_object"},      # force valid JSON output
    messages=[
        {"role": "system", "content": system},
        {"role": "user",   "content": user},
    ],
)`, lang: "python", file: "cli/subly/translate.py", lines: "64–73" },
            { list: [
              "<b>temperature=0.2</b> — we want faithful, consistent translation, not creative variety.",
              "<b>response_format json_object</b> — the API guarantees syntactically valid JSON, so parsing won't fail on stray prose.",
              "<b>max_tokens=4096</b> — a ceiling so a misbehaving response can't run up an unbounded bill.",
            ]},
          ],
        },
        {
          id: "continuity",
          title: "Consistency across a long video",
          blocks: [
            { p: "Names, tone and terminology should stay identical from minute 1 to minute 120. A character shouldn't be \"Haru\" early and \"Haruka\" later. So as we translate, we feed the model a <b>rolling tail of recently translated English lines</b> as context — plus your <code>--notes</code> hint." },
            { code: `context_parts = []
if notes:
    context_parts.append(f"About this video (use for terminology/names):\\n{notes}")
if context_tail:
    joined = "\\n".join(context_tail[-6:])          # last 6 English lines
    context_parts.append(f"Preceding English lines (for continuity):\\n{joined}")`, lang: "python", file: "cli/subly/translate.py", lines: "93–98" },
            { p: "And because long videos are translated chunk by chunk, the <i>end</i> of one chunk seeds the <i>start</i> of the next. In <code>cli.py</code>:" },
            { code: `en_local = translate_mod.translate_segments(
    ja_local, model=openai_model, notes=notes,
    prior_context=prior_ctx,          # tail of the PREVIOUS chunk's English
    progress=progress,
)
prior_ctx = [s.text for s in en_local][-6:]   # seed the NEXT chunk`, lang: "python", file: "cli/subly/cli.py", lines: "421–429 (trimmed)" },
            { note: "This is why a name doesn't randomly change spelling halfway through a two-hour video, even though it was translated in twelve independent chunks. The continuity tail stitches them together.", kind: "tip" },
          ],
        },
        {
          id: "robustness",
          title: "Code that refuses to crash",
          blocks: [
            { p: "LLMs are flaky: they occasionally return malformed JSON, drop a line, or ramble until they hit the token limit. A pipeline that dies on the first hiccup is useless for a 2-hour video. So translation is built to <b>degrade gracefully, never crash.</b>" },
            { code: `def _safe_translate(client, model, batch, notes, context_tail):
    """Translate a batch without ever raising: on failure, split in half and
    recurse; a single segment that still fails keeps its (collapsed) original."""
    try:
        return _translate_batch(client, model, batch, notes, context_tail)
    except TranslationError:
        if len(batch) > 1:
            mid = len(batch) // 2
            out = _safe_translate(client, model, batch[:mid], notes, context_tail)
            out.update(_safe_translate(client, model, batch[mid:], notes, context_tail))
            return out
        seg = batch[0]
        return {seg.index: _collapse_repeats(seg.text)}   # last resort: keep original`, lang: "python", file: "cli/subly/translate.py", lines: "118–136" },
            { steps: [
              { t: "Batch of 40 fails", d: "Maybe the model hit its output limit mid-JSON. Don't give up." },
              { t: "Split in half, retry each", d: "20 + 20. Recurse. Smaller batches are more likely to succeed." },
              { t: "Down to a single line", d: "Keep halving until batches of 1." },
              { t: "Worst case: keep the original", d: "If one stubborn line still fails, it keeps its (repeat-collapsed) Japanese rather than blowing up the entire run." },
            ]},
            { p: "There's a second safety net too: after each batch, any ids the model simply <i>dropped</i> are re-translated one at a time, and if all else fails a line falls back to its original text:" },
            { code: `# Repair any ids the model dropped by translating them one-by-one.
missing = [seg for seg in batch if seg.index not in out]
for seg in missing:
    one = _safe_translate(client, model, [seg], notes, context_tail)
    out.update(one)

for seg in batch:
    en = out.get(seg.index, seg.text)   # last-resort: keep original
    translated.append(with_text(seg, en))`, lang: "python", file: "cli/subly/translate.py", lines: "166–174" },
            { note: "Also note <code>_call</code> retries transient network/rate-limit errors with <b>exponential backoff</b> (<code>sleep(min(2**attempt, 30))</code>), and <code>_collapse_repeats</code> squashes runaway \"ああああ…\" before sending so the model can't burn tokens echoing it. Layers upon layers of \"don't let one bad input ruin the run.\"", kind: "key", title: "Defense in depth, again" },
            { q: "What's the absolute worst-case outcome for a single line that the model keeps failing on?", a: "It keeps its original (repeat-collapsed) Japanese text in that timestamped slot. You lose one translation, not the whole video — and the timing is still perfect because the slot never moved." },
          ],
        },
      ],
      quiz: [
        {
          q: "How does the design guarantee timestamps are never altered by translation?",
          options: ["It re-runs Whisper afterward", "The model only sees a numbered list and returns the same ids; timestamps stay in the code, never sent to the model", "OpenAI preserves them", "Timestamps are added after translation"],
          answer: 1,
          explain: "Lines go to the model as {id, ja} and come back as {id, en}. The code pastes English onto the original timestamped segment by id. The model never touches a timestamp.",
        },
        {
          q: "What is `response_format={\"type\": \"json_object\"}` for?",
          options: ["To translate to JSON", "To force the API to return syntactically valid JSON so parsing won't fail", "To compress the response", "To set the language"],
          answer: 1,
          explain: "It constrains the model's output to valid JSON, so the code can reliably json.loads() the reply instead of scraping prose.",
        },
        {
          q: "Why feed the model a rolling tail of recent English lines?",
          options: ["To save tokens", "For continuity — consistent names, tone and terminology across a long video", "To translate faster", "It's required by the API"],
          answer: 1,
          explain: "The continuity tail (and --notes) keeps a character's name and the tone stable from start to finish, even across independently-translated chunks.",
        },
        {
          q: "When a batch of 40 fails to translate, what does _safe_translate do?",
          options: ["Aborts the whole run", "Splits the batch in half and retries recursively, down to single lines", "Skips all 40 lines", "Switches models"],
          answer: 1,
          explain: "It halves and recurses. Smaller batches usually succeed; a single line that still fails keeps its original text. The run never crashes on one bad batch.",
        },
        {
          q: "What does the code do for an id the model dropped from its reply?",
          options: ["Ignores that subtitle entirely", "Re-translates that single line on its own; if even that fails, keeps the original", "Crashes", "Reuses the previous line's text"],
          answer: 1,
          explain: "Missing ids are repaired by translating them one-by-one, with a final fallback of keeping the original Japanese so no slot is ever left empty.",
        },
      ],
    },

    /* =====================================================================
     * MODULE 7 — THE EVENT CONTRACT
     * ===================================================================*/
    {
      id: "events",
      num: 7,
      title: "The Event Contract",
      tag: "Architecture",
      color: "gold",
      est: "15 min",
      blurb: "The single seam between Python and TypeScript. Why it exists, how it lets you build a GUI with no backend, and the simulator that fakes it.",
      lessons: [
        {
          id: "why-contract",
          title: "Why a contract at all?",
          blocks: [
            { lead: "The CLI normally prints friendly, colourful progress for humans. But a GUI — or any other program — needs something <b>stable and machine-readable</b>. So with <code>--json</code>, every meaningful step emits one JSON object per line on stdout." },
            { code: `# from the module docstring — this is the design, stated plainly:
# - One JSON object per line on stdout, flushed immediately (live, not buffered).
# - Every event has \`type\` (str) and \`t\` (unix seconds, float).
# - Unknown/extra fields are allowed; consumers ignore what they don't understand.
# - New event types may be added over time — treat them as optional.`, lang: "python", file: "cli/subly/events.py", lines: "15–21" },
            { p: "<code>events.py</code> is the <b>single source of truth</b> for this contract. The same event names and fields are produced by the real pipeline <i>and</i> by the simulator (next lesson), so a UI built against one works against the other." },
            { note: "These four rules are a tiny API design lesson. \"Every event has type and t,\" \"ignore unknown fields,\" \"new types are optional\" — that's <b>forward compatibility</b>. You can add events later without breaking old readers. Real APIs live or die on this.", kind: "key", title: "Why these rules matter" },
          ],
        },
        {
          id: "emitter",
          title: "The emitter: an elegant no-op",
          blocks: [
            { p: "Here's a lovely piece of design. The pipeline code is sprinkled with <code>emitter.emit(...)</code> calls everywhere. But in normal (human) mode we don't want any JSON. The trick: when disabled, <code>emit()</code> does <b>nothing.</b>" },
            { code: `class EventEmitter:
    def __init__(self, enabled=False, stream=None):
        self.enabled = enabled
        self._stream = stream or sys.stdout

    def emit(self, type: str, **fields) -> None:
        if not self.enabled:
            return                                   # no-op in human mode
        event = {"type": type, "t": round(time.time(), 3), **fields}
        line = json.dumps(event, ensure_ascii=False)
        self._stream.write(line + "\\n")
        self._stream.flush()                         # so readers see it live

# Module-level singleton the CLI configures once and the pipeline imports.
emitter = EventEmitter(enabled=False)`, lang: "python", file: "cli/subly/events.py", lines: "47–69 (trimmed)" },
            { steps: [
              { t: "One singleton, imported everywhere", d: "The pipeline just calls emitter.emit(...). It never checks a mode." },
              { t: "--json flips one switch", d: "The CLI calls configure(enabled=True) once; suddenly every emit() produces output." },
              { t: "flush() after each line", d: "Forces the line out immediately so a reader (the app) sees events live, not in a buffered burst at the end." },
            ]},
            { note: "Because <code>emit()</code> is a no-op when disabled, the exact same pipeline code paths run in both modes. No <code>if json_mode:</code> littered through the logic. The instrumentation is invisible until you ask for it.", kind: "tip" },
          ],
        },
        {
          id: "event-zoo",
          title: "The events, start to finish",
          blocks: [
            { p: "A run emits this sequence. Reading it top to bottom is reading the whole pipeline as a story:" },
            { diagram: `<table class="evt-table">
              <tr><td><code>run_start</code></td><td>video, output, models, notes — the run begins</td></tr>
              <tr><td><code>audio_ready</code></td><td>duration (seconds) — ffmpeg done</td></tr>
              <tr><td><code>plan</code></td><td>total chunks + their [start,end] ranges</td></tr>
              <tr><td><code>estimate</code></td><td>est_usd, est_seconds — rough cost/time</td></tr>
              <tr class="evt-loop"><td colspan="2">↻ per chunk:</td></tr>
              <tr><td><code>chunk_start</code></td><td>index, total, overall_pct, eta_seconds</td></tr>
              <tr><td><code>stage_start</code></td><td>stage = "transcribe"</td></tr>
              <tr><td><code>transcribe_progress</code></td><td>done/total audio frames (drives the bar)</td></tr>
              <tr><td><code>transcribe_done</code></td><td>lines, seconds, peak_gb</td></tr>
              <tr><td><code>stage_start</code></td><td>stage = "translate"</td></tr>
              <tr><td><code>translate_progress</code></td><td>done/total lines</td></tr>
              <tr><td><code>translate_done</code></td><td>lines, seconds</td></tr>
              <tr><td><code>chunk_done</code></td><td>overall_pct, eta_seconds</td></tr>
              <tr class="evt-loop"><td colspan="2">↻ end per chunk</td></tr>
              <tr><td><code>run_done</code></td><td>output, ja_lines, en_lines, seconds</td></tr>
              <tr><td><code>error</code></td><td>stage, message, fatal — can appear any time</td></tr>
            </table>` },
            { p: "There's also a <code>cached</code> event: when a chunk was already finished on a previous run, it's emitted instead of the transcribe/translate pair — that's how the UI shows \"skipped, reused\" instead of re-running work." },
          ],
        },
        {
          id: "ts-mirror",
          title: "The TypeScript mirror",
          blocks: [
            { p: "The desktop app is TypeScript, so it needs typed versions of these events. <code>desktop/src/eventsource/types.ts</code> is a hand-written mirror of the Python contract — the comment at the top says it out loud:" },
            { code: `// TypeScript mirror of the Python \`events.py\` contract. Keep in sync with the
// CLI: these are the JSON-lines events emitted by \`subly run --json\`.

export interface TranscribeProgressEvent extends BaseEvent {
  type: "transcribe_progress";
  index: number;
  done: number;   // audio frames seeked so far
  total: number;  // total audio frames in the chunk
}

// Strict discriminated union of all known events — enables \`switch (e.type)\`
// narrowing in the reducer.
export type SublyEvent =
  | RunStartEvent | AudioReadyEvent | PlanEvent | EstimateEvent
  | ChunkStartEvent | StageStartEvent | TranscribeProgressEvent
  | TranscribeDoneEvent | TranslateProgressEvent | TranslateDoneEvent
  | CachedEvent | ChunkDoneEvent | RunDoneEvent | ErrorEvent;`, lang: "typescript", file: "desktop/src/eventsource/types.ts", lines: "1–130 (trimmed)" },
            { note: "A <b>discriminated union</b> + the shared <code>type</code> field means TypeScript can narrow the event inside a <code>switch (e.type)</code> — so when you handle <code>case \"transcribe_progress\"</code>, the compiler knows <code>e.done</code> and <code>e.total</code> exist. The contract isn't just documentation; it's type-checked.", kind: "key", title: "Why a discriminated union" },
            { q: "Both events.py and types.ts describe the same events by hand. What's the risk, and how does the project manage it?", a: "They can drift out of sync if one is edited without the other. The project manages it with a clear convention (both files say 'keep in sync'), the simulator + tests that exercise real event shapes, and the narrow, rarely-changing contract surface." },
          ],
        },
        {
          id: "simulator",
          title: "The simulator: a GUI with no backend",
          blocks: [
            { p: "This is the payoff. Because the contract is the only seam, you can <b>fake</b> it. <code>simulate.py</code> emits the exact same event shapes the real pipeline does — in a few seconds, deterministically, with <b>no model and no API calls.</b>" },
            { code: `def simulate_run(em, *, duration=1500.0, chunk_minutes=10.0, speed=1.0, ...):
    em.emit("run_start", video=video, output=output, ...)
    em.emit("audio_ready", duration=duration)
    n = math.ceil(duration / (chunk_minutes*60))     # plan like the real planner
    em.emit("plan", total=n, chunks=chunks)
    em.emit("estimate", est_usd=round(duration/3600*0.19, 4), ...)
    for c in chunks:
        em.emit("chunk_start", index=i, total=n, ...)
        em.emit("stage_start", index=i, stage="transcribe")
        for done in range(0, frames + 1, ...):       # fake incremental progress
            em.emit("transcribe_progress", index=i, done=done, total=frames)
        em.emit("transcribe_done", index=i, lines=lines, seconds=2.4, peak_gb=2.8)
        ... # translate stage, same shape
        em.emit("chunk_done", index=i, ...)
    em.emit("run_done", output=output, en_lines=total_lines, ...)`, lang: "python", file: "cli/subly/simulate.py", lines: "15–113 (trimmed)" },
            { p: "Run <code>subly run anything.mp4 --json --simulate</code> and you get a complete, realistic run in seconds. The desktop app uses this to develop the UI, and the tests use it to prove the bridge parses real CLI output — all without a 3 GB model or a paid API." },
            { note: "This is the architectural reward for keeping a narrow contract. One seam → you can stub the seam → the entire frontend becomes buildable and testable in isolation. When people say \"design for testability,\" <i>this</i> is what it buys you.", kind: "key", title: "The whole point" },
          ],
        },
      ],
      quiz: [
        {
          q: "What does emitter.emit() do when the emitter is disabled (normal human mode)?",
          options: ["Prints to stderr", "Nothing — it returns immediately, a no-op", "Buffers events for later", "Raises an error"],
          answer: 1,
          explain: "When disabled, emit() returns immediately. That's why the same pipeline code runs in both modes — no `if json_mode` branches needed.",
        },
        {
          q: "Why does emit() call self._stream.flush() after every line?",
          options: ["To save the file", "So a reader sees each event live instead of in a buffered burst at the end", "To translate it", "It's required by JSON"],
          answer: 1,
          explain: "Flushing forces the line out immediately, so the consuming app gets real-time progress rather than everything at once when the buffer fills.",
        },
        {
          q: "What's the role of types.ts relative to events.py?",
          options: ["It generates events.py", "It's a hand-written TypeScript mirror of the same contract, kept in sync", "It replaces events.py", "It's auto-generated at build time"],
          answer: 1,
          explain: "types.ts mirrors the Python contract by hand as typed interfaces and a discriminated union, so the TS side is type-checked against the same events.",
        },
        {
          q: "What makes a discriminated union useful for handling events?",
          options: ["It compresses the data", "The shared `type` field lets TypeScript narrow to the exact event in a switch, so its fields are known", "It encrypts events", "It sorts them"],
          answer: 1,
          explain: "In `switch (e.type)`, each case narrows `e` to that specific event interface, so the compiler knows exactly which fields are present.",
        },
        {
          q: "What is the big architectural payoff of having one narrow event seam?",
          options: ["Faster transcription", "You can fake the seam (simulate.py) and build/test the entire GUI with no model and no API", "Cheaper translation", "Smaller model files"],
          answer: 1,
          explain: "Because the contract is the only seam, the simulator can emit identical events, making the whole frontend buildable and testable in isolation.",
        },
      ],
    },

    /* =====================================================================
     * MODULE 8 — THE DESKTOP APP
     * ===================================================================*/
    {
      id: "desktop",
      num: 8,
      title: "The Desktop App",
      tag: "Electron + React",
      color: "iris",
      est: "18 min",
      blurb: "How the GUI consumes the event stream: spawning the CLI, the swappable source, the reducer that turns events into state, and the live timeline.",
      lessons: [
        {
          id: "shape",
          title: "The shape of the app",
          blocks: [
            { lead: "The desktop app has one job: <b>spawn the CLI, read its event stream, and draw it.</b> It's built on the contract from Module 7. Here's the whole architecture in one picture:" },
            { diagram: `<div class="ascii">
┌────────────────────────────┐   spawn    ┌──────────────────────────┐
│ Electron + React (renderer) │ ─────────▶ │ subly run --json │
│  reducer → timeline / views │ ◀───────── │  1 JSON event per line    │
└────────────────────────────┘   stdout   └──────────────────────────┘
        │  EventSource seam (one interface)
        ├── ElectronEventSource → the real CLI via IPC      (production)
        └── MockEventSource     → replays a captured fixture (browser + tests)
</div>` },
            { p: "Two processes, two languages, one stream of JSON between them. The React side <i>never</i> knows whether it's talking to the real CLI or a fake — that's the power of the <code>EventSource</code> interface." },
          ],
        },
        {
          id: "spawn",
          title: "The bridge: spawning & line-buffering",
          blocks: [
            { p: "Electron's <b>main process</b> is the only place that knows how to launch the pipeline. It spawns the CLI and reads stdout. But stdout arrives in arbitrary chunks — a single read might contain half an event, or three and a half. So it <b>line-buffers</b>: accumulate text, split on newlines, parse each complete line." },
            { code: `const child = spawn("uv", buildArgs(options), { cwd: CLI_DIR, env });

let buffer = "";
const onData = (data) => {
  buffer += data.toString();
  let nl;
  while ((nl = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, nl).trim();   // one complete line
    buffer = buffer.slice(nl + 1);             // keep the remainder
    if (!line) continue;
    try {
      const evt = JSON.parse(line);
      if (!sender.isDestroyed()) sender.send(channel, evt);   // → renderer over IPC
    } catch {
      // Non-JSON line: surface as a log event rather than crashing the stream.
    }
  }
};
child.stdout.on("data", onData);`, lang: "javascript", file: "desktop/electron/main.js", lines: "53–86 (trimmed)" },
            { note: "Line-buffering is a classic, must-know pattern for reading any line-delimited stream (logs, network protocols, subprocess output). You can <b>never</b> assume one \"data\" event equals one line. Accumulate, split on the delimiter, keep the leftover for next time.", kind: "key", title: "Pattern: line-buffering" },
            { p: "Notice the <code>spawn(\"uv\", buildArgs(options), { cwd: CLI_DIR })</code>. That's the seam to the engine: today it runs <code>uv run subly …</code> from the repo. To ship to non-developers, you'd swap this one line for a bundled runtime — and the entire renderer stays untouched." },
          ],
        },
        {
          id: "buildargs",
          title: "buildArgs: settings → CLI flags",
          blocks: [
            { p: "The UI collects options (model, notes, chunk minutes, checkboxes). <code>buildArgs</code> is a tiny <b>pure function</b> that turns those into the CLI's argument list. It's kept in its own file with no Electron import — specifically so it can be unit-tested in isolation." },
            { code: `export function buildArgs(options) {
  const args = ["run", "subly", "run", options.video, "--json"];
  if (options.output)       args.push("--output", options.output);
  if (options.whisperModel) args.push("--whisper-model", options.whisperModel);
  if (options.openaiModel)  args.push("--openai-model", options.openaiModel);
  if (options.notes)        args.push("--notes", options.notes);
  if (options.chunkMinutes != null)
                            args.push("--chunk-minutes", String(options.chunkMinutes));
  if (options.keepJapanese) args.push("--keep-japanese");
  if (options.keepNonSpeech)args.push("--keep-non-speech");
  if (options.force)        args.push("--force");
  if (options.simulate)     args.push("--simulate");
  return args;
}`, lang: "javascript", file: "desktop/electron/buildArgs.js" },
            { note: "<b>Pure function</b> = same input → same output, no side effects (no spawning, no files, no globals). Pure functions are the easiest code in any codebase to test: you just assert outputs. Pulling the settings→flags mapping out into one is a deliberate testability move.", kind: "tip", title: "Why \"pure\"" },
          ],
        },
        {
          id: "eventsource",
          title: "The swappable EventSource",
          blocks: [
            { p: "The React UI talks to <i>an interface</i>, not a concrete thing. <code>EventSource</code> has one method: <code>run(options, onEvent, onExit)</code>. Two implementations satisfy it — and the UI can't tell them apart." },
            { code: `// The one seam between UI and pipeline. Electron and the browser mock both
// implement this, so the React UI never knows which it's talking to.
export interface EventSource {
  run(
    options: RunOptions,
    onEvent: (event: SublyEvent) => void,
    onExit: (code: number | null) => void,
  ): RunHandle;            // RunHandle has .cancel()
}`, lang: "typescript", file: "desktop/src/eventsource/types.ts", lines: "146–159" },
            { steps: [
              { t: "ElectronEventSource", d: "Sends options to the main process over IPC, listens for JSON events coming back. Used in the real app." },
              { t: "MockEventSource", d: "Replays a captured fixture of real --simulate output. Used in the browser (?mock) and in tests — no Electron, no backend." },
            ]},
            { note: "This is the classic <b>dependency-inversion</b> / strategy pattern: depend on an abstraction, choose the concrete one at the edge. Because the whole UI reads from this interface, you develop it in a normal browser tab with fake data and it behaves exactly like production.", kind: "key" },
          ],
        },
        {
          id: "reducer",
          title: "The reducer: events → state",
          blocks: [
            { p: "Raw events are awkward to render directly. So <code>useJob.ts</code> runs them through a <b>reducer</b> — a pure function <code>(state, event) → newState</code> — that folds the stream into one tidy <code>JobState</code> object. Every view reads from <code>JobState</code>, <b>never</b> from raw events." },
            { code: `export function reducer(state: JobState, action: Action): JobState {
  const e = action.event;
  const s = { ...state, events: [...state.events, e] };
  switch (e.type) {
    case "run_start":
      return { ...s, status: "running", video: e.video, output: e.output, ... };
    case "plan":
      return { ...s, total: e.total,
               chunks: e.chunks.map((c) => ({ ...c, stage: "pending", cached: false })) };
    case "stage_start":
      return { ...s, chunks: patchChunk(s.chunks, e.index, {
                 stage: e.stage === "transcribe" ? "transcribing" : "translating" }) };
    case "transcribe_progress":
      return { ...s, chunks: patchChunk(s.chunks, e.index,
                 { transcribeDone: e.done, transcribeTotal: e.total }) };
    case "run_done":
      return { ...s, status: "done", enLines: e.en_lines, overallPct: 100, ... };
    case "error":
      return e.fatal ? { ...s, status: "error", error: e.message } : s;
    default:
      return s;   // unknown/future events: ignore (forward-compatible!)
  }
}`, lang: "typescript", file: "desktop/src/useJob.ts", lines: "71–204 (trimmed)" },
            { list: [
              "<b>Pure & immutable.</b> Each case returns a <i>new</i> state object (<code>{ ...s, ... }</code>) instead of mutating — exactly what React wants to detect changes.",
              "<b>The default case ignores unknowns.</b> That's the forward-compatibility rule from Module 7, honoured in code: a future event type just falls through harmlessly.",
              "<b>One source of truth.</b> Timeline, progress bar and the done-screen all read <code>JobState</code>. They can't disagree, because there's only one state.",
            ]},
            { q: "Why fold events into a JobState instead of letting components read events directly?", a: "Components would each re-derive the same logic and could disagree. A single reducer computes the state once; every view renders the same truth. It's also trivially unit-testable: feed events, assert the resulting state." },
          ],
        },
        {
          id: "smooth-bar",
          title: "An honest progress bar",
          blocks: [
            { p: "The CLI's <code>overall_pct</code> only updates at chunk boundaries — so for a single chunk it would jump 0 → 100 with nothing in between. The reducer computes a <b>smoother</b> overall percentage from each chunk's <i>sub-progress</i>, weighting transcription heavily because it dominates wall-clock time." },
            { code: `// Transcription dominates wall-clock time, so it carries most of the weight —
// this keeps the overall bar honest rather than jumping 0→100 at chunk edges.
const TRANSCRIBE_WEIGHT = 0.85;
const TRANSLATE_WEIGHT  = 0.15;

function chunkFraction(c: ChunkState): number {
  if (c.stage === "done" || c.enLines != null) return 1;
  let f = 0;
  if (c.cached || c.jaLines != null || c.stage === "translating") {
    f += TRANSCRIBE_WEIGHT;                         // transcribe finished
  } else if (c.transcribeTotal) {
    f += TRANSCRIBE_WEIGHT * (c.transcribeDone / c.transcribeTotal);  // mid-transcribe
  }
  if (c.translateTotal) {
    f += TRANSLATE_WEIGHT * (c.translateDone / c.translateTotal);
  }
  return f;
}`, lang: "typescript", file: "desktop/src/useJob.ts", lines: "212–239 (trimmed)" },
            { note: "This is a small but telling detail: the team cared enough about the <i>feel</i> of the progress bar to weight the two stages by their real duration, so the bar moves at a believable pace instead of lying. Polish like this is what separates a demo from a product.", kind: "tip", title: "Polish" },
          ],
        },
        {
          id: "keychain",
          title: "Bonus: the API key in the Keychain",
          blocks: [
            { p: "Translation needs an OpenAI key. The app stores it in the <b>macOS Keychain</b> — not a plain text file — using the built-in <code>security</code> CLI. No native module to compile per Electron version, and the user can inspect or revoke the key in Keychain Access." },
            { code: `const SERVICE = "subly";
const ACCOUNT = "openai-api-key";

export async function getKey() {
  try {
    const out = await run(["find-generic-password", "-s", SERVICE, "-a", ACCOUNT, "-w"]);
    return out.replace(/\\n$/, "") || null;
  } catch (err) {
    // Exit 44 = item not found: a normal "no key yet" state, not an error.
    if (err.code === 44) return null;
    throw err;
  }
}`, lang: "javascript", file: "desktop/electron/keychain.js", lines: "21–42 (trimmed)" },
            { note: "The secret stays in the main process — it's injected into the CLI's environment at spawn time and <b>never crosses back to the renderer</b>. The onboarding screen only ever asks \"is a key present?\", never \"what is it?\". That separation is a real security habit worth copying.", kind: "key", title: "Secrets discipline" },
            { p: "And that's the whole system — from <code>video.mp4</code> to <code>video.en.srt</code>, across two languages and three external tools, held together by one stream of JSON. You now understand every seam in it." },
          ],
        },
      ],
      quiz: [
        {
          q: "Why does the main process line-buffer the CLI's stdout?",
          options: ["To compress it", "Because a single 'data' chunk may contain partial or multiple lines; events must be split on newlines", "To translate it", "To slow it down"],
          answer: 1,
          explain: "stdout arrives in arbitrary chunks. Line-buffering accumulates text, splits on \\n, and keeps the remainder — so each complete JSON line is parsed exactly once.",
        },
        {
          q: "What is the purpose of the EventSource interface?",
          options: ["To encrypt events", "To let the UI run against either the real CLI or a mock, without knowing which", "To define the SRT format", "To store the API key"],
          answer: 1,
          explain: "Both ElectronEventSource and MockEventSource implement run(). The UI depends on the abstraction, so it works identically with real or fake data.",
        },
        {
          q: "What does the reducer in useJob.ts produce?",
          options: ["SRT files", "A single JobState object that every view reads from", "CLI flags", "The model weights"],
          answer: 1,
          explain: "It folds the event stream into one JobState. Timeline, progress and done-screen all render from that single source of truth.",
        },
        {
          q: "Why does the reducer's `default` case just `return s`?",
          options: ["It's a bug", "Forward compatibility — unknown/future event types are ignored harmlessly", "To reset state", "To throw an error"],
          answer: 1,
          explain: "Ignoring unknown events is the contract's forward-compatibility rule in action: new event types can be added without breaking the existing reader.",
        },
        {
          q: "Why weight transcription at 0.85 and translation at 0.15 in the progress calc?",
          options: ["Random values", "Transcription dominates wall-clock time, so weighting it makes the bar advance at a believable pace", "To make it faster", "Required by React"],
          answer: 1,
          explain: "The weights reflect real durations, so the overall bar moves honestly within a chunk instead of jumping 0→100 at boundaries.",
        },
        {
          q: "How is the OpenAI key handled securely in the desktop app?",
          options: ["Stored in localStorage", "Kept in the macOS Keychain and injected into the CLI env in the main process; never sent to the renderer", "Hardcoded", "Emailed to the user"],
          answer: 1,
          explain: "The key lives in the Keychain, is injected into the child process environment at spawn, and never crosses back to the renderer — which only asks whether a key exists.",
        },
      ],
    },
  ],
};

if (typeof window !== "undefined") window.COURSE = COURSE;
