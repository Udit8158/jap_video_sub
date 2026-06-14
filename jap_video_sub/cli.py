"""Command-line interface for jap_video_sub.

Pipeline:  video --(ffmpeg)--> audio.wav --(mlx-whisper)--> ja.srt --(openai)--> en.srt

Intermediate files live in `<video>.jvs/` next to the input, so re-running
resumes where it left off. Use --force to redo a step.
"""

from __future__ import annotations

import os
import shutil
import time
from pathlib import Path

import typer
from dotenv import load_dotenv
from rich.console import Console

from . import audio as audio_mod
from . import srt as srt_mod
from . import transcribe as transcribe_mod
from . import translate as translate_mod

app = typer.Typer(
    add_completion=False,
    help="Turn a Japanese-audio video into time-synced English subtitles.",
)
console = Console()


def _workdir(video: Path) -> Path:
    d = video.parent / f"{video.stem}.jvs"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _step(msg: str) -> None:
    console.print(f"[bold cyan]›[/] {msg}")


def _done(msg: str) -> None:
    console.print(f"  [green]✓[/] {msg}")


def _get_audio(video: Path, work: Path, force: bool) -> Path:
    wav = work / "audio.wav"
    if wav.exists() and not force:
        _done(f"audio cached → {wav.name}")
        return wav
    _step("Extracting 16kHz mono audio (ffmpeg)…")
    with console.status("[cyan]extracting audio…", spinner="dots"):
        audio_mod.extract_audio(video, wav)
    _done(f"audio → {wav.name}")
    return wav


def _mmss(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:d}:{m:02d}:{s:02d}" if h else f"{m:d}:{s:02d}"


def _fmt_dur(seconds: float) -> str:
    seconds = int(round(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h {m:02d}m"
    if m:
        return f"{m}m {s:02d}s"
    return f"{s}s"


def _load_model(model: str) -> None:
    with console.status(f"[cyan]loading '{model}' model into memory…", spinner="dots"):
        transcribe_mod.preload(model)


def _plan_chunks(
    wav: Path, work: Path, force: bool, duration: float, chunk_seconds: float
) -> tuple[list[tuple[float, float]], Path]:
    """Return the [(start, end)] chunk plan and the chunks working dir."""
    chunks_dir = work / "chunks"
    if force and chunks_dir.exists():
        shutil.rmtree(chunks_dir)
    chunks_dir.mkdir(parents=True, exist_ok=True)

    if duration <= chunk_seconds:
        return [(0.0, duration)], chunks_dir

    _step(f"Long audio ({_mmss(duration)}) — splitting into chunks to fit memory…")
    with console.status("[cyan]analyzing audio for clean split points…", spinner="dots"):
        silences = audio_mod.detect_silences(wav)
        plan = audio_mod.plan_chunks(duration, chunk_seconds, silences)
    _done(f"split into {len(plan)} chunks (cut at pauses)")
    return plan, chunks_dir


def _chunk_rule(
    i: int, total: int, start: float, end: float, chunk_durs: list[float]
) -> None:
    """Print a section header for a chunk, including overall progress + ETA."""
    if total == 1:
        console.rule("[bold]Processing (single part)[/]", align="left", style="cyan")
        return
    done = i - 1
    info = f"overall {int(done / total * 100)}% · chunk {i}/{total}"
    if chunk_durs:
        avg = sum(chunk_durs) / len(chunk_durs)
        info += f" · ~{_fmt_dur(avg * (total - done))} left"
    title = f"[bold]Chunk {i}/{total}[/]  [dim]{_mmss(start)}–{_mmss(end)} · {info}[/]"
    console.rule(title, align="left", style="cyan")


def _get_japanese(
    wav: Path,
    work: Path,
    model: str,
    notes: str,
    force: bool,
    verbose: bool,
    chunk_seconds: float,
    keep_chunks: bool,
    cache_limit_gb: float,
    drop_nonspeech: bool,
) -> list[srt_mod.Segment]:
    """Transcription only (used by the `transcribe` command)."""
    ja_path = work / "ja.srt"
    if ja_path.exists() and not force:
        _done(f"transcript cached → {ja_path.name}")
        return srt_mod.read(ja_path)

    duration = audio_mod.probe_duration(wav)
    prompt = notes or None
    vflag = True if verbose else None  # None -> progress bar only
    plan, chunks_dir = _plan_chunks(wav, work, force, duration, chunk_seconds)
    total = len(plan)
    transcribe_mod.set_cache_limit(cache_limit_gb)

    model_loaded = False
    all_segments: list[srt_mod.Segment] = []
    for i, (start, end) in enumerate(plan, start=1):
        chunk_ja = chunks_dir / f"chunk_{i:03d}.ja.srt"
        _chunk_rule(i, total, start, end, [])
        if chunk_ja.exists() and not force:
            cached = srt_mod.read(chunk_ja)
            _done(f"transcript cached — {len(cached)} lines")
            all_segments.extend(cached)
            continue

        if not model_loaded:
            _load_model(model)
            model_loaded = True
        t0 = time.perf_counter()
        transcribe_mod.reset_peak_memory()
        chunk_wav = chunks_dir / f"chunk_{i:03d}.wav"
        audio_mod.slice_audio(wav, start, end, chunk_wav)
        local = transcribe_mod.transcribe(
            chunk_wav, model=model, initial_prompt=prompt, verbose=vflag,
            drop_nonspeech=drop_nonspeech,
        )
        # shift chunk-local timestamps to absolute position in the full video
        local = [
            srt_mod.Segment(s.index, s.start + start, s.end + start, s.text)
            for s in local
        ]
        srt_mod.write(chunk_ja, local)  # persist for resume on crash/OOM
        chunk_wav.unlink(missing_ok=True)
        peak = transcribe_mod.peak_memory_gb()
        transcribe_mod.clear_cache()
        _done(
            f"transcribed {len(local)} lines · {_fmt_dur(time.perf_counter() - t0)}"
            f" · peak {peak:.1f} GB"
        )
        all_segments.extend(local)

    for idx, seg in enumerate(all_segments, start=1):
        seg.index = idx
    srt_mod.write(ja_path, all_segments)
    if not keep_chunks:
        shutil.rmtree(chunks_dir, ignore_errors=True)
    return all_segments


def _run_pipeline(
    video: Path,
    out: Path,
    whisper_model: str,
    openai_model: str | None,
    notes: str,
    force: bool,
    keep_japanese: bool,
    chunk_seconds: float,
    keep_chunks: bool,
    verbose: bool,
    cache_limit_gb: float,
    drop_nonspeech: bool,
) -> None:
    """Full per-chunk pipeline: each chunk is transcribed then translated, with
    per-stage progress, per-chunk timing, and overall progress/ETA."""
    work = _workdir(video)
    console.print(f"[bold]jap-video-sub[/] · {video.name}")

    if out.exists() and not force:
        _done(f"already done (cached) → {out}")
        console.print("  [dim]use --force to regenerate[/]")
        return

    if not os.environ.get("OPENAI_API_KEY"):
        console.print(
            "[red]OPENAI_API_KEY not set.[/] Add it to "
            f"{Path(__file__).resolve().parents[1] / '.env'} and re-run."
        )
        raise typer.Exit(1)

    wav = _get_audio(video, work, force)
    duration = audio_mod.probe_duration(wav)
    prompt = notes or None
    vflag = True if verbose else None
    plan, chunks_dir = _plan_chunks(wav, work, force, duration, chunk_seconds)
    total = len(plan)
    transcribe_mod.set_cache_limit(cache_limit_gb)

    all_ja: list[srt_mod.Segment] = []
    all_en: list[srt_mod.Segment] = []
    prior_ctx: list[str] = []
    chunk_durs: list[float] = []
    model_loaded = False
    t_start = time.perf_counter()

    for i, (start, end) in enumerate(plan, start=1):
        chunk_ja = chunks_dir / f"chunk_{i:03d}.ja.srt"
        chunk_en = chunks_dir / f"chunk_{i:03d}.en.srt"
        _chunk_rule(i, total, start, end, chunk_durs)

        # Fully done already (transcribed + translated): reuse and skip.
        if chunk_en.exists() and not force:
            en_local = srt_mod.read(chunk_en)
            ja_local = srt_mod.read(chunk_ja) if chunk_ja.exists() else en_local
            _done(f"cached (transcription + translation) — {len(en_local)} lines")
            all_ja.extend(ja_local)
            all_en.extend(en_local)
            prior_ctx = [s.text for s in en_local][-6:]
            continue

        t_chunk = time.perf_counter()

        # ---- Stage 1: transcribe ----
        if chunk_ja.exists() and not force:
            ja_local = srt_mod.read(chunk_ja)
            _done(f"[1/2] transcript cached — {len(ja_local)} lines")
        else:
            console.print("  [bold cyan]· [1/2] Transcribing…[/]")
            if not model_loaded:
                _load_model(whisper_model)
                model_loaded = True
            t0 = time.perf_counter()
            transcribe_mod.reset_peak_memory()
            chunk_wav = chunks_dir / f"chunk_{i:03d}.wav"
            audio_mod.slice_audio(wav, start, end, chunk_wav)
            local = transcribe_mod.transcribe(
                chunk_wav, model=whisper_model, initial_prompt=prompt, verbose=vflag,
                drop_nonspeech=drop_nonspeech,
            )
            ja_local = [
                srt_mod.Segment(s.index, s.start + start, s.end + start, s.text)
                for s in local
            ]
            srt_mod.write(chunk_ja, ja_local)
            chunk_wav.unlink(missing_ok=True)
            peak = transcribe_mod.peak_memory_gb()
            transcribe_mod.clear_cache()
            _done(
                f"[1/2] transcribed {len(ja_local)} lines · "
                f"{_fmt_dur(time.perf_counter() - t0)} · peak {peak:.1f} GB"
            )

        # ---- Stage 2: translate ----
        t1 = time.perf_counter()
        console.print("  [bold cyan]· [2/2] Translating…[/]")
        with console.status("[cyan][2/2] translating…", spinner="dots") as status:

            def progress(done: int, tot: int) -> None:
                status.update(f"[cyan][2/2] translating… {done}/{tot} lines")

            en_local = translate_mod.translate_segments(
                ja_local,
                model=openai_model,
                notes=notes,
                prior_context=prior_ctx,
                progress=progress,
            )
        srt_mod.write(chunk_en, en_local)
        prior_ctx = [s.text for s in en_local][-6:]
        _done(f"[2/2] translated {len(en_local)} lines · {_fmt_dur(time.perf_counter() - t1)}")

        all_ja.extend(ja_local)
        all_en.extend(en_local)
        dt = time.perf_counter() - t_chunk
        chunk_durs.append(dt)
        if total > 1:
            console.print(f"  [bold green]✓ chunk {i}/{total} done · {_fmt_dur(dt)}[/]")

    if not all_en:
        console.print("[red]No speech detected — nothing to translate.[/]")
        raise typer.Exit(1)

    for idx, seg in enumerate(all_ja, start=1):
        seg.index = idx
    for idx, seg in enumerate(all_en, start=1):
        seg.index = idx
    srt_mod.write(work / "ja.srt", all_ja)
    srt_mod.write(out, all_en)

    if keep_japanese:
        ja_out = out.parent / f"{out.stem}.ja.srt"
        srt_mod.write(ja_out, all_ja)
        _done(f"Japanese subtitles → {ja_out}")
    if not keep_chunks:
        shutil.rmtree(chunks_dir, ignore_errors=True)

    console.print(
        f"\n[bold green]Done in {_fmt_dur(time.perf_counter() - t_start)}.[/] "
        f"→ [bold]{out}[/]"
    )


def _translate(
    segments: list[srt_mod.Segment],
    work: Path,
    out: Path,
    model: str | None,
    notes: str,
    force: bool,
) -> Path:
    if out.exists() and not force:
        _done(f"translation cached → {out}")
        return out
    _step(f"Translating {len(segments)} segments JA→EN (OpenAI)…")
    with console.status("[cyan]translating…", spinner="dots") as status:

        def progress(done: int, total: int) -> None:
            status.update(f"[cyan]translating… {done}/{total} segments")

        english = translate_mod.translate_segments(
            segments, model=model, notes=notes, progress=progress
        )
    srt_mod.write(out, english)
    _done(f"English subtitles → {out}")
    return out


@app.command()
def run(
    video: Path = typer.Argument(..., exists=True, dir_okay=False, help="Japanese-audio video/audio file."),
    output: Path = typer.Option(None, "--output", "-o", help="Output .srt path (default: <video>.en.srt)."),
    whisper_model: str = typer.Option("large-v3", "--whisper-model", "-w", help="large-v3 | turbo | medium | small."),
    openai_model: str = typer.Option(None, "--openai-model", "-m", help="OpenAI model (default: gpt-4o or $JVS_OPENAI_MODEL)."),
    notes: str = typer.Option("", "--notes", "-n", help="Context about the video (topic, character names) to improve accuracy."),
    force: bool = typer.Option(False, "--force", "-f", help="Redo every step, ignoring cached files."),
    keep_japanese: bool = typer.Option(False, "--keep-japanese", help="Also copy the Japanese .srt next to the output."),
    chunk_minutes: float = typer.Option(10.0, "--chunk-minutes", "-c", help="Split audio longer than this into chunks (memory safety). 0 disables."),
    keep_chunks: bool = typer.Option(False, "--keep-chunks", help="Keep intermediate per-chunk files instead of deleting them."),
    cache_limit_gb: float = typer.Option(2.0, "--cache-limit-gb", help="Cap MLX's reused GPU memory pool (GB) to ease memory pressure. 0 = unlimited."),
    keep_non_speech: bool = typer.Option(False, "--keep-non-speech", help="Keep moaning/non-speech sound cues instead of dropping them."),
    verbose: bool = typer.Option(False, "--verbose", help="Stream Whisper decoding output."),
) -> None:
    """Full pipeline: video → English .srt (per-chunk transcribe + translate)."""
    out = output or video.with_suffix(".en.srt")
    chunk_seconds = chunk_minutes * 60 if chunk_minutes > 0 else float("inf")
    _run_pipeline(
        video, out, whisper_model, openai_model, notes, force,
        keep_japanese, chunk_seconds, keep_chunks, verbose, cache_limit_gb,
        not keep_non_speech,
    )


@app.command()
def transcribe(
    video: Path = typer.Argument(..., exists=True, dir_okay=False, help="Japanese-audio video/audio file."),
    whisper_model: str = typer.Option("large-v3", "--whisper-model", "-w"),
    notes: str = typer.Option("", "--notes", "-n"),
    force: bool = typer.Option(False, "--force", "-f"),
    chunk_minutes: float = typer.Option(10.0, "--chunk-minutes", "-c", help="Split audio longer than this into chunks. 0 disables."),
    keep_chunks: bool = typer.Option(False, "--keep-chunks"),
    cache_limit_gb: float = typer.Option(2.0, "--cache-limit-gb", help="Cap MLX's reused GPU memory pool (GB). 0 = unlimited."),
    keep_non_speech: bool = typer.Option(False, "--keep-non-speech", help="Keep moaning/non-speech sound cues instead of dropping them."),
    verbose: bool = typer.Option(False, "--verbose"),
) -> None:
    """Only transcribe: produce the Japanese .srt (no translation)."""
    work = _workdir(video)
    console.print(f"[bold]jap-video-sub transcribe[/] · {video.name}")
    chunk_seconds = chunk_minutes * 60 if chunk_minutes > 0 else float("inf")
    wav = _get_audio(video, work, force)
    _get_japanese(
        wav, work, whisper_model, notes, force, verbose, chunk_seconds, keep_chunks,
        cache_limit_gb, not keep_non_speech,
    )
    console.print(f"\n[bold green]Done.[/] → [bold]{work / 'ja.srt'}[/]")


@app.command()
def translate(
    japanese_srt: Path = typer.Argument(..., exists=True, dir_okay=False, help="Existing Japanese .srt to translate."),
    output: Path = typer.Option(None, "--output", "-o", help="Output .srt path (default: <input>.en.srt)."),
    openai_model: str = typer.Option(None, "--openai-model", "-m"),
    notes: str = typer.Option("", "--notes", "-n"),
    force: bool = typer.Option(False, "--force", "-f"),
) -> None:
    """Only translate an existing Japanese .srt → English .srt."""
    out = output or japanese_srt.with_suffix(".en.srt")
    segments = srt_mod.read(japanese_srt)
    console.print(f"[bold]jap-video-sub translate[/] · {japanese_srt.name} ({len(segments)} segments)")
    _translate(segments, japanese_srt.parent, out, openai_model, notes, force)
    console.print(f"\n[bold green]Done.[/] → [bold]{out}[/]")


def main() -> None:
    load_dotenv()
    app()


if __name__ == "__main__":
    main()
